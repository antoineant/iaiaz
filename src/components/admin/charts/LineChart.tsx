"use client";

import { useMemo } from "react";

interface DataPoint {
  label: string;
  values: Record<string, number>;
}

interface LineChartProps {
  data: DataPoint[];
  keys: string[];
  colors: Record<string, string>;
  height?: number;
  showLabels?: boolean;
  formatValue?: (value: number) => string;
  formatLabel?: (label: string) => string;
  showDots?: boolean;
}

export function LineChart({
  data,
  keys,
  colors,
  height = 300,
  showLabels = true,
  formatValue = (v) => `€${v.toFixed(2)}`,
  formatLabel = (l) => l,
  showDots = true,
}: LineChartProps) {
  const { maxValue, minValue } = useMemo(() => {
    let max = 0;
    let min = 0;
    data.forEach((d) => {
      keys.forEach((key) => {
        const val = d.values[key] || 0;
        if (val > max) max = val;
        if (val < min) min = val;
      });
    });
    // Add some padding to max
    return { maxValue: max * 1.1 || 1, minValue: Math.min(min, 0) };
  }, [data, keys]);

  const padding = { top: 20, right: 20, bottom: 40, left: 60 };
  const chartWidth = 800;
  const chartHeight = height;
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  const xStep = data.length > 1 ? innerWidth / (data.length - 1) : innerWidth;

  // Y-axis ticks
  const yTicks = useMemo(() => {
    const tickCount = 5;
    const range = maxValue - minValue;
    const step = range / tickCount;
    return Array.from({ length: tickCount + 1 }, (_, i) => minValue + i * step);
  }, [maxValue, minValue]);

  const getY = (value: number) => {
    const range = maxValue - minValue;
    return padding.top + innerHeight - ((value - minValue) / range) * innerHeight;
  };

  const getX = (index: number) => {
    return padding.left + index * xStep;
  };

  // Generate path for each line
  const paths = useMemo(() => {
    return keys.map((key) => {
      const points = data.map((d, i) => {
        const x = getX(i);
        const y = getY(d.values[key] || 0);
        return { x, y, value: d.values[key] || 0, label: d.label };
      });

      const pathD = points
        .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
        .join(" ");

      return { key, points, pathD };
    });
  }, [data, keys]);

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        className="w-full min-w-[400px]"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Y-axis grid lines and labels */}
        {yTicks.map((tick, i) => {
          const y = getY(tick);
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

        {/* Zero line (if applicable) */}
        {minValue < 0 && (
          <line
            x1={padding.left}
            y1={getY(0)}
            x2={chartWidth - padding.right}
            y2={getY(0)}
            stroke="currentColor"
            strokeOpacity={0.3}
            strokeDasharray="4,4"
          />
        )}

        {/* Lines */}
        {paths.map(({ key, points, pathD }) => (
          <g key={key}>
            <path
              d={pathD}
              fill="none"
              stroke={colors[key]}
              strokeWidth={2}
              className="transition-opacity"
            />
            {showDots &&
              points.map((p, i) => (
                <circle
                  key={i}
                  cx={p.x}
                  cy={p.y}
                  r={4}
                  fill={colors[key]}
                  className="transition-all hover:r-6"
                >
                  <title>
                    {key}: {formatValue(p.value)}
                  </title>
                </circle>
              ))}
          </g>
        ))}

        {/* X-axis labels */}
        {showLabels &&
          data.map((d, i) => (
            <text
              key={i}
              x={getX(i)}
              y={chartHeight - padding.bottom + 20}
              textAnchor="middle"
              className="fill-current text-xs opacity-60"
            >
              {formatLabel(d.label)}
            </text>
          ))}

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
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: colors[key] }}
            />
            <span className="text-sm opacity-70">{key}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
