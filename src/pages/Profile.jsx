import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Play,
  BookOpen,
  User,
  Edit3,
  Check,
  X,
  ChevronRight,
  Heart,
  Clock,
  Sparkles,
  Home,
  Star,
} from "lucide-react";
import { createPortal } from "react-dom";

// ─── Shared drama metadata ─────────────────────────────────────────────────────

const DRAMA_META = {
  1: { title: "糟糕，是心动", cover: "https://s3plus.meituan.net/mcopilot-pub/nocode-task/chenyanbo/6mbgt2myarbc4ceg1ypr9hempo7j5g/ep1_0s.jpg",                                              genre: "校园爱情", accent: "#C2185B" },
  2: { title: "心动禁区",     cover: "https://s3plus.meituan.net/mcopilot-pub/nocode-task/chenyanbo/7e9f3hxarnd9a9hfjsm60lu6gmak98/0%281%29.jpg",                                     genre: "校园言情", accent: "#7EB8E8" },
};

const CHAR_META = {
  "1": { name: "陆辰安", role: "篮球队学长",       image: "https://s3plus.meituan.net/mcopilot-pub/nocode-task/chenyanbo/nuofgzlquhoexwiygin2imt0c3z4kk/frame_003.jpg" },
  "2": { name: "苏念卿",         role: "神秘女子",  image: "https://s3plus.meituan.net/mcopilot-pub/nocode-task/chenyanbo/l69x125ljosgy5zqpfvgs7ev9p9lxg/frame_005.jpg" },
  "3": { name: "顾霄寒",     role: "冷酷对手",   image: "https://s3plus.meituan.net/mcopilot-pub/nocode-task/chenyanbo/84m3dngg6qhzuc01peernwqleoyb6q/frame_007.jpg" },
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function relativeTime(ts) {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60)    return "刚刚";
  if (diff < 3600)  return `${Math.floor(diff / 60)}分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
  return `${Math.floor(diff / 86400)}天前`;
}

// ─── Keyframes ─────────────────────────────────────────────────────────────────

const STYLES = `
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(14px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes shimmerBg {
    0%   { background-position: -200% center; }
    100% { background-position:  200% center; }
  }
  @keyframes popIn {
    0%   { transform: scale(0.92); opacity: 0; }
    100% { transform: scale(1);    opacity: 1; }
  }
  @keyframes overlayIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes sheetUp {
    from { transform: translateY(100%); }
    to   { transform: translateY(0); }
  }
`;

// ─── Section Header ────────────────────────────────────────────────────────────

const SectionHeader = ({ icon: Icon, title, count, accent = "#E8A87C" }) => (
  <div className="flex items-center justify-between px-5 mb-3">
    <div className="flex items-center gap-2">
      <div
        style={{
          width: "28px", height: "28px", borderRadius: "8px",
          background: `${accent}18`,
          border: `1px solid ${accent}30`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        <Icon size={13} style={{ color: accent }} />
      </div>
      <span className="font-serif" style={{ color: "#F5F0EB", fontSize: "15px", fontWeight: "600" }}>
        {title}
      </span>
      {count > 0 && (
        <span
          className="font-sans"
          style={{
            background: `${accent}20`, border: `1px solid ${accent}35`,
            color: accent, fontSize: "10px", fontWeight: "700",
            padding: "1px 7px", borderRadius: "999px",
          }}
        >
          {count}
        </span>
      )}
    </div>
  </div>
);

// ─── Watch History Card ────────────────────────────────────────────────────────

const WatchCard = ({ item, onClick }) => {
  const meta = DRAMA_META[item.dramaId];
  if (!meta) return null;
  return (
    <div
      onClick={onClick}
      style={{
        flexShrink: 0,
        width: "120px",
        cursor: "pointer",
        animation: "fadeUp 0.4s ease both",
      }}
    >
      {/* Cover */}
      <div
        style={{
          position: "relative",
          width: "120px",
          height: "160px",
          borderRadius: "12px",
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.07)",
          boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
          marginBottom: "8px",
        }}
      >
        <img
          src={meta.cover}
          alt={meta.title}
          className="mx-auto object-cover"
          style={{ width: "100%", height: "100%" }}
        />
        {/* Gradient overlay */}
        <div
          style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(to top, rgba(13,13,13,0.9) 0%, transparent 55%)",
          }}
        />
        {/* EP badge */}
        <div
          style={{
            position: "absolute", bottom: "8px", left: "8px",
            background: "rgba(13,13,13,0.85)",
            border: `1px solid ${meta.accent}50`,
            borderRadius: "6px",
            padding: "2px 7px",
          }}
        >
          <span className="font-sans" style={{ color: meta.accent, fontSize: "10px", fontWeight: "700" }}>
            EP{item.ep + 1}
          </span>
        </div>
        {/* Play icon */}
        <div
          style={{
            position: "absolute", top: "8px", right: "8px",
            width: "24px", height: "24px", borderRadius: "50%",
            background: "rgba(232,168,124,0.2)",
            border: "1px solid rgba(232,168,124,0.4)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <Play size={10} fill="#E8A87C" style={{ color: "#E8A87C", marginLeft: "1px" }} />
        </div>
      </div>
      {/* Title */}
      <p
        className="font-sans"
        style={{
          color: "#F5F0EB", fontSize: "11px", lineHeight: "1.4",
          overflow: "hidden", display: "-webkit-box",
          WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
        }}
      >
        {meta.title}
      </p>
      <p className="font-sans" style={{ color: "rgba(245,240,235,0.35)", fontSize: "10px", marginTop: "2px" }}>
        {relativeTime(item.time)}
      </p>
    </div>
  );
};

// ─── Persona Edit Sheet ────────────────────────────────────────────────────────

const PersonaSheet = ({ persona, onSave, onClose }) => {
  const [name, setName]   = useState(persona.name   || "");
  const [tagline, setTagline] = useState(persona.tagline || "");
  const inputRef = useRef(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 300);
  }, []);

  const PRESET_NAMES = ["Aria", "Luna", "Vivienne", "Celeste", "Elara", "Nova", "Seraphina", "Iris"];
  const PRESET_TAGS  = [
    "The one who got away",
    "Secretly in love",
    "Cold on the outside",
    "Hiding a secret",
    "Stronger than she looks",
    "Doesn't trust easily",
  ];

  return createPortal(
    <>
      <style>{`
        @keyframes overlayIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes sheetUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
      `}</style>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 9000,
          background: "rgba(0,0,0,0.65)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
          animation: "overlayIn 0.25s ease both",
        }}
      />
      {/* Sheet */}
      <div
        style={{
          position: "fixed", bottom: 0, left: 0, right: 0,
          zIndex: 9001,
          maxWidth: "480px", margin: "0 auto",
          borderRadius: "24px 24px 0 0",
          background: "rgba(16,8,24,0.99)",
          backdropFilter: "blur(32px)",
          WebkitBackdropFilter: "blur(32px)",
          border: "1px solid rgba(232,168,124,0.15)",
          borderBottom: "none",
          boxShadow: "0 -16px 48px rgba(0,0,0,0.7)",
          animation: "sheetUp 0.35s cubic-bezier(0.2,0,0,1) both",
          paddingBottom: "env(safe-area-inset-bottom, 16px)",
        }}
      >
        {/* Handle */}
        <div style={{ display: "flex", justifyContent: "center", paddingTop: "12px", paddingBottom: "4px" }}>
          <div style={{ width: "36px", height: "4px", borderRadius: "2px", background: "rgba(232,168,124,0.25)" }} />
        </div>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px 16px" }}>
          <span className="font-serif" style={{ color: "#F5F0EB", fontSize: "17px", fontWeight: "600" }}>
            My Persona
          </span>
          <button
            onClick={onClose}
            style={{
              width: "30px", height: "30px", borderRadius: "50%",
              background: "rgba(255,255,255,0.07)", border: "none",
              display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
            }}
          >
            <X size={15} style={{ color: "rgba(245,240,235,0.6)" }} />
          </button>
        </div>

        <div style={{ padding: "0 20px 20px", overflowY: "auto", maxHeight: "70vh" }}>
          {/* Name field */}
          <p className="font-sans" style={{ color: "rgba(245,240,235,0.5)", fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "8px" }}>
            你在故事中的名字
          </p>
          <div
            style={{
              display: "flex", alignItems: "center",
              padding: "12px 16px",
              borderRadius: "14px",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(232,168,124,0.25)",
              marginBottom: "12px",
            }}
          >
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="输入你的名字..."
              maxLength={20}
              className="flex-1 bg-transparent outline-none font-sans"
              style={{ color: "#F5F0EB", fontSize: "15px", caretColor: "#E8A87C" }}
            />
            {name && (
              <button onClick={() => setName("")} style={{ background: "none", border: "none", cursor: "pointer", padding: "0 0 0 8px" }}>
                <X size={14} style={{ color: "rgba(245,240,235,0.3)" }} />
              </button>
            )}
          </div>

          {/* Preset names */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "20px" }}>
            {PRESET_NAMES.map((n) => (
              <button
                key={n}
                onClick={() => setName(n)}
                style={{
                  padding: "5px 12px", borderRadius: "999px",
                  background: name === n ? "rgba(232,168,124,0.18)" : "rgba(255,255,255,0.04)",
                  border: name === n ? "1px solid rgba(232,168,124,0.5)" : "1px solid rgba(255,255,255,0.08)",
                  color: name === n ? "#E8A87C" : "rgba(245,240,235,0.5)",
                  fontSize: "12px", fontFamily: "sans-serif",
                  cursor: "pointer", transition: "all 0.15s",
                }}
              >
                {n}
              </button>
            ))}
          </div>

          {/* Tagline field */}
          <p className="font-sans" style={{ color: "rgba(245,240,235,0.5)", fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "8px" }}>
            角色标签
          </p>
          <div
            style={{
              padding: "12px 16px",
              borderRadius: "14px",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(155,89,182,0.2)",
              marginBottom: "12px",
            }}
          >
            <input
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="描述你的角色..."
              maxLength={40}
              className="w-full bg-transparent outline-none font-sans"
              style={{ color: "#F5F0EB", fontSize: "14px", caretColor: "#9B59B6" }}
            />
          </div>

          {/* Preset taglines */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "24px" }}>
            {PRESET_TAGS.map((t) => (
              <button
                key={t}
                onClick={() => setTagline(t)}
                style={{
                  padding: "9px 14px", borderRadius: "10px", textAlign: "left",
                  background: tagline === t ? "rgba(155,89,182,0.12)" : "rgba(255,255,255,0.03)",
                  border: tagline === t ? "1px solid rgba(155,89,182,0.4)" : "1px solid rgba(255,255,255,0.06)",
                  color: tagline === t ? "#C8A0D8" : "rgba(245,240,235,0.45)",
                  fontSize: "13px", fontFamily: "sans-serif",
                  cursor: "pointer", transition: "all 0.15s",
                  display: "flex", alignItems: "center", gap: "8px",
                }}
              >
                <Sparkles size={11} style={{ color: tagline === t ? "#9B59B6" : "rgba(245,240,235,0.2)", flexShrink: 0 }} />
                {t}
              </button>
            ))}
          </div>

          {/* Save button */}
          <button
            onClick={() => { onSave({ name, tagline }); onClose(); }}
            style={{
              width: "100%", padding: "14px",
              borderRadius: "14px",
              background: "linear-gradient(135deg, #E8A87C, #C8906A)",
              border: "none", cursor: "pointer",
              color: "#1A0E08", fontSize: "15px",
              fontFamily: "sans-serif", fontWeight: "700",
              boxShadow: "0 4px 20px rgba(232,168,124,0.35)",
            }}
          >
            Save Persona
          </button>
        </div>
      </div>
    </>,
    document.body
  );
};

// ─── Bottom Nav (same as Index) ────────────────────────────────────────────────

const BottomNav = ({ onNavigate }) => {
  const tabs = [
    { id: "home",  label: "Home",  icon: Home,     path: "/" },
    { id: "watch", label: "Watch", icon: Play,     path: "/player/1" },
    { id: "crave", label: "Crave", icon: Heart,    path: "/crave" },
    { id: "me",    label: "Me",    icon: User,     path: "/profile" },
  ];
  return createPortal(
    <div
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        background: "rgba(13,13,13,0.96)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderTop: "1px solid rgba(232,168,124,0.08)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        maxWidth: "480px",
        margin: "0 auto",
      }}
    >
      <div className="flex items-center justify-around px-2 py-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.id === "me";
          return (
            <button
              key={tab.id}
              onClick={() => onNavigate(tab.path)}
              className="flex flex-col items-center gap-1"
              style={{ minWidth: "60px" }}
            >
              <div className="relative">
                <Icon
                  size={22}
                  style={{
                    color: isActive ? "#E8A87C" : "rgba(245,240,235,0.35)",
                    transition: "color 0.2s",
                  }}
                />
                {isActive && (
                  <div
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                    style={{ background: "#E8A87C" }}
                  />
                )}
              </div>
              <span
                className="font-sans"
                style={{
                  fontSize: "9px",
                  color: isActive ? "#E8A87C" : "rgba(245,240,235,0.35)",
                  letterSpacing: "0.02em",
                }}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>,
    document.body
  );
};

// ─── Main Profile Page ─────────────────────────────────────────────────────────

const Profile = () => {
  const navigate = useNavigate();

  // ── Persona ──
  const [persona, setPersona] = useState(() => {
    try { return JSON.parse(localStorage.getItem("user_persona") || "{}"); }
    catch { return {}; }
  });
  const [showPersonaSheet, setShowPersonaSheet] = useState(false);

  const savePersona = (p) => {
    setPersona(p);
    localStorage.setItem("user_persona", JSON.stringify(p));
  };

  // ── Watch history ──
  const [watchHistory, setWatchHistory] = useState([]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("watch_history");
      setWatchHistory(raw ? JSON.parse(raw) : []);
    } catch { setWatchHistory([]); }
  }, []);

  // ── Stats ──
  const totalEps   = watchHistory.length;

  const displayName = persona.name || "Reader";
  const displayTag  = persona.tagline || "Tap to set your persona";

  return (
    <div
      style={{
        background: "#0D0D0D",
        maxWidth: "480px",
        margin: "0 auto",
        minHeight: "100vh",
        position: "relative",
      }}
    >
      <style>{STYLES}</style>

      {/* Ambient glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 40% at 50% 0%, rgba(155,89,182,0.07) 0%, transparent 55%)",
          zIndex: 0,
          maxWidth: "480px",
          margin: "0 auto",
        }}
      />

      <div className="relative z-10 pb-28">

        {/* ── Hero / User Card ── */}
        <div
          style={{
            position: "relative",
            padding: "max(48px, calc(env(safe-area-inset-top, 0px) + 48px)) 20px 24px",
            background: "linear-gradient(180deg, rgba(155,89,182,0.12) 0%, transparent 100%)",
            borderBottom: "1px solid rgba(232,168,124,0.08)",
            animation: "fadeUp 0.5s ease both",
          }}
        >
          {/* Avatar + edit persona */}
          <div style={{ display: "flex", alignItems: "flex-end", gap: "16px", marginBottom: "16px" }}>
            {/* Avatar circle */}
            <div
              style={{
                width: "72px", height: "72px", borderRadius: "50%",
                background: "linear-gradient(135deg, #E8A87C 0%, #9B59B6 100%)",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
                boxShadow: "0 0 24px rgba(232,168,124,0.3), 0 0 48px rgba(155,89,182,0.15)",
                border: "2px solid rgba(232,168,124,0.3)",
              }}
            >
              <span
                className="font-serif"
                style={{ color: "#0D0D0D", fontSize: "28px", fontWeight: "700", lineHeight: 1 }}
              >
                {displayName.charAt(0).toUpperCase()}
              </span>
            </div>

            {/* Name + tagline */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                <span className="font-serif" style={{ color: "#F5F0EB", fontSize: "20px", fontWeight: "700" }}>
                  {displayName}
                </span>
                <button
                  onClick={() => setShowPersonaSheet(true)}
                  style={{
                    width: "24px", height: "24px", borderRadius: "50%",
                    background: "rgba(232,168,124,0.12)",
                    border: "1px solid rgba(232,168,124,0.3)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer",
                  }}
                >
                  <Edit3 size={11} style={{ color: "#E8A87C" }} />
                </button>
              </div>
              <p
                className="font-sans italic"
                style={{
                  color: persona.tagline ? "rgba(200,160,216,0.8)" : "rgba(245,240,235,0.3)",
                  fontSize: "12px",
                  cursor: "pointer",
                }}
                onClick={() => setShowPersonaSheet(true)}
              >
                {displayTag}
              </p>
            </div>
          </div>

          {/* Stats row */}
          <div
            style={{
              display: "flex", gap: "12px",
            }}
          >
            {[
              { label: "Episodes", value: totalEps,     icon: Play,     accent: "#E8A87C" },
              { label: "Dramas",   value: Object.keys(
                  watchHistory.reduce((acc, h) => {
                    acc[h.dramaId] = true; return acc;
                  }, {})
                ).length,                               icon: Star,     accent: "#C2185B" },
            ].map(({ label, value, icon: Icon, accent }) => (
              <div
                key={label}
                style={{
                  flex: 1,
                  padding: "10px 12px",
                  borderRadius: "12px",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  textAlign: "center",
                }}
              >
                <Icon size={14} style={{ color: accent, margin: "0 auto 4px" }} />
                <p className="font-serif" style={{ color: "#F5F0EB", fontSize: "18px", fontWeight: "700", lineHeight: 1 }}>
                  {value}
                </p>
                <p className="font-sans" style={{ color: "rgba(245,240,235,0.35)", fontSize: "10px", marginTop: "2px" }}>
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ── My Persona Card ── */}
        <div style={{ padding: "24px 20px 0", animation: "fadeUp 0.5s ease 0.05s both" }}>
          <SectionHeader icon={User} title="My Persona" accent="#9B59B6" />
          <button
            onClick={() => setShowPersonaSheet(true)}
            style={{
              width: "100%",
              padding: "16px",
              borderRadius: "16px",
              background: "rgba(155,89,182,0.06)",
              border: "1px solid rgba(155,89,182,0.18)",
              display: "flex", alignItems: "center", gap: "14px",
              cursor: "pointer",
              transition: "background 0.2s",
            }}
          >
            {/* Avatar mini */}
            <div
              style={{
                width: "48px", height: "48px", borderRadius: "50%",
                background: "linear-gradient(135deg, #E8A87C 0%, #9B59B6 100%)",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
                boxShadow: "0 0 12px rgba(155,89,182,0.3)",
              }}
            >
              <span className="font-serif" style={{ color: "#0D0D0D", fontSize: "20px", fontWeight: "700" }}>
                {displayName.charAt(0).toUpperCase()}
              </span>
            </div>

            <div style={{ flex: 1, textAlign: "left" }}>
              <p className="font-sans" style={{ color: "#F5F0EB", fontSize: "14px", fontWeight: "600", marginBottom: "3px" }}>
                {displayName}
              </p>
              <p className="font-sans italic" style={{ color: persona.tagline ? "rgba(200,160,216,0.7)" : "rgba(245,240,235,0.25)", fontSize: "12px" }}>
                {persona.tagline || "No tagline set yet"}
              </p>
            </div>

            <div
              style={{
                width: "32px", height: "32px", borderRadius: "50%",
                background: "rgba(155,89,182,0.15)",
                border: "1px solid rgba(155,89,182,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Edit3 size={13} style={{ color: "#9B59B6" }} />
            </div>
          </button>
        </div>

        {/* ── Watch History ── */}
        <div style={{ paddingTop: "28px", animation: "fadeUp 0.5s ease 0.1s both" }}>
          <SectionHeader icon={Play} title="Watch History" count={watchHistory.length} accent="#E8A87C" />

          {watchHistory.length === 0 ? (
            <div
              style={{
                margin: "0 20px",
                padding: "28px 20px",
                borderRadius: "16px",
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.05)",
                textAlign: "center",
              }}
            >
              <Play size={28} style={{ color: "rgba(245,240,235,0.15)", margin: "0 auto 10px" }} />
              <p className="font-sans" style={{ color: "rgba(245,240,235,0.3)", fontSize: "13px" }}>
                No episodes watched yet
              </p>
              <button
                onClick={() => navigate("/")}
                style={{
                  marginTop: "12px",
                  padding: "8px 20px", borderRadius: "999px",
                  background: "rgba(232,168,124,0.12)",
                  border: "1px solid rgba(232,168,124,0.25)",
                  color: "#E8A87C", fontSize: "12px",
                  fontFamily: "sans-serif", cursor: "pointer",
                }}
              >
                Browse dramas
              </button>
            </div>
          ) : (
            <div
              style={{
                display: "flex", gap: "12px",
                overflowX: "auto", padding: "4px 20px 8px",
                scrollbarWidth: "none",
              }}
            >
              {watchHistory.map((item, i) => (
                <WatchCard
                  key={`${item.dramaId}_${item.ep}_${i}`}
                  item={item}
                  onClick={() => navigate(`/player/${item.dramaId}`)}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Settings row ── */}
        <div style={{ padding: "28px 20px 0", animation: "fadeUp 0.5s ease 0.2s both" }}>
          <div
            style={{
              borderRadius: "16px",
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
              overflow: "hidden",
            }}
          >
            {[
              { label: "Notifications", sub: "Manage alerts" },
              { label: "Language",      sub: "English" },
              { label: "Privacy",       sub: "Data & permissions" },
              { label: "About AfterLine", sub: "v1.0.0" },
            ].map((item, i, arr) => (
              <div
                key={item.label}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "14px 16px",
                  borderBottom: i < arr.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
                  cursor: "pointer",
                }}
              >
                <div>
                  <p className="font-sans" style={{ color: "rgba(245,240,235,0.75)", fontSize: "13px" }}>{item.label}</p>
                  <p className="font-sans" style={{ color: "rgba(245,240,235,0.3)", fontSize: "11px", marginTop: "1px" }}>{item.sub}</p>
                </div>
                <ChevronRight size={15} style={{ color: "rgba(245,240,235,0.25)" }} />
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Bottom Nav */}
      <BottomNav onNavigate={(path) => navigate(path)} />

      {/* Persona Sheet */}
      {showPersonaSheet && (
        <PersonaSheet
          persona={persona}
          onSave={savePersona}
          onClose={() => setShowPersonaSheet(false)}
        />
      )}
    </div>
  );
};

export default Profile;
