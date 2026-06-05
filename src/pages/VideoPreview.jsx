import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Play,
  Share2,
  Edit3,
  Home,
  Sparkles,
  Film,
  Calendar,
  Layers,
  Check,
} from "lucide-react";

// 剧名映射
const DRAMA_NAMES = {
  "1": "糟糕，是心动",
  "2": "心动禁区",
  "3": "糟糕是心动之织光裁爱",
  "4": "糟糕我刚渣的前男友",
};

// 格式化当前时间
function formatNow() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// 从 localStorage 读取视频风格（VideoCreate 页面选择的）
function getVideoStyle() {
  try {
    return localStorage.getItem("creative-video-style") || "甜宠";
  } catch {
    return "甜宠";
  }
}

const STYLE_COLORS = {
  甜宠: { bg: "rgba(236,72,153,0.2)", border: "rgba(236,72,153,0.4)", text: "#f472b6" },
  虐恋: { bg: "rgba(239,68,68,0.2)", border: "rgba(239,68,68,0.4)", text: "#f87171" },
  悬疑: { bg: "rgba(99,102,241,0.2)", border: "rgba(99,102,241,0.4)", text: "#818cf8" },
  搞笑: { bg: "rgba(251,191,36,0.2)", border: "rgba(251,191,36,0.4)", text: "#fbbf24" },
};

