import { useState, useRef, useEffect } from "react";
import AiChatMap from "./AiChatMap";
import { useAuth } from "../context/AuthContext";
import { fetchAiChatReply } from "../api/ai";

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

export default function AiChat({ isGuest = false }) {
  const { exitGuestMode } = useAuth();
  const [open, setOpen]       = useState(false);
  const [showMap, setShowMap] = useState(false);
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

      const reply = await fetchAiChatReply(content, history);
      setMessages((prev) => [...prev, { role: "model", content: reply || "Sorry, I couldn't understand that. Try asking about a specific route!" }]);
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
          position: "fixed", bottom: "calc(var(--bottom-nav-height) + 16px)", right: 16,
          width: 48, height: 48, borderRadius: "50%",
          background: "var(--accent-primary)",
          border: "none",
          cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 8px 20px rgba(var(--shadow-rgb), 0.28)",
          zIndex: 300,
        }}
      >
        <i className={`ti ${open ? "ti-x" : isGuest ? "ti-lock" : "ti-message-circle"}`}
           style={{ fontSize: 20, color: "#04170a" }} />
      </button>

      {/* Chat window */}
      {open && isGuest && (
        <div className="ai-chat-window" style={{
          position: "fixed",
          bottom: "calc(var(--bottom-nav-height) + 74px)",
          right: 16, left: 16, margin: "0 auto",
          width: "auto", maxWidth: 340,
          background: "var(--bg-surface)",
          border: "1px solid rgba(var(--border-rgb), 0.14)",
          borderRadius: 16,
          overflow: "hidden", zIndex: 300,
          boxShadow: "0 12px 32px rgba(var(--shadow-rgb), 0.18)",
          fontFamily: "'Inter', system-ui, sans-serif",
          transformOrigin: "bottom right",
          padding: "24px 20px",
          display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 10,
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: "50%",
            background: "rgba(var(--accent-primary-rgb), 0.10)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <i className="ti ti-lock" style={{ fontSize: 20, color: "var(--accent-primary)" }} />
          </div>
          <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
            Sign in to chat with TransitGo AI
          </p>
          <p style={{ fontSize: 12.5, color: "var(--text-faint)", margin: 0, lineHeight: 1.5 }}>
            The AI assistant is available to signed-in riders. Create a free account to unlock it.
          </p>
          <button
            type="button"
            onClick={exitGuestMode}
            style={{
              marginTop: 6, width: "100%", padding: "10px 16px", borderRadius: 10,
              background: "var(--accent-primary)", border: "none", cursor: "pointer",
              fontSize: 13.5, fontWeight: 600, color: "#04170a",
            }}
          >
            Sign In / Create Account
          </button>
        </div>
      )}
      {open && !isGuest && (
        <div className="ai-chat-window" style={{
          position: "fixed",
          bottom: "calc(var(--bottom-nav-height) + 74px)",
          right: 16, left: 16, margin: "0 auto",
          width: "auto", maxWidth: 340,
          height: "min(70vh, 460px)",
          background: "var(--bg-surface)",
          border: "1px solid rgba(var(--border-rgb), 0.14)",
          borderRadius: 16,
          display: "flex", flexDirection: "column",
          overflow: "hidden", zIndex: 300,
          boxShadow: "0 12px 32px rgba(var(--shadow-rgb), 0.18)",
          fontFamily: "'Inter', system-ui, sans-serif",
          transformOrigin: "bottom right",
        }}>

          {/* Header */}
          <div style={{ padding: "12px 14px", borderBottom: "1px solid rgba(var(--border-rgb), 0.10)", background: "var(--bg-surface-alt)", display: "flex", alignItems: "center", gap: 9 }}>
            <div style={{ width: 26, height: 20, border: "1.5px solid var(--accent-primary)", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontFamily: "'Fira Code', monospace", fontSize: 10, fontWeight: 600, color: "var(--accent-primary)" }}>TG</span>
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", flex: 1 }}>TransitGo Assistant</div>
            <button
              onClick={() => setShowMap((v) => !v)}
              title={showMap ? "Back to chat" : "Show map"}
              style={{
                width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                background: showMap ? "var(--accent-primary)" : "rgba(var(--accent-primary-rgb), 0.08)",
                border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <i className={`ti ${showMap ? "ti-message-circle" : "ti-map-2"}`}
                 style={{ fontSize: 15, color: showMap ? "#04170a" : "var(--accent-primary)" }} />
            </button>
          </div>

          {showMap ? (
            <AiChatMap />
          ) : (
            <>
          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "12px", display: "flex", flexDirection: "column", gap: 8 }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                <div style={{
                  maxWidth: "80%",
                  padding: "8px 12px",
                  borderRadius: msg.role === "user" ? "10px 10px 2px 10px" : "10px 10px 10px 2px",
                  background: msg.role === "user" ? "var(--accent-primary)" : "var(--bg-surface-alt)",
                  border: msg.role === "user" ? "none" : "1px solid rgba(var(--border-rgb), 0.10)",
                  fontSize: 13, color: msg.role === "user" ? "#04170a" : "var(--text-primary)", lineHeight: 1.5,
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
                      borderRadius: 8,
                      border: "1px solid rgba(var(--accent-primary-rgb), 0.20)",
                      background: "var(--bg-surface-alt)",
                      color: "var(--accent-primary)",
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
                    background: "var(--accent-primary)",
                    animation: `pulse 1s ${i * 0.2}s infinite`,
                  }} />
                ))}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: "10px 12px", borderTop: "1px solid rgba(var(--border-rgb), 0.10)", display: "flex", gap: 8 }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Ask about routes..."
              style={{
                flex: 1,
                background: "var(--bg-surface-alt)",
                border: "1px solid rgba(var(--border-rgb), 0.14)",
                borderRadius: 8, padding: "8px 12px",
                fontSize: 16, color: "var(--text-primary)",
              }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              style={{
                width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                background: input.trim() ? "var(--accent-primary)" : "var(--bg-disabled)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <i className="ti ti-send" style={{ fontSize: 15, color: input.trim() ? "#04170a" : "var(--text-faint)" }} />
            </button>
          </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
