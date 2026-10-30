import { cn } from '../../lib/utils';
import type { ReactNode } from 'react';

interface LogoProps {
  url?: string;
  children?: ReactNode;
  className?: string;
}

const Logo = ({ url, children, className }: LogoProps) => (
  <a href={url} className={cn('flex items-center gap-2', className)}>
    {children}
  </a>
);

interface LogoImageProps {
  src: string;
  alt?: string;
  title?: string;
  className?: string;
}

const LogoImage = ({ src, alt, title, className }: LogoImageProps) => (
  <img src={src} alt={alt} title={title} className={cn('h-8 w-auto', className)} />
);

interface LogoTextProps {
  children?: ReactNode;
  className?: string;
}

const LogoText = ({ children, className }: LogoTextProps) => (
  <span className={cn('font-bold', className)}>{children}</span>
);

export { Logo, LogoImage, LogoText };
