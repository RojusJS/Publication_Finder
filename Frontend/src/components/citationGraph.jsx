import { useEffect, useMemo, useState } from "react";
import { getPublicationDetail } from "../services/openalexApi";
import PublicationCardModal from "./publicationCardModal";
import { useLanguage } from "./language";
import { useToast } from "./toastContext";
import apiClient from "../services/apiClient";

async function fetchCitingWorks(openalexId) {
  const resp = await apiClient.get("/search/publications/citing/", {
    params: { id: openalexId },
  });
  return resp.data.results || [];
}

async function fetchReferencedWorks(openalexId) {
  const resp = await apiClient.get("/search/publications/referenced/", {
    params: { id: openalexId },
  });
  return resp.data.results || [];
}

function trimTitle(title, max = 38) {
  if (!title) return "Be pavadinimo";
  return title.length > max ? title.slice(0, max) + "..." : title;
}

function buildStaticNodes(centerPub, works) {
  const center = {
    id: centerPub.openalex_id || centerPub.id || "center",
    title: centerPub.title,
    year: centerPub.year,
    citations: centerPub.cited_by_count ?? 0,
    isCenter: true,
    x: 50,
    y: 50,
  };
  const nodes = works.slice(0, 16).map((work, index, arr) => {
    const angle = (2 * Math.PI * index) / arr.length;
    return {
      id: work.id,
      title: work.title || "Be pavadinimo",
      year: work.year,
      citations: work.cited_by_count ?? 0,
      isCenter: false,
      x: 50 + 40 * Math.cos(angle),
      y: 50 + 40 * Math.sin(angle),
    };
  });
  return [center, ...nodes];
}

