'use client';

import { cn } from '../lib/utils';
import Silk from './Silk';
import { Logo, LogoImage, LogoText } from './shadcnblocks/logo';

interface MenuItem {
  title: string;
  links: {
    text: string;
    url: string;
  }[];
}

interface Footer2Props {
  logo?: {
    url: string;
    src: string;
    alt: string;
    title: string;
  };
  className?: string;
  tagline?: string;
  menuItems?: MenuItem[];
  copyright?: string;
  bottomLinks?: {
    text: string;
    url: string;
  }[];
}

const Footer2 = ({
  logo = {
    src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/block-1.svg",
    alt: "Trinetra",
    title: "Trinetra",
    url: "/",
  },
  className,
  tagline = "See beyond the visible.",
  menuItems = [
    {
      title: "Product",
      links: [
        { text: "Overview", url: "#" },
        { text: "Pricing", url: "#" },
        { text: "Marketplace", url: "#" },
        { text: "Features", url: "#" },
        { text: "Integrations", url: "#" },
      ],
    },
    {
      title: "Company",
      links: [
        { text: "About", url: "#" },
        { text: "Team", url: "#" },
        { text: "Blog", url: "#" },
        { text: "Careers", url: "#" },
        { text: "Contact", url: "#" },
      ],
    },
    {
      title: "Resources",
      links: [
        { text: "Help", url: "#" },
        { text: "Sales", url: "#" },
        { text: "Advertise", url: "#" },
      ],
    },
    {
      title: "Social",
      links: [
        { text: "Twitter", url: "#" },
        { text: "Instagram", url: "#" },
        { text: "LinkedIn", url: "#" },
      ],
    },
  ],
  copyright = "© 2026 Trinetra. All rights reserved.",
  bottomLinks = [
    { text: "Terms and Conditions", url: "#" },
    { text: "Privacy Policy", url: "#" },
  ],
}: Footer2Props) => {
  return (
    <section className={cn("relative overflow-hidden", className)} style={{ minHeight: '500px' }}>
      {/* Silk background */}
      <div style={{ position: "absolute", inset: 0, zIndex: 0, width: '100%', height: '100%' }}>
        <Silk
          speed={5}
          scale={1}
          color="#7B7481"
          noiseIntensity={1.5}
          rotation={0}
        />
      </div>

      {/* Footer content */}
      <div className="relative" style={{ zIndex: 10, paddingTop: '8rem', paddingBottom: '4rem' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1.5rem' }}>
          <footer>
            <div className="grid grid-cols-2 gap-8 lg:grid-cols-6">
              <div className="col-span-2 mb-8 lg:mb-0">
                <div className="flex items-center gap-2 lg:justify-start">
                  <Logo url={logo.url}>
                    <LogoImage
                      src={logo.src}
                      alt={logo.alt}
                      title={logo.title}
                      className="h-10 dark:invert"
                    />
                    <LogoText className="text-xl">{logo.title}</LogoText>
                  </Logo>
                </div>
                <p className="mt-4 font-bold text-white">{tagline}</p>
              </div>
              {menuItems.map((section, sectionIdx) => (
                <div key={sectionIdx}>
                  <h3 className="mb-4 font-bold text-white">{section.title}</h3>
                  <ul className="space-y-4 text-white/60">
                    {section.links.map((link, linkIdx) => (
                      <li
                        key={linkIdx}
                        className="font-medium hover:text-white transition-colors"
                      >
                        <a href={link.url}>{link.text}</a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="mt-24 flex flex-col justify-between gap-4 border-t border-white/20 pt-8 text-sm font-medium text-white/60 md:flex-row md:items-center">
              <p>{copyright}</p>
              <ul className="flex gap-4">
                {bottomLinks.map((link, linkIdx) => (
                  <li key={linkIdx} className="underline hover:text-white transition-colors">
                    <a href={link.url}>{link.text}</a>
                  </li>
                ))}
              </ul>
            </div>
          </footer>
        </div>
      </div>
    </section>
  );
};

export { Footer2 };
