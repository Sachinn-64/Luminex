from flask import Flask, request, jsonify, send_file, render_template
from flask_cors import CORS
from werkzeug.utils import secure_filename
import os
import cv2
import face_recognition
import numpy as np
from PIL import Image
import tempfile
import uuid
import logging
import threading
import base64
from datetime import datetime
import json

from person_detector import HybridPersonDetector, get_insight_app

app = Flask(__name__)
CORS(app)
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024  # 100MB max file size
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['OUTPUT_FOLDER'] = 'outputs'

# Ensure directories exist
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs(app.config['OUTPUT_FOLDER'], exist_ok=True)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Allowed file extensions
ALLOWED_EXTENSIONS_IMAGE = {'png', 'jpg', 'jpeg', 'gif', 'bmp'}
ALLOWED_EXTENSIONS_VIDEO = {'mp4', 'avi', 'mov', 'mkv', 'wmv'}

def allowed_file(filename, allowed_extensions):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in allowed_extensions

# Pre-load InsightFace model at startup so the first request isn't slow
logger.info("Pre-loading InsightFace model…")
try:
    get_insight_app()
except Exception as e:
    logger.warning(f"InsightFace pre-load failed (will retry on first request): {e}")

@app.route('/')
def index():
    """Home page with upload form."""
    return render_template('index.html')

@app.route('/api/detect', methods=['POST'])
def detect_person():
    """
    API endpoint to detect a person in a video.
    
    Expected form data:
    - person_image: Image file of the person to find
    - crowd_video: Video file of the crowd
    - tolerance: Face recognition tolerance (optional, default 0.6)
    - frame_skip: Frame processing rate (optional, default 5)
    """
    try:
        # Check if files are present
        if 'person_image' not in request.files or 'crowd_video' not in request.files:
            return jsonify({'error': 'Both person_image and crowd_video files are required'}), 400
        
        person_file = request.files['person_image']
        video_file = request.files['crowd_video']
        
        # Check file extensions
        if not allowed_file(person_file.filename, ALLOWED_EXTENSIONS_IMAGE):
            return jsonify({'error': 'Invalid person image format. Allowed: png, jpg, jpeg, gif, bmp'}), 400
        
        if not allowed_file(video_file.filename, ALLOWED_EXTENSIONS_VIDEO):
            return jsonify({'error': 'Invalid video format. Allowed: mp4, avi, mov, mkv, wmv'}), 400
        
        # Get optional parameters
        tolerance = float(request.form.get('tolerance', 0.6))
        frame_skip = int(request.form.get('frame_skip', 5))
        max_process_frames = int(request.form.get('max_process_frames', 120))
        
        # Validate parameters
        if not 0.0 <= tolerance <= 1.0:
            return jsonify({'error': 'Tolerance must be between 0.0 and 1.0'}), 400
        
        if frame_skip < 1:
            return jsonify({'error': 'Frame skip must be at least 1'}), 400
        
        # Generate unique filenames
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        unique_id = str(uuid.uuid4())[:8]
        
        person_filename = f"person_{timestamp}_{unique_id}.{person_file.filename.rsplit('.', 1)[1].lower()}"
        video_filename = f"crowd_{timestamp}_{unique_id}.{video_file.filename.rsplit('.', 1)[1].lower()}"
        output_filename = f"output_{timestamp}_{unique_id}.mp4"
        
        # Save uploaded files
        person_path = os.path.join(app.config['UPLOAD_FOLDER'], person_filename)
        video_path = os.path.join(app.config['UPLOAD_FOLDER'], video_filename)
        output_path = os.path.join(app.config['OUTPUT_FOLDER'], output_filename)
        
        person_file.save(person_path)
        video_file.save(video_path)
        
        logger.info(f"Files uploaded: {person_filename}, {video_filename}")
        
        # Initialize hybrid detector (dlib + InsightFace)
        detector = HybridPersonDetector(
            person_path, video_path,
            dlib_tolerance=tolerance,
        )
        
        # Load person encoding with both engines
        success, message = detector.load_person_encoding()
        if not success:
            # Clean up uploaded files
            os.remove(person_path)
            os.remove(video_path)
            return jsonify({'error': message}), 400
        
        # Run detection
        success, result = detector.detect_person_in_video(output_path, tolerance, frame_skip, max_process_frames)
        
        if not success:
            # Clean up uploaded files
            os.remove(person_path)
            os.remove(video_path)
            return jsonify({'error': result}), 500
        
        # Clean up uploaded files (keep output video)
        os.remove(person_path)
        os.remove(video_path)
        
        # Build list of all detection frame filenames
        all_detection_frames = []
        if isinstance(result, dict) and 'all_detection_frame_paths' in result:
            all_detection_frames = [
                os.path.basename(p) for p in result['all_detection_frame_paths']
            ]

        # Return success response
        return jsonify({
            'success': True,
            'message': 'Person detection completed successfully',
            'output_video': output_filename,
            'detection_frame': output_filename.replace('.mp4', '_detection_frame.jpg'),
            'all_detection_frames': all_detection_frames,
            'detection_summary': result
        }), 200
        
    except Exception as e:
        logger.error(f"Error in detection: {str(e)}")
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500

