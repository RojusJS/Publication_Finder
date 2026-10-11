import { useMemo, useRef, useState } from "react";
import { errorMessage } from "../../api/client";
import { getCitationNetwork } from "../../api/search";
import useQuery from "../../hooks/useQuery";
import { useLanguage } from "../../i18n/LanguageContext";
import { shortId } from "../../utils/publication";
import { Alert, EmptyState, Loading } from "../ui/Feedback";
import Icon from "../ui/Icon";

const WIDTH = 960;
const HEIGHT = 520;
const MARGIN = { top: 28, right: 28, bottom: 44, left: 64 };
const PLOT_W = WIDTH - MARGIN.left - MARGIN.right;
const PLOT_H = HEIGHT - MARGIN.top - MARGIN.bottom;
const RADIUS = { center: 9, reference: 6, citing: 6 };
const COLORS = { center: "var(--viz-center)", reference: "var(--viz-reference)", citing: "var(--viz-citing)" };
const HIT_RADIUS = 12;

function niceYearStep(span) {
  const raw = span / 7;
  return [1, 2, 5, 10, 20, 25, 50, 100].find((step) => step >= raw) || 100;
}

/** Deterministic layout: x = year, y = log citations, then pairwise relaxation to avoid overlaps. */
function computeLayout(nodes) {
  const center = nodes.find((node) => node.role === "center");
  const fallbackYear = center?.year || nodes.find((node) => node.year)?.year || 2000;
  const years = nodes.map((node) => node.year || fallbackYear);
  let minYear = Math.min(...years);
  let maxYear = Math.max(...years);
  if (minYear === maxYear) {
    minYear -= 1;
    maxYear += 1;
  }
  const maxCitations = Math.max(...nodes.map((node) => node.cited_by_count || 0), 9);
  const maxLog = Math.ceil(Math.log10(maxCitations + 1));

  const x = (year) => MARGIN.left + ((year - minYear + 0.5) / (maxYear - minYear + 1)) * PLOT_W;
  const y = (citations) => MARGIN.top + PLOT_H - (Math.log10(citations + 1) / maxLog) * PLOT_H;

  const placed = nodes.map((node, index) => ({
    ...node,
    r: RADIUS[node.role] || 6,
    x: x(years[index]),
    y: y(node.cited_by_count || 0),
    homeX: x(years[index]),
  }));

  const yearWidth = PLOT_W / (maxYear - minYear + 1);
  const maxShift = Math.max(4, yearWidth * 0.45);
  for (let pass = 0; pass < 80; pass += 1) {
    let moved = false;
    for (let i = 0; i < placed.length; i += 1) {
      for (let j = i + 1; j < placed.length; j += 1) {
        const a = placed[i];
        const b = placed[j];
        const minDistance = a.r + b.r + 4;
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        const distance = Math.hypot(dx, dy);
        if (distance >= minDistance) continue;
        if (distance < 0.01) {
          dx = ((i + j) % 2 ? 1 : -1) * 0.5;
          dy = 1;
        }
        const length = Math.hypot(dx, dy);
        const push = (minDistance - distance) / 2;
        const ux = dx / length;
        const uy = dy / length;
        const aFixed = a.role === "center";
        const bFixed = b.role === "center";
        if (!aFixed) {
          a.x -= ux * push * (bFixed ? 2 : 1);
          a.y -= uy * push * (bFixed ? 2 : 1);
        }
        if (!bFixed) {
          b.x += ux * push * (aFixed ? 2 : 1);
          b.y += uy * push * (aFixed ? 2 : 1);
        }
        moved = true;
      }
    }
    for (const node of placed) {
      node.x = Math.min(Math.max(node.x, node.homeX - maxShift, MARGIN.left + node.r), MARGIN.left + PLOT_W - node.r, node.homeX + maxShift);
      node.y = Math.min(Math.max(node.y, MARGIN.top + node.r), MARGIN.top + PLOT_H - node.r);
    }
    if (!moved) break;
  }

  const step = niceYearStep(maxYear - minYear);
  const yearTicks = [];
  for (let year = Math.ceil(minYear / step) * step; year <= maxYear; year += step) yearTicks.push(year);
  const citationTicks = [];
  for (let power = 0; power <= maxLog; power += 1) {
    const value = power === 0 ? 0 : 10 ** power;
    citationTicks.push({ value, y: y(value) });
  }
  return { nodes: placed, yearTicks: yearTicks.map((year) => ({ year, x: x(year) })), citationTicks };
}

