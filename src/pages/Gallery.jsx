import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Lock, X, ChevronLeft, ChevronRight, Sparkles, Star, MessageCircle } from "lucide-react";

// ─── Keyframes ─────────────────────────────────────────────────────────────────

const KEYFRAMES = `
  @keyframes shimmer {
    0%   { background-position: -200% center; }
    100% { background-position:  200% center; }
  }
  @keyframes toastSlide {
    0%   { opacity: 0; transform: translateY(20px) scale(0.95); }
    12%  { opacity: 1; transform: translateY(0)    scale(1); }
    80%  { opacity: 1; transform: translateY(0)    scale(1); }
    100% { opacity: 0; transform: translateY(8px)  scale(0.97); }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes scaleIn {
    from { opacity: 0; transform: scale(0.92); }
    to   { opacity: 1; transform: scale(1); }
  }
  @keyframes ringFill {
    from { stroke-dashoffset: 100; }
    to   { stroke-dashoffset: var(--dash-offset); }
  }
  @keyframes unlockPulse {
    0%,100% { box-shadow: 0 0 0 0 rgba(232,168,124,0.4); }
    50%     { box-shadow: 0 0 0 8px rgba(232,168,124,0); }
  }
`;

// ─── CG Data ───────────────────────────────────────────────────────────────────

const DRAMA_INFO = {
  "1": { name: "糟糕，是心动", total: 12, unlocked: 3 },
  "2": { name: "午夜继承人", total: 10, unlocked: 2 },
};

const CG_ITEMS = [
  { id: 1, title: "初次相遇", subtitle: "第1集 · 教室", unlocked: true, image: "https://s3plus.meituan.net/mcopilot-pub/nocode-task/chenyanbo/59frjyxeorfplj0uzmoshfoxb56b7a/01_0s.jpg", rarity: "Common" },
  { id: 2, title: "心动瞬间", subtitle: "第1集 · 颁奖", unlocked: true, image: "https://s3plus.meituan.net/mcopilot-pub/nocode-task/chenyanbo/5s1t93ht42nbsqc6rfhwyxja9p2cy7/01_60s.jpg", rarity: "Rare" },
  { id: 3, title: "运动会邂逅", subtitle: "第2集 · 赛场", unlocked: true, image: "https://s3plus.meituan.net/mcopilot-pub/nocode-task/chenyanbo/vnnumtyjagyoptzxndmme0h08kfji2/02_40s.jpg", rarity: "Epic" },
  { id: 4, title: "三人对峙", subtitle: "第2集 · 球场", unlocked: false, condition: "看到第2集", image: "https://s3plus.meituan.net/mcopilot-pub/nocode-task/chenyanbo/bnz3ee9zjms6yu26ecevf4fkd6cjtb/02_100s.jpg", rarity: "Epic" },
  { id: 5, title: "趣味马拉松", subtitle: "第3集 · 赛道", unlocked: false, condition: "看到第3集", image: "https://s3plus.meituan.net/mcopilot-pub/nocode-task/chenyanbo/qkd5zcevtlnh3nb4ceqxjyoofb3hp2/03_40s.jpg", rarity: "Rare" },
  { id: 6, title: "樱花告白", subtitle: "第3集 · 樱花道", unlocked: false, condition: "看到第3集", image: "https://s3plus.meituan.net/mcopilot-pub/nocode-task/chenyanbo/uggdo7dkbzlnp9zfry3mfeszisimde/03_60s.jpg", rarity: "Legendary" },
  { id: 7, title: "转学生登场", subtitle: "第4集 · 教室", unlocked: false, condition: "看到第4集", image: "https://s3plus.meituan.net/mcopilot-pub/nocode-task/chenyanbo/mfjnumhwu26htaoz1rkypz2j657d4v/04_60s.jpg", rarity: "Rare" },
  { id: 8, title: "糟糕是心动", subtitle: "第4集 · 走廊", unlocked: false, condition: "看到第4集", image: "https://s3plus.meituan.net/mcopilot-pub/nocode-task/chenyanbo/4812vbrrxddnjwm7sa0lfhd1pjqw4i/04_140s.jpg", rarity: "Epic" },
  { id: 9, title: "图书馆邂逅", subtitle: "第5集 · 图书馆", unlocked: false, condition: "看到第5集", image: "https://s3plus.meituan.net/mcopilot-pub/nocode-task/chenyanbo/n2b2vujn08dwm3jq3e28z3t4lverug/05%281%29_20s.jpg", rarity: "Rare" },
  { id: 10, title: "小王子的约定", subtitle: "第5集 · 图书馆", unlocked: false, condition: "看到第5集", image: "https://s3plus.meituan.net/mcopilot-pub/nocode-task/chenyanbo/c7vsfvkqcqputjq342znkr0yz5a109/05%281%29_60s.jpg", rarity: "Legendary" },
  { id: 11, title: "放学同行", subtitle: "第5集 · 小巷", unlocked: false, condition: "看到第5集", image: "https://s3plus.meituan.net/mcopilot-pub/nocode-task/chenyanbo/fhs1k3y92kgxtnprnmy1qh4hfunnch/05%281%29_80s.jpg", rarity: "Epic" },
  { id: 12, title: "校庆排练", subtitle: "第5集 · 音乐教室", unlocked: false, condition: "看完全剧", image: "https://s3plus.meituan.net/mcopilot-pub/nocode-task/chenyanbo/t7sat29xk397us2bkq8n6qykx7b6fx/05%281%29_99s.jpg", rarity: "Legendary" },
];