export default function CitationGraph({ pub, projects = [] }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [works, setWorks] = useState([]);
  const [mode, setMode] = useState("citing");
  const { t } = useLanguage();
  const [selectedPub, setSelectedPub] = useState(null);
  const [selectedPubOpen, setSelectedPubOpen] = useState(false);
  const [hoveredId, setHoveredId] = useState(null);
  const { showToast } = useToast();

  useEffect(() => {
    if (!pub?.openalex_id) return;
    setLoading(true);
    setError("");
    const fetchFn = mode === "citing" ? fetchCitingWorks : fetchReferencedWorks;
    fetchFn(pub.openalex_id)
      .then((data) => {
        setWorks(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Nepavyko įkelti citavimų");
        setLoading(false);
      });
  }, [pub?.openalex_id, mode]);

  const nodes = useMemo(() => buildStaticNodes(pub, works), [pub, works]);
  const centerNode = nodes[0];
  const outerNodes = nodes.slice(1);

  const handleNodeClick = async (node) => {
    if (node.isCenter) return;
    try {
      const fullPub = await getPublicationDetail(node.id);
      setSelectedPub(fullPub);
      setSelectedPubOpen(true);
    } catch {
      showToast("Nepavyko gauti publikacijos informacijos");
    }
  };

  return (
    <>
      <div style={{ display: "flex", gap: "6px", marginBottom: "14px" }}>
        {[
          { key: "citing", label: t.citing_my_pub },
          { key: "referenced", label: t.cited_by_my_pub },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setMode(key)}
            style={{
              padding: "5px 14px",
              borderRadius: "20px",
              border:
                mode === key ? "1.5px solid #1e2d4a" : "1.5px solid #c8d4e3",
              background: mode === key ? "#1e2d4a" : "#ffffff",
              color: mode === key ? "#ffffff" : "#7a90aa",
              cursor: "pointer",
              fontFamily: "Times New Roman",
              fontSize: "13px",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              if (mode !== key) {
                e.currentTarget.style.borderColor = "#1e2d4a";
                e.currentTarget.style.color = "#1e2d4a";
              }
            }}
            onMouseLeave={(e) => {
              if (mode !== key) {
                e.currentTarget.style.borderColor = "#c8d4e3";
                e.currentTarget.style.color = "#7a90aa";
              }
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div
        style={{
          width: "100%",
          height: "680px",
          borderRadius: "10px",
          border: "1px solid #dce3ed",
          background: "#f0f2f5",
          position: "relative",
          overflow: "hidden",
          fontFamily: "Times New Roman",
        }}
      >
        {loading && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#7a90aa",
              fontSize: "14px",
            }}
          >
            {t.loading_citations}
          </div>
        )}
        {error && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#c0392b",
              fontSize: "14px",
            }}
          >
            {error}
          </div>
        )}
        {!loading && !error && works.length === 0 && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#7a90aa",
              fontSize: "14px",
            }}
          >
            {mode === "citing" ? t.no_citing_works : t.no_referenced_works}
          </div>
        )}

        {!loading && !error && works.length > 0 && (
          <>
            <svg
              width="100%"
              height="100%"
              style={{
                position: "absolute",
                inset: 0,
                zIndex: 1,
                pointerEvents: "none",
              }}
            >
              {outerNodes.map((node) => (
                <line
                  key={`line-${node.id}`}
                  x1={`${centerNode.x}%`}
                  y1={`${centerNode.y}%`}
                  x2={`${node.x}%`}
                  y2={`${node.y}%`}
                  stroke="#c8d4e3"
                  strokeWidth="1.5"
                />
              ))}
            </svg>

            {nodes.map((node) => (
              <div
                key={node.id}
                title={`${node.title}${node.year ? ` (${node.year})` : ""}`}
                onClick={() => handleNodeClick(node)}
                onMouseEnter={() => !node.isCenter && setHoveredId(node.id)}
                onMouseLeave={() => setHoveredId(null)}
                style={{
                  position: "absolute",
                  left: `${node.x}%`,
                  top: `${node.y}%`,
                  transform: "translate(-50%, -50%)",
                  zIndex: node.isCenter ? 3 : 2,
                  minWidth: node.isCenter ? "200px" : "120px",
                  maxWidth: node.isCenter ? "280px" : "150px",
                  padding: node.isCenter ? "12px 16px" : "8px 10px",
                  borderRadius: node.isCenter ? "10px" : "8px",
                  textAlign: "center",
                  fontSize: node.isCenter ? "14px" : "11px",
                  lineHeight: "1.35",
                  boxShadow: node.isCenter
                    ? "0 4px 16px rgba(30,45,74,0.2)"
                    : hoveredId === node.id
                      ? "0 4px 12px rgba(30,45,74,0.12)"
                      : "0 2px 6px rgba(30,45,74,0.07)",
                  boxSizing: "border-box",
                  cursor: node.isCenter ? "default" : "pointer",
                  transition: "box-shadow 0.15s, background 0.15s",
                  background: node.isCenter
                    ? "#1e2d4a"
                    : hoveredId === node.id
                      ? "#e8eef7"
                      : "#ffffff",
                  color: node.isCenter ? "#ffffff" : "#1e2d4a",
                  border: node.isCenter
                    ? "none"
                    : hoveredId === node.id
                      ? "1px solid #7fa8d4"
                      : "1px solid #dce3ed",
                  fontFamily: "Times New Roman",
                  fontWeight: node.isCenter ? "600" : "400",
                }}
              >
                <div>{trimTitle(node.title, node.isCenter ? 55 : 28)}</div>
                {!node.isCenter && (
                  <div
                    style={{
                      marginTop: "4px",
                      fontSize: "10px",
                      color: hoveredId === node.id ? "#5a7090" : "#7a90aa",
                    }}
                  >
                    {`${node.year || "—"} · ${node.citations} cit.`}
                  </div>
                )}
              </div>
            ))}
          </>
        )}
      </div>

      <PublicationCardModal
        open={selectedPubOpen}
        onClose={() => setSelectedPubOpen(false)}
        pub={selectedPub}
        institutionName={null}
        projects={projects}
      />
    </>
  );
}
