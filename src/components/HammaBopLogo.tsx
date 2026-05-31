type Props = {
  className?: string;
  size?: number;
  dark?: boolean;
};

export function HammaBopLogo({ className = "", size = 36, dark = false }: Props) {
  const id = `hb-grad-${size}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F4853A" />
          <stop offset="100%" stopColor="#C85A10" />
        </linearGradient>
      </defs>
      {/* Left leg of H */}
      <path
        d="M7 6 C7 6 7 8 8.5 9.5 L11 12 L11 24 C11 26 9 27.5 7.5 29 L7.5 30 L13 30 L13 18.5 L23 18.5 L23 30 L28.5 30 L28.5 29 C27 27.5 25 26 25 24 L25 12 L27.5 9.5 C29 8 29 6 29 6 L23 6 C23 6 23 8 21.5 9.5 L19 12 L17 12 L14.5 9.5 C13 8 13 6 13 6 Z"
        fill={`url(#${id})`}
      />
    </svg>
  );
}

export function HammaBopWordmark({ className = "", textSize = "text-xl" }: { className?: string; textSize?: string }) {
  return (
    <span className={`font-extrabold tracking-tight ${textSize} ${className}`}>
      <span className="text-[#EE7526]">Hamma</span>
      <span className="text-neutral-900">Bop</span>
    </span>
  );
}

export function HammaBopWordmarkWhite({ className = "", textSize = "text-xl" }: { className?: string; textSize?: string }) {
  return (
    <span className={`font-extrabold tracking-tight ${textSize} ${className}`}>
      <span className="text-[#EE7526]">Hamma</span>
      <span className="text-white">Bop</span>
    </span>
  );
}
