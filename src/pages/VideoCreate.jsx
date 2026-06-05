import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  parseAIJsonArray,
  detectGarbledText,
  preprocessAIOutput,
  buildStoryboardPrompt,
} from "@/lib/aiResponseParser";
import {
  ArrowLeft,
  Sparkles,
  Trash2,
  Plus,
  Film,
  Tag,
  Loader2,
  Music,
  Clapperboard,
  Camera,
  Clock,
  Wand2,
  Users,
  Check,
} from "lucide-react";

// ─── 角色参考数据 ─────────────────────────────────────────────────────────────
const CHARACTER_REFS = {
  '沈彦希': {
    name: '沈彦希',
    appearance: '长发及肩，精致五官，白皙肤色',
    frames: [
      { id: 'syx_1', label: '正脸微笑', url: '' },
      { id: 'syx_2', label: '侧脸特写', url: '' },
      { id: 'syx_3', label: '全身站姿', url: '' },
    ]
  },
  '江辰': {
    name: '江辰',
    appearance: '短发利落，棱角分明，高挑身材',
    frames: [
      { id: 'jc_1', label: '正脸严肃', url: '' },
      { id: 'jc_2', label: '微笑侧脸', url: '' },
      { id: 'jc_3', label: '全身西装', url: '' },
    ]
  },
  '顾星辰': {
    name: '顾星辰',
    appearance: '圆脸可爱，马尾辫，活泼气质',
    frames: [
      { id: 'gxc_1', label: '正脸开心', url: '' },
      { id: 'gxc_2', label: '侧脸思考', url: '' },
    ]
  }
};

// ─── 情绪标签颜色 ─────────────────────────────────────────────────────────────
const EMOTION_COLORS = {
  暧昧: { bg: "rgba(168,85,247,0.2)", border: "rgba(168,85,247,0.5)", text: "#c084fc" },
  心动: { bg: "rgba(236,72,153,0.2)", border: "rgba(236,72,153,0.5)", text: "#f472b6" },
  紧张: { bg: "rgba(239,68,68,0.2)", border: "rgba(239,68,68,0.5)", text: "#f87171" },
  温柔: { bg: "rgba(251,191,36,0.2)", border: "rgba(251,191,36,0.5)", text: "#fbbf24" },
  甜蜜: { bg: "rgba(244,114,182,0.2)", border: "rgba(244,114,182,0.5)", text: "#f9a8d4" },
  冲突: { bg: "rgba(249,115,22,0.2)", border: "rgba(249,115,22,0.5)", text: "#fb923c" },
  深情: { bg: "rgba(99,102,241,0.2)", border: "rgba(99,102,241,0.5)", text: "#818cf8" },
  惊喜: { bg: "rgba(16,185,129,0.2)", border: "rgba(16,185,129,0.5)", text: "#34d399" },
};

const getEmotionStyle = (mood) => {
  if (!mood) return EMOTION_COLORS["暧昧"];
  for (const key of Object.keys(EMOTION_COLORS)) {
    if (mood.includes(key)) return EMOTION_COLORS[key];
  }
  return EMOTION_COLORS["暧昧"];
};

// ─── fallback：从 history 解析分镜（visualMetas 为空时使用）────────────────────
function guessEmotion(text) {
  if (!text) return "暧昧";
  if (/心动|喜欢|爱|甜/.test(text)) return "心动";
  if (/紧张|害怕|颤抖|心跳/.test(text)) return "紧张";
  if (/温柔|轻声|柔/.test(text)) return "温柔";
  if (/甜蜜|笑|开心/.test(text)) return "甜蜜";
  if (/冲突|争吵|愤怒|生气/.test(text)) return "冲突";
  if (/深情|凝视|眼神/.test(text)) return "深情";
  if (/惊讶|没想到|突然/.test(text)) return "惊喜";
  return "暧昧";
}

