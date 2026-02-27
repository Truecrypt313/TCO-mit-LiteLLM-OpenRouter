import type { ImgHTMLAttributes } from 'react';
import logoUrl from '@/assets/brand/openlunaris-logo.png';
import markUrl from '@/assets/brand/openlunaris-mark.png';

type LogoVariant = 'mark' | 'full';
type LogoSize = 'sm' | 'md';

type LogoProps = {
  variant?: LogoVariant;
  size?: LogoSize;
} & Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt'>;

const sizeByVariant: Record<LogoVariant, Record<LogoSize, number>> = {
  full: {
    sm: 28,
    md: 34
  },
  mark: {
    sm: 28,
    md: 34
  }
};

export function Logo({ variant = 'mark', size = 'md', className = '', ...imgProps }: LogoProps) {
  const src = variant === 'mark' ? markUrl : logoUrl;
  const height = sizeByVariant[variant][size];

  return (
    <img
      src={src}
      alt="openLunaris logo"
      height={height}
      className={`object-contain shrink-0 w-auto ${className}`.trim()}
      {...imgProps}
    />
  );
}

export default Logo;