function NetworkGraph({ network, show, onOpen }) {
  const { t, formatNumber, formatCompact } = useLanguage();
  const containerRef = useRef(null);
  const [hovered, setHovered] = useState(null);

  const visibleNodes = useMemo(
    () => network.nodes.filter((node) => node.role === "center" || show === "both" || node.role === show.replace(/s$/, "")),
    [network.nodes, show],
  );
  const layout = useMemo(() => computeLayout(visibleNodes), [visibleNodes]);
  const byId = useMemo(() => Object.fromEntries(layout.nodes.map((node) => [node.id, node])), [layout.nodes]);
  const edges = useMemo(
    () => network.edges.filter((edge) => byId[edge.source] && byId[edge.target]),
    [network.edges, byId],
  );
  const connected = useMemo(() => {
    if (!hovered) return null;
    const ids = new Set([hovered.id]);
    edges.forEach((edge) => {
      if (edge.source === hovered.id) ids.add(edge.target);
      if (edge.target === hovered.id) ids.add(edge.source);
    });
    return ids;
  }, [hovered, edges]);
  const center = layout.nodes.find((node) => node.role === "center");

  const showTooltip = (node, event) => {
    const box = containerRef.current?.getBoundingClientRect();
    if (!box) return;
    const scale = box.width / WIDTH;
    const left = event?.clientX != null ? event.clientX - box.left : node.x * scale;
    const top = event?.clientY != null ? event.clientY - box.top : node.y * scale;
    setHovered({ id: node.id, left, top, width: box.width });
  };

  const hoveredNode = hovered ? byId[hovered.id] : null;
  const roleLabel = (role) => t(`network.role_${role}`);

  return (
    <div className="chart" ref={containerRef} onPointerLeave={() => setHovered(null)}>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={t("network.aria", { count: layout.nodes.length - 1 })}>
        {layout.citationTicks.map((tick) => (
          <g key={tick.value}>
            <line x1={MARGIN.left} x2={WIDTH - MARGIN.right} y1={tick.y} y2={tick.y} stroke="var(--viz-grid)" strokeWidth="1" />
            <text x={MARGIN.left - 8} y={tick.y + 4} textAnchor="end" fontSize="12" fill="var(--text-muted)" style={{ fontVariantNumeric: "tabular-nums" }}>
              {formatCompact(tick.value)}
            </text>
          </g>
        ))}
        <line x1={MARGIN.left} x2={WIDTH - MARGIN.right} y1={MARGIN.top + PLOT_H} y2={MARGIN.top + PLOT_H} stroke="var(--viz-axis)" strokeWidth="1" />
        {layout.yearTicks.map((tick) => (
          <text key={tick.year} x={tick.x} y={HEIGHT - MARGIN.bottom + 18} textAnchor="middle" fontSize="12" fill="var(--text-muted)">
            {tick.year}
          </text>
        ))}
        <text x={MARGIN.left + PLOT_W / 2} y={HEIGHT - 6} textAnchor="middle" fontSize="12" fill="var(--text-muted)">
          {t("network.axis_year")}
        </text>
        <text transform={`translate(14 ${MARGIN.top + PLOT_H / 2}) rotate(-90)`} textAnchor="middle" fontSize="12" fill="var(--text-muted)">
          {t("network.axis_citations")}
        </text>

        <g>
          {edges.map((edge) => {
            const source = byId[edge.source];
            const target = byId[edge.target];
            const active = connected && connected.has(edge.source) && connected.has(edge.target) && (edge.source === hovered.id || edge.target === hovered.id);
            return (
              <line
                key={`${edge.source}-${edge.target}`}
                x1={source.x}
                y1={source.y}
                x2={target.x}
                y2={target.y}
                stroke={active ? "var(--navy)" : "#b9c6d8"}
                strokeOpacity={connected ? (active ? 0.9 : 0.12) : 0.45}
                strokeWidth={active ? 1.5 : 1}
              />
            );
          })}
        </g>

        <g>
          {layout.nodes.map((node) => {
            const dimmed = connected && !connected.has(node.id);
            return (
              <g key={node.id} opacity={dimmed ? 0.3 : 1}>
                {node.in_library && <circle cx={node.x} cy={node.y} r={node.r + 4} fill="none" stroke="var(--navy)" strokeWidth="2" />}
                <circle cx={node.x} cy={node.y} r={node.r} fill={COLORS[node.role]} stroke="#fff" strokeWidth="2" />
              </g>
            );
          })}
        </g>

        {center && (
          <text x={center.x} y={center.y - center.r - 8} textAnchor="middle" fontSize="12" fontWeight="600" fill="var(--text)" paintOrder="stroke" stroke="#fff" strokeWidth="4">
            {t("network.this_publication")}
          </text>
        )}

        <g>
          {layout.nodes.map((node) => (
            <circle
              key={node.id}
              cx={node.x}
              cy={node.y}
              r={HIT_RADIUS}
              fill="transparent"
              style={{ cursor: node.role === "center" ? "default" : "pointer", outline: "none" }}
              tabIndex={0}
              role="button"
              aria-label={`${node.title || t("publication.untitled")}, ${node.year || "?"}, ${t.count("network.citations", node.cited_by_count || 0)}`}
              onPointerMove={(event) => showTooltip(node, event)}
              onFocus={() => showTooltip(node)}
              onBlur={() => setHovered(null)}
              onClick={() => node.role !== "center" && onOpen(node)}
              onKeyDown={(event) => {
                if ((event.key === "Enter" || event.key === " ") && node.role !== "center") {
                  event.preventDefault();
                  onOpen(node);
                }
              }}
            />
          ))}
        </g>
      </svg>

      {hoveredNode && (
        <div
          className="chart-tooltip"
          style={{
            left: Math.max(0, Math.min(hovered.left + 14, hovered.width - 290)),
            top: hovered.top + 14,
          }}
        >
          <strong>{formatNumber(hoveredNode.cited_by_count)}</strong> {t("network.citations_label")} · {hoveredNode.year || "—"}
          <div className="serif" style={{ color: "var(--text)", fontWeight: 600, margin: "3px 0" }}>
            {hoveredNode.title || t("publication.untitled")}
          </div>
          {hoveredNode.authors?.length > 0 && <div>{hoveredNode.authors.join(", ")}</div>}
          <div className="row" style={{ marginTop: 4, gap: 6 }}>
            <span className="legend-swatch" style={{ background: COLORS[hoveredNode.role] }} />
            {roleLabel(hoveredNode.role)}
            {hoveredNode.in_library && ` · ${t("network.in_library")}`}
          </div>
        </div>
      )}
    </div>
  );
}

