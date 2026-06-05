import { useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Home, Play, Heart, User, Plus, X, ChevronRight, Sparkles, Clock } from "lucide-react";

// ─── Keyframes ────────────────────────────────────────────────────────────────

const STYLES = `
  @keyframes craveSlideUp {
    from { opacity: 0; transform: translateY(100%); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes craveFadeIn {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes intimacyFill {
    from { width: 0%; }
    to   { width: var(--target-width); }
  }
`;

// ─── Data ─────────────────────────────────────────────────────────────────────

const MY_REWRITES = [
  {
    id: "rw1",
    name: "沈彦希",
    drama: "心动禁区",
    dramaId: "2",
    charId: "1",
    lastChat: "刚刚",
    intimacy: 65,
    image: "https://s3plus.meituan.net/mcopilot-pub/nocode-task/chenyanbo/ujnj6kjw27ro1feytk76v2lr4ztv2r/ep1_60s.jpg",
  },
];

const FEATURED_DRAMAS = [
  {
    id: 2,
    title: "心动禁区",
    genre: "校园言情",
    image: "https://s3plus.meituan.net/mcopilot-pub/nocode-task/chenyanbo/7e9f3hxarnd9a9hfjsm60lu6gmak98/0%281%29.jpg",
  },
  {
    id: 1,
    title: "心动禁区",
    genre: "校园言情",
    image: "https://s3plus.meituan.net/mcopilot-pub/nocode-task/chenyanbo/7e9f3hxarnd9a9hfjsm60lu6gmak98/0%281%29.jpg",
  },
];

// ─── Bottom Nav ───────────────────────────────────────────────────────────────

