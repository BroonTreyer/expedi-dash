interface Props {
  data: { dia: string; km: number }[];
  width?: number;
  height?: number;
}

export function MotoristaSparkline({ data, width = 80, height = 24 }: Props) {
  if (!data.length) return <span className="text-xs text-muted-foreground">—</span>;
  const vals = data.map((d) => d.km);
  const max = Math.max(...vals, 1);
  const min = Math.min(...vals, 0);
  const range = max - min || 1;
  const step = data.length > 1 ? width / (data.length - 1) : width;
  const pts = data
    .map((d, i) => {
      const x = i * step;
      const y = height - ((d.km - min) / range) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth="1.5"
        points={pts}
      />
    </svg>
  );
}
