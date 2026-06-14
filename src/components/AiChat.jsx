import { useState, useRef, useEffect } from "react";

const SYSTEM_PROMPT = `You are TransitGo AI, a helpful transit assistant for Metro Cebu, Philippines.
You help commuters find the best jeepney, bus, and taxi routes.

Known routes and fares:
- SM City to Ayala Center: Jeepney 03Q, ₱13, 20-30 min (direct)
- SM City to IT Park: Jeepney 04L or 17B, ₱13, 15-25 min
- SM City to Airport: MyBus MCIA, ₱50, 45-60 min
- Ayala to IT Park: Jeepney 04L, ₱13, 10-20 min
- SM City to Colon: Jeepney 01I, ₱13, 20-35 min
- Colon to Basilica: Walking, free, 12 min
- SM City to Basilica: Bus 02B, ₱25, 30 min

Discounts:
- Students, PWD, Senior citizens get 20% discount

Tips:
- Avoid rush hours 7-9 AM and 5-7 PM
- Always carry small bills
- MyBus accepts GCash

Keep answers short, friendly, and in English. Always mention fare and travel time.`;

export default function AiChat() {
  const [open, setOpen]       = useState(false);
  const [messages, setMessages] = useState([
    { role: "model", content: "Hi! I'm TransitGo AI 👋 Ask me anything about Cebu routes, fares, or travel tips!" }
  ]);
  const [input,   setInput]   = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
    if (!input.trim() || loading) return;

    const userMsg = { role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const history = messages.map((m) => ({
        role: m.role,
        parts: [{ text: m.content }],
      }));

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
            contents: [
              ...history,
              { role: "user", parts: [{ text: input }] },
            ],
          }),
        }
      );

      const data  = await response.json();
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text
        || "Sorry, I couldn't understand that. Try asking about a specific route!";

      setMessages((prev) => [...prev, { role: "model", content: reply }]);
    } catch (err) {
      setMessages((prev) => [...prev, {
        role: "model",
        content: "Sorry, something went wrong. Please try again!",
      }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          position: "fixed", bottom: 80, right: 20,
          width: 52, height: 52, borderRadius: "50%",
          background: "#1976d2",
          border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 4px 20px rgba(25,118,210,0.4)",
          zIndex: 300,
        }}
      >
        <i className={`ti ${open ? "ti-x" : "ti-message-circle"}`}
           style={{ fontSize: 22, color: "#fff" }} />
      </button>

      {/* Chat window */}
      {open && (
        <div style={{
          position: "fixed", bottom: 144, right: 20,
          width: 300, maxHeight: 420,
          background: "#0d1e35",
          border: "0.5px solid rgba(255,255,255,0.15)",
          borderRadius: 16,
          display: "flex", flexDirection: "column",
          overflow: "hidden", zIndex: 300,
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        }}>

          {/* Header */}
          <div style={{ padding: "12px 14px", borderBottom: "0.5px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(100,181,246,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <i className="ti ti-robot" style={{ fontSize: 15, color: "#64b5f6" }} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: "#fff" }}>TransitGo AI</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Powered by Gemini</div>
            </div>
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#69f0ae" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#69f0ae", display: "inline-block", animation: "pulse 1.8s infinite" }} />
              Online
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "12px", display: "flex", flexDirection: "column", gap: 8 }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                <div style={{
                  maxWidth: "80%",
                  padding: "8px 12px",
                  borderRadius: msg.role === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                  background: msg.role === "user" ? "#1976d2" : "rgba(255,255,255,0.08)",
                  border: msg.role === "user" ? "none" : "0.5px solid rgba(255,255,255,0.12)",
                  fontSize: 13, color: "#fff", lineHeight: 1.5,
                }}>
                  {msg.content}
                </div>
              </div>
            ))}

            {/* Loading dots */}
            {loading && (
              <div style={{ display: "flex", gap: 4, padding: "4px 8px" }}>
                {[0, 1, 2].map((i) => (
                  <div key={i} style={{
                    width: 6, height: 6, borderRadius: "50%",
                    background: "#64b5f6",
                    animation: `pulse 1s ${i * 0.2}s infinite`,
                  }} />
                ))}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: "10px 12px", borderTop: "0.5px solid rgba(255,255,255,0.08)", display: "flex", gap: 8 }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Ask about routes..."
              style={{
                flex: 1,
                background: "rgba(255,255,255,0.06)",
                border: "0.5px solid rgba(255,255,255,0.12)",
                borderRadius: 10, padding: "8px 12px",
                fontSize: 13, color: "#fff",
              }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                background: input.trim() ? "#1976d2" : "rgba(255,255,255,0.08)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <i className="ti ti-send" style={{ fontSize: 16, color: "#fff" }} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}