const BottomNav = ({ active, onNavigate }) => {
  const tabs = [
    { id: "home",  label: "首页",  icon: Home,  path: "/" },
    { id: "watch", label: "追剧", icon: Play,  path: "/player/2" },
    { id: "crave", label: "心动", icon: Heart, path: "/crave" },
    { id: "me",    label: "我的",    icon: User,  path: "/profile" },
  ];

  return createPortal(
    <div
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        background: "rgba(13,13,13,0.96)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <div className="flex items-center justify-around px-2 py-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = active === tab.id;
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
                  transition: "color 0.2s",
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

// ─── Intimacy Bar ─────────────────────────────────────────────────────────────

const IntimacyBar = ({ value }) => {
  const color =
    value >= 60 ? "#E8A87C" : value >= 35 ? "#9B59B6" : "rgba(245,240,235,0.3)";
  const label =
    value >= 60 ? "深情" : value >= 35 ? "暖意" : "疏远";

  return (
    <div className="flex items-center gap-2 mt-2">
      <div
        className="flex-1 rounded-full overflow-hidden"
        style={{ height: "3px", background: "rgba(255,255,255,0.08)" }}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${value}%`,
            background: `linear-gradient(90deg, ${color}, ${color}cc)`,
            "--target-width": `${value}%`,
            animation: "intimacyFill 0.8s cubic-bezier(0.34,1.56,0.64,1) forwards",
          }}
        />
      </div>
      <span
        className="font-sans flex-shrink-0"
        style={{ color, fontSize: "10px", fontWeight: "600", minWidth: "40px" }}
      >
        {label}
      </span>
    </div>
  );
};

// ─── ReWrite Card ─────────────────────────────────────────────────────────────

const ReWriteCard = ({ item, onClick }) => (
  <button
    onClick={onClick}
    className="w-full flex items-center gap-4 px-5 py-4 text-left transition-all duration-200 active:scale-98"
    style={{
      background: "rgba(255,255,255,0.03)",
      borderBottom: "1px solid rgba(255,255,255,0.05)",
      animation: "craveFadeIn 0.4s ease both",
    }}
  >
    {/* Avatar */}
    <div className="relative flex-shrink-0">
      <img
        src={item.image}
        alt={item.name}
        className="object-cover rounded-full"
        style={{
          width: "64px",
          height: "64px",
          border: "2px solid rgba(232,168,124,0.3)",
          boxShadow: "0 0 16px rgba(232,168,124,0.15)",
        }}
      />
      {/* Online dot */}
      <div
        className="absolute bottom-0.5 right-0.5 rounded-full"
        style={{
          width: "10px",
          height: "10px",
          background: "#27AE60",
          border: "2px solid #0D0D0D",
        }}
      />
    </div>

    {/* Info */}
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between mb-0.5">
        <p
          className="font-serif truncate"
          style={{ color: "#F5F0EB", fontSize: "15px", fontWeight: "600" }}
        >
          {item.name}
        </p>
        <ChevronRight size={14} style={{ color: "rgba(245,240,235,0.25)", flexShrink: 0 }} />
      </div>
      <p
        className="font-sans truncate mb-1"
        style={{ color: "rgba(245,240,235,0.45)", fontSize: "11px" }}
      >
        {item.drama}
      </p>
      <div className="flex items-center gap-1">
        <Clock size={9} style={{ color: "rgba(245,240,235,0.3)" }} />
        <span
          className="font-sans"
          style={{ color: "rgba(245,240,235,0.3)", fontSize: "10px" }}
        >
          {item.lastChat}
        </span>
      </div>
      <IntimacyBar value={item.intimacy} />
    </div>
  </button>
);

// ─── New Story Panel ──────────────────────────────────────────────────────────

const NewStoryPanel = ({ onClose }) => (
  <div className="absolute inset-0 z-40" style={{ pointerEvents: "auto" }}>
    {/* Backdrop */}
    <div
      className="absolute inset-0"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    />

    {/* Sheet */}
    <div
      className="absolute inset-x-0 bottom-0 rounded-t-3xl flex flex-col"
      style={{
        background: "rgba(16,8,24,0.98)",
        backdropFilter: "blur(28px)",
        WebkitBackdropFilter: "blur(28px)",
        border: "1px solid rgba(232,168,124,0.12)",
        borderBottom: "none",
        boxShadow: "0 -24px 60px rgba(155,89,182,0.2)",
        animation: "craveSlideUp 0.38s cubic-bezier(0.34,1.2,0.64,1)",
        maxHeight: "72vh",
        paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)",
      }}
    >
      {/* Handle */}
      <div className="flex justify-center pt-3 pb-1">
        <div
          className="rounded-full"
          style={{ width: "36px", height: "4px", background: "rgba(232,168,124,0.25)" }}
        />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4">
        <div>
          <h3
            className="font-serif"
            style={{ color: "#F5F0EB", fontSize: "18px", fontWeight: "700" }}
          >
            开始新故事
          </h3>
          <p
            className="font-sans mt-0.5"
            style={{ color: "rgba(245,240,235,0.4)", fontSize: "12px" }}
          >
            选一部剧开始改编
          </p>
        </div>
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <X size={16} style={{ color: "rgba(245,240,235,0.6)" }} />
        </button>
      </div>

      {/* Drama list */}
      <div className="flex-1 overflow-y-auto px-4 pb-2" style={{ scrollbarWidth: "none" }}>
        <div className="flex flex-col gap-2">
          {FEATURED_DRAMAS.map((drama) => (
            <button
              key={drama.id}
              onClick={onClose}
              className="flex items-center gap-3 w-full px-3 py-3 rounded-2xl text-left transition-all duration-200 active:scale-98"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(232,168,124,0.12)",
              }}
            >
              <img
                src={drama.image}
                alt={drama.title}
                className="object-cover rounded-xl flex-shrink-0"
                style={{ width: "52px", height: "52px" }}
              />
              <div className="flex-1 min-w-0">
                <p
                  className="font-serif truncate"
                  style={{ color: "#F5F0EB", fontSize: "14px", fontWeight: "600" }}
                >
                  {drama.title}
                </p>
                <p
                  className="font-sans mt-0.5"
                  style={{ color: "rgba(232,168,124,0.6)", fontSize: "11px" }}
                >
                  {drama.genre}
                </p>
              </div>
              <div
                className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center"
                style={{
                  background: "rgba(232,168,124,0.1)",
                  border: "1px solid rgba(232,168,124,0.25)",
                }}
              >
                <Sparkles size={12} style={{ color: "#E8A87C" }} />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  </div>
);

// ─── Crave Page ───────────────────────────────────────────────────────────────

const Crave = () => {
  const navigate = useNavigate();
  const [showPanel, setShowPanel] = useState(false);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#0D0D0D",
        maxWidth: "480px",
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <style>{STYLES}</style>

      {/* ── Header ── */}
      <div
        className="flex-shrink-0 px-5"
        style={{
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 20px)",
          paddingBottom: "16px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div className="flex items-start justify-between">
          <div>
            <h1
              className="font-serif"
              style={{
                color: "#F5F0EB",
                fontSize: "26px",
                fontWeight: "700",
                letterSpacing: "-0.02em",
                lineHeight: "1.2",
              }}
            >
              我的故事线
            </h1>
            <p
              className="font-sans mt-1"
              style={{ color: "rgba(245,240,235,0.4)", fontSize: "13px" }}
            >
              你的平行剧情
            </p>
          </div>
          {/* Story count badge */}
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full mt-1"
            style={{
              background: "rgba(232,168,124,0.1)",
              border: "1px solid rgba(232,168,124,0.25)",
            }}
          >
            <Sparkles size={11} style={{ color: "#E8A87C" }} />
            <span
              className="font-sans"
              style={{ color: "#E8A87C", fontSize: "11px", fontWeight: "600" }}
            >
              {MY_REWRITES.length} 个故事
            </span>
          </div>
        </div>
      </div>

      {/* ── Card List ── */}
      <div
        className="flex-1 overflow-y-auto"
        style={{ scrollbarWidth: "none", paddingBottom: "100px" }}
      >
        {MY_REWRITES.map((item, i) => (
          <div key={item.id} style={{ animationDelay: `${i * 0.08}s` }}>
            <ReWriteCard
              item={item}
              onClick={() => navigate(`/chat/${item.dramaId}/${item.charId}`)}
            />
          </div>
        ))}

        {/* Section divider */}
        <div className="px-5 pt-6 pb-2">
          <p
            className="font-sans"
            style={{
              color: "rgba(245,240,235,0.2)",
              fontSize: "10px",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            点击继续故事 · 点+开始新故事
          </p>
        </div>
      </div>

      {/* ── FAB: New Story ── */}
      <button
        onClick={() => setShowPanel(true)}
        className="fixed flex items-center gap-2 rounded-full transition-all duration-200 active:scale-95"
        style={{
bottom: "calc(env(safe-area-inset-bottom, 0px) + 76px)",
right: "20px",
          background: "linear-gradient(135deg, #E8A87C, #C2185B)",
          boxShadow: "0 4px 24px rgba(232,168,124,0.45), 0 0 48px rgba(194,24,91,0.2)",
          padding: "12px 20px",
          zIndex: 30,
        }}
      >
        <Plus size={18} style={{ color: "#fff" }} />
        <span
          className="font-sans"
          style={{ color: "#fff", fontSize: "14px", fontWeight: "700" }}
        >
          新故事
        </span>
      </button>

      {/* ── New Story Panel ── */}
      {showPanel && <NewStoryPanel onClose={() => setShowPanel(false)} />}

      <BottomNav active="crave" onNavigate={(path) => navigate(path)} />
    </div>
  );
};

export default Crave;
