import React from "react";

interface BarChartProps {
  data: { label: string; value: number }[];
  height?: number;
  barColor?: string;
  valuePrefix?: string;
}

export const BarChart: React.FC<BarChartProps> = ({
  data,
  height = 200,
  barColor = "#10B981",
  valuePrefix = "",
}) => {
  if (!data || data.length === 0) {
    return <div className="text-sm text-slate-500 text-center py-8">No data available</div>;
  }

  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="w-full">
      <div className="flex items-end gap-2 w-full pt-4 pb-2" style={{ height: `${height}px` }}>
        {data.map((item, index) => {
          const heightPercent = Math.max(8, Math.round((item.value / maxValue) * 100));
          return (
            <div key={index} className="flex-1 flex flex-col items-center h-full justify-end group relative">
              {/* Tooltip */}
              <div className="absolute -top-8 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-xs px-2 py-1 rounded border border-slate-700 pointer-events-none whitespace-nowrap z-20 shadow-lg">
                {item.label}: {valuePrefix}{item.value.toLocaleString()}
              </div>

              {/* Bar */}
              <div
                style={{
                  height: `${heightPercent}%`,
                  backgroundColor: barColor,
                }}
                className="w-full rounded-t-md transition-all duration-300 group-hover:brightness-125 group-hover:shadow-[0_0_12px_rgba(16,185,129,0.4)]"
              />
            </div>
          );
        })}
      </div>
      {/* Labels */}
      <div className="flex justify-between text-xs text-slate-400 border-t border-slate-800 pt-2 px-1">
        {data.map((item, index) => (
          <span key={index} className="truncate text-center" style={{ width: `${100 / data.length}%` }}>
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
};
