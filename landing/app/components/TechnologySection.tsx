'use client';

import { motion } from 'framer-motion';

const capabilities = [
  {
    number: '01',
    title: 'Weapon Detection',
    description:
      'AI-powered detection of firearms, sharp objects, and dangerous items in real-time. Advanced pattern recognition identifies potential threats instantly.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
  },
  {
    number: '02',
    title: 'Crowd Analytics',
    description:
      'Real-time crowd monitoring, density estimation, and anomaly detection. Track movements, identify unusual behaviors, and manage public spaces intelligently.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
  },
  {
    number: '03',
    title: 'Multi-Modal Fusion',
    description:
      'Integrate visible light, thermal imaging, and depth sensors. Unified platform processes all sensor data seamlessly for comprehensive situational awareness.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
      </svg>
    ),
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.25, 0.1, 0.25, 1] as const },
  },
};

export default function TechnologySection() {
  return (
    <section
      id="technology"
      style={{
        background: '#050505',
        padding: 'clamp(80px, 12vw, 160px) clamp(24px, 6vw, 80px)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background grid */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(rgba(0,80,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,80,255,0.04) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
          pointerEvents: 'none',
        }}
      />

      <div style={{ maxWidth: '1200px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
        {/* Section label */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '80px',
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
            Capabilities
          </span>
        </motion.div>

        {/* Heading */}
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
          style={{
            fontFamily: 'var(--font-inter)',
            fontSize: 'clamp(32px, 5vw, 72px)',
            fontWeight: 700,
            letterSpacing: '-0.03em',
            lineHeight: 1.1,
            color: '#fff',
            marginBottom: '80px',
            maxWidth: '600px',
          }}
        >
          Built for a world that never stops moving.
        </motion.h2>

        {/* Cards grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1px',
            background: 'rgba(255,255,255,0.05)',
          }}
        >
          {capabilities.map((cap) => (
            <CapabilityCard key={cap.number} cap={cap} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function CapabilityCard({ cap }: { cap: (typeof capabilities)[number] }) {
  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ backgroundColor: '#0A0A0C' }}
      transition={{ duration: 0.2 }}
      style={{
        background: '#050505',
        padding: 'clamp(32px, 4vw, 56px)',
        position: 'relative',
        cursor: 'default',
      }}
    >
      {/* Hover glow */}
      <motion.div
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at top left, rgba(0,80,255,0.1), transparent 60%)',
          pointerEvents: 'none',
        }}
      />

      {/* Number */}
      <div
        style={{
          fontSize: '11px',
          fontWeight: 500,
          letterSpacing: '0.2em',
          color: 'rgba(0,214,255,0.4)',
          fontFamily: 'var(--font-inter)',
          marginBottom: '32px',
        }}
      >
        {cap.number}
      </div>

      {/* Icon */}
      <div style={{ color: 'rgba(0,214,255,0.6)', marginBottom: '24px', width: '24px', height: '24px' }}>
        {cap.icon}
      </div>

      {/* Title */}
      <h3
        style={{
          fontFamily: 'var(--font-inter)',
          fontSize: '20px',
          fontWeight: 600,
          letterSpacing: '-0.01em',
          color: '#fff',
          marginBottom: '16px',
        }}
      >
        {cap.title}
      </h3>

      {/* Description */}
      <p
        style={{
          fontFamily: 'var(--font-inter)',
          fontSize: '14px',
          fontWeight: 300,
          lineHeight: 1.8,
          color: 'rgba(255,255,255,0.45)',
        }}
      >
        {cap.description}
      </p>

      {/* Bottom accent line */}
      <motion.div
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(0,80,255,0.5), transparent)',
        }}
      />
    </motion.div>
  );
}
