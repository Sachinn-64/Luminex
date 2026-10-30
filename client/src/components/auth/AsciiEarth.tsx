import { useEffect, useRef } from 'react';
import { EARTH_MASK_H, EARTH_MASK_W, getEarthMask } from '@/components/auth/earthMask';

/**
 * A slowly rotating ASCII planet Earth rendered on a canvas.
 * Every character cell is ray-cast against a sphere, mapped to lat/lon,
 * looked up in a baked land mask and shaded with a fixed light source.
 */
export default function AsciiEarth({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const mask = getEarthMask();

    const LAND = ' .:-=+*#%@';
    const BRIGHT = '.:;+xX#%@@';
    const OCEAN = '. . : : ;';
    const LEVELS = 10;
    const CELL_W = 7;
    const CELL_H = 12;
    const FONT = `500 11px "Martian Mono", ui-monospace, Menlo, monospace`;

    // light from upper-left, slightly in front
    const L = [-0.45, 0.55, 0.7] as const;
    const Ll = Math.hypot(L[0], L[1], L[2]);
    const lx = L[0] / Ll;
    const ly = L[1] / Ll;
    const lz = L[2] / Ll;

    const TILT = (23.4 * Math.PI) / 180;
    const cosT = Math.cos(TILT);
    const sinT = Math.sin(TILT);

    let W = 0;
    let H = 0;
    let cols = 0;
    let rows = 0;
    let dpr = 1;
    let raf = 0;
    let lastFrame = 0;
    const t0 = performance.now();

    // static star field (cell coordinates)
    let stars: { x: number; y: number; ch: string; a: number }[] = [];

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      W = Math.max(1, Math.floor(rect.width));
      H = Math.max(1, Math.floor(rect.height));
      canvas.width = Math.floor(W * dpr);
      canvas.height = Math.floor(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(W / CELL_W);
      rows = Math.ceil(H / CELL_H);
      stars = [];
      const n = Math.floor((cols * rows) / 55);
      for (let i = 0; i < n; i++) {
        stars.push({
          x: Math.floor(Math.random() * cols),
          y: Math.floor(Math.random() * rows),
          ch: Math.random() < 0.15 ? '+' : '.',
          a: 0.12 + Math.random() * 0.35,
        });
      }
      draw(performance.now());
    };

    const buckets: { x: number; y: number; ch: string }[][] = Array.from({ length: LEVELS }, () => []);

    const draw = (now: number) => {
      ctx.clearRect(0, 0, W, H);
      for (const b of buckets) b.length = 0;

      const t = (now - t0) / 1000;
      const theta = reduce ? 0.6 : t * 0.14; // ~45s per rotation
      const cosR = Math.cos(theta);
      const sinR = Math.sin(theta);

      const cx = W / 2;
      const cy = H * 0.5;
      const R = Math.min(W, H) * 0.44;

      // stars (skip those inside the disc)
      for (const s of stars) {
        const px = s.x * CELL_W + CELL_W / 2;
        const py = s.y * CELL_H + CELL_H / 2;
        const dx = (px - cx) / R;
        const dy = (py - cy) / R;
        if (dx * dx + dy * dy < 1.12) continue;
        const tw = reduce ? 1 : 0.7 + 0.3 * Math.sin(t * 1.5 + s.x * 0.7 + s.y * 1.3);
        const lvl = Math.min(LEVELS - 1, Math.floor(s.a * tw * LEVELS));
        buckets[lvl].push({ x: s.x * CELL_W, y: s.y * CELL_H, ch: s.ch });
      }

      for (let gy = 0; gy < rows; gy++) {
        const py = gy * CELL_H + CELL_H / 2;
        const ny = -(py - cy) / R; // up is +y
        for (let gx = 0; gx < cols; gx++) {
          const px = gx * CELL_W + CELL_W / 2;
          const nx = (px - cx) / R;
          const rr = nx * nx + ny * ny;

          if (rr > 1) {
            // thin atmospheric rim just outside the limb
            if (rr < 1.09) {
              const f = 1 - (rr - 1) / 0.09;
              const lvl = Math.max(0, Math.min(LEVELS - 1, Math.floor(f * 2.2)));
              if (f > 0.35) buckets[lvl].push({ x: gx * CELL_W, y: gy * CELL_H, ch: f > 0.7 ? ':' : '.' });
            }
            continue;
          }

          const nz = Math.sqrt(1 - rr);

          // apply axial tilt (rotate about x), then spin about y
          const y1 = ny * cosT - nz * sinT;
          const z1 = ny * sinT + nz * cosT;
          const x1 = nx;
          const x2 = x1 * cosR + z1 * sinR;
          const z2 = -x1 * sinR + z1 * cosR;
          const y2 = y1;

          const lon = Math.atan2(x2, z2); // -PI..PI
          const lat = Math.asin(Math.max(-1, Math.min(1, y2)));
          const u = lon / (2 * Math.PI) + 0.5;
          const v = 0.5 - lat / Math.PI;
          const mx = ((Math.floor(u * EARTH_MASK_W) % EARTH_MASK_W) + EARTH_MASK_W) % EARTH_MASK_W;
          const my = Math.max(0, Math.min(EARTH_MASK_H - 1, Math.floor(v * EARTH_MASK_H)));
          const kind = mask[my * EARTH_MASK_W + mx];

          // lambert shading in screen space + limb darkening
          const shade = Math.max(0, nx * lx + ny * ly + nz * lz);
          const limb = 0.35 + 0.65 * nz;

          let b: number;
          let ramp: string;
          if (kind === 0) {
            b = (0.09 + 0.24 * shade) * limb;
            ramp = OCEAN;
          } else if (kind === 2) {
            b = (0.45 + 0.55 * shade) * limb;
            ramp = BRIGHT;
          } else {
            b = (0.34 + 0.66 * shade) * limb;
            ramp = LAND;
          }
          if (b < 0.03) continue;
          const ch = ramp[Math.min(ramp.length - 1, Math.floor(b * (ramp.length - 1) + 0.5))];
          if (ch === ' ') continue;
          const lvl = Math.min(LEVELS - 1, Math.floor(b * LEVELS));
          buckets[lvl].push({ x: gx * CELL_W, y: gy * CELL_H, ch });
        }
      }

      ctx.font = FONT;
      ctx.textBaseline = 'top';
      for (let l = 0; l < LEVELS; l++) {
        const bucket = buckets[l];
        if (!bucket.length) continue;
        const a = 0.16 + (l / (LEVELS - 1)) * 0.84;
        ctx.fillStyle = `rgba(255,255,255,${a.toFixed(3)})`;
        for (let i = 0; i < bucket.length; i++) ctx.fillText(bucket[i].ch, bucket[i].x, bucket[i].y);
      }
    };

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (now - lastFrame < 1000 / 20) return;
      lastFrame = now;
      draw(now);
    };

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();
    if (!reduce) raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return <canvas ref={ref} aria-hidden className={className} style={{ width: '100%', height: '100%', display: 'block' }} />;
}