// ─── Rarity config ─────────────────────────────────────────────────────────────

const RARITY = {
  Common:    { color: "#9E9E9E", glow: "rgba(158,158,158,0.3)",    label: "普通" },
  Rare:      { color: "#42A5F5", glow: "rgba(66,165,245,0.3)",     label: "稀有" },
  Epic:      { color: "#9B59B6", glow: "rgba(155,89,182,0.4)",     label: "史诗" },
  Legendary: { color: "#E8A87C", glow: "rgba(232,168,124,0.45)",   label: "传说" },
};

// ─── Progress Ring ─────────────────────────────────────────────────────────────

const ProgressRing = ({ unlocked, total }) => {
  const pct = unlocked / total;
  const r = 22;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct);

  return (
    <div className="relative flex items-center justify-center" style={{ width: "56px", height: "56px" }}>
      <svg width="56" height="56" style={{ transform: "rotate(-90deg)" }}>
        {/* Track */}
        <circle cx="28" cy="28" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
        {/* Fill */}
        <circle
          cx="28" cy="28" r={r}
          fill="none"
          stroke="url(#ringGrad)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.34,1.56,0.64,1)" }}
        />
        <defs>
          <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#E8A87C" />
            <stop offset="100%" stopColor="#9B59B6" />
          </linearGradient>
        </defs>
      </svg>
      {/* Center text */}
      <div className="absolute flex flex-col items-center justify-center">
        <span className="font-sans font-bold" style={{ color: "#E8A87C", fontSize: "13px", lineHeight: 1 }}>
          {unlocked}
        </span>
        <span className="font-sans" style={{ color: "rgba(245,240,235,0.4)", fontSize: "8px" }}>
          /{total}
        </span>
      </div>
    </div>
  );
};

// ─── Fullscreen Viewer ─────────────────────────────────────────────────────────

