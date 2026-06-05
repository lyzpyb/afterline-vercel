import { useNavigate } from "react-router-dom";
import { Play, Sparkles, Heart, Star, Film } from "lucide-react";
import { trackABClick } from "@/hooks/useABVersion";

const Landing = () => {
  const navigate = useNavigate();

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
      <style>{`
        @keyframes landingFadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes landingPulse {
          0%, 100% { box-shadow: 0 0 20px rgba(232,168,124,0.3); }
          50%      { box-shadow: 0 0 40px rgba(232,168,124,0.6); }
        }
        @keyframes landingShimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
      `}</style>

      {/* ── Main Content ── */}
      <div
        className="flex-1 flex flex-col items-center justify-center px-8"
        style={{ paddingBottom: "40px" }}
      >
        {/* Brand */}
        <div
          className="text-center mb-8"
          style={{ animation: "landingFadeUp 0.6s ease both" }}
        >
          {/* Logo / Brand Mark */}
          <div
            className="mx-auto mb-6 flex items-center justify-center"
            style={{
              width: "80px",
              height: "80px",
              borderRadius: "24px",
              background: "linear-gradient(135deg, rgba(232,168,124,0.15), rgba(194,24,91,0.15))",
              border: "1px solid rgba(232,168,124,0.2)",
            }}
          >
            <span
              className="font-serif"
              style={{
                fontSize: "36px",
                color: "#E8A87C",
                fontWeight: "700",
              }}
            >
              A
            </span>
          </div>

          <h1
            className="font-serif mb-2"
            style={{
              color: "#F5F0EB",
              fontSize: "32px",
              fontWeight: "700",
              letterSpacing: "-0.02em",
            }}
          >
            AfterLine
          </h1>
          <p
            className="font-sans"
            style={{
              color: "rgba(245,240,235,0.5)",
              fontSize: "14px",
              letterSpacing: "0.05em",
            }}
          >
            用你的决定，重塑与他的未来
          </p>
        </div>

        {/* Feature Tags */}
        <div
          className="flex flex-wrap justify-center gap-2 mb-10"
          style={{ animation: "landingFadeUp 0.6s ease 0.15s both" }}
        >
          {[
            { icon: Heart, text: "沉浸式恋爱" },
            { icon: Sparkles, text: "AI 互动剧情" },
            { icon: Star, text: "多分支结局" },
          ].map(({ icon: Icon, text }) => (
            <div
              key={text}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(232,168,124,0.12)",
              }}
            >
              <Icon size={12} style={{ color: "#E8A87C" }} />
              <span
                className="font-sans"
                style={{ color: "rgba(245,240,235,0.6)", fontSize: "11px" }}
              >
                {text}
              </span>
            </div>
          ))}
        </div>

        {/* CTA Buttons */}
        <div
          className="w-full flex flex-col gap-3"
          style={{ animation: "landingFadeUp 0.6s ease 0.3s both" }}
        >
          {/* A 版：观看短剧 */}
          <button
            onClick={() => { trackABClick("A", "click_enter_drama"); navigate("/drama"); }}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl transition-all duration-200 active:scale-[0.97]"
            style={{
              background: "linear-gradient(135deg, #E8A87C, #C2185B)",
              boxShadow: "0 4px 24px rgba(232,168,124,0.35)",
            }}
          >
            <Play size={18} fill="#fff" style={{ color: "#fff" }} />
            <span
              className="font-sans"
              style={{ color: "#fff", fontSize: "16px", fontWeight: "700" }}
            >
              观看短剧
            </span>
          </button>

          {/* B 版：互动体验 */}
          <button
            onClick={() => { trackABClick("B", "click_enter_full"); navigate("/full"); }}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl transition-all duration-200 active:scale-[0.97]"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(232,168,124,0.2)",
            }}
          >
            <Sparkles size={18} style={{ color: "#E8A87C" }} />
            <span
              className="font-sans"
              style={{
                color: "#E8A87C",
                fontSize: "16px",
                fontWeight: "700",
              }}
            >
              互动体验
            </span>
          </button>
        </div>

        {/* Subtitle */}
        <p
          className="font-sans mt-6 text-center"
          style={{
            color: "rgba(245,240,235,0.25)",
            fontSize: "11px",
            lineHeight: "1.6",
            animation: "landingFadeUp 0.6s ease 0.45s both",
          }}
        >
          观看短剧：沉浸式追剧体验<br />
          互动体验：与男主实时对话，你的选择改变剧情走向
        </p>

        {/* AI 创作工具入口 */}
        <div
          className="w-full mt-6"
          style={{ animation: "landingFadeUp 0.6s ease 0.5s both" }}
        >
          <p className="font-sans text-center mb-3" style={{ color: "rgba(245,240,235,0.3)", fontSize: "10px", letterSpacing: "0.12em", textTransform: "uppercase" }}>AI 创作工具</p>
          <div className="grid grid-cols-2 gap-3">
            {/* 短剧创作 */}
            <button
              onClick={() => navigate("/comic-create")}
              className="flex flex-col items-start rounded-2xl active:scale-95 transition-transform duration-150"
              style={{
                background: "linear-gradient(135deg, #0d1f3a 0%, #1a1030 100%)",
                border: "1px solid rgba(59,130,246,0.3)",
                padding: "14px",
              }}
            >
              <div
                className="flex items-center justify-center rounded-xl mb-2"
                style={{
                  width: "38px",
                  height: "38px",
                  background: "linear-gradient(135deg, #2563eb, #7c3aed)",
                  boxShadow: "0 4px 12px rgba(37,99,235,0.4)",
                }}
              >
                <Film size={18} color="#fff" />
              </div>
              <p className="font-sans font-semibold text-xs mb-0.5" style={{ color: "#F5F0EB" }}>短剧创作</p>
              <p className="font-sans" style={{ color: "rgba(245,240,235,0.4)", fontSize: "10px" }}>AI 生成分镜&短剧</p>
            </button>
            {/* 漫剧 Demo */}
            <button
              onClick={() => navigate("/comic-demo")}
              className="flex flex-col items-start rounded-2xl active:scale-95 transition-transform duration-150"
              style={{
                background: "linear-gradient(135deg, #1a1030 0%, #0d1a2e 100%)",
                border: "1px solid rgba(124,58,237,0.3)",
                padding: "14px",
              }}
            >
              <div
                className="flex items-center justify-center rounded-xl mb-2"
                style={{
                  width: "38px",
                  height: "38px",
                  background: "linear-gradient(135deg, #7c3aed, #a855f7)",
                  boxShadow: "0 4px 12px rgba(124,58,237,0.4)",
                }}
              >
                <Sparkles size={18} color="#fff" />
              </div>
              <p className="font-sans font-semibold text-xs mb-0.5" style={{ color: "#F5F0EB" }}>漫剧 Demo</p>
              <p className="font-sans" style={{ color: "rgba(245,240,235,0.4)", fontSize: "10px" }}>一句话生成漫剧</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Landing;
