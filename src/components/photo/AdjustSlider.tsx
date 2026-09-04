type Props = {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (v: number) => void;
  onReset?: () => void;
};

export function AdjustSlider({
  label,
  value,
  min,
  max,
  step = 1,
  suffix = "",
  onChange,
  onReset,
}: Props) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="group py-2">
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <button
          type="button"
          onDoubleClick={onReset}
          className="font-medium tracking-wide text-muted-foreground transition-colors group-hover:text-foreground"
          title="Double-click to reset"
        >
          {label}
        </button>
        <span className="tabular-nums font-semibold text-foreground">
          {Number.isInteger(value) ? value : value.toFixed(1)}
          {suffix}
        </span>
      </div>
      <div className="relative flex h-4 items-center">
        <div className="absolute h-1 w-full rounded-full bg-muted" />
        <div
          className="absolute h-1 rounded-full bg-primary"
          style={{
            left: min < 0 ? `${Math.min(50, pct)}%` : 0,
            width: min < 0 ? `${Math.abs(pct - 50)}%` : `${pct}%`,
          }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          onDoubleClick={onReset}
          className="relative z-10 h-4 w-full cursor-pointer appearance-none bg-transparent [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:shadow-md [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-foreground"
        />
      </div>
    </div>
  );
}