const FullscreenViewer = ({ items, startIndex, onClose }) => {
  const [idx, setIdx] = useState(startIndex);
  const item = items[idx];
  const rarity = RARITY[item.rarity];

  const prev = () => setIdx(i => Math.max(0, i - 1));
  const next = () => setIdx(i => Math.min(items.length - 1, i + 1));

  // Keyboard nav
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "ArrowLeft")  prev();
      if (e.key === "ArrowRight") next();
      if (e.key === "Escape")     onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{
        background: "rgba(5,2,10,0.97)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        animation: "fadeIn 0.25s ease",
        maxWidth: "480px",
        margin: "0 auto",
      }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-12 pb-4 flex-shrink-0">
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}
        >
          <X size={18} style={{ color: "#F5F0EB" }} />
        </button>
        <div className="text-center">
          <p className="font-serif" style={{ color: "#F5F0EB", fontSize: "15px", fontWeight: "600" }}>
            {item.title}
          </p>
          <p className="font-sans" style={{ color: "rgba(245,240,235,0.45)", fontSize: "11px" }}>
            {idx + 1} / {items.length}
          </p>
        </div>
        {/* Rarity badge */}
        <div
          className="px-2.5 py-1 rounded-full font-sans"
          style={{
            background: `${rarity.color}18`,
            border: `1px solid ${rarity.color}55`,
            color: rarity.color,
            fontSize: "10px",
            fontWeight: "600",
          }}
        >
          {rarity.label}
        </div>
      </div>

      {/* Image */}
      <div
        className="flex-1 relative flex items-center justify-center px-4"
        style={{ animation: "scaleIn 0.3s ease" }}
        key={idx}
      >
        <img
          src={item.image}
          alt={item.title}
          className="mx-auto object-cover rounded-2xl"
          style={{
            maxHeight: "65vh",
            width: "100%",
            boxShadow: `0 0 40px ${rarity.glow}, 0 20px 60px rgba(0,0,0,0.8)`,
            border: `1px solid ${rarity.color}33`,
          }}
        />

        {/* Prev / Next arrows */}
        {idx > 0 && (
          <button
            onClick={prev}
            className="absolute left-6 w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            <ChevronLeft size={20} style={{ color: "#F5F0EB" }} />
          </button>
        )}
        {idx < items.length - 1 && (
          <button
            onClick={next}
            className="absolute right-6 w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            <ChevronRight size={20} style={{ color: "#F5F0EB" }} />
          </button>
        )}
      </div>

      {/* Bottom info */}
      <div className="px-5 pt-4 pb-10 flex-shrink-0">
        <h2 className="font-serif text-center mb-1" style={{ color: "#F5F0EB", fontSize: "20px", fontWeight: "600" }}>
          {item.title}
        </h2>
        <p className="font-sans text-center mb-4" style={{ color: "#E8A87C", fontSize: "13px" }}>
          {item.subtitle}
        </p>

        {/* Dot indicators */}
        <div className="flex justify-center gap-1.5">
          {items.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className="rounded-full transition-all duration-200"
              style={{
                width: i === idx ? "20px" : "6px",
                height: "6px",
                background: i === idx
                  ? "linear-gradient(90deg, #E8A87C, #9B59B6)"
                  : "rgba(245,240,235,0.2)",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── Toast ─────────────────────────────────────────────────────────────────────

const Toast = ({ message, onDone }) => {
  useEffect(() => {
    const t = setTimeout(onDone, 2800);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div
      className="fixed z-50 left-4 right-4 flex items-center gap-3 px-4 py-3 rounded-2xl"
      style={{
        bottom: "32px",
        background: "rgba(22,10,32,0.97)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: "1px solid rgba(232,168,124,0.2)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        animation: "toastSlide 2.8s ease forwards",
        maxWidth: "448px",
        margin: "0 auto",
      }}
    >
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: "rgba(232,168,124,0.15)", border: "1px solid rgba(232,168,124,0.3)" }}
      >
        <Lock size={14} style={{ color: "#E8A87C" }} />
      </div>
      <p className="font-sans" style={{ color: "#F5F0EB", fontSize: "13px", lineHeight: "1.4" }}>
        {message}
      </p>
    </div>
  );
};

// ─── Gallery Card ──────────────────────────────────────────────────────────────

const UnlockedCard = ({ item, onClick }) => {
  const rarity = RARITY[item.rarity];
  return (
    <button
      onClick={onClick}
      className="relative rounded-2xl overflow-hidden w-full transition-transform duration-200 active:scale-95"
      style={{
        aspectRatio: "3/4",
        border: `1px solid ${rarity.color}44`,
        boxShadow: `0 4px 20px rgba(0,0,0,0.5), 0 0 16px ${rarity.glow}`,
        animation: "unlockPulse 3s ease-in-out infinite",
      }}
    >
      <img
        src={item.image}
        alt={item.title}
        className="mx-auto object-cover w-full h-full"
      />
      {/* Gradient overlay */}
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(to top, rgba(13,13,13,0.92) 0%, rgba(13,13,13,0.3) 45%, transparent 70%)",
        }}
      />
      {/* Rarity badge top-right */}
      <div
        className="absolute top-2 right-2 px-2 py-0.5 rounded-full font-sans flex items-center gap-1"
        style={{
          background: `${rarity.color}22`,
          border: `1px solid ${rarity.color}55`,
          color: rarity.color,
          fontSize: "9px",
          fontWeight: "600",
          backdropFilter: "blur(6px)",
        }}
      >
        <Star size={7} fill={rarity.color} style={{ color: rarity.color }} />
        {rarity.label}
      </div>
      {/* Bottom info */}
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <p className="font-serif" style={{ color: "#F5F0EB", fontSize: "13px", fontWeight: "600", lineHeight: "1.3" }}>
          {item.title}
        </p>
        <p className="font-sans mt-0.5" style={{ color: "rgba(232,168,124,0.7)", fontSize: "10px" }}>
          {item.subtitle}
        </p>
      </div>
      {/* Sparkle corner */}
      <Sparkles
        size={12}
        className="absolute top-2 left-2"
        style={{ color: rarity.color, opacity: 0.8 }}
      />
    </button>
  );
};

