"use client";

import { useMemo } from "react";

interface DataPoint {
  label: string;
  values: Record<string, number>;
}

interface StackedBarChartProps {
  data: DataPoint[];
  keys: string[];
  colors: Record<string, string>;
  height?: number;
  showLabels?: boolean;
  formatValue?: (value: number) => string;
  formatLabel?: (label: string) => string;
}

export function StackedBarChart({
  data,
  keys,
  colors,
  height = 300,
  showLabels = true,
  formatValue = (v) => `€${v.toFixed(2)}`,
  formatLabel = (l) => l,
}: StackedBarChartProps) {
  const { maxValue, barData } = useMemo(() => {
    let max = 0;
    const processed = data.map((d) => {
      const total = keys.reduce((sum, key) => sum + (d.values[key] || 0), 0);
      if (total > max) max = total;
      return { ...d, total };
    });
    return { maxValue: max || 1, barData: processed };
  }, [data, keys]);

  const padding = { top: 20, right: 20, bottom: 40, left: 60 };
  const chartWidth = 800;
  const chartHeight = height;
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  const barWidth = Math.max(
    20,
    Math.min(60, (innerWidth / barData.length) * 0.7)
  );
  const barGap = (innerWidth - barWidth * barData.length) / (barData.length + 1);

  // Y-axis ticks
  const yTicks = useMemo(() => {
    const tickCount = 5;
    const step = maxValue / tickCount;
    return Array.from({ length: tickCount + 1 }, (_, i) => i * step);
  }, [maxValue]);

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        className="w-full min-w-[400px]"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Y-axis grid lines and labels */}
        {yTicks.map((tick, i) => {
          const y = padding.top + innerHeight - (tick / maxValue) * innerHeight;
          return (
            <g key={i}>
              <line
                x1={padding.left}
                y1={y}
                x2={chartWidth - padding.right}
                y2={y}
                stroke="currentColor"
                strokeOpacity={0.1}
              />
              <text
                x={padding.left - 10}
                y={y}
                textAnchor="end"
                dominantBaseline="middle"
                className="fill-current text-xs opacity-60"
              >
                {formatValue(tick)}
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {barData.map((d, barIndex) => {
          const x = padding.left + barGap + barIndex * (barWidth + barGap);
          let cumulativeHeight = 0;

          return (
            <g key={barIndex}>
              {keys.map((key) => {
                const value = d.values[key] || 0;
                const barHeight = (value / maxValue) * innerHeight;
                const y =
                  padding.top +
                  innerHeight -
                  cumulativeHeight -
                  barHeight;
                cumulativeHeight += barHeight;

                return (
                  <rect
                    key={key}
                    x={x}
                    y={y}
                    width={barWidth}
                    height={barHeight}
                    fill={colors[key]}
                    className="transition-opacity hover:opacity-80"
                  >
                    <title>
                      {key}: {formatValue(value)}
                    </title>
                  </rect>
                );
              })}

              {/* X-axis label */}
              {showLabels && (
                <text
                  x={x + barWidth / 2}
                  y={chartHeight - padding.bottom + 20}
                  textAnchor="middle"
                  className="fill-current text-xs opacity-60"
                >
                  {formatLabel(d.label)}
                </text>
              )}
            </g>
          );
        })}

        {/* X-axis line */}
        <line
          x1={padding.left}
          y1={chartHeight - padding.bottom}
          x2={chartWidth - padding.right}
          y2={chartHeight - padding.bottom}
          stroke="currentColor"
          strokeOpacity={0.2}
        />
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-4 mt-4">
        {keys.map((key) => (
          <div key={key} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded"
              style={{ backgroundColor: colors[key] }}
            />
            <span className="text-sm opacity-70">{key}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
