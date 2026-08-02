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

const SUGGESTED_PROMPTS = [
  "Fare from SM City to Ayala?",
  "Fastest way to IT Park?",
  "Is there a student discount?",
  "Best time to avoid traffic?",
];

function formatInline(text, keyPrefix) {
  return text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean).map((part, i) => {
    const key = `${keyPrefix}-${i}`;
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={key}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={key}>{part.slice(1, -1)}</em>;
    }
    return part;
  });
}

function ChatMessage({ content }) {
  const normalized = content.replace(/(\*\*[^*]+\*\*)|(\*(?!\*)\s+)/g, (m, bold, bullet) => bullet ? "\n* " : m);
  const lines = normalized.split("\n").map((l) => l.trim()).filter(Boolean);

  const blocks = [];
  let list = null;
  for (const line of lines) {
    const bullet = line.match(/^\*\s+(.*)/);
    if (bullet) {
      if (!list) { list = []; blocks.push({ type: "list", items: list }); }
      list.push(bullet[1]);
    } else {
      list = null;
      blocks.push({ type: "p", text: line });
    }
  }

  return blocks.map((block, i) =>
    block.type === "list" ? (
      <ul key={i} style={{ margin: "4px 0", paddingLeft: 18 }}>
        {block.items.map((item, j) => (
          <li key={j} style={{ marginBottom: 2 }}>{formatInline(item, `${i}-${j}`)}</li>
        ))}
      </ul>
    ) : (
      <p key={i} style={{ margin: i === 0 ? 0 : "6px 0 0" }}>{formatInline(block.text, `${i}`)}</p>
    )
  );
}

export default function AiChat() {
  const [open, setOpen]       = useState(false);
  const [messages, setMessages] = useState([
    { role: "model", content: "Hi, I'm the TransitGo assistant. Ask me about Cebu routes, fares, or travel tips." }
  ]);
  const [input,   setInput]   = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(text) {
    const content = (text ?? input).trim();
    if (!content || loading) return;

    const userMsg = { role: "user", content };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const history = messages.map((m) => ({
        role: m.role,
        parts: [{ text: m.content }],
      }));

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
            contents: [
              ...history,
              { role: "user", parts: [{ text: content }] },
            ],
          }),
        }
      );

      const data  = await response.json();
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text
        || "Sorry, I couldn't understand that. Try asking about a specific route!";

      setMessages((prev) => [...prev, { role: "model", content: reply }]);
    } catch (err) {
      console.error(err);
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
          width: 48, height: 48, borderRadius: "50%",
          background: "#131a24",
          border: "1px solid rgba(226,165,58,0.4)",
          cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 4px 16px rgba(0,0,0,0.35)",
          zIndex: 300,
        }}
      >
        <i className={`ti ${open ? "ti-x" : "ti-message-circle"}`}
           style={{ fontSize: 20, color: "#e2a53a" }} />
      </button>

      {/* Chat window */}
      {open && (
        <div style={{
          position: "fixed", bottom: 138, right: 20,
          width: 300, maxHeight: 420,
          background: "#0d1420",
          border: "1px solid rgba(255,255,255,0.14)",
          borderRadius: 8,
          display: "flex", flexDirection: "column",
          overflow: "hidden", zIndex: 300,
          boxShadow: "0 8px 28px rgba(0,0,0,0.4)",
        }}>

          {/* Header */}
          <div style={{ padding: "12px 14px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", gap: 9 }}>
            <div style={{ width: 26, height: 20, border: "1.5px solid #e2a53a", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontFamily: "'Fira Code', monospace", fontSize: 10, fontWeight: 600, color: "#e2a53a" }}>TG</span>
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>TransitGo Assistant</div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "12px", display: "flex", flexDirection: "column", gap: 8 }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                <div style={{
                  maxWidth: "80%",
                  padding: "8px 12px",
                  borderRadius: msg.role === "user" ? "8px 8px 2px 8px" : "8px 8px 8px 2px",
                  background: msg.role === "user" ? "#e2a53a" : "rgba(255,255,255,0.07)",
                  border: msg.role === "user" ? "none" : "1px solid rgba(255,255,255,0.10)",
                  fontSize: 13, color: msg.role === "user" ? "#1a1408" : "#fff", lineHeight: 1.5,
                }}>
                  {msg.role === "model" ? <ChatMessage content={msg.content} /> : msg.content}
                </div>
              </div>
            ))}

            {messages.length === 1 && !loading && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 2 }}>
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => sendMessage(prompt)}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 4,
                      border: "1px solid rgba(226,165,58,0.35)",
                      background: "rgba(226,165,58,0.08)",
                      color: "#e2a53a",
                      fontSize: 12,
                      textAlign: "left",
                    }}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}

            {/* Loading dots */}
            {loading && (
              <div style={{ display: "flex", gap: 4, padding: "4px 8px" }}>
                {[0, 1, 2].map((i) => (
                  <div key={i} style={{
                    width: 6, height: 6, borderRadius: "50%",
                    background: "#e2a53a",
                    animation: `pulse 1s ${i * 0.2}s infinite`,
                  }} />
                ))}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: "10px 12px", borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", gap: 8 }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Ask about routes..."
              style={{
                flex: 1,
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.10)",
                borderRadius: 6, padding: "8px 12px",
                fontSize: 13, color: "#fff",
              }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              style={{
                width: 34, height: 34, borderRadius: 6, flexShrink: 0,
                background: input.trim() ? "#e2a53a" : "rgba(255,255,255,0.08)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <i className="ti ti-send" style={{ fontSize: 15, color: input.trim() ? "#1a1408" : "#fff" }} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
