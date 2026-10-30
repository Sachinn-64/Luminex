import GooeyNav from './components/GooeyNav';
import HeroCanvas from './components/HeroCanvas';
import VisionSection from './components/VisionSection';
import TechnologySection from './components/TechnologySection';
import CTASection from './components/CTASection';
import { Footer2 } from './components/Footer2';
import LanguageSwitcher from './components/LanguageSwitcher';
import VoiceNavigator from './components/VoiceNavigator';

const navItems = [
  { label: 'Home', href: 'http://localhost:3000/' },
  { label: 'Dashboard', href: 'http://localhost:5173/dashboard' },
  { label: 'About', href: '#about' },
];

export default function Home() {
  return (
    <main style={{ background: '#050505', minHeight: '100vh' }}>
      <style>{`
        .signin-btn {
          color: #fff;
          text-decoration: none;
          font-size: 0.85rem;
          font-weight: 500;
          padding: 0.5rem 0.75rem;
          border-radius: 0.375rem;
          border: 1px solid rgba(255, 255, 255, 0.2);
          transition: all 0.3s ease;
          cursor: pointer;
          display: inline-block;
        }
        .signin-btn:hover {
          background-color: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.4);
        }
      `}</style>
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, display: 'flex', alignItems: 'center', paddingTop: '1rem', paddingLeft: '1.5rem', paddingRight: '1.5rem' }}>
        <a href="#" className="notranslate" style={{ color: '#fff', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' as const, whiteSpace: 'nowrap' as const, width: '100px' }}>TRINETRA</a>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <GooeyNav
            items={navItems}
            particleCount={15}
            particleDistances={[90, 10]}
            particleR={100}
            initialActiveIndex={0}
            animationTime={600}
            timeVariance={300}
            colors={[1, 2, 3, 1, 2, 3, 1, 4]}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '260px', justifyContent: 'flex-end' }}>
          <LanguageSwitcher />
          <a 
            href="http://localhost:5173/#/login"
            className="signin-btn"
          >
            Sign In
          </a>
        </div>
      </div>
      <HeroCanvas />
      <VisionSection />
      <TechnologySection />
      <CTASection />
      <Footer2 />
      <VoiceNavigator />
    </main>
  );
}
