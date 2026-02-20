import { useState } from "react";

export default function App() {
  // 3 pieces on the canvas
  const [parts] = useState([
    { id: "source", name: "Source", x: 120, y: 120, w: 150, h: 90 },
    { id: "resistor", name: "Resistor", x: 360, y: 220, w: 170, h: 90 },
    { id: "led", name: "LED", x: 620, y: 140, w: 150, h: 90 },
  ]);

  return (
    <div style={{ height: "100vh", display: "flex", fontFamily: "system-ui, Arial" }}>
      {/* Sidebar */}
      <div
        style={{
          width: 220,
          borderRight: "1px solid #e2e8f0",
          padding: 12,
          background: "white",
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 10 }}>Palette</div>

        <button style={btnStyle}>Source</button>
        <button style={btnStyle}>Resistor</button>
        <button style={btnStyle}>LED</button>

        <div style={{ marginTop: 12, fontSize: 12, color: "#64748b" }}>
          Next: we'll make these draggable.
        </div>
      </div>

      {/* Canvas */}
      <div
        style={{
          flex: 1,
          position: "relative",
          overflow: "hidden",

          // grid background
          backgroundColor: "#f8fafc",
          backgroundImage:
            "linear-gradient(#e2e8f0 1px, transparent 1px), linear-gradient(90deg, #e2e8f0 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      >
        {/* Parts */}
        {parts.map((p) => (
          <div
            key={p.id}
            style={{
              position: "absolute",
              left: p.x,
              top: p.y,
              width: p.w,
              height: p.h,
              borderRadius: 12,
              border: "1px solid #cbd5e1",
              background: "white",
              boxShadow: "0 1px 6px rgba(0,0,0,0.08)",
              padding: 10,
              userSelect: "none",
            }}
          >
            <div style={{ fontWeight: 700, color: "#0f172a" }}>{p.name}</div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}>
              (ports + wires next)
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const btnStyle = {
  width: "100%",
  padding: "10px 12px",
  marginBottom: 8,
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  background: "#fff",
  cursor: "pointer",
  fontWeight: 600,
};