function parseHistoryToScenes(history) {
  if (!history || !Array.isArray(history) || history.length === 0) return [];
  const scenes = [];
  let sceneIndex = 0;
  let i = 0;
  while (i < history.length) {
    const block = history[i];
    if (block.type === "choice_echo") {
      sceneIndex++;
      scenes.push({
        id: `scene_${sceneIndex}_${Date.now()}_${i}`,
        index: sceneIndex,
        scene: "用户互动场景",
        action: block.text || "",
        dialogue: block.text || "",
        camera: "近景",
        mood: guessEmotion(block.text || ""),
        duration: 5,
      });
      i++;
      continue;
    }
    if (block.type === "scene" || block.type === "divider") {
      const aiBlocks = [];
      while (i < history.length && history[i].type !== "choice_echo") {
        aiBlocks.push(history[i]);
        i++;
      }
      let description = "";
      let dialogue = "";
      for (const b of aiBlocks) {
        if (b.type === "scene" && b.scene) {
          const s = b.scene;
          if (s.prose && s.prose.length > 0) description += s.prose.join(" ") + " ";
          if (s.proseAfterDialogue && s.proseAfterDialogue.length > 0)
            description += s.proseAfterDialogue.join(" ") + " ";
          if (s.dialogue) dialogue += s.dialogue + " ";
        }
      }
      description = description.trim();
      dialogue = dialogue.trim();
      if (description || dialogue) {
        sceneIndex++;
        scenes.push({
          id: `scene_${sceneIndex}_${Date.now()}_${i}`,
          index: sceneIndex,
          scene: description || "AI 叙事场景",
          action: description.slice(0, 40) || "场景展开",
          dialogue: dialogue || "",
          camera: "中景",
          mood: guessEmotion(description + dialogue),
          duration: 6,
        });
      }
      continue;
    }
    i++;
  }
  return scenes;
}

// ─── 情绪标签组件 ─────────────────────────────────────────────────────────────
const EmotionTag = ({ mood }) => {
  const style = getEmotionStyle(mood);
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "3px",
        padding: "2px 8px",
        borderRadius: "999px",
        background: style.bg,
        border: `1px solid ${style.border}`,
        color: style.text,
        fontSize: "11px",
        fontWeight: "500",
        flexShrink: 0,
      }}
    >
      <Tag size={9} />
      {mood || "暧昧"}
    </span>
  );
};

