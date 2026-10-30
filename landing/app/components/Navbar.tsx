'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const navLinks = ['Vision', 'Technology', 'About'];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <motion.nav
      className="fixed top-0 left-0 right-0 z-50"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
      style={{
        transition: 'background 0.4s ease, backdrop-filter 0.4s ease, border-color 0.4s ease',
        background: scrolled
          ? 'rgba(5, 5, 5, 0.75)'
          : 'transparent',
        backdropFilter: scrolled ? 'blur(20px) saturate(180%)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(20px) saturate(180%)' : 'none',
        borderBottom: scrolled
          ? '1px solid rgba(255, 255, 255, 0.06)'
          : '1px solid transparent',
      }}
    >
      <div
        className="flex items-center justify-between"
        style={{ padding: '20px 40px', maxWidth: '1400px', margin: '0 auto' }}
      >
        {/* Wordmark */}
        <motion.a
          href="#"
          className="no-select"
          style={{
            fontFamily: 'var(--font-inter)',
            fontSize: '15px',
            fontWeight: 600,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: '#ffffff',
            textDecoration: 'none',
            position: 'relative',
          }}
          whileHover={{ opacity: 0.75 }}
          transition={{ duration: 0.2 }}
        >
          TRINETRA
          <span
            style={{
              position: 'absolute',
              bottom: '-2px',
              left: 0,
              right: 0,
              height: '1px',
              background: 'linear-gradient(90deg, #0050FF, #00D6FF)',
              opacity: 0.6,
            }}
          />
        </motion.a>

        {/* Center nav links */}
        <div
          className="hidden md:flex items-center gap-10"
          style={{ fontFamily: 'var(--font-inter)' }}
        >
          {navLinks.map((link) => (
            <motion.a
              key={link}
              href={`#${link.toLowerCase()}`}
              className="no-select"
              style={{
                fontSize: '13px',
                fontWeight: 400,
                letterSpacing: '0.06em',
                color: 'rgba(255, 255, 255, 0.55)',
                textDecoration: 'none',
              }}
              whileHover={{ color: '#ffffff' }}
              transition={{ duration: 0.2 }}
            >
              {link}
            </motion.a>
          ))}
        </div>

        {/* Enter button */}
        <motion.button
          className="btn-enter hidden md:flex"
          style={{ fontFamily: 'var(--font-inter)' }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Enter
        </motion.button>
      </div>
    </motion.nav>
  );
}