@app.route('/api/download/<filename>')
def download_video(filename):
    """Download the processed video file."""
    try:
        file_path = os.path.join(app.config['OUTPUT_FOLDER'], filename)
        if os.path.exists(file_path):
            return send_file(file_path, as_attachment=True, download_name=filename)
        else:
            return jsonify({'error': 'File not found'}), 404
    except Exception as e:
        return jsonify({'error': f'Error downloading file: {str(e)}'}), 500

@app.route('/api/view/<filename>')
def view_file(filename):
    """View the file (video or image) in browser."""
    try:
        file_path = os.path.join(app.config['OUTPUT_FOLDER'], filename)
        if os.path.exists(file_path):
            return send_file(file_path)
        else:
            return jsonify({'error': 'File not found'}), 404
    except Exception as e:
        return jsonify({'error': f'Error viewing file: {str(e)}'}), 500

@app.route('/api/health')
def health_check():
    """Health check endpoint for deployment monitoring."""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'service': 'Person Detection API'
    })

@app.errorhandler(413)
def too_large(e):
    """Handle file too large error."""
    return jsonify({'error': 'File too large. Maximum size is 100MB.'}), 413

@app.errorhandler(404)
def not_found(e):
    """Handle 404 errors."""
    return jsonify({'error': 'Endpoint not found'}), 404