const VideoPreview = () => {
  const navigate = useNavigate();
  const { dramaId, ep } = useParams();
  const [isPlaying, setIsPlaying] = useState(false);
  const [shared, setShared] = useState(false);

  const dramaName = DRAMA_NAMES[dramaId] || `剧集 ${dramaId}`;
  const videoStyle = getVideoStyle();
  const styleColor = STYLE_COLORS[videoStyle] || STYLE_COLORS["甜宠"];
  const createdAt = formatNow();

  const handleShare = () => {
    setShared(true);
    setTimeout(() => setShared(false), 2000);
  };

  return (
    <div
      style={{
        background: "#0D0D0D",
        maxWidth: "480px",
        margin: "0 auto",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulseRing {
          0%   { transform: scale(1);   opacity: 0.8; }
          50%  { transform: scale(1.12); opacity: 0.4; }
          100% { transform: scale(1);   opacity: 0.8; }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        ::-webkit-scrollbar { width: 0; }
      `}</style>

      {/* ── 顶部导航栏 ── */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          background: "rgba(13,13,13,0.95)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
        }}
      >
        <button
          onClick={() => navigate(-1)}
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "10px",
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <ArrowLeft size={16} style={{ color: "rgba(255,255,255,0.7)" }} />
        </button>

        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Sparkles size={14} style={{ color: "#a78bfa" }} />
            <span style={{ color: "#fff", fontSize: "16px", fontWeight: "600" }}>我的创作</span>
          </div>
          <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "11px", margin: 0 }}>
            {dramaName} · EP{ep || 1}
          </p>
        </div>
      </div>

      {/* ── 主体内容（可滚动） ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 16px 140px" }}>

        {/* ── 视频播放器占位区（16:9） ── */}
        <div
          style={{
            width: "100%",
            aspectRatio: "16 / 9",
            borderRadius: "16px",
            overflow: "hidden",
            position: "relative",
            marginBottom: "20px",
            animation: "fadeIn 0.5s ease both",
            boxShadow: "0 8px 40px rgba(124,58,237,0.3)",
          }}
        >
          {/* 渐变紫色封面背景 */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(135deg, #1e0a3c 0%, #3b0764 40%, #6d28d9 70%, #a855f7 100%)",
            }}
          />

          {/* 光晕装饰 */}
          <div
            style={{
              position: "absolute",
              top: "20%",
              left: "30%",
              width: "120px",
              height: "120px",
              borderRadius: "50%",
              background: "rgba(168,85,247,0.25)",
              filter: "blur(40px)",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: "10%",
              right: "20%",
              width: "80px",
              height: "80px",
              borderRadius: "50%",
              background: "rgba(236,72,153,0.2)",
              filter: "blur(30px)",
            }}
          />

          {/* AI 生成标签 */}
          <div
            style={{
              position: "absolute",
              top: "12px",
              left: "12px",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              padding: "4px 10px",
              borderRadius: "999px",
              background: "rgba(0,0,0,0.4)",
              backdropFilter: "blur(8px)",
              border: "1px solid rgba(168,85,247,0.4)",
            }}
          >
            <Sparkles size={10} style={{ color: "#a78bfa" }} />
            <span style={{ color: "#c4b5fd", fontSize: "10px", fontWeight: "500" }}>AI 生成</span>
          </div>

          {/* 中间播放按钮 */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "12px",
            }}
          >
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                background: "rgba(255,255,255,0.15)",
                backdropFilter: "blur(8px)",
                border: "2px solid rgba(255,255,255,0.4)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                animation: "pulseRing 2.5s ease-in-out infinite",
                position: "relative",
                zIndex: 1,
              }}
            >
              <Play
                size={22}
                style={{ color: "#fff", marginLeft: "3px", fill: "#fff" }}
              />
            </button>

            {/* 底部提示文字 */}
            <p
              style={{
                color: "rgba(255,255,255,0.55)",
                fontSize: "12px",
                margin: 0,
                textAlign: "center",
                letterSpacing: "0.03em",
              }}
            >
              AI 生成的视频将在这里播放
            </p>
          </div>

          {/* 底部进度条装饰 */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: "3px",
              background: "rgba(255,255,255,0.1)",
            }}
          >
            <div
              style={{
                height: "100%",
                width: "35%",
                background: "linear-gradient(90deg, #7c3aed, #a855f7)",
                borderRadius: "999px",
              }}
            />
          </div>
        </div>

        {/* ── 创作信息卡片 ── */}
        <div
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "16px",
            padding: "16px",
            animation: "fadeIn 0.5s 0.15s ease both",
            opacity: 0,
            animationFillMode: "forwards",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "14px" }}>
            <Film size={13} style={{ color: "#a78bfa" }} />
            <span style={{ color: "rgba(255,255,255,0.7)", fontSize: "13px", fontWeight: "600" }}>
              创作信息
            </span>
          </div>

          {/* 剧名 */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Film size={12} style={{ color: "rgba(255,255,255,0.25)" }} />
              <span style={{ color: "rgba(255,255,255,0.35)", fontSize: "12px" }}>剧名</span>
            </div>
            <span style={{ color: "rgba(255,255,255,0.8)", fontSize: "13px", fontWeight: "500" }}>
              {dramaName}
            </span>
          </div>

          {/* 集数 */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Layers size={12} style={{ color: "rgba(255,255,255,0.25)" }} />
              <span style={{ color: "rgba(255,255,255,0.35)", fontSize: "12px" }}>集数</span>
            </div>
            <span style={{ color: "rgba(255,255,255,0.8)", fontSize: "13px", fontWeight: "500" }}>
              EP{ep || 1}
            </span>
          </div>

          {/* 创作时间 */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Calendar size={12} style={{ color: "rgba(255,255,255,0.25)" }} />
              <span style={{ color: "rgba(255,255,255,0.35)", fontSize: "12px" }}>创作时间</span>
            </div>
            <span style={{ color: "rgba(255,255,255,0.8)", fontSize: "13px", fontWeight: "500" }}>
              {createdAt}
            </span>
          </div>

          {/* 视频风格标签 */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Sparkles size={12} style={{ color: "rgba(255,255,255,0.25)" }} />
              <span style={{ color: "rgba(255,255,255,0.35)", fontSize: "12px" }}>视频风格</span>
            </div>
            <span
              style={{
                padding: "3px 10px",
                borderRadius: "999px",
                background: styleColor.bg,
                border: `1px solid ${styleColor.border}`,
                color: styleColor.text,
                fontSize: "12px",
                fontWeight: "500",
              }}
            >
              {videoStyle}
            </span>
          </div>
        </div>
      </div>

      {/* ── 底部固定操作按钮 ── */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: "100%",
          maxWidth: "480px",
          padding: "12px 16px 32px",
          background: "linear-gradient(to top, #0D0D0D 65%, transparent)",
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        }}
      >
        {/* 分享按钮 */}
        <button
          onClick={handleShare}
          style={{
            width: "100%",
            padding: "14px",
            borderRadius: "14px",
            background: shared
              ? "rgba(16,185,129,0.3)"
              : "linear-gradient(135deg, #7c3aed, #a855f7)",
            border: shared ? "1px solid rgba(16,185,129,0.5)" : "none",
            cursor: "pointer",
            color: "#fff",
            fontSize: "15px",
            fontWeight: "600",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "7px",
            boxShadow: shared ? "none" : "0 4px 20px rgba(124,58,237,0.4)",
            transition: "all 0.3s",
          }}
        >
          {shared ? (
            <>
              <Check size={16} />
              已复制分享链接
            </>
          ) : (
            <>
              <Share2 size={16} />
              分享
            </>
          )}
        </button>

        {/* 重新编辑 + 返回首页 */}
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={() => navigate(`/video-create/${dramaId}/${ep || 1}`)}
            style={{
              flex: 1,
              padding: "12px",
              borderRadius: "12px",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.12)",
              cursor: "pointer",
              color: "rgba(255,255,255,0.7)",
              fontSize: "13px",
              fontWeight: "500",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
            }}
          >
            <Edit3 size={14} />
            重新编辑
          </button>

          <button
            onClick={() => navigate("/")}
            style={{
              flex: 1,
              padding: "12px",
              borderRadius: "12px",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.12)",
              cursor: "pointer",
              color: "rgba(255,255,255,0.7)",
              fontSize: "13px",
              fontWeight: "500",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
            }}
          >
            <Home size={14} />
            返回首页
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoPreview;
