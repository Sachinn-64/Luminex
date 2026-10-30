'use client';

import { motion } from 'framer-motion';

export default function VisionSection() {
  return (
    <section
      id="vision"
      style={{
        background: '#050505',
        padding: 'clamp(100px, 14vw, 200px) clamp(24px, 6vw, 80px)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Subtle radial glow */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '800px',
          height: '800px',
          borderRadius: '50%',
          background:
            'radial-gradient(ellipse at center, rgba(0,80,255,0.07) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Label */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '64px',
          }}
        >
          <div className="glow-line" style={{ flex: 1, maxWidth: '60px' }} />
          <span
            style={{
              fontSize: '11px',
              fontWeight: 500,
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
              color: 'rgba(0,214,255,0.7)',
              fontFamily: 'var(--font-inter)',
            }}
          >
            Our Vision
          </span>
        </motion.div>

        {/* Main statement */}
        <motion.h2
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: [0.25, 0.1, 0.25, 1] }}
          style={{
            fontFamily: 'var(--font-inter)',
            fontSize: 'clamp(28px, 4.5vw, 68px)',
            fontWeight: 700,
            letterSpacing: '-0.03em',
            lineHeight: 1.1,
            color: '#fff',
            maxWidth: '900px',
            marginBottom: '48px',
          }}
        >
          Trinetra enables intelligent surveillance with real-time threat detection, weapon recognition, and crowd analytics for{' '}
          <span
            style={{
              background: 'linear-gradient(135deg, #0050FF, #00D6FF)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            smarter security.
          </span>
        </motion.h2>

        {/* Divider */}
        <motion.div
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, ease: [0.25, 0.1, 0.25, 1], delay: 0.2 }}
          style={{
            height: '1px',
            background: 'linear-gradient(90deg, rgba(0,80,255,0.4), rgba(0,214,255,0.2), transparent)',
            marginBottom: '48px',
            transformOrigin: 'left',
            maxWidth: '600px',
          }}
        />

        {/* Body copy */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.3 }}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '48px',
            maxWidth: '900px',
          }}
        >
          <p
            style={{
              fontFamily: 'var(--font-inter)',
              fontSize: 'clamp(14px, 1.5vw, 17px)',
              fontWeight: 300,
              lineHeight: 1.9,
              color: 'rgba(255,255,255,0.45)',
            }}
          >
            In a world saturated with images and signals, true intelligence lies not in what you see — but in how you see. Trinetra was built to give machines the gift of genuine perception.
          </p>
          <p
            style={{
              fontFamily: 'var(--font-inter)',
              fontSize: 'clamp(14px, 1.5vw, 17px)',
              fontWeight: 300,
              lineHeight: 1.9,
              color: 'rgba(255,255,255,0.45)',
            }}
          >
            Our systems don't just process pixels — they understand context, read intent, and anticipate what lies beyond the frame. Welcome to the third eye.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
