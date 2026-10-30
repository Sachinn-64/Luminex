'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const TOTAL_FRAMES = 240;
const FRAME_PATH = (i: number) =>
  `/frames/frame_-${String(i + 1).padStart(3, '0')}.jpg`;

interface Beat {
  headline: string;
  subHeadline?: string;
  cta?: boolean;
  startPct: number;
  endPct: number;
}

const BEATS: Beat[] = [
  { headline: 'TRINETRA', subHeadline: 'Advanced Surveillance Intelligence', startPct: 0, endPct: 30 },
  { headline: 'Security\nReimagined', startPct: 30, endPct: 70 },
  { headline: 'The future of safety.', cta: true, startPct: 70, endPct: 100 },
];

export default function HeroCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const framesRef = useRef<HTMLImageElement[]>([]);
  const currentFrameRef = useRef<number>(0);
  const targetFrameRef = useRef<number>(0);
  const rafRef = useRef<number>(0);
  const sectionRef = useRef<HTMLDivElement>(null);
  const loadedRef = useRef<boolean>(false);

  const [loadProgress, setLoadProgress] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeBeat, setActiveBeat] = useState(0);

  // Preload all frames
  useEffect(() => {
    let loaded = 0;
    const images: HTMLImageElement[] = new Array(TOTAL_FRAMES);
    framesRef.current = images;

    for (let i = 0; i < TOTAL_FRAMES; i++) {
      const img = new Image();
      img.src = FRAME_PATH(i);
      img.onload = () => {
        loaded++;
        setLoadProgress(Math.round((loaded / TOTAL_FRAMES) * 100));
        if (loaded === TOTAL_FRAMES) {
          loadedRef.current = true;
          setIsLoaded(true);
          drawFrame(0);
        }
      };
      img.onerror = () => {
        loaded++;
        setLoadProgress(Math.round((loaded / TOTAL_FRAMES) * 100));
        if (loaded === TOTAL_FRAMES) {
          loadedRef.current = true;
          setIsLoaded(true);
        }
      };
      images[i] = img;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Draw a specific frame to canvas
  const drawFrame = (index: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const frameIdx = Math.max(0, Math.min(TOTAL_FRAMES - 1, Math.round(index)));
    const img = framesRef.current[frameIdx];
    if (!img || !img.complete || img.naturalWidth === 0) return;

    const dpr = window.devicePixelRatio || 1;
    const W = canvas.width / dpr;
    const H = canvas.height / dpr;

    // Cover fit
    const imgAspect = img.naturalWidth / img.naturalHeight;
    const canvasAspect = W / H;

    let drawW: number, drawH: number, drawX: number, drawY: number;
    if (imgAspect > canvasAspect) {
      drawH = H;
      drawW = H * imgAspect;
    } else {
      drawW = W;
      drawH = W / imgAspect;
    }
    drawX = (W - drawW) / 2;
    drawY = (H - drawH) / 2;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.drawImage(img, drawX, drawY, drawW, drawH);
    ctx.restore();
  };

  // RAF animation loop
  useEffect(() => {
    if (!isLoaded) return;

    const animate = () => {
      const target = targetFrameRef.current;
      const current = currentFrameRef.current;
      const diff = target - current;

      if (Math.abs(diff) > 0.05) {
        currentFrameRef.current += diff * 0.12;
        drawFrame(currentFrameRef.current);
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded]);

  // Scroll listener
  useEffect(() => {
    const handleScroll = () => {
      const section = sectionRef.current;
      if (!section) return;
      const rect = section.getBoundingClientRect();
      const sectionH = section.offsetHeight - window.innerHeight;
      const scrolled = -rect.top;
      const progress = Math.max(0, Math.min(1, scrolled / sectionH));

      targetFrameRef.current = progress * (TOTAL_FRAMES - 1);

      // Update active beat
      const pct = progress * 100;
      let beat = 0;
      if (pct >= 30 && pct < 70) beat = 1;
      else if (pct >= 70) beat = 2;
      setActiveBeat(beat);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Canvas resize
  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      if (loadedRef.current) drawFrame(currentFrameRef.current);
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={sectionRef} style={{ height: '400vh' }} className="relative">
      {/* Sticky wrapper */}
      <div className="sticky top-0 w-full h-screen overflow-hidden" style={{ background: '#050505' }}>
        {/* Canvas */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ display: 'block' }}
        />

        {/* Vignette overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse at center, transparent 40%, rgba(5,5,5,0.85) 100%)',
          }}
        />

        {/* Top fade */}
        <div
          className="absolute top-0 left-0 right-0 h-32 pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, #050505 0%, transparent 100%)' }}
        />

        {/* Bottom fade */}
        <div
          className="absolute bottom-0 left-0 right-0 h-40 pointer-events-none"
          style={{ background: 'linear-gradient(to top, #050505 0%, transparent 100%)' }}
        />

        {/* Loading screen */}
        <AnimatePresence>
          {!isLoaded && (
            <motion.div
              className="absolute inset-0 flex flex-col items-center justify-center z-50"
              style={{ background: '#050505' }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: 'easeInOut' }}
            >
              <motion.div
                className="text-xs tracking-[0.3em] uppercase mb-8"
                style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-inter)' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                Loading Vision
              </motion.div>
              {/* Progress bar */}
              <div
                className="relative overflow-hidden"
                style={{
                  width: '200px',
                  height: '1px',
                  background: 'rgba(255,255,255,0.08)',
                }}
              >
                <motion.div
                  className="absolute inset-y-0 left-0"
                  style={{
                    background: 'linear-gradient(90deg, #0050FF, #00D6FF)',
                    width: `${loadProgress}%`,
                  }}
                  transition={{ ease: 'linear' }}
                />
              </div>
              <motion.div
                className="mt-4 text-xs tabular-nums"
                style={{ color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--font-inter)' }}
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              >
                {loadProgress}%
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Story beat text overlays */}
        <AnimatePresence mode="wait">
          {isLoaded && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeBeat}
                  className="text-center px-6 max-w-5xl mx-auto"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
                >
                  {activeBeat === 0 && (
                    <>
                      <motion.h1
                        className="no-select"
                        style={{
                          fontFamily: 'var(--font-inter)',
                          fontSize: 'clamp(72px, 12vw, 160px)',
                          fontWeight: 700,
                          letterSpacing: '-0.03em',
                          lineHeight: 1,
                          background: 'linear-gradient(135deg, #ffffff 30%, rgba(0,214,255,0.7) 100%)',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          backgroundClip: 'text',
                          mixBlendMode: 'plus-lighter',
                        }}
                      >
                        TRINETRA
                      </motion.h1>
                      <motion.p
                        className="mt-6 no-select"
                        style={{
                          fontFamily: 'var(--font-inter)',
                          fontSize: 'clamp(14px, 1.8vw, 20px)',
                          fontWeight: 300,
                          letterSpacing: '0.18em',
                          textTransform: 'uppercase',
                          color: 'rgba(255,255,255,0.5)',
                        }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3, duration: 0.6 }}
                      >
                        See beyond the visible.
                      </motion.p>
                    </>
                  )}

                  {activeBeat === 1 && (
                    <motion.h2
                      className="no-select"
                      style={{
                        fontFamily: 'var(--font-inter)',
                        fontSize: 'clamp(56px, 9vw, 130px)',
                        fontWeight: 700,
                        letterSpacing: '-0.04em',
                        lineHeight: 0.95,
                        color: 'rgba(255,255,255,0.95)',
                      }}
                    >
                      Perception<br />
                      <span
                        style={{
                          background: 'linear-gradient(135deg, #0050FF, #00D6FF)',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          backgroundClip: 'text',
                        }}
                      >
                        Reimagined
                      </span>
                    </motion.h2>
                  )}

                  {activeBeat === 2 && (
                    <>
                      <motion.h2
                        className="no-select"
                        style={{
                          fontFamily: 'var(--font-inter)',
                          fontSize: 'clamp(40px, 6vw, 96px)',
                          fontWeight: 600,
                          letterSpacing: '-0.03em',
                          lineHeight: 1.1,
                          color: 'rgba(255,255,255,0.9)',
                        }}
                      >
                        The future of vision.
                      </motion.h2>
                      <motion.div
                        className="mt-10 pointer-events-auto"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4, duration: 0.6 }}
                      >
                        <button className="btn-primary">
                          Enter Trinetra
                        </button>
                      </motion.div>
                    </>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          )}
        </AnimatePresence>

        {/* Scroll indicator at beat 0 */}
        <AnimatePresence>
          {isLoaded && activeBeat === 0 && (
            <motion.div
              className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none z-20"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 1, duration: 0.6 }}
            >
              <span
                style={{
                  fontSize: '10px',
                  letterSpacing: '0.3em',
                  textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.3)',
                  fontFamily: 'var(--font-inter)',
                }}
              >
                Scroll
              </span>
              <motion.div
                style={{
                  width: '1px',
                  height: '40px',
                  background: 'linear-gradient(to bottom, rgba(0,214,255,0.6), transparent)',
                }}
                animate={{ scaleY: [0, 1, 0] }}
                transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
