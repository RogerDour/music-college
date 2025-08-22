// client/src/pages/MaterialsList.jsx
import { useEffect, useState } from "react";
import { listMaterials } from "../api/materials";

export default function MaterialsList({ courseId }) {
  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!courseId) return;
    listMaterials(courseId)
      .then(setItems)
      .catch((e) => {
        setErr("Failed to load materials.");
        console.error(e);
      });
  }, [courseId]);

  return (
    <div style={{ maxWidth: 800, margin: "2rem auto" }}>
      <h2>Materials</h2>
      {err && <p style={{ color: "tomato" }}>{err}</p>}
      <ul style={{ display: "grid", gap: 8 }}>
        {items.map((m) => (
          <li
            key={m._id}
            style={{ border: "1px solid #ddd", padding: 12, borderRadius: 8 }}
          >
            <div>
              <strong>{m.title}</strong>
            </div>
            <div>
              Type: {m.mimetype || "—"} | Size:{" "}
              {m.size ? Math.round(m.size / 1024) : 0} KB
            </div>
            <div style={{ marginTop: 6 }}>
              {m.filename && (
                <a
                  href={`http://localhost:5000/uploads/${m.filename}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Download
                </a>
              )}
              {m.url && (
                <>
                  {" "}
                  |{" "}
                  <a href={m.url} target="_blank" rel="noreferrer">
                    Open
                  </a>
                </>
              )}
            </div>
          </li>
        ))}
        {items.length === 0 && <li>No materials yet.</li>}
      </ul>
    </div>
  );
}
