import { useState, useRef, useEffect } from "react";

const GRID  = 24;
const PORT_R = 7;
const SNAP_R = 20;

const DEFS = {
  source: {
    name: "Source",
    w: 160, h: 80,
    bg: "#dbeafe", border: "#3b82f6",
    ports: [
      { id: "neg", label: "−", lx: 0,   ly: 40 },
      { id: "pos", label: "+", lx: 160, ly: 40 },
    ],
  },
  resistor: {
    name: "Resistor",
    w: 160, h: 80,
    bg: "#fef9c3", border: "#ca8a04",
    ports: [
      { id: "a", label: "A", lx: 0,   ly: 40 },
      { id: "b", label: "B", lx: 160, ly: 40 },
    ],
  },
  led: {
    name: "LED",
    w: 160, h: 80,
    bg: "#dcfce7", border: "#16a34a",
    ports: [
      { id: "anode",   label: "A+", lx: 0,   ly: 40 },
      { id: "cathode", label: "K−", lx: 160, ly: 40 },
    ],
  },
};

function snapTo(v) { return Math.round(v / GRID) * GRID; }

function portWorld(part, port) {
  return { x: part.x + port.lx, y: part.y + port.ly };
}

function nearestPort(mx, my, parts, exclude) {
  let best = null, bestD = SNAP_R;
  for (const part of parts) {
    for (const port of DEFS[part.defId].ports) {
      if (exclude?.partId === part.id && exclude?.portId === port.id) continue;
      const wx = part.x + port.lx, wy = part.y + port.ly;
      const d = Math.hypot(mx - wx, my - wy);
      if (d < bestD) { bestD = d; best = { partId: part.id, portId: port.id, wx, wy }; }
    }
  }
  return best;
}

let uid = 1;