const LockedCard = ({ item, onTap }) => {
  const rarity = RARITY[item.rarity];
  return (
    <button
      onClick={onTap}
      className="relative rounded-2xl overflow-hidden w-full active:scale-95 transition-transform duration-200"
      style={{
        aspectRatio: "3/4",
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      {/* Blurred bg image */}
      <img
        src={item.image}
        alt=""
        className="mx-auto object-cover w-full h-full"
        style={{ filter: "blur(12px) brightness(0.25)", transform: "scale(1.1)" }}
      />

      {/* Shimmer overlay */}
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(105deg, transparent 40%, rgba(232,168,124,0.06) 50%, transparent 60%)",
          backgroundSize: "200% 100%",
          animation: "shimmer 3s linear infinite",
        }}
      />

      {/* Dark overlay */}
      <div
        className="absolute inset-0"
        style={{ background: "rgba(13,13,13,0.55)" }}
      />

      {/* Center lock */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{
            background: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.12)",
            backdropFilter: "blur(8px)",
          }}
        >
          <Lock size={16} style={{ color: "rgba(245,240,235,0.5)" }} />
        </div>
        <p
          className="font-sans text-center"
          style={{ color: "rgba(245,240,235,0.35)", fontSize: "10px", lineHeight: "1.4" }}
        >
          {item.condition}
        </p>
      </div>

      {/* Rarity badge */}
      <div
        className="absolute top-2 right-2 px-2 py-0.5 rounded-full font-sans flex items-center gap-1"
        style={{
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.1)",
          color: "rgba(245,240,235,0.3)",
          fontSize: "9px",
          backdropFilter: "blur(6px)",
        }}
      >
        <Lock size={7} style={{ color: "rgba(245,240,235,0.3)" }} />
        {rarity.label}
      </div>
    </button>
  );
};

// ─── Main Gallery Page ─────────────────────────────────────────────────────────

