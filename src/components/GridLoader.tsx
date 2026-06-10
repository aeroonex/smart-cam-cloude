type Props = {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  label?: string;
};

const CUBE_SIZES = {
  sm: 16,
  md: 22,
  lg: 30,
  xl: 38,
};

const GAPS = {
  sm: 6,
  md: 8,
  lg: 10,
  xl: 13,
};

export function GridLoader({ size = "md", className = "", label }: Props) {
  const cubeSize = CUBE_SIZES[size];
  const gap = GAPS[size];

  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <div
        className="grid-loader"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap,
        }}
      >
        {Array.from({ length: 9 }).map((_, i) => (
          <div
            key={i}
            className="cube"
            style={{
              width: cubeSize,
              height: cubeSize,
              animationDelay: `${(i + 1) * 0.2}s`,
            }}
          />
        ))}
      </div>
      {label && (
        <span className="text-sm text-neutral-400 animate-pulse">{label}</span>
      )}
    </div>
  );
}
