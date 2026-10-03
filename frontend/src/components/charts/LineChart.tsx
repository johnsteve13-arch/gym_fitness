import React from "react";

interface LineChartProps {
  data: { label: string; value: number }[];
  height?: number;
  lineColor?: string;
  valuePrefix?: string;
}

export const LineChart: React.FC<LineChartProps> = ({
  data,
  height = 200,
  lineColor = "#10B981",
  valuePrefix = "$",
}) => {
  if (!data || data.length < 2) {
    return <div className="text-sm text-slate-500 text-center py-8">Insufficient data points</div>;
  }

  const values = data.map((d) => d.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values, minVal + 1);

  const points = data.map((item, idx) => {
    const x = (idx / (data.length - 1)) * 100;
    const y = 100 - ((item.value - minVal) / (maxVal - minVal || 1)) * 80 - 10;
    return `${x},${y}`;
  });

  const pathString = `M ${points.join(" L ")}`;
  const areaString = `M 0,100 L ${points.join(" L ")} L 100,100 Z`;

  return (
    <div className="w-full">
      <div className="relative w-full" style={{ height: `${height}px` }}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={lineColor} stopOpacity="0.35" />
              <stop offset="100%" stopColor={lineColor} stopOpacity="0.0" />
            </linearGradient>
          </defs>
          <path d={areaString} fill="url(#chartGradient)" />
          <path
            d={pathString}
            fill="none"
            stroke={lineColor}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>
      {/* Labels */}
      <div className="flex justify-between text-xs text-slate-400 border-t border-slate-800 pt-2">
        {data.map((item, idx) => (
          <div key={idx} className="flex flex-col items-center">
            <span className="text-[11px] text-slate-300 font-semibold">
              {valuePrefix}{item.value.toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-500">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