// ─── 可编辑分镜卡片 ───────────────────────────────────────────────────────────
const SceneCard = ({ scene, onChange, onDelete, cardPrompt, cardPromptLoading, onGeneratePrompt }) => {
  return (
    <div
      style={{
        position: "relative",
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "14px",
        overflow: "hidden",
        marginBottom: "12px",
        animation: "fadeInUp 0.35s ease both",
      }}
    >
      {/* 左侧紫色竖线 */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: "3px",
          background: "linear-gradient(180deg, #7c3aed, #a855f7)",
          borderRadius: "3px 0 0 3px",
        }}
      />

      <div style={{ padding: "14px 14px 14px 18px" }}>
        {/* 顶部：编号 + 情绪 + 时长 + 删除 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                background: "rgba(124,58,237,0.2)",
                border: "1px solid rgba(124,58,237,0.4)",
                borderRadius: "6px",
                padding: "2px 8px",
              }}
            >
              <Film size={10} style={{ color: "#a78bfa" }} />
              <span style={{ color: "#a78bfa", fontSize: "11px", fontWeight: "600" }}>
                镜头 {scene.index}
              </span>
            </div>
            <EmotionTag mood={scene.mood} />
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "3px",
                padding: "2px 7px",
                borderRadius: "6px",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <Clock size={9} style={{ color: "rgba(255,255,255,0.35)" }} />
              <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "10px" }}>
                {scene.duration}s
              </span>
            </div>
          </div>
          <button
            onClick={() => onDelete(scene.id)}
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "8px",
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.2)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Trash2 size={12} style={{ color: "rgba(239,68,68,0.6)" }} />
          </button>
        </div>

        {/* 场景描述（可编辑 textarea） */}
        <div style={{ marginBottom: "10px" }}>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              color: "rgba(255,255,255,0.3)",
              fontSize: "10px",
              letterSpacing: "0.05em",
              marginBottom: "5px",
            }}
          >
            <Film size={9} />
            场景描述
          </label>
          <textarea
            value={scene.scene}
            onChange={(e) => onChange(scene.id, "scene", e.target.value)}
            rows={2}
            style={{
              width: "100%",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "8px",
              padding: "8px 10px",
              color: "rgba(245,240,235,0.8)",
              fontSize: "13px",
              lineHeight: "1.6",
              resize: "none",
              outline: "none",
              fontFamily: "serif",
              boxSizing: "border-box",
              transition: "border-color 0.2s",
            }}
            onFocus={(e) => (e.target.style.borderColor = "rgba(124,58,237,0.5)")}
            onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.08)")}
          />
        </div>

        {/* 角色动作（可编辑 textarea） */}
        <div style={{ marginBottom: "10px" }}>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              color: "rgba(255,255,255,0.3)",
              fontSize: "10px",
              letterSpacing: "0.05em",
              marginBottom: "5px",
            }}
          >
            <Wand2 size={9} />
            角色动作
          </label>
          <textarea
            value={scene.action}
            onChange={(e) => onChange(scene.id, "action", e.target.value)}
            rows={2}
            style={{
              width: "100%",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "8px",
              padding: "8px 10px",
              color: "rgba(245,240,235,0.8)",
              fontSize: "13px",
              lineHeight: "1.6",
              resize: "none",
              outline: "none",
              fontFamily: "serif",
              boxSizing: "border-box",
              transition: "border-color 0.2s",
            }}
            onFocus={(e) => (e.target.style.borderColor = "rgba(124,58,237,0.5)")}
            onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.08)")}
          />
        </div>

        {/* 镜头描述 + 台词（只读展示） */}
        <div style={{ display: "flex", gap: "8px" }}>
          {scene.camera && (
            <div
              style={{
                flex: 1,
                background: "rgba(124,58,237,0.06)",
                border: "1px solid rgba(124,58,237,0.15)",
                borderRadius: "8px",
                padding: "6px 10px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  marginBottom: "3px",
                }}
              >
                <Camera size={9} style={{ color: "rgba(167,139,250,0.6)" }} />
                <span style={{ color: "rgba(167,139,250,0.6)", fontSize: "10px" }}>镜头</span>
              </div>
              <p style={{ color: "#c4b5fd", fontSize: "12px", margin: 0, lineHeight: "1.4" }}>
                {scene.camera}
              </p>
            </div>
          )}
          {scene.dialogue && (
            <div
              style={{
                flex: 2,
                background: "rgba(232,168,124,0.06)",
                border: "1px solid rgba(232,168,124,0.15)",
                borderRadius: "8px",
                padding: "6px 10px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  marginBottom: "3px",
                }}
              >
                <span style={{ color: "rgba(232,168,124,0.6)", fontSize: "10px" }}>台词</span>
              </div>
              <p
                style={{
                  color: "#E8A87C",
                  fontSize: "12px",
                  margin: 0,
                  lineHeight: "1.4",
                  fontFamily: "serif",
                }}
              >
                「{scene.dialogue}」
              </p>
            </div>
          )}
        </div>

        {/* 视频生成 Prompt（仅在有值时显示） */}
        {scene.videoPrompt && (
          <div
            style={{
              marginTop: "10px",
              background: "rgba(16,185,129,0.07)",
              border: "1px solid rgba(16,185,129,0.2)",
              borderRadius: "8px",
              padding: "8px 10px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                marginBottom: "5px",
              }}
            >
              <Sparkles size={9} style={{ color: "rgba(16,185,129,0.7)" }} />
              <span
                style={{
                  color: "rgba(16,185,129,0.8)",
                  fontSize: "10px",
                  fontWeight: "600",
                  letterSpacing: "0.04em",
                }}
              >
                视频生成 Prompt
              </span>
            </div>
            <p
              style={{
                color: "rgba(110,231,183,0.85)",
                fontSize: "11px",
                margin: 0,
                lineHeight: "1.6",
                fontFamily: "monospace",
                wordBreak: "break-word",
              }}
            >
              {scene.videoPrompt}
            </p>
          </div>
        )}

        {/* 「生成视频描述」按钮 */}
        <div style={{ marginTop: "10px" }}>
          <button
            onClick={() => onGeneratePrompt(scene)}
            disabled={cardPromptLoading}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              padding: "5px 12px",
              borderRadius: "8px",
              background: cardPromptLoading
                ? "rgba(124,58,237,0.08)"
                : "rgba(124,58,237,0.15)",
              border: "1px solid rgba(124,58,237,0.3)",
              cursor: cardPromptLoading ? "not-allowed" : "pointer",
              color: "#c4b5fd",
              fontSize: "12px",
              fontWeight: "500",
              transition: "all 0.2s",
              opacity: cardPromptLoading ? 0.7 : 1,
            }}
          >
            {cardPromptLoading ? (
              <>
                <Loader2 size={11} style={{ animation: "spin 1s linear infinite" }} />
                生成中…
              </>
            ) : (
              <>
                <Sparkles size={11} />
                生成视频描述
              </>
            )}
          </button>

          {/* cardPrompt 展示区 */}
          {cardPrompt && (
            <div
              style={{
                marginTop: "8px",
                background: "rgba(16,185,129,0.07)",
                border: "1px solid rgba(16,185,129,0.2)",
                borderRadius: "8px",
                padding: "8px 10px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  marginBottom: "5px",
                }}
              >
                <Sparkles size={9} style={{ color: "rgba(16,185,129,0.7)" }} />
                <span
                  style={{
                    color: "rgba(16,185,129,0.8)",
                    fontSize: "10px",
                    fontWeight: "600",
                    letterSpacing: "0.04em",
                  }}
                >
                  视频描述（点击全选复制）
                </span>
              </div>
              <textarea
                readOnly
                value={cardPrompt}
                onClick={(e) => e.target.select()}
                rows={4}
                style={{
                  width: "100%",
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: "rgba(110,231,183,0.9)",
                  fontSize: "11px",
                  lineHeight: "1.6",
                  fontFamily: "monospace",
                  resize: "none",
                  cursor: "text",
                  boxSizing: "border-box",
                  padding: 0,
                  wordBreak: "break-word",
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── AI 加载状态组件 ──────────────────────────────────────────────────────────
const StoryboardLoading = () => (
  <div
    style={{
      flex: 1,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "60px 24px",
      textAlign: "center",
    }}
  >
    {/* 动画圆圈 */}
    <div style={{ position: "relative", width: "80px", height: "80px", marginBottom: "28px" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          border: "2px solid rgba(124,58,237,0.15)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          border: "2px solid transparent",
          borderTopColor: "#a855f7",
          animation: "spin 1s linear infinite",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: "12px",
          borderRadius: "50%",
          border: "2px solid transparent",
          borderTopColor: "rgba(168,85,247,0.5)",
          animation: "spin 1.5s linear infinite reverse",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Sparkles size={22} style={{ color: "#a855f7" }} />
      </div>
    </div>

    <p
      style={{
        color: "#fff",
        fontSize: "16px",
        fontWeight: "600",
        marginBottom: "8px",
        letterSpacing: "0.02em",
      }}
    >
      AI 正在分析剧情
    </p>
    <p
      style={{
        color: "rgba(255,255,255,0.4)",
        fontSize: "13px",
        lineHeight: "1.7",
        maxWidth: "240px",
      }}
    >
      正在生成分镜脚本...
      <br />
      <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.25)" }}>
        根据你的互动内容智能编排镜头
      </span>
    </p>

    {/* 进度点动画 */}
    <div style={{ display: "flex", gap: "6px", marginTop: "24px" }}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            background: "#a855f7",
            animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
    </div>
  </div>
);

// ─── 空状态组件 ───────────────────────────────────────────────────────────────
const EmptyState = ({ onBack }) => (
  <div
    style={{
      flex: 1,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "40px 24px",
      textAlign: "center",
    }}
  >
    <div
      style={{
        width: "72px",
        height: "72px",
        borderRadius: "20px",
        background: "rgba(124,58,237,0.1)",
        border: "1px solid rgba(124,58,237,0.2)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: "20px",
      }}
    >
      <Film size={32} style={{ color: "rgba(124,58,237,0.6)" }} />
    </div>
    <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "16px", fontWeight: "500", marginBottom: "8px" }}>
      暂无对话记录
    </p>
    <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "13px", lineHeight: "1.6", marginBottom: "28px" }}>
      请先在对话页面与角色互动超过 3 轮，
      <br />再点击「生成视频」按钮
    </p>
    <button
      onClick={onBack}
      style={{
        padding: "10px 24px",
        borderRadius: "999px",
        background: "linear-gradient(135deg, #7c3aed, #a855f7)",
        border: "none",
        cursor: "pointer",
        color: "#fff",
        fontSize: "14px",
        fontWeight: "500",
      }}
    >
      返回对话
    </button>
  </div>
);

// ─── 主页面 ───────────────────────────────────────────────────────────────────
const VideoCreate = () => {
  const navigate = useNavigate();
  const { dramaId, ep } = useParams();

  const [scenes, setScenes] = useState([]);
  const [isEmpty, setIsEmpty] = useState(false);
  const [isLoadingStoryboard, setIsLoadingStoryboard] = useState(false);
  const [videoStyle, setVideoStyle] = useState("甜宠");
  const [bgMusic, setBgMusic] = useState("浪漫钢琴");
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedRefs, setSelectedRefs] = useState({});
  const [cardPrompts, setCardPrompts] = useState({});
  const [cardPromptLoading, setCardPromptLoading] = useState({});

  // ── 单卡片视频描述生成函数 ────────────────────────────────────────────────────
  const generateCardPrompt = useCallback(async (scene) => {
    setCardPromptLoading((prev) => ({ ...prev, [scene.id]: true }));
    try {
      const promptText = `You are a professional AI video prompt writer for a Chinese romantic drama.

Scene info:
- Description: ${scene.scene || ""}
- Character action: ${scene.action || ""}
- Mood: ${scene.mood || ""}
- Camera: ${scene.camera || ""}

Character references:
- Lin Xia (female lead disguised as boy): short black hair, petite build, maroon school blazer
- Shen Yanxi (male lead): silver-grey wavy hair past ears, gold semi-rimmed glasses, maroon school blazer worn open

Write a single English video generation prompt for this scene. Format: scene setting + character appearance + action/expression + camera movement + lighting style.
End with exactly: No subtitles, no text overlay, no watermark, no captions, no on-screen text. Cinematic quality, romantic drama style.
Output the prompt text only, no other content.`;

      const { data, error } = await supabase.functions.invoke("nocode-friday-ai", {
        body: { content: promptText },
      });
      if (error || !data?.content) throw new Error(error?.message || "no content");
      setCardPrompts((prev) => ({ ...prev, [scene.id]: data.content.trim() }));
    } catch (err) {
      console.error("generateCardPrompt error:", err);
    } finally {
      setCardPromptLoading((prev) => ({ ...prev, [scene.id]: false }));
    }
  }, []);

  // ── AI 分镜生成函数 ──────────────────────────────────────────────────────────
  const generateStoryboard = useCallback(async (visualMetas, isRetry = false) => {
    setIsLoadingStoryboard(true);
    try {
      // 使用统一的 prompt 构建器，强化 JSON 输出约束
      const prompt = buildStoryboardPrompt(visualMetas);

      const { data, error } = await supabase.functions.invoke("nocode-friday-ai", {
        body: { content: prompt },
      });

      if (error || !data?.content) throw new Error(error?.message || "no content");

      // Step 1: 预处理
      const content = preprocessAIOutput(data.content);

      // Step 2: 乱码检测
      const garbleCheck = detectGarbledText(content);
      if (garbleCheck.isGarbled && !isRetry) {
        console.warn("AI分镜输出乱码检测触发:", garbleCheck.reasons);
        return generateStoryboard(visualMetas, true);
      }

      // Step 3: 健壮的 JSON 解析
      const result = parseAIJsonArray(content);
      if (!result.success) {
        // JSON 解析失败时，如果还没重试过则重试一次
        if (!isRetry) {
          console.warn("AI分镜JSON解析失败，正在重试:", result.error);
          return generateStoryboard(visualMetas, true);
        }
        throw new Error(result.error);
      }

      const normalized = result.data.map((item, idx) => ({
        id: `ai_scene_${idx + 1}_${Date.now()}`,
        index: idx + 1,
        scene: item.desc || "",
        action: item.act || "",
        dialogue: item.dialogue || "",
        camera: item.cam || "中景",
        mood: item.mood || "暧昧",
        duration: typeof item.dur === "number" ? item.dur : 6,
        videoPrompt: item.prompt || "",
      }));

      setScenes(normalized);
    } catch (err) {
      console.error("generateStoryboard error:", err);
      // AI 失败时 fallback 到 messages 解析
      try {
        const raw = localStorage.getItem("creative-messages");
        if (raw) {
          const history = JSON.parse(raw);
          const fallback = parseHistoryToScenes(history);
          if (fallback.length > 0) {
            setScenes(fallback);
            return;
          }
        }
      } catch (_) {}
      setIsEmpty(true);
    } finally {
      setIsLoadingStoryboard(false);
    }
  }, []);

  // ── 页面初始化：读取数据并决定走 AI 还是 fallback ────────────────────────────
  useEffect(() => {
    try {
      const metaRaw = localStorage.getItem("creative-visual-metas");
      const visualMetas = metaRaw ? JSON.parse(metaRaw) : null;

      if (Array.isArray(visualMetas) && visualMetas.length > 0) {
        // 有 visualMetas → 走 AI 分镜
        generateStoryboard(visualMetas);
        return;
      }

      // fallback：从 creative-messages 解析
      const msgRaw = localStorage.getItem("creative-messages");
      if (!msgRaw) { setIsEmpty(true); return; }
      const history = JSON.parse(msgRaw);
      if (!Array.isArray(history) || history.length === 0) { setIsEmpty(true); return; }
      const parsed = parseHistoryToScenes(history);
      if (parsed.length === 0) { setIsEmpty(true); return; }
      setScenes(parsed);
    } catch (e) {
      setIsEmpty(true);
    }
  }, [generateStoryboard]);

  // ── 卡片字段修改 ─────────────────────────────────────────────────────────────
  const handleFieldChange = useCallback((id, field, value) => {
    setScenes((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  }, []);

  // ── 删除场景 ─────────────────────────────────────────────────────────────────
  const handleDelete = useCallback((id) => {
    setScenes((prev) => {
      const next = prev.filter((s) => s.id !== id);
      return next.map((s, i) => ({ ...s, index: i + 1 }));
    });
  }, []);

  // ── 添加空白场景 ─────────────────────────────────────────────────────────────
  const handleAddScene = useCallback(() => {
    setScenes((prev) => [
      ...prev,
      {
        id: `scene_new_${Date.now()}`,
        index: prev.length + 1,
        scene: "新场景描述",
        action: "角色动作",
        dialogue: "",
        camera: "中景",
        mood: "暧昧",
        duration: 6,
      },
    ]);
  }, []);

  // ── 切换参考帧选中状态 ────────────────────────────────────────────────────────
  const handleToggleRef = useCallback((charName, frameId) => {
    setSelectedRefs((prev) => {
      const current = prev[charName] || [];
      const exists = current.includes(frameId);
      return {
        ...prev,
        [charName]: exists
          ? current.filter((id) => id !== frameId)
          : [...current, frameId],
      };
    });
  }, []);

  // ── 生成视频 ─────────────────────────────────────────────────────────────────
  const handleGenerateVideo = useCallback(() => {
    setIsGenerating(true);
    localStorage.setItem("creative-scenes", JSON.stringify(scenes));
    localStorage.setItem("creative-character-refs", JSON.stringify(selectedRefs));
    setTimeout(() => {
      setIsGenerating(false);
      navigate(`/video-preview/${dramaId}/${ep || 1}`);
    }, 5000);
  }, [scenes, selectedRefs, dramaId, ep, navigate]);

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
      }}
    >
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50%       { opacity: 1;   transform: scale(1.2); }
        }
        textarea:focus {
          border-color: rgba(124,58,237,0.5) !important;
          background: rgba(124,58,237,0.06) !important;
        }
        ::-webkit-scrollbar { width: 0; }
      `}</style>

      {/* 顶部导航栏 */}
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
            <span style={{ color: "#fff", fontSize: "16px", fontWeight: "600" }}>视频创作</span>
          </div>
          {!isEmpty && !isLoadingStoryboard && (
            <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "11px", margin: 0 }}>
              共 {scenes.length} 个分镜 · EP{ep || 1}
            </p>
          )}
          {isLoadingStoryboard && (
            <p style={{ color: "rgba(168,85,247,0.7)", fontSize: "11px", margin: 0 }}>
              AI 分析中...
            </p>
          )}
        </div>

        {!isEmpty && !isLoadingStoryboard && (
          <div
            style={{
              padding: "4px 10px",
              borderRadius: "8px",
              background: "rgba(124,58,237,0.15)",
              border: "1px solid rgba(124,58,237,0.3)",
            }}
          >
            <span style={{ color: "#a78bfa", fontSize: "11px", fontWeight: "500" }}>
              剧集 {dramaId}
            </span>
          </div>
        )}
      </div>

      {/* 内容区域 */}
      {isEmpty ? (
        <EmptyState onBack={() => navigate(-1)} />
      ) : isLoadingStoryboard ? (
        <StoryboardLoading />
      ) : (
        <>
          {/* 场景列表 */}
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 280px" }}>
            {/* 提示文字 */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                marginBottom: "16px",
                padding: "10px 14px",
                background: "rgba(124,58,237,0.06)",
                border: "1px solid rgba(124,58,237,0.15)",
                borderRadius: "10px",
              }}
            >
              <Sparkles size={12} style={{ color: "#a78bfa", flexShrink: 0 }} />
              <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "12px", lineHeight: "1.5" }}>
                AI 已根据你的互动生成分镜脚本，可直接编辑场景描述和角色动作
              </span>
            </div>

            {scenes.map((scene) => (
              <SceneCard
                key={scene.id}
                scene={scene}
                onChange={handleFieldChange}
                onDelete={handleDelete}
                cardPrompt={cardPrompts[scene.id] || ""}
                cardPromptLoading={!!cardPromptLoading[scene.id]}
                onGeneratePrompt={generateCardPrompt}
              />
            ))}

            {/* 添加场景按钮 */}
            <button
              onClick={handleAddScene}
              style={{
                width: "100%",
                padding: "13px",
                borderRadius: "14px",
                background: "rgba(124,58,237,0.08)",
                border: "1px dashed rgba(124,58,237,0.35)",
                cursor: "pointer",
                color: "#a78bfa",
                fontSize: "14px",
                fontWeight: "500",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                marginBottom: "24px",
              }}
            >
              <Plus size={16} />
              添加分镜
            </button>

            {/* ── 角色参考选择区 ── */}
            <div style={{ marginBottom: "24px" }}>
              {/* 标题 */}
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                <Users size={14} style={{ color: "#a78bfa" }} />
                <span style={{ color: "rgba(255,255,255,0.8)", fontSize: "14px", fontWeight: "600" }}>
                  角色参考
                </span>
              </div>
              <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "11px", margin: "0 0 14px 20px", lineHeight: "1.5" }}>
                选择角色形象参考，确保视频中人物一致
              </p>

              {/* 角色卡片横向滚动 */}
              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  overflowX: "auto",
                  paddingBottom: "4px",
                  scrollbarWidth: "none",
                }}
              >
                {Object.values(CHARACTER_REFS).map((char) => {
                  const selectedCount = (selectedRefs[char.name] || []).length;
                  return (
                    <div
                      key={char.name}
                      style={{
                        flexShrink: 0,
                        width: "148px",
                        background: selectedCount > 0
                          ? "rgba(124,58,237,0.1)"
                          : "rgba(255,255,255,0.03)",
                        border: selectedCount > 0
                          ? "1px solid rgba(124,58,237,0.35)"
                          : "1px solid rgba(255,255,255,0.07)",
                        borderRadius: "14px",
                        padding: "14px 12px",
                        transition: "all 0.2s",
                      }}
                    >
                      {/* 头像 + 名字 + badge */}
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                        {/* 头像占位 */}
                        <div
                          style={{
                            width: "40px",
                            height: "40px",
                            borderRadius: "50%",
                            background: "linear-gradient(135deg, rgba(124,58,237,0.4), rgba(168,85,247,0.25))",
                            border: "1px solid rgba(124,58,237,0.3)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <span style={{ color: "#c4b5fd", fontSize: "15px", fontWeight: "700" }}>
                            {char.name[0]}
                          </span>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                            <span style={{ color: "#fff", fontSize: "13px", fontWeight: "600" }}>
                              {char.name}
                            </span>
                            {selectedCount > 0 && (
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  minWidth: "16px",
                                  height: "16px",
                                  padding: "0 4px",
                                  borderRadius: "999px",
                                  background: "linear-gradient(135deg, #7c3aed, #a855f7)",
                                  color: "#fff",
                                  fontSize: "10px",
                                  fontWeight: "700",
                                }}
                              >
                                {selectedCount}
                              </span>
                            )}
                          </div>
                          <p
                            style={{
                              color: "rgba(255,255,255,0.3)",
                              fontSize: "10px",
                              margin: 0,
                              lineHeight: "1.4",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {char.appearance}
                          </p>
                        </div>
                      </div>

                      {/* 参考帧标签 */}
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                        {char.frames.map((frame) => {
                          const isSelected = (selectedRefs[char.name] || []).includes(frame.id);
                          return (
                            <button
                              key={frame.id}
                              onClick={() => handleToggleRef(char.name, frame.id)}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "3px",
                                padding: "3px 8px",
                                borderRadius: "6px",
                                background: isSelected
                                  ? "rgba(124,58,237,0.3)"
                                  : "rgba(255,255,255,0.05)",
                                border: isSelected
                                  ? "1px solid rgba(124,58,237,0.6)"
                                  : "1px solid rgba(255,255,255,0.1)",
                                color: isSelected ? "#c4b5fd" : "rgba(255,255,255,0.4)",
                                fontSize: "11px",
                                cursor: "pointer",
                                transition: "all 0.15s",
                                fontWeight: isSelected ? "500" : "400",
                              }}
                            >
                              {isSelected && <Check size={8} />}
                              {frame.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── 视频风格选择区 ── */}
            <div style={{ marginBottom: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "12px" }}>
                <Clapperboard size={14} style={{ color: "#a78bfa" }} />
                <span style={{ color: "rgba(255,255,255,0.8)", fontSize: "14px", fontWeight: "600" }}>
                  视频风格
                </span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {["甜宠", "虐恋", "悬疑", "搞笑"].map((style) => (
                  <button
                    key={style}
                    onClick={() => setVideoStyle(style)}
                    style={{
                      padding: "7px 18px",
                      borderRadius: "999px",
                      background:
                        videoStyle === style
                          ? "linear-gradient(135deg, #7c3aed, #a855f7)"
                          : "transparent",
                      border:
                        videoStyle === style
                          ? "1px solid transparent"
                          : "1px solid rgba(255,255,255,0.2)",
                      color: videoStyle === style ? "#fff" : "rgba(255,255,255,0.6)",
                      fontSize: "13px",
                      fontWeight: videoStyle === style ? "600" : "400",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </div>

            {/* ── 配乐选择区 ── */}
            <div style={{ marginBottom: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "12px" }}>
                <Music size={14} style={{ color: "#a78bfa" }} />
                <span style={{ color: "rgba(255,255,255,0.8)", fontSize: "14px", fontWeight: "600" }}>
                  背景音乐
                </span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {["浪漫钢琴", "紧张弦乐", "无"].map((music) => (
                  <button
                    key={music}
                    onClick={() => setBgMusic(music)}
                    style={{
                      padding: "7px 18px",
                      borderRadius: "999px",
                      background:
                        bgMusic === music
                          ? "linear-gradient(135deg, #7c3aed, #a855f7)"
                          : "transparent",
                      border:
                        bgMusic === music
                          ? "1px solid transparent"
                          : "1px solid rgba(255,255,255,0.2)",
                      color: bgMusic === music ? "#fff" : "rgba(255,255,255,0.6)",
                      fontSize: "13px",
                      fontWeight: bgMusic === music ? "600" : "400",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                  >
                    {music}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 底部固定：生成视频按钮 */}
          <div
            style={{
              position: "fixed",
              bottom: 0,
              left: "50%",
              transform: "translateX(-50%)",
              width: "100%",
              maxWidth: "480px",
              padding: "12px 16px 32px",
              background: "linear-gradient(to top, #0D0D0D 70%, transparent)",
              zIndex: 10,
            }}
          >
            <button
              onClick={handleGenerateVideo}
              disabled={isGenerating || scenes.length === 0}
              style={{
                width: "100%",
                padding: "15px",
                borderRadius: "14px",
                background:
                  isGenerating || scenes.length === 0
                    ? "rgba(124,58,237,0.4)"
                    : "linear-gradient(135deg, #7c3aed, #a855f7)",
                border: "none",
                cursor: isGenerating || scenes.length === 0 ? "not-allowed" : "pointer",
                color: "#fff",
                fontSize: "15px",
                fontWeight: "600",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                boxShadow:
                  isGenerating || scenes.length === 0
                    ? "none"
                    : "0 4px 24px rgba(124,58,237,0.45)",
                transition: "all 0.3s",
              }}
            >
              {isGenerating ? (
                <>
                  <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                  AI 正在生成视频...
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  生成视频
                </>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default VideoCreate;