function NetworkTable({ network, show, onOpen }) {
  const { t, formatNumber } = useLanguage();
  const rows = network.nodes
    .filter((node) => node.role !== "center" && (show === "both" || node.role === show.replace(/s$/, "")))
    .sort((a, b) => (b.year || 0) - (a.year || 0) || b.cited_by_count - a.cited_by_count);
  return (
    <div style={{ overflowX: "auto" }}>
      <table className="network-table">
        <thead>
          <tr>
            <th>{t("network.col_title")}</th>
            <th>{t("network.col_relation")}</th>
            <th className="num">{t("network.col_year")}</th>
            <th className="num">{t("network.col_citations")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((node) => (
            <tr key={node.id}>
              <td>
                <button type="button" className="link-button" style={{ textAlign: "left" }} onClick={() => onOpen(node)}>
                  {node.title || t("publication.untitled")}
                </button>
                {node.in_library && <span className="chip chip-info" style={{ marginLeft: 6 }}>{t("network.in_library")}</span>}
                {node.authors?.length > 0 && <div className="tiny muted">{node.authors.join(", ")}</div>}
              </td>
              <td className="small">{t(`network.role_${node.role}`)}</td>
              <td className="num">{node.year || "—"}</td>
              <td className="num">{formatNumber(node.cited_by_count)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function CitationNetwork({ openalexId, onOpenPublication }) {
  const { t, formatNumber } = useLanguage();
  const id = shortId(openalexId);
  const network = useQuery(id ? `network:${id}` : null, () => getCitationNetwork(id));
  const [show, setShow] = useState("both");
  const [view, setView] = useState("graph");

  if (network.loading) return <Loading label={t("network.loading")} />;
  if (network.error) return <Alert>{errorMessage(network.error, t, "network.failed")}</Alert>;
  if (!network.data) return null;

  const { counts } = network.data;
  if (counts.references_shown + counts.citing_shown === 0) {
    return <EmptyState icon="network" title={t("network.empty_title")}>{t("network.empty")}</EmptyState>;
  }
  const open = (node) => onOpenPublication(node.id);

  return (
    <div className="stack">
      <div className="row-between" style={{ flexWrap: "wrap" }}>
        <div className="segmented" role="group" aria-label={t("network.show")}>
          {["both", "references", "citing"].map((value) => (
            <button key={value} type="button" aria-pressed={show === value} onClick={() => setShow(value)}>
              {t(`network.show_${value}`)}
            </button>
          ))}
        </div>
        <div className="segmented" role="group" aria-label={t("network.view")}>
          <button type="button" aria-pressed={view === "graph"} onClick={() => setView("graph")}>
            <Icon name="network" size={14} /> {t("network.view_graph")}
          </button>
          <button type="button" aria-pressed={view === "list"} onClick={() => setView("list")}>
            <Icon name="list" size={14} /> {t("network.view_list")}
          </button>
        </div>
      </div>

      <p className="small muted">
        {t("network.summary", {
          references: formatNumber(counts.references_shown),
          referencesTotal: formatNumber(counts.references_total),
          citing: formatNumber(counts.citing_shown),
          citingTotal: formatNumber(counts.citing_total),
        })}
      </p>

      <div className="chart-legend" aria-hidden={view === "list"}>
        <span className="legend-key"><span className="legend-swatch" style={{ background: COLORS.reference }} />{t("network.role_reference")}</span>
        <span className="legend-key"><span className="legend-swatch" style={{ background: COLORS.citing }} />{t("network.role_citing")}</span>
        <span className="legend-key"><span className="legend-swatch" style={{ background: COLORS.center }} />{t("network.role_center")}</span>
        <span className="legend-key"><span className="legend-ring" />{t("network.in_library")}</span>
        <span className="legend-key subtle">{t("network.edges_hint")}</span>
      </div>

      {view === "graph" ? (
        <div className="network-frame">
          <NetworkGraph network={network.data} show={show} onOpen={open} />
        </div>
      ) : (
        <NetworkTable network={network.data} show={show} onOpen={open} />
      )}
    </div>
  );
}
