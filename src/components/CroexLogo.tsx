import React from 'react';

interface CroexLogoProps {
  className?: string;
  size?: number | string;
  showText?: boolean;
}

export const CroexLogo: React.FC<CroexLogoProps> = ({
  className = '',
  size = 44,
  showText = false,
}) => {
  const pixelSize = typeof size === 'number' ? `${size}px` : size;

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {/* Official Uploaded 3D Golden & Black Croex Ballot Logo - HD Print */}
      <img
        src="/croex-logo-hd.png"
        alt="Croex Voting Center"
        style={{ width: pixelSize, height: pixelSize }}
        className="rounded-2xl object-contain shadow-sm shrink-0 transition-transform duration-200 hover:scale-105"
      />

      {/* Brand Text Lockup */}
      {showText && (
        <div className="flex flex-col justify-center">
          <div className="flex items-center text-xl sm:text-2xl font-black tracking-tight leading-none text-slate-900">
            <span>CROE</span>
            <span className="bg-gradient-to-br from-amber-400 via-amber-500 to-amber-700 bg-clip-text text-transparent">
              X
            </span>
          </div>
          <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-[0.25em] text-slate-800 mt-1">
            VOTING CENTER
          </span>
        </div>
      )}
    </div>
  );
};

