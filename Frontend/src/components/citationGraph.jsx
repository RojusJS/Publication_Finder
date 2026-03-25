import { useEffect, useMemo, useState } from "react";
import { getPublicationDetail } from "../services/openalexApi";
import PublicationCardModal from "./publicationCardModal";

const OPENALEX_BASE = "https://api.openalex.org";

async function fetchCitingWorks(openalexId) {
  const shortId = openalexId.replace("https://openalex.org/", "");
  const url =
    `${OPENALEX_BASE}/works?filter=cites:${shortId}` +
    `&select=id,title,publication_year,cited_by_count` +
    `&per-page=16`;

  const res = await fetch(url);
  if (!res.ok) throw new Error("OpenAlex fetch failed");

  const data = await res.json();
  return data.results || [];
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

  const radius = 40;

  const nodes = works.slice(0, 16).map((work, index, arr) => {
    const angle = (2 * Math.PI * index) / arr.length;

    return {
      id: work.id,
      title: work.title || "Be pavadinimo",
      year: work.publication_year,
      citations: work.cited_by_count ?? 0,
      isCenter: false,
      x: 50 + radius * Math.cos(angle),
      y: 50 + radius * Math.sin(angle),
    };
  });

  return [center, ...nodes];
}

function getNodeStyle(isCenter) {
  if (isCenter) {
    return {
      background: "#534AB7",
      color: "#ffffff",
      border: "1px solid #3C3489",
      fontWeight: "bold",
      zIndex: 3,
    };
  }

  return {
    background: "#f0eef4",
    color: "#1a1a1a",
    border: "1px solid #c4c2cc",
    zIndex: 2,
  };
}

export default function CitationGraph({ pub, projects = [] }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [works, setWorks] = useState([]);

  const [selectedPub, setSelectedPub] = useState(null);
  const [selectedPubOpen, setSelectedPubOpen] = useState(false);
  const [nodeLoadingId, setNodeLoadingId] = useState(null);

  useEffect(() => {
    if (!pub?.openalex_id) return;

    setLoading(true);
    setError("");

    fetchCitingWorks(pub.openalex_id)
      .then((data) => {
        setWorks(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Nepavyko įkelti citavimų");
        setLoading(false);
      });
  }, [pub?.openalex_id]);

  const nodes = useMemo(() => buildStaticNodes(pub, works), [pub, works]);

  const centerNode = nodes[0];
  const outerNodes = nodes.slice(1);

  const handleNodeClick = async (node) => {
    if (node.isCenter) return;

    try {
      setNodeLoadingId(node.id);
      const fullPub = await getPublicationDetail(node.id);
      setSelectedPub(fullPub);
      setSelectedPubOpen(true);
    } catch (err) {
      alert("Nepavyko gauti publikacijos informacijos");
    } finally {
      setNodeLoadingId(null);
    }
  };

  return (
    <>
      <div
        style={{
          width: "100%",
          height: "700px",
          borderRadius: "12px",
          border: "1px solid #d6d3dc",
          background: "#fafaf9",
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
              color: "#777",
              fontSize: "15px",
            }}
          >
            Kraunami citavimai...
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
              fontSize: "15px",
            }}
          >
            {error}
          </div>
        )}

        {!loading && !error && (
          <>
            <svg
              width="100%"
              height="100%"
              style={{
                position: "absolute",
                inset: 0,
                zIndex: 1,
              }}
            >
              {outerNodes.map((node) => (
                <line
                  key={`line-${node.id}`}
                  x1={`${centerNode.x}%`}
                  y1={`${centerNode.y}%`}
                  x2={`${node.x}%`}
                  y2={`${node.y}%`}
                  stroke="rgba(80, 80, 80, 0.22)"
                  strokeWidth="1.2"
                />
              ))}
            </svg>

            {nodes.map((node) => (
              <div
                key={node.id}
                title={`${node.title}${node.year ? ` (${node.year})` : ""}`}
                onClick={() => handleNodeClick(node)}
                style={{
                  position: "absolute",
                  left: `${node.x}%`,
                  top: `${node.y}%`,
                  transform: "translate(-50%, -50%)",
                  minWidth: node.isCenter ? "220px" : "130px",
                  maxWidth: node.isCenter ? "300px" : "160px",
                  padding: node.isCenter ? "12px 16px" : "8px 10px",
                  borderRadius: node.isCenter ? "14px" : "10px",
                  textAlign: "center",
                  fontSize: node.isCenter ? "15px" : "12px",
                  lineHeight: "1.35",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                  boxSizing: "border-box",
                  cursor: node.isCenter ? "default" : "pointer",
                  opacity: nodeLoadingId === node.id ? 0.7 : 1,
                  ...getNodeStyle(node.isCenter),
                }}
              >
                <div>{trimTitle(node.title, node.isCenter ? 55 : 28)}</div>

                {!node.isCenter && (
                  <div
                    style={{
                      marginTop: "4px",
                      fontSize: "11px",
                      color: "#777",
                    }}
                  >
                    {nodeLoadingId === node.id
                      ? "Kraunama..."
                      : `${node.year || "—"} · ${node.citations} cit.`}
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