export default function App() {
  const [parts, setParts] = useState([
    { id: "p1", defId: "source",   x: 96,  y: 120 },
    { id: "p2", defId: "resistor", x: 360, y: 216 },
    { id: "p3", defId: "led",      x: 624, y: 120 },
  ]);
  const [wires, setWires] = useState([]);
  const [drag,  setDrag]  = useState(null); // { partId, ox, oy }
  const [draft, setDraft] = useState(null); // { from:{partId,portId}, mx, my }
  const canvasRef = useRef(null);

  // Global Escape to cancel draft
  useEffect(() => {
    const fn = (e) => { if (e.key === "Escape") setDraft(null); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, []);

  function canvasXY(e) {
    const r = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  // ── Canvas mouse events ────────────────────────────────────────────────────

  function onMouseMove(e) {
    const { x, y } = canvasXY(e);
    if (drag) {
      setParts(ps => ps.map(p =>
        p.id === drag.partId
          ? { ...p, x: snapTo(x - drag.ox), y: snapTo(y - drag.oy) }
          : p
      ));
    }
    if (draft) setDraft(d => ({ ...d, mx: x, my: y }));
  }

  function onMouseUp() { setDrag(null); }

  function onCanvasClick(e) {
    if (!draft) return;
    const { x, y } = canvasXY(e);
    // Cancel draft only if click landed on empty space (no nearby port)
    if (!nearestPort(x, y, parts, draft.from)) setDraft(null);
  }

  // ── Part drag ──────────────────────────────────────────────────────────────

  function onPartDown(e, partId) {
    e.stopPropagation();
    if (draft) return;
    const { x, y } = canvasXY(e);
    const p = parts.find(p => p.id === partId);
    setDrag({ partId, ox: x - p.x, oy: y - p.y });
  }

  // ── Port click ─────────────────────────────────────────────────────────────

  function onPortClick(e, partId, portId) {
    e.stopPropagation();
    if (drag) return;

    if (!draft) {
      const { x, y } = canvasXY(e);
      setDraft({ from: { partId, portId }, mx: x, my: y });
      return;
    }

    // Same port → cancel
    if (draft.from.partId === partId && draft.from.portId === portId) {
      setDraft(null);
      return;
    }

    const from = draft.from, to = { partId, portId };

    // Prevent duplicate wire (either direction)
    const dup = wires.some(w =>
      (w.from.partId === from.partId && w.from.portId === from.portId &&
       w.to.partId   === to.partId   && w.to.portId   === to.portId) ||
      (w.from.partId === to.partId   && w.from.portId === to.portId &&
       w.to.partId   === from.partId && w.to.portId   === from.portId)
    );
    if (!dup) setWires(ws => [...ws, { id: `w${uid++}`, from, to }]);
    setDraft(null);
  }

  // ── Wire geometry ──────────────────────────────────────────────────────────

  function wirePos(wire) {
    const fp    = parts.find(p => p.id === wire.from.partId);
    const fport = DEFS[fp.defId].ports.find(p => p.id === wire.from.portId);
    const tp    = parts.find(p => p.id === wire.to.partId);
    const tport = DEFS[tp.defId].ports.find(p => p.id === wire.to.portId);
    const a = portWorld(fp, fport), b = portWorld(tp, tport);
    return { ax: a.x, ay: a.y, bx: b.x, by: b.y };
  }

  // Draft endpoint: snap to nearby port or follow raw mouse
  const snapTarget = draft ? nearestPort(draft.mx, draft.my, parts, draft.from) : null;
  let draftEx = draft?.mx ?? 0, draftEy = draft?.my ?? 0;
  if (snapTarget) { draftEx = snapTarget.wx; draftEy = snapTarget.wy; }

  let draftSx = 0, draftSy = 0;
  if (draft) {
    const fp    = parts.find(p => p.id === draft.from.partId);
    const fport = DEFS[fp.defId].ports.find(p => p.id === draft.from.portId);
    const pos   = portWorld(fp, fport);
    draftSx = pos.x; draftSy = pos.y;
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ height: "100vh", display: "flex", fontFamily: "system-ui, Arial" }}>

      {/* ── Sidebar ── */}
      <div style={{
        width: 200, flexShrink: 0,
        borderRight: "1px solid #e2e8f0",
        padding: 12, background: "#fff",
        display: "flex", flexDirection: "column",
      }}>
        <div style={{ fontWeight: 700, marginBottom: 10, fontSize: 15 }}>Components</div>

        {Object.entries(DEFS).map(([defId, def]) => (
          <div key={defId} style={{
            padding: "8px 10px", marginBottom: 8, borderRadius: 10,
            border: `1.5px solid ${def.border}`, background: def.bg,
          }}>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{def.name}</div>
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
              {def.ports.map(p => p.label).join(" · ")}
            </div>
          </div>
        ))}

        <div style={{ marginTop: "auto", borderTop: "1px solid #e2e8f0", paddingTop: 12 }}>
          <button style={sideBtn} onClick={() => setWires([])}>Clear wires</button>

          <div style={{ marginTop: 14, fontSize: 11, color: "#94a3b8", lineHeight: 1.8 }}>
            <b style={{ color: "#334155" }}>Drag</b> a block to move it.<br />
            <b style={{ color: "#334155" }}>Click</b> a port → start wire.<br />
            <b style={{ color: "#334155" }}>Click</b> another port → connect.<br />
            <b style={{ color: "#334155" }}>Click</b> a wire → delete it.<br />
            <b style={{ color: "#334155" }}>Esc</b> → cancel.
          </div>
        </div>
      </div>

      {/* ── Canvas ── */}
      <div
        ref={canvasRef}
        style={{
          flex: 1, position: "relative", overflow: "hidden",
          cursor: draft ? "crosshair" : drag ? "grabbing" : "default",
          backgroundColor: "#f8fafc",
          backgroundImage:
            "linear-gradient(#e2e8f0 1px, transparent 1px)," +
            "linear-gradient(90deg, #e2e8f0 1px, transparent 1px)",
          backgroundSize: `${GRID}px ${GRID}px`,
        }}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onClick={onCanvasClick}
      >
        {/* Parts */}
        {parts.map(part => {
          const def = DEFS[part.defId];
          return (
            <div key={part.id} style={{
              position: "absolute",
              left: part.x, top: part.y,
              width: def.w, height: def.h,
            }}>
              {/* Body */}
              <div
                onMouseDown={e => onPartDown(e, part.id)}
                style={{
                  position: "absolute", inset: 0,
                  borderRadius: 12,
                  border: `1.5px solid ${def.border}`,
                  background: def.bg,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: drag?.partId === part.id ? "grabbing" : "grab",
                  userSelect: "none",
                }}
              >
                <span style={{ fontWeight: 700, fontSize: 13, color: "#0f172a" }}>
                  {def.name}
                </span>
              </div>

              {/* Ports */}
              {def.ports.map(port => {
                const isDraftFrom =
                  draft?.from.partId === part.id && draft?.from.portId === port.id;
                const isSnap =
                  snapTarget?.partId === part.id && snapTarget?.portId === port.id;
                return (
                  <div
                    key={port.id}
                    title={port.label}
                    onMouseDown={e => e.stopPropagation()}
                    onClick={e => onPortClick(e, part.id, port.id)}
                    style={{
                      position: "absolute",
                      left: port.lx - PORT_R,
                      top:  port.ly - PORT_R,
                      width:  PORT_R * 2,
                      height: PORT_R * 2,
                      borderRadius: "50%",
                      background: isDraftFrom ? "#f97316" : isSnap ? "#22c55e" : "#fff",
                      border: `2.5px solid ${
                        isDraftFrom ? "#ea580c" : isSnap ? "#16a34a" : def.border
                      }`,
                      cursor: "crosshair",
                      zIndex: 2,
                      transform: isSnap ? "scale(1.5)" : "scale(1)",
                      transition: "transform 0.1s, background 0.1s",
                      boxSizing: "border-box",
                    }}
                  />
                );
              })}
            </div>
          );
        })}

        {/* SVG wire layer */}
        <svg style={{
          position: "absolute", inset: 0,
          width: "100%", height: "100%",
          overflow: "visible", pointerEvents: "none",
        }}>
          {/* Committed wires */}
          {wires.map(wire => {
            const { ax, ay, bx, by } = wirePos(wire);
            return (
              <g
                key={wire.id}
                style={{ pointerEvents: "all", cursor: "pointer" }}
                onClick={() => setWires(ws => ws.filter(w => w.id !== wire.id))}
              >
                {/* Fat invisible hit area */}
                <line x1={ax} y1={ay} x2={bx} y2={by}
                  stroke="transparent" strokeWidth={14} />
                {/* Visible wire */}
                <line x1={ax} y1={ay} x2={bx} y2={by}
                  stroke="#475569" strokeWidth={2.5} strokeLinecap="round" />
              </g>
            );
          })}

          {/* Draft wire */}
          {draft && (
            <line
              x1={draftSx} y1={draftSy} x2={draftEx} y2={draftEy}
              stroke={snapTarget ? "#22c55e" : "#f97316"}
              strokeWidth={2} strokeDasharray="6 4" strokeLinecap="round"
              style={{ pointerEvents: "none" }}
            />
          )}
        </svg>
      </div>
    </div>
  );
}

const sideBtn = {
  width: "100%",
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid #cbd5e1",
  background: "#fff",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: 13,
};
