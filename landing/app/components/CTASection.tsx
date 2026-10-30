'use client';

import { motion } from 'framer-motion';

export default function CTASection() {
  return (
    <section
      id="about"
      style={{
        background: '#050505',
        padding: 'clamp(100px, 14vw, 200px) clamp(24px, 6vw, 80px)',
        position: 'relative',
        overflow: 'hidden',
        borderTop: '1px solid rgba(255,255,255,0.04)',
      }}
    >
      {/* Radial glow background */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '900px',
          height: '600px',
          background:
            'radial-gradient(ellipse at center, rgba(0,80,255,0.12) 0%, rgba(0,214,255,0.04) 40%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          maxWidth: '800px',
          margin: '0 auto',
          position: 'relative',
          zIndex: 1,
          textAlign: 'center',
        }}
      >
        {/* Label */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          style={{ marginBottom: '40px' }}
        >
          <span
            style={{
              fontSize: '11px',
              fontWeight: 500,
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
              color: 'rgba(0,214,255,0.6)',
              fontFamily: 'var(--font-inter)',
            }}
          >
            Smart Surveillance Awaits
          </span>
        </motion.div>

        {/* Heading */}
        <motion.h2
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: [0.25, 0.1, 0.25, 1] }}
          style={{
            fontFamily: 'var(--font-inter)',
            fontSize: 'clamp(36px, 6vw, 88px)',
            fontWeight: 700,
            letterSpacing: '-0.04em',
            lineHeight: 1.05,
            color: '#fff',
            marginBottom: '32px',
          }}
        >
          Are you ready to{' '}
          <span
            style={{
              background: 'linear-gradient(135deg, #0050FF, #00D6FF)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            secure
          </span>{' '}
          everything?
        </motion.h2>

        {/* Subtext */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          style={{
            fontFamily: 'var(--font-inter)',
            fontSize: 'clamp(14px, 1.5vw, 17px)',
            fontWeight: 300,
            lineHeight: 1.8,
            color: 'rgba(255,255,255,0.4)',
            marginBottom: '56px',
            maxWidth: '560px',
            margin: '0 auto 56px',
          }}
        >
          Trinetra is exclusively available for partners and early adopters. Request access to join the future of perception.
        </motion.p>

        {/* CTA buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.4 }}
          style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}
        >
          <motion.button
            className="btn-primary"
            style={{
              fontFamily: 'var(--font-inter)',
              background: 'linear-gradient(135deg, rgba(0,80,255,0.2), rgba(0,214,255,0.1))',
              borderColor: 'rgba(0,214,255,0.5)',
            }}
            whileHover={{ scale: 1.03, boxShadow: '0 0 40px rgba(0,214,255,0.2)' }}
            whileTap={{ scale: 0.98 }}
          >
            Request Access
          </motion.button>
          <motion.button
            className="btn-primary"
            style={{ fontFamily: 'var(--font-inter)' }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
          >
            Learn More
          </motion.button>
        </motion.div>

        {/* Footer line */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay: 0.8 }}
          style={{ marginTop: '120px' }}
        >
          <div
            style={{
              height: '1px',
              background: 'rgba(255,255,255,0.06)',
              marginBottom: '32px',
            }}
          />
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '16px',
            }}
          >
            <span
              style={{
                fontSize: '12px',
                fontWeight: 600,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.3)',
                fontFamily: 'var(--font-inter)',
              }}
            >
              TRINETRA
            </span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 300,
                color: 'rgba(255,255,255,0.2)',
                fontFamily: 'var(--font-inter)',
              }}
            >
              © 2026 Trinetra. All rights reserved.
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