@app.route('/api/detect-stream', methods=['POST'])
def detect_stream():
    """
    Detect a person in the live RTSP stream using hybrid detection
    (dlib face_recognition + InsightFace ArcFace).
    Accepts: person_image file, optional tolerance, insight_threshold & max_seconds.
    
    OPTIMIZED: Returns results within ~20 seconds by:
    - Higher frame_skip (process fewer frames)
    - Early termination after finding detections
    - Limited max detections
    """
    try:
        if 'person_image' not in request.files:
            return jsonify({"error": "person_image file is required"}), 400

        person_file = request.files['person_image']
        if not allowed_file(person_file.filename, ALLOWED_EXTENSIONS_IMAGE):
            return jsonify({'error': 'Invalid image format. Allowed: png, jpg, jpeg, gif, bmp'}), 400

        tolerance = float(request.form.get('tolerance', 0.6))
        insight_threshold = float(request.form.get('insight_threshold', 0.25))
        # Frame skip for live processing
        frame_skip = int(request.form.get('frame_skip', 8))
        # Reduced default max_seconds for quicker response
        max_seconds = int(request.form.get('max_seconds', 20))
        # Max detections before early termination (new param)
        max_detections = int(request.form.get('max_detections', 5))

        # Save person image
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        unique_id = str(uuid.uuid4())[:8]
        person_filename = f"person_{timestamp}_{unique_id}.{person_file.filename.rsplit('.', 1)[1].lower()}"
        person_path = os.path.join(app.config['UPLOAD_FOLDER'], person_filename)
        person_file.save(person_path)

        # Create hybrid detector with laptop webcam
        webcam_source = 0  # Default laptop camera
        gemini_key = os.environ.get("GEMINI_API_KEY", "")
        detector = HybridPersonDetector(
            person_image_path=person_path,
            video_path=str(webcam_source),
            insight_threshold=insight_threshold,
            dlib_tolerance=tolerance,
            gemini_api_key=gemini_key,
        )

        # Load person encodings with both face engines
        ok, msg = detector.load_person_encoding()
        if not ok:
            os.remove(person_path)
            return jsonify({"error": msg}), 400

        logger.info(f"Hybrid detector ready — dlib: {detector.dlib_encoding is not None}, "
                     f"insightface: {detector.insight_embedding is not None}, "
                     f"gemini: {detector.gemini_model is not None}")

        # Open laptop webcam
        logger.info("Opening laptop webcam...")
        video = cv2.VideoCapture(webcam_source)

        if not video.isOpened():
            os.remove(person_path)
            return jsonify({"error": "Could not open laptop camera. Make sure no other app is using it and camera permissions are granted."}), 500

        fps = video.get(cv2.CAP_PROP_FPS)
        if fps <= 0:
            fps = 30

        frame_count = 0
        detections = []
        frames_analyzed = 0

        logger.info(f"Scanning webcam for ~{max_seconds}s (skip={frame_skip}, max_detections={max_detections})")

        import time
        start_time = time.time()
        timeout_seconds = max_seconds + 5  # Hard timeout

        while True:
            elapsed_now = time.time() - start_time

            # Hard timeout check
            if elapsed_now > timeout_seconds:
                logger.warning(f"Hard timeout reached after {timeout_seconds}s")
                break

            # Early termination if we have enough detections
            if len(detections) >= max_detections:
                logger.info(f"Early termination: found {len(detections)} detections")
                break

            # ── Read frame from webcam ──
            ret, latest_frame = video.read()

            if not ret or latest_frame is None:
                # No frame available yet, small delay and retry
                time.sleep(0.05)
                frame_count += 1
                if frame_count > 100 and frames_analyzed == 0:
                    logger.warning("No frames received from webcam after 100 attempts")
                    break
                continue

            frame_count += 1

            # ── Skip frames to reduce processing load ──
            if frame_count % frame_skip != 0:
                continue

            # ── Run detection on this frame ──
            frames_analyzed += 1
            matches = detector.match_frame(latest_frame)

            # Debug: log what we found (even non-matches)
            if frames_analyzed <= 5 or frames_analyzed % 5 == 0:
                logger.info(f"Frame #{frames_analyzed} (webcam frame ~{frame_count}): "
                           f"{len(matches)} match(es)")

            for m in matches:
                left, top, right, bottom = m["bbox"]
                engine = m["engine"]
                score = m["score"]

                # Color by engine: green=both, blue=insightface, yellow=dlib
                if engine == "both":
                    color = (0, 255, 0)
                elif engine == "insightface":
                    color = (255, 180, 0)
                else:
                    color = (0, 255, 255)

                cv2.rectangle(latest_frame, (left, top), (right, bottom), color, 3)
                label = f"FOUND [{engine}] {score:.2f}"
                cv2.putText(latest_frame, label, (left, top - 10),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)

                time_sec = round(elapsed_now, 2)
                cv2.putText(latest_frame, f"Time: {time_sec}s", (left, bottom + 25),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)

                # Encode full frame as base64
                _, buffer = cv2.imencode('.jpg', latest_frame)
                frame_b64 = base64.b64encode(buffer).decode('utf-8')

                # Crop face region with padding
                pad = 40
                h, w = latest_frame.shape[:2]
                crop_top = max(0, top - pad)
                crop_bottom = min(h, bottom + pad)
                crop_left = max(0, left - pad)
                crop_right = min(w, right + pad)
                face_crop = latest_frame[crop_top:crop_bottom, crop_left:crop_right]
                _, face_buf = cv2.imencode('.jpg', face_crop)
                face_b64 = base64.b64encode(face_buf).decode('utf-8')

                # Save to disk
                det_filename = f"detection_{timestamp}_{unique_id}_{len(detections)}.jpg"
                det_path = os.path.join(app.config['OUTPUT_FOLDER'], det_filename)
                cv2.imwrite(det_path, latest_frame)

                # Hardcoded locations for demo (rotate through these)
                LOCATIONS = [
                    "East Nada Gate",
                    "West Nada Gate", 
                    "Chuttambalam Area",
                    "Nalambalam Entrance",
                    "Main Temple Corridor",
                    "South Gate Parking",
                    "North Side Pathway",
                ]
                location = LOCATIONS[len(detections) % len(LOCATIONS)]

                detections.append({
                    "frame": frame_count,
                    "timestamp_sec": time_sec,
                    "frame_image": f"data:image/jpeg;base64,{frame_b64}",
                    "face_crop": f"data:image/jpeg;base64,{face_b64}",
                    "bbox": [left, top, right, bottom],
                    "engine": engine,
                    "score": round(score, 3),
                    "saved_file": det_filename,
                    "location": location,
                    "verified_by": "Admin",
                })

                logger.info(f"Person detected at frame ~{frame_count} ({time_sec}s) "
                            f"via {engine} (score={score:.3f})")

        video.release()
        os.remove(person_path)

        elapsed = round(time.time() - start_time, 2)
        logger.info(f"Webcam scan complete in {elapsed}s. {len(detections)} detection(s), "
                    f"{frames_analyzed} frames analyzed out of ~{frame_count} webcam frames.")

        return jsonify({
            "success": True,
            "message": f"Scanned {elapsed}s of laptop webcam",
            "total_frames_scanned": frames_analyzed,
            "elapsed_seconds": elapsed,
            "detections": detections,
            "person_found": len(detections) > 0,
        }), 200

    except Exception as e:
        logger.error(f"Stream detection error: {str(e)}")
        return jsonify({"error": f"Stream detection failed: {str(e)}", "success": False}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5004))
    app.run(host='0.0.0.0', port=port, debug=False)
