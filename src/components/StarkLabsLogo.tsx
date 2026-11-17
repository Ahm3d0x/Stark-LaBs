import React from 'react';

interface StarkLabsLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'hero';
  showTagline?: boolean;
  className?: string;
}

export const StarkLabsLogo: React.FC<StarkLabsLogoProps> = ({
  size = 'md',
  showTagline = false,
  className = '',
}) => {
  const svgSize =
    size === 'hero'
      ? 'w-12 h-12 sm:w-16 sm:h-16'
      : size === 'lg'
      ? 'w-9 h-9 sm:w-10 sm:h-10'
      : size === 'sm'
      ? 'w-6 h-6'
      : 'w-8 h-8 sm:w-9 sm:h-9';

  const textSize =
    size === 'hero'
      ? 'text-4xl sm:text-6xl'
      : size === 'lg'
      ? 'text-2xl sm:text-3xl'
      : size === 'sm'
      ? 'text-base sm:text-lg'
      : 'text-xl sm:text-2xl';

  return (
    <div
      dir="ltr"
      className={`inline-flex items-center gap-2.5 sm:gap-3 select-none ${className}`}
    >
      {/* Freestanding Precision 3D Isometric S-Cube & Extruder Vector Mark (No Box Clutter) */}
      <svg
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${svgSize} shrink-0 drop-shadow-[0_0_12px_rgba(245,158,11,0.28)]`}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="slTopGold" x1="12" y1="6" x2="52" y2="30" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FEF08A" />
            <stop offset="50%" stopColor="#FBBF24" />
            <stop offset="100%" stopColor="#F59E0B" />
          </linearGradient>
          <linearGradient id="slRightAmber" x1="32" y1="18" x2="56" y2="56" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#B45309" />
          </linearGradient>
          <linearGradient id="slLeftSteel" x1="8" y1="18" x2="32" y2="56" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#E4E4E7" />
            <stop offset="100%" stopColor="#71717A" />
          </linearGradient>
        </defs>

        {/* Outer Precision Isometric Hexagon Frame */}
        <path
          d="M32 4L56 17.8V46.2L32 60L8 46.2V17.8L32 4Z"
          stroke="url(#slTopGold)"
          strokeWidth="2.2"
          strokeOpacity="0.45"
          fill="#09090B"
          fillOpacity="0.65"
        />

        {/* Top 3D Isometric S-Ribbon Facet (Glowing Gold) */}
        <path
          d="M32 10L50 20.4L41 25.6L32 20.4L23 25.6L32 30.8L50 20.4"
          fill="url(#slTopGold)"
        />
        <path
          d="M32 10L50 20.4L32 30.8L14 20.4L32 10Z"
          fill="url(#slTopGold)"
        />

        {/* Inner Cutout Creating 3D Layered Depth */}
        <path
          d="M32 15.5L42.5 21.5L32 27.5L21.5 21.5L32 15.5Z"
          fill="#09090B"
        />
        <path
          d="M32 18.5L37.5 21.6L32 24.8L26.5 21.6L32 18.5Z"
          fill="#FBBF24"
        />

        {/* Left Isometric 3D Facet (Brushed Titanium White/Silver with Layered 3D Print Lines) */}
        <path
          d="M14 20.4L32 30.8V51.6L14 41.2V20.4Z"
          fill="url(#slLeftSteel)"
        />
        <path
          d="M18 27.5L28 33.3M18 33L28 38.8M18 38.5L28 44.3"
          stroke="#09090B"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* Right Isometric 3D Facet (Sculpted Amber Gold with Precision Extruder Slit) */}
        <path
          d="M50 20.4L32 30.8V51.6L50 41.2V20.4Z"
          fill="url(#slRightAmber)"
        />
        <path
          d="M46 27.5L36 33.3M46 33L36 38.8M46 38.5L36 44.3"
          stroke="#09090B"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* Bottom Precision Nozzle Tip Accent */}
        <path
          d="M28 53.5L32 57.5L36 53.5H28Z"
          fill="#FBBF24"
        />
      </svg>

      {/* Sculpted Industrial Brand Wordmark (LTR for "StarkLaBs" alignment) */}
      <div className="flex flex-col items-start min-w-0">
        <div className="flex items-baseline tracking-tight leading-none whitespace-nowrap font-display">
          <span className={`${textSize} font-black text-zinc-100`}>Stark</span>
          <span
            className={`${textSize} font-black bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 bg-clip-text text-transparent`}
          >
            LaBs
          </span>
          <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-amber-400 ml-1 self-end mb-1.5 shadow-[0_0_8px_#f59e0b]" />
        </div>
        {showTagline && (
          <span
            dir="rtl"
            className="text-[10px] sm:text-xs font-bold text-amber-400/90 mt-1 whitespace-nowrap"
          >
            معمل الطباعة ثلاثية الأبعاد
          </span>
        )}
      </div>
    </div>
  );
};
