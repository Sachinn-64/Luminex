"""
Hybrid Person Detector — combines dlib + InsightFace + Gemini Vision.

face_recognition  → excellent on frontal / near-frontal faces, fast
InsightFace       → handles side profiles, angles, partial occlusion, low light
Gemini 2.5 Flash  → visual comparison (clothing, body shape, context) — works at distance

Strategy:
  1. Both face engines encode the target person's face.
  2. Every processed frame is checked by BOTH face engines (union).
  3. If neither finds a match, Gemini Vision compares visually as fallback.
  4. A match from ANY engine counts as a detection.
"""

import cv2
import face_recognition
import numpy as np
import os
import base64
import json
import argparse
import logging
from datetime import datetime

# InsightFace (ArcFace + RetinaFace)
from insightface.app import FaceAnalysis

# Gemini Vision
import google.generativeai as genai

logger = logging.getLogger(__name__)

# ─── Singleton InsightFace loader ───────────────────────────────────────────
_insight_app = None


def get_insight_app():
    """Lazy-load and cache the InsightFace model (heavy, ~300 MB)."""
    global _insight_app
    if _insight_app is None:
        logger.info("Loading InsightFace buffalo_l model (first time)…")
        _insight_app = FaceAnalysis(
            name="buffalo_l",
            providers=["CPUExecutionProvider"],
        )
        # Use 640x640 detection size for better accuracy on small/distant faces
        _insight_app.prepare(ctx_id=-1, det_size=(640, 640))
        logger.info("InsightFace model ready.")
    return _insight_app


# ─── Utility ────────────────────────────────────────────────────────────────

def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """Cosine similarity in [-1, 1]; higher = more similar."""
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-8))


# ─── HybridPersonDetector ──────────────────────────────────────────────────

