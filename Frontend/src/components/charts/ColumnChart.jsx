import { useMemo, useRef, useState } from "react";
import { useLanguage } from "../../i18n/LanguageContext";

const WIDTH = 640;
const MARGIN = { top: 22, right: 8, bottom: 26, left: 40 };
const MAX_BAR = 24;
const GAP = 2;

function niceMax(value) {
  if (value <= 5) return Math.max(1, Math.ceil(value));
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const step = [1, 2, 2.5, 5, 10].find((candidate) => candidate >= normalized) || 10;
  return step * magnitude;
}

/** Path of a column with a 4px rounded top, square at the baseline. */
function columnPath(x, y, width, height) {
  const radius = Math.min(4, width / 2, height);
  return [
    `M${x},${y + height}`,
    `V${y + radius}`,
    `Q${x},${y} ${x + radius},${y}`,
    `H${x + width - radius}`,
    `Q${x + width},${y} ${x + width},${y + radius}`,
    `V${y + height}`,
    "Z",
  ].join(" ");
}

/**
 * Single-series column chart. ``data`` = ``[{ label, value }]``.
 * Hover/focus tooltips on every column, a direct label on the maximum and a
 * screen-reader table with all values.
 */
export default function ColumnChart({ data, height = 180, valueLabel, ariaLabel }) {
  const { formatNumber, formatCompact } = useLanguage();
  const containerRef = useRef(null);
  const [active, setActive] = useState(null);

  const layout = useMemo(() => {
    const plotWidth = WIDTH - MARGIN.left - MARGIN.right;
    const plotHeight = height - MARGIN.top - MARGIN.bottom;
    const maxValue = Math.max(...data.map((item) => item.value), 0);
    const top = niceMax(maxValue || 1);
    const band = plotWidth / Math.max(data.length, 1);
    const barWidth = Math.max(2, Math.min(MAX_BAR, band - GAP));
    const ticks = [0, top / 2, top].map((value) => ({
      value,
      y: MARGIN.top + plotHeight - (value / top) * plotHeight,
    }));
    const labelEvery = Math.ceil(data.length / 10);
    const bars = data.map((item, index) => {
      const barHeight = (item.value / top) * plotHeight;
      const center = MARGIN.left + band * index + band / 2;
      return {
        ...item,
        index,
        center,
        x: center - barWidth / 2,
        y: MARGIN.top + plotHeight - barHeight,
        width: barWidth,
        height: barHeight,
        bandX: MARGIN.left + band * index,
        bandWidth: band,
        showLabel: index % labelEvery === 0 || index === data.length - 1,
      };
    });
    const maxIndex = data.findIndex((item) => item.value === maxValue && maxValue > 0);
    return { bars, ticks, plotHeight, maxIndex };
  }, [data, height]);

  if (!data.length) return null;

  const activeBar = active ? layout.bars[active.index] : null;
  const activate = (bar) => {
    const box = containerRef.current?.getBoundingClientRect();
    const scale = box ? box.width / WIDTH : 1;
    const width = box?.width || WIDTH;
    setActive({
      index: bar.index,
      left: Math.max(0, Math.min(bar.center * scale - 60, width - 140)),
      top: Math.max(0, bar.y * scale - 52),
    });
  };

  return (
    <div className="chart" ref={containerRef} onPointerLeave={() => setActive(null)}>
      <svg viewBox={`0 0 ${WIDTH} ${height}`} role="img" aria-label={ariaLabel}>
        {layout.ticks.map((tick) => (
          <g key={tick.value}>
            <line x1={MARGIN.left} x2={WIDTH - MARGIN.right} y1={tick.y} y2={tick.y} stroke={tick.value === 0 ? "var(--viz-axis)" : "var(--viz-grid)"} strokeWidth="1" />
            <text x={MARGIN.left - 6} y={tick.y + 4} textAnchor="end" fontSize="11" fill="var(--text-muted)" style={{ fontVariantNumeric: "tabular-nums" }}>
              {formatCompact(tick.value)}
            </text>
          </g>
        ))}
        {layout.bars.map((bar) => (
          <g key={bar.label}>
            {bar.height > 0 && (
              <path
                d={columnPath(bar.x, bar.y, bar.width, bar.height)}
                fill="var(--viz-bar)"
                opacity={!active || active.index === bar.index ? 1 : 0.55}
              />
            )}
            {bar.showLabel && (
              <text x={bar.center} y={height - 8} textAnchor="middle" fontSize="11" fill="var(--text-muted)">
                {bar.label}
              </text>
            )}
            {bar.index === layout.maxIndex && (
              <text x={bar.center} y={bar.y - 6} textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--text-secondary)">
                {formatNumber(bar.value)}
              </text>
            )}
            <rect
              x={bar.bandX}
              y={MARGIN.top}
              width={bar.bandWidth}
              height={layout.plotHeight}
              fill="transparent"
              tabIndex={0}
              aria-label={`${bar.label}: ${formatNumber(bar.value)} ${valueLabel}`}
              style={{ outline: "none" }}
              onPointerEnter={() => activate(bar)}
              onFocus={() => activate(bar)}
              onBlur={() => setActive(null)}
            />
          </g>
        ))}
      </svg>
      {activeBar && (
        <div className="chart-tooltip" style={{ left: active.left, top: active.top }}>
          <strong>{formatNumber(activeBar.value)}</strong> {valueLabel}
          <div>{activeBar.label}</div>
        </div>
      )}
      <table className="visually-hidden">
        <caption>{ariaLabel}</caption>
        <tbody>
          {data.map((item) => (
            <tr key={item.label}>
              <th scope="row">{item.label}</th>
              <td>{item.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