const Gallery = () => {
  const navigate = useNavigate();
  const { dramaId } = useParams();
  const drama = DRAMA_INFO[dramaId] || DRAMA_INFO["1"];

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [toast, setToast] = useState(null);

  const unlockedItems = CG_ITEMS.filter(i => i.unlocked);

  const handleUnlockedTap = (item) => {
    const idx = unlockedItems.findIndex(u => u.id === item.id);
    setViewerIndex(idx);
    setViewerOpen(true);
  };

  const handleLockedTap = (item) => {
    setToast(`解锁条件：${item.condition}`);
  };

  return (
    <div
      className="min-h-screen"
      style={{ background: "#0D0D0D", maxWidth: "480px", margin: "0 auto" }}
    >
      <style>{KEYFRAMES}</style>

      {/* Ambient glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 30% at 50% 0%, rgba(155,89,182,0.07) 0%, transparent 60%)",
          zIndex: 0,
        }}
      />

      <div className="relative z-10">
        {/* Header */}
        <div
          className="flex items-center gap-3 px-5 pb-4"
          style={{
            paddingTop: "max(16px, env(safe-area-inset-top, 16px))",
            background: "rgba(13,13,13,0.95)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderBottom: "1px solid rgba(232,168,124,0.08)",
            position: "sticky",
            top: 0,
            zIndex: 20,
          }}
        >
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(232,168,124,0.15)" }}
          >
            <ArrowLeft size={18} style={{ color: "#F5F0EB" }} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-serif" style={{ color: "#F5F0EB", fontSize: "20px", fontWeight: "700" }}>
              剧照图鉴
            </h1>
            <p className="font-sans truncate" style={{ color: "#E8A87C", fontSize: "11px", marginTop: "1px" }}>
              {drama.name}
            </p>
          </div>
        </div>

        {/* Stats bar */}
        <div
          className="mx-5 mt-5 mb-5 px-4 py-4 rounded-2xl flex items-center gap-4"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(232,168,124,0.12)",
            backdropFilter: "blur(12px)",
          }}
        >
          <ProgressRing unlocked={drama.unlocked} total={drama.total} />
          <div className="flex-1">
            <p className="font-sans font-semibold" style={{ color: "#F5F0EB", fontSize: "15px" }}>
              已解锁：{" "}
              <span style={{ color: "#E8A87C" }}>{drama.unlocked}</span>
              <span style={{ color: "rgba(245,240,235,0.4)" }}>/{drama.total}</span>
            </p>
            <p className="font-sans mt-0.5" style={{ color: "rgba(245,240,235,0.45)", fontSize: "12px" }}>
              {drama.total - drama.unlocked} 个场景待解锁
            </p>
            {/* Mini progress bar */}
            <div
              className="mt-2 w-full rounded-full overflow-hidden"
              style={{ height: "3px", background: "rgba(255,255,255,0.08)" }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${(drama.unlocked / drama.total) * 100}%`,
                  background: "linear-gradient(90deg, #E8A87C, #9B59B6)",
                  transition: "width 1s ease",
                }}
              />
            </div>
          </div>
          <div
            className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl"
            style={{
              background: "rgba(232,168,124,0.08)",
              border: "1px solid rgba(232,168,124,0.2)",
            }}
          >
            <Sparkles size={14} style={{ color: "#E8A87C" }} />
            <span className="font-sans" style={{ color: "#E8A87C", fontSize: "9px", fontWeight: "600" }}>
              {Math.round((drama.unlocked / drama.total) * 100)}%
            </span>
          </div>
        </div>

        {/* Section label */}
        <div className="flex items-center gap-3 px-5 mb-4">
          <div className="flex-1 h-px" style={{ background: "rgba(232,168,124,0.1)" }} />
          <span
            className="font-sans uppercase tracking-widest"
            style={{ color: "rgba(232,168,124,0.5)", fontSize: "10px" }}
          >
            场景图鉴
          </span>
          <div className="flex-1 h-px" style={{ background: "rgba(232,168,124,0.1)" }} />
        </div>

        {/* 2-column grid */}
        <div className="px-5 pb-10 grid grid-cols-2 gap-3">
          {CG_ITEMS.map((item) =>
            item.unlocked ? (
              <UnlockedCard
                key={item.id}
                item={item}
                onClick={() => handleUnlockedTap(item)}
              />
            ) : (
              <LockedCard
                key={item.id}
                item={item}
                onTap={() => handleLockedTap(item)}
              />
            )
          )}
        </div>
      </div>

      {/* Chat FAB */}
      {!viewerOpen && (
        <button
          onClick={() => navigate(`/chat/${dramaId || "1"}/1`)}
          className="fixed z-30 flex items-center gap-2 px-4 py-3 rounded-full"
          style={{
            bottom: "32px",
            right: "max(16px, calc(50vw - 224px))",
            background: "linear-gradient(135deg, #E8A87C 0%, #C8906A 50%, #9B59B6 100%)",
            boxShadow: "0 8px 32px rgba(232,168,124,0.45), 0 0 60px rgba(155,89,182,0.2)",
            border: "1px solid rgba(255,255,255,0.15)",
          }}
        >
          <MessageCircle size={16} style={{ color: "#0D0D0D" }} />
          <span className="font-sans font-semibold" style={{ color: "#0D0D0D", fontSize: "13px" }}>
            和辰安聊天
          </span>
        </button>
      )}

      {/* Fullscreen Viewer */}
      {viewerOpen && (
        <FullscreenViewer
          items={unlockedItems}
          startIndex={viewerIndex}
          onClose={() => setViewerOpen(false)}
        />
      )}

      {/* Toast */}
      {toast && (
        <Toast
          message={toast}
          onDone={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default Gallery;