class HybridPersonDetector:
    """
    Detect a target person using two face-recognition engines.

    Parameters
    ----------
    person_image_path : str
        Path to the target person's face image.
    video_path : str
        Path to a video file **or** an RTSP stream URL.
    insight_threshold : float
        Cosine-similarity threshold for InsightFace (0-1, default 0.35).
        Lower = more lenient (good for side profiles).
    dlib_tolerance : float
        Euclidean-distance tolerance for face_recognition (default 0.6).
        Lower = stricter.
    """

    def __init__(
        self,
        person_image_path: str,
        video_path: str,
        insight_threshold: float = 0.35,
        dlib_tolerance: float = 0.6,
        gemini_api_key: str = None,
    ):
        self.person_image_path = person_image_path
        self.video_path = video_path
        self.insight_threshold = insight_threshold
        self.dlib_tolerance = dlib_tolerance

        # Encodings filled by load_person_encoding()
        self.dlib_encoding = None       # 128-d numpy array
        self.insight_embedding = None   # 512-d numpy array

        # Gemini Vision setup
        self.gemini_model = None
        self.person_image_bytes = None
        if gemini_api_key:
            try:
                genai.configure(api_key=gemini_api_key)
                self.gemini_model = genai.GenerativeModel('gemini-2.5-flash')
                # Load person image bytes for Gemini comparison
                with open(person_image_path, 'rb') as f:
                    self.person_image_bytes = f.read()
                logger.info("Gemini 2.5 Flash engine initialized")
            except Exception as e:
                logger.warning(f"Gemini init failed: {e}")

        self.output_dir = "detected_frames"
        os.makedirs(self.output_dir, exist_ok=True)

    # ── Load target face ────────────────────────────────────────────────

    def load_person_encoding(self):
        """
        Encode the target person's face with **both** engines.
        Returns (success: bool, message: str).
        """
        dlib_ok = self._load_dlib_encoding()
        insight_ok = self._load_insight_encoding()

        if not dlib_ok and not insight_ok:
            return False, (
                "Neither engine could find a face in the image. "
                "Please use a photo with a clearly visible face."
            )

        parts = []
        if dlib_ok:
            parts.append("dlib (face_recognition)")
        if insight_ok:
            parts.append("InsightFace (ArcFace)")

        msg = f"Person encoded with: {', '.join(parts)}"
        logger.info(msg)
        return True, msg

    def _load_dlib_encoding(self) -> bool:
        try:
            img = face_recognition.load_image_file(self.person_image_path)
            encs = face_recognition.face_encodings(img)
            if encs:
                self.dlib_encoding = encs[0]
                return True
        except Exception as e:
            logger.warning(f"dlib encoding failed: {e}")
        return False

    def _load_insight_encoding(self) -> bool:
        try:
            app = get_insight_app()
            img = cv2.imread(self.person_image_path)
            if img is None:
                return False
            faces = app.get(img)
            if faces:
                # Pick the largest detected face
                faces = sorted(
                    faces,
                    key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]),
                    reverse=True,
                )
                self.insight_embedding = faces[0].normed_embedding
                return True
        except Exception as e:
            logger.warning(f"InsightFace encoding failed: {e}")
        return False

    # ── Per-frame matching ──────────────────────────────────────────────

    def _enhance_frame(self, frame_bgr: np.ndarray) -> np.ndarray:
        """Apply CLAHE contrast enhancement for better detection in varying lighting."""
        lab = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        l = clahe.apply(l)
        enhanced = cv2.merge([l, a, b])
        return cv2.cvtColor(enhanced, cv2.COLOR_LAB2BGR)

    def _get_tiles(self, frame_bgr: np.ndarray):
        """
        Split frame into overlapping tiles for multi-scale detection.
        Returns list of (tile_image, x_offset, y_offset) tuples.
        Distant faces appear ~2x larger in each quadrant tile.
        """
        h, w = frame_bgr.shape[:2]
        tiles = []

        # Full frame (for close subjects)
        tiles.append((frame_bgr, 0, 0))

        # 4 overlapping quadrants with 20% overlap (for distant subjects at ~2x zoom)
        mid_x = w // 2
        mid_y = h // 2
        overlap_x = int(w * 0.1)
        overlap_y = int(h * 0.1)

        # Top-left
        tiles.append((frame_bgr[0:mid_y + overlap_y, 0:mid_x + overlap_x], 0, 0))
        # Top-right
        tiles.append((frame_bgr[0:mid_y + overlap_y, mid_x - overlap_x:w], mid_x - overlap_x, 0))
        # Bottom-left
        tiles.append((frame_bgr[mid_y - overlap_y:h, 0:mid_x + overlap_x], 0, mid_y - overlap_y))
        # Bottom-right
        tiles.append((frame_bgr[mid_y - overlap_y:h, mid_x - overlap_x:w], mid_x - overlap_x, mid_y - overlap_y))

        return tiles

    def match_frame(self, frame_bgr: np.ndarray):
        """
        Run all detection engines on a single BGR frame.
        Uses multi-scale tile detection + CLAHE enhancement.

        Returns a list of dicts, one per matched face:
            { "bbox": (left, top, right, bottom),
              "engine": "dlib" | "insightface" | "both" | "gemini",
              "score": float }
        """
        matches = {}  # key = rough bbox centre → avoids duplicates

        # Enhance frame contrast for better detection
        enhanced = self._enhance_frame(frame_bgr)
        h_full, w_full = enhanced.shape[:2]

        # Get multi-scale tiles
        tiles = self._get_tiles(enhanced)
        logger.info(f"[MultiScale] Processing {len(tiles)} tiles from {w_full}x{h_full} frame")

        # ── dlib pass (multi-scale) ────────────────────────────────────
        if self.dlib_encoding is not None:
            total_dlib_faces = 0
            for tile_idx, (tile, x_off, y_off) in enumerate(tiles):
                rgb = cv2.cvtColor(tile, cv2.COLOR_BGR2RGB)

                # Use CNN model for tile 0 (full frame), HOG for quadrants (speed balance)
                if tile_idx == 0:
                    try:
                        locations = face_recognition.face_locations(rgb, model="cnn")
                    except Exception:
                        # CNN model may not be available, fall back to HOG
                        locations = face_recognition.face_locations(rgb, model="hog", number_of_times_to_upsample=2)
                else:
                    locations = face_recognition.face_locations(rgb, model="hog", number_of_times_to_upsample=1)

                encodings = face_recognition.face_encodings(rgb, locations)
                total_dlib_faces += len(locations)

                for loc, enc in zip(locations, encodings):
                    top, right, bottom, left = loc
                    # Map tile coords back to full frame
                    top += y_off
                    bottom += y_off
                    left += x_off
                    right += x_off

                    dist = face_recognition.face_distance([self.dlib_encoding], enc)[0]

                    logger.info(f"[dlib] tile{tile_idx} Face at ({left},{top})-({right},{bottom}): "
                               f"distance={dist:.3f}, threshold={self.dlib_tolerance}, "
                               f"{'MATCH' if dist <= self.dlib_tolerance else 'NO MATCH'}")

                    if dist <= self.dlib_tolerance:
                        key = (round(left / 30), round(top / 30))
                        score = round(1.0 - dist, 3)
                        if key not in matches or matches[key]["score"] < score:
                            matches[key] = {
                                "bbox": (left, top, right, bottom),
                                "engine": "dlib",
                                "score": score,
                            }

            logger.info(f"[dlib] {total_dlib_faces} total face(s) across {len(tiles)} tiles")

        # ── InsightFace pass (multi-scale) ──────────────────────────────
        if self.insight_embedding is not None:
            try:
                insight_app = get_insight_app()
                total_insight_faces = 0

                for tile_idx, (tile, x_off, y_off) in enumerate(tiles):
                    faces = insight_app.get(tile)
                    total_insight_faces += len(faces)

                    for face in faces:
                        sim = cosine_similarity(self.insight_embedding, face.normed_embedding)

                        x1, y1, x2, y2 = [int(v) for v in face.bbox]
                        # Map tile coords back to full frame
                        x1 += x_off
                        y1 += y_off
                        x2 += x_off
                        y2 += y_off

                        logger.info(f"[InsightFace] tile{tile_idx} Face at ({x1},{y1})-({x2},{y2}): "
                                   f"similarity={sim:.3f}, threshold={self.insight_threshold}, "
                                   f"{'MATCH' if sim >= self.insight_threshold else 'NO MATCH'}")

                        if sim >= self.insight_threshold:
                            key = (round(x1 / 30), round(y1 / 30))
                            if key in matches:
                                matches[key]["engine"] = "both"
                                matches[key]["score"] = max(matches[key]["score"], round(sim, 3))
                            else:
                                matches[key] = {
                                    "bbox": (x1, y1, x2, y2),
                                    "engine": "insightface",
                                    "score": round(sim, 3),
                                }

                logger.info(f"[InsightFace] {total_insight_faces} total face(s) across {len(tiles)} tiles")

            except Exception as e:
                logger.warning(f"InsightFace frame analysis failed: {e}")

        # ── Gemini Vision pass (fallback when face engines find nothing) ──
        if not matches and self.gemini_model and self.person_image_bytes:
            try:
                logger.info("[Gemini] Face engines found nothing — running visual comparison...")
                gemini_result = self._gemini_compare(frame_bgr)
                if gemini_result:
                    matches[('gemini', 0)] = gemini_result
            except Exception as e:
                logger.warning(f"Gemini comparison failed: {e}")

        return list(matches.values())

    def _gemini_compare(self, frame_bgr: np.ndarray):
        """
        Use Gemini 2.5 Flash to visually compare the target person against
        the stream frame. Works for clothing, body shape, posture — not just face.
        Returns a match dict or None.
        """
        # Encode frame as JPEG
        _, frame_buf = cv2.imencode('.jpg', frame_bgr, [int(cv2.IMWRITE_JPEG_QUALITY), 85])
        frame_bytes = frame_buf.tobytes()

        # Build Gemini prompt with both images
        prompt = """You are a person identification system. Compare these two images:

Image 1 (TARGET): A reference photo of a specific person.
Image 2 (SCENE): A camera frame that may or may not contain that person.

Analyze carefully — compare face, hair, clothing, body build, posture, accessories.
The person may be at a distance, partially occluded, or from a different angle.

Respond with ONLY valid JSON (no markdown, no backticks):
{
  "person_found": true/false,
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation",
  "approximate_location": "left/center/right/not_found"
}"""

        response = self.gemini_model.generate_content(
            [
                prompt,
                {'mime_type': 'image/jpeg', 'data': self.person_image_bytes},
                {'mime_type': 'image/jpeg', 'data': frame_bytes},
            ],
            generation_config={'temperature': 0.1, 'max_output_tokens': 200},
        )

        text = response.text.strip()
        # Clean markdown fences if present
        if text.startswith('```'):
            text = text.split('\n', 1)[1] if '\n' in text else text[3:]
        if text.endswith('```'):
            text = text[:-3]
        text = text.strip()

        result = json.loads(text)
        found = result.get('person_found', False)
        confidence = float(result.get('confidence', 0))
        reasoning = result.get('reasoning', '')
        location = result.get('approximate_location', 'center')

        logger.info(f"[Gemini] person_found={found}, confidence={confidence:.2f}, "
                   f"reason='{reasoning}'")

        if found and confidence >= 0.4:
            # Estimate bbox from location hint
            h, w = frame_bgr.shape[:2]
            if location == 'left':
                x1, x2 = int(w * 0.05), int(w * 0.45)
            elif location == 'right':
                x1, x2 = int(w * 0.55), int(w * 0.95)
            else:  # center
                x1, x2 = int(w * 0.25), int(w * 0.75)
            y1, y2 = int(h * 0.1), int(h * 0.9)

            return {
                "bbox": (x1, y1, x2, y2),
                "engine": "gemini",
                "score": round(confidence, 3),
            }

        return None

    # ── Video / stream scan ─────────────────────────────────────────────

    def detect_person(self, tolerance=0.6, frame_skip=5):
        """CLI-friendly: process a video/stream and save detection frames."""
        self.dlib_tolerance = tolerance

        if self.dlib_encoding is None and self.insight_embedding is None:
            print("No encoding loaded. Call load_person_encoding() first.")
            return

        print(f"Opening: {self.video_path}")
        video = cv2.VideoCapture(self.video_path, cv2.CAP_FFMPEG)
        if not video.isOpened():
            print("Error: Could not open video/stream.")
            return

        frame_count = 0
        detected_frames = 0

        print("Starting hybrid detection (dlib + InsightFace)…")

        while True:
            ret, frame = video.read()
            if not ret:
                print("Stream ended or frame not received.")
                break

            if frame_count % frame_skip == 0:
                hits = self.match_frame(frame)
                for hit in hits:
                    left, top, right, bottom = hit["bbox"]
                    engine = hit["engine"]
                    score = hit["score"]

                    cv2.rectangle(frame, (left, top), (right, bottom), (0, 255, 0), 2)
                    label = f"FOUND [{engine}] {score:.2f}"
                    cv2.putText(frame, label, (left, top - 10),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)

                    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
                    fname = f"detection_{ts}_{frame_count}.jpg"
                    cv2.imwrite(os.path.join(self.output_dir, fname), frame)
                    detected_frames += 1
                    print(f"  ✓ Detected [{engine}] score={score:.2f} → {fname}")

            if frame_count % 100 == 0:
                print(f"  Processed frames: {frame_count}")
            frame_count += 1

        video.release()
        print(f"\nDone — {frame_count} frames, {detected_frames} detections")
        print(f"Saved in: {self.output_dir}")

    def detect_person_in_video(self, output_video_path, tolerance=0.6, frame_skip=5, max_process_frames=120):
        """
        Smart video scan — samples frames evenly, then does adaptive dense
        sampling around detections for multi-frame capture.

        Strategy:
          1. Evenly sample up to max_process_frames across the video.
          2. Seek to each frame → run detection → save annotated frame.
          3. On first detection, queue nearby frames (±1 s) for dense sampling.
          4. Save up to `max_saved_frames` best detection images.
        """
        self.dlib_tolerance = tolerance
        max_saved_frames = 5  # save up to 5 unique detection images

        if self.dlib_encoding is None and self.insight_embedding is None:
            return False, "No person encoding loaded."

        video = cv2.VideoCapture(self.video_path)
        if not video.isOpened():
            return False, "Could not open video file."

        fps = int(video.get(cv2.CAP_PROP_FPS)) or 30
        total_frames = int(video.get(cv2.CAP_PROP_FRAME_COUNT))
        if total_frames <= 0:
            total_frames = 1000  # fallback

        # Build list of frame indices to sample (evenly spaced)
        effective_skip = max(frame_skip, total_frames // max_process_frames) if total_frames > max_process_frames else frame_skip
        sample_indices = sorted(set(range(0, total_frames, effective_skip)))
        num_initial_samples = len(sample_indices)

        logger.info(f"Smart scan: {total_frames} total frames, initial sample {num_initial_samples} "
                     f"(every {effective_skip} frames), fps={fps}")

        detected_frames = 0
        detection_timestamps = []
        detection_frame_paths = []   # up to max_saved_frames paths
        best_detection = None        # {"score": float, "path": str}
        already_sampled = set()      # avoid re-processing frames
        dense_queue = []             # extra frames queued after detections

        def _process_frame(frame_idx):
            """Seek to frame_idx, run detection, return hits list."""
            nonlocal detected_frames, best_detection
            if frame_idx in already_sampled or frame_idx < 0 or frame_idx >= total_frames:
                return []
            already_sampled.add(frame_idx)

            video.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
            ret, frame = video.read()
            if not ret:
                return []

            hits = self.match_frame(frame)

            for hit in hits:
                left, top, right, bottom = hit["bbox"]
                engine = hit["engine"]
                score = hit["score"]
                ts = round(frame_idx / fps, 2)

                cv2.rectangle(frame, (left, top), (right, bottom), (0, 255, 0), 2)
                cv2.putText(frame, f"FOUND [{engine}] {score:.2f}",
                            (left, top - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 255, 0), 2)
                cv2.putText(frame, f"Time: {ts}s",
                            (left, bottom + 25), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)

                detected_frames += 1
                detection_timestamps.append(ts)

                # Save detection frame image (up to max_saved_frames)
                if len(detection_frame_paths) < max_saved_frames:
                    suffix = f"_detection_frame_{len(detection_frame_paths)}.jpg"
                    path = output_video_path.replace(".mp4", suffix)
                    cv2.imwrite(path, frame)
                    detection_frame_paths.append(path)

                # Track best scoring detection (always overwrite with higher)
                if best_detection is None or score > best_detection["score"]:
                    best_path = output_video_path.replace(".mp4", "_detection_frame.jpg")
                    cv2.imwrite(best_path, frame)
                    best_detection = {"score": score, "path": best_path}

                logger.info(f"[{engine}] Detected at frame {frame_idx} ({ts}s) score={score:.2f}")

            return hits

        # ── Pass 1: evenly spaced sampling ──────────────────────────────
        for i, frame_idx in enumerate(sample_indices):
            hits = _process_frame(frame_idx)

            # Adaptive dense sampling: if detection found, queue nearby frames
            if hits:
                window = int(fps)  # ±1 second around detection
                step = max(1, window // 6)  # ~6 extra samples per side
                for offset in range(-window, window + 1, step):
                    neighbor = frame_idx + offset
                    if neighbor not in already_sampled:
                        dense_queue.append(neighbor)

            if (i + 1) % 20 == 0:
                pct = ((i + 1) / num_initial_samples) * 100
                logger.info(f"Progress: {pct:.0f}%  ({i + 1}/{num_initial_samples} sampled)")

        # ── Pass 2: dense sampling around detections ────────────────────
        if dense_queue:
            dense_queue = sorted(set(dense_queue))
            logger.info(f"Dense sampling {len(dense_queue)} extra frames around detections")
            for frame_idx in dense_queue:
                _process_frame(frame_idx)

        video.release()

        total_sampled = len(already_sampled)
        logger.info(f"Done. Sampled {total_sampled} frames, {detected_frames} detections.")

        # Best detection frame path (backward compatible)
        detection_frame_path = best_detection["path"] if best_detection else None

        return True, {
            "total_frames": total_frames,
            "detected_frames": detected_frames,
            "detection_timestamps": detection_timestamps,
            "output_video_path": output_video_path,
            "detection_frame_path": detection_frame_path,
            "all_detection_frame_paths": detection_frame_paths,
        }

    # ── Convenience ─────────────────────────────────────────────────────

    def run_detection(self, tolerance=0.6, frame_skip=5):
        print("===== Hybrid Lost Person Detection =====")
        print(f"Person image : {self.person_image_path}")
        print(f"Video/Stream : {self.video_path}")
        print(f"Engines      : dlib + InsightFace (ArcFace)\n")

        ok, msg = self.load_person_encoding()
        print(msg)
        if not ok:
            return

        self.detect_person(tolerance, frame_skip)


# ─── CLI entry point ────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Detect a person in video or RTSP stream (hybrid dlib + InsightFace)"
    )
    parser.add_argument("--person", required=True, help="Path to person's image")
    parser.add_argument("--video", required=True, help="Video file or RTSP URL")
    parser.add_argument("--tolerance", type=float, default=0.5,
                        help="dlib tolerance (lower=stricter, default 0.5)")
    parser.add_argument("--insight-threshold", type=float, default=0.35,
                        help="InsightFace cosine threshold (lower=more lenient, default 0.35)")
    parser.add_argument("--frame-skip", type=int, default=10)

    args = parser.parse_args()

    if not os.path.exists(args.person):
        print("Person image not found.")
        return

    detector = HybridPersonDetector(
        args.person, args.video,
        insight_threshold=args.insight_threshold,
        dlib_tolerance=args.tolerance,
    )
    detector.run_detection(args.tolerance, args.frame_skip)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    main()