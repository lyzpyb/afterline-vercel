import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, RotateCcw } from "lucide-react";

// ─── 故事脚本 ──────────────────────────────────────────────────────────────────
const STORY_SCRIPT = {
  start: {
    type: "video",
    url: "https://s3plus.meituan.net/mcopilot-pub/nocode-task/chenyanbo/i6g3zi5nnj9eesml828ezoo1gcxjwn/mmexport1779810379501.mp4",
    next: "choice1",
  },
  choice1: {
    type: "choice",
    question: "你会怎么回应？",
    options: [
      { label: "故作强硬", next: "branch_a" },
      { label: "示弱撒娇", next: "branch_b" },
    ],
  },
  branch_a: {
    type: "video",
    url: "https://s3plus.meituan.net/mcopilot-pub/nocode-task/chenyanbo/9vcntms1jqblzvv20zjmbdzhgfj86s/%E5%88%86%E6%94%AF1.mp4",
    next: "mid_node",
  },
  branch_b: {
    type: "video",
    url: "https://s3plus.meituan.net/mcopilot-pub/nocode-task/chenyanbo/j7tkldvp3qiyj8a3xfxro7vfyd4jle/%E5%88%86%E6%94%AF2.mp4",
    next: "mid_node",
  },
  mid_node: {
    type: "video",
    url: "https://s3plus.meituan.net/mcopilot-pub/nocode-task/chenyanbo/1yfxidyjcmoyorazky4fa42ctvavus/%E8%8A%82%E7%82%B9.mp4",
    next: "choice2",
  },
  choice2: {
    type: "choice",
    question: "关键时刻，你的选择是？",
    options: [
      { label: "闭眼认命", next: "ending_a" },
      { label: "反客为主", next: "ending_b" },
    ],
  },
  ending_a: {
    type: "video",
    url: "https://s3plus.meituan.net/mcopilot-pub/nocode-task/chenyanbo/l1ht1jnb7392kmnrbjw31fk0ckcgim/%E8%8A%82%E7%82%B9A.mp4",
    next: null,
    isEnding: true,
    endingTitle: "结局A · 命运的温柔",
  },
  ending_b: {
    type: "video",
    url: "https://s3plus.meituan.net/mcopilot-pub/nocode-task/chenyanbo/6ep9xg6z2gqs677hs9m1hrlxmsvinz/%E8%8A%82%E7%82%B9B.mp4",
    next: null,
    isEnding: true,
    endingTitle: "结局B · 逆风而行",
  },
};

// 获取某节点的视频 URL（用于预加载）
function getVideoUrl(nodeId) {
  const node = STORY_SCRIPT[nodeId];
  return node?.type === "video" ? node.url : null;
}

// ─── 主组件 ────────────────────────────────────────────────────────────────────
export default function InteractivePlayer() {
  const navigate = useNavigate();

  // 双 buffer：activeSlot = 0 或 1，表示当前显示哪个 video 元素
  const [activeSlot, setActiveSlot] = useState(0);
  // 每个 slot 当前的 nodeId
  const [slotNodeId, setSlotNodeId] = useState(["start", null]);
  // 每个 slot 的 opacity（用于 crossfade）
  const [slotOpacity, setSlotOpacity] = useState([1, 0]);

  const videoRefs = [useRef(null), useRef(null)];

  const [showChoices, setShowChoices] = useState(false);
  const [showEnding, setShowEnding] = useState(false);
  const [choicesVisible, setChoicesVisible] = useState(false);
  const [pendingChoiceId, setPendingChoiceId] = useState(null);
  const [currentNodeId, setCurrentNodeId] = useState("start");

  const currentNode = STORY_SCRIPT[currentNodeId];
  const pendingChoiceNode = pendingChoiceId ? STORY_SCRIPT[pendingChoiceId] : null;
  const endingTitle = currentNode?.endingTitle || "";

  // ── 预加载下一个视频节点 ──────────────────────────────────────────────────────
  const preloadNext = useCallback((nextNodeId) => {
    if (!nextNodeId) return;
    const url = getVideoUrl(nextNodeId);
    if (!url) return;
    const nextSlot = activeSlot === 0 ? 1 : 0;
    const nextVideo = videoRefs[nextSlot].current;
    if (!nextVideo) return;
    // 只在 src 不同时才重新 load，避免重复
    if (nextVideo.src !== url) {
      nextVideo.src = url;
      nextVideo.load();
    }
    setSlotNodeId((prev) => {
      const updated = [...prev];
      updated[nextSlot] = nextNodeId;
      return updated;
    });
  }, [activeSlot, videoRefs]);

  // ── 跳转节点（crossfade swap） ───────────────────────────────────────────────
  const goToNode = useCallback((nodeId) => {
    setShowChoices(false);
    setChoicesVisible(false);
    setShowEnding(false);
    setPendingChoiceId(null);
    setCurrentNodeId(nodeId);

    const node = STORY_SCRIPT[nodeId];
    if (node?.type !== "video") return;

    const nextSlot = activeSlot === 0 ? 1 : 0;
    const nextVideo = videoRefs[nextSlot].current;
    const currVideo = videoRefs[activeSlot].current;

    // 确保 next slot 已挂载正确 src
    if (nextVideo && nextVideo.getAttribute("data-node") !== nodeId) {
      nextVideo.src = node.url;
      nextVideo.load();
    }

    // 播放下一个 slot
    if (nextVideo) {
      nextVideo.currentTime = 0;
      nextVideo.play().catch(() => {});
    }

    // crossfade：next slot 淡入，current slot 淡出
    setSlotOpacity(nextSlot === 1 ? [0, 1] : [1, 0]);
    setActiveSlot(nextSlot);
    setSlotNodeId((prev) => {
      const updated = [...prev];
      updated[nextSlot] = nodeId;
      return updated;
    });

    // 200ms 后暂停并重置退出的 slot，等待下次预加载
    setTimeout(() => {
      if (currVideo) {
        currVideo.pause();
        currVideo.currentTime = 0;
        currVideo.removeAttribute("src");
      }
    }, 300);
  }, [activeSlot, videoRefs]);

  // ── 视频播放完毕 ──────────────────────────────────────────────────────────────
  const handleVideoEnded = useCallback((slotIdx) => {
    // 只响应当前活跃 slot 的事件
    if (slotIdx !== activeSlot) return;
    if (!currentNode) return;

    if (currentNode.isEnding) {
      setShowEnding(true);
      return;
    }

    if (currentNode.next) {
      const next = STORY_SCRIPT[currentNode.next];
      if (next?.type === "choice") {
        // 定格最后一帧
        const vid = videoRefs[activeSlot].current;
        if (vid) {
          vid.pause();
          const dur = vid.duration;
          if (dur && isFinite(dur)) vid.currentTime = dur - 0.001;
        }
        setPendingChoiceId(currentNode.next);
        setShowChoices(true);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => setChoicesVisible(true));
        });
      } else {
        goToNode(currentNode.next);
      }
    }
  }, [activeSlot, currentNode, goToNode, videoRefs]);

  // ── 选择选项 ──────────────────────────────────────────────────────────────────
  const handleChoiceSelect = useCallback((next) => {
    setChoicesVisible(false);
    setTimeout(() => {
      setShowChoices(false);
      goToNode(next);
    }, 320);
  }, [goToNode]);

  // ── 初始化：播放 start 节点 ───────────────────────────────────────────────────
  useEffect(() => {
    const vid = videoRefs[0].current;
    if (!vid) return;
    vid.src = STORY_SCRIPT.start.url;
    vid.load();
    vid.play().catch(() => {});
    setSlotNodeId(["start", null]);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 视频开始播放时预加载下一段 ────────────────────────────────────────────────
  const handleVideoPlaying = useCallback((slotIdx) => {
    if (slotIdx !== activeSlot) return;
    const node = STORY_SCRIPT[slotNodeId[slotIdx]];
    if (!node || node.type !== "video") return;
    const nextId = node.next;
    if (!nextId) return;
    const nextNode = STORY_SCRIPT[nextId];
    // next 是 video 节点才直接预加载；是 choice 则找 choice 的所有分支预加载
    if (nextNode?.type === "video") {
      preloadNext(nextId);
    } else if (nextNode?.type === "choice") {
      // choice 节点本身没视频，预加载其所有选项分支
      nextNode.options?.forEach((opt) => {
        const branchNode = STORY_SCRIPT[opt.next];
        if (branchNode?.type === "video") {
          // 只预加载第一个分支（另一个等用户选择后再加载）
          preloadNext(opt.next);
        }
      });
    }
  }, [activeSlot, slotNodeId, preloadNext]);

  // ── 重新开始 ──────────────────────────────────────────────────────────────────
  const handleRestart = useCallback(() => {
    setShowEnding(false);
    setShowChoices(false);
    setChoicesVisible(false);
    setPendingChoiceId(null);
    setCurrentNodeId("start");
    setActiveSlot(0);
    setSlotOpacity([1, 0]);

    // 重置两个 slot
    videoRefs.forEach((ref, i) => {
      const vid = ref.current;
      if (!vid) return;
      if (i === 0) {
        vid.src = STORY_SCRIPT.start.url;
        vid.load();
        vid.play().catch(() => {});
      } else {
        vid.pause();
        vid.currentTime = 0;
        vid.removeAttribute("src");
      }
    });
    setSlotNodeId(["start", null]);
  }, [videoRefs]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#000",
        overflow: "hidden",
      }}
    >
      {/* ── 双 buffer 视频层 ── */}
      {[0, 1].map((slotIdx) => (
        <video
          key={slotIdx}
          ref={videoRefs[slotIdx]}
          data-node={slotNodeId[slotIdx]}
          onEnded={() => handleVideoEnded(slotIdx)}
          onPlaying={() => handleVideoPlaying(slotIdx)}
          playsInline
          muted={false}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: slotOpacity[slotIdx],
            transition: "opacity 0.2s ease",
            zIndex: slotOpacity[slotIdx] > 0 ? 1 : 0,
          }}
        />
      ))}

      {/* ── 渐变遮罩 ── */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, transparent 20%, transparent 60%, rgba(0,0,0,0.7) 100%)",
          pointerEvents: "none",
          zIndex: 5,
        }}
      />

      {/* ── 左上角返回按钮 ── */}
      <button
        onClick={() => navigate(-1)}
        style={{
          position: "absolute",
          top: "env(safe-area-inset-top, 16px)",
          left: "16px",
          marginTop: "16px",
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "36px",
          height: "36px",
          borderRadius: "50%",
          background: "rgba(0,0,0,0.4)",
          border: "1px solid rgba(255,255,255,0.15)",
          cursor: "pointer",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
        }}
      >
        <ArrowLeft size={18} color="#fff" />
      </button>

      {/* ── 标题标签 ── */}
      <div
        style={{
          position: "absolute",
          top: "calc(env(safe-area-inset-top, 16px) + 22px)",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "2px",
        }}
      >
        <span style={{ color: "rgba(255,255,255,0.9)", fontSize: "15px", fontWeight: "600", letterSpacing: "0.02em" }}>
          心动禁区
        </span>
        <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "11px" }}>
          互动剧情
        </span>
      </div>

      {/* ── 选项面板（底部滑入） ── */}
      {showChoices && pendingChoiceNode?.type === "choice" && (
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 20,
            transform: choicesVisible ? "translateY(0)" : "translateY(100%)",
            transition: "transform 0.35s cubic-bezier(0.32,0.72,0,1)",
            padding: "0 0 calc(env(safe-area-inset-bottom, 0px) + 28px)",
            background: "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.6) 70%, transparent 100%)",
            paddingTop: "60px",
          }}
        >
          <p style={{ textAlign: "center", color: "rgba(255,255,255,0.65)", fontSize: "13px", marginBottom: "16px", letterSpacing: "0.04em" }}>
            {pendingChoiceNode.question}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", padding: "0 24px" }}>
            {pendingChoiceNode.options.map((opt, idx) => (
              <button
                key={idx}
                onClick={() => handleChoiceSelect(opt.next)}
                style={{
                  width: "100%",
                  padding: "14px 24px",
                  borderRadius: "16px",
                  background: "linear-gradient(135deg, rgba(232,168,124,0.85) 0%, rgba(155,89,182,0.85) 100%)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  cursor: "pointer",
                  color: "#fff",
                  fontSize: "16px",
                  fontWeight: "600",
                  letterSpacing: "0.08em",
                  textShadow: "0 1px 4px rgba(0,0,0,0.3)",
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                  boxShadow: "0 4px 20px rgba(155,89,182,0.35)",
                  transition: "transform 0.15s, opacity 0.15s",
                }}
                onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.97)")}
                onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
                onTouchStart={(e) => (e.currentTarget.style.opacity = "0.85")}
                onTouchEnd={(e) => (e.currentTarget.style.opacity = "1")}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── 结局结束界面 ── */}
      {showEnding && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 30,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "flex-end",
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(2px)",
            WebkitBackdropFilter: "blur(2px)",
            paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 48px)",
            animation: "fadeIn 0.5s ease",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: "36px" }}>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "12px", letterSpacing: "0.1em", marginBottom: "8px" }}>
              THE END
            </p>
            <p style={{ color: "#fff", fontSize: "22px", fontWeight: "700", letterSpacing: "0.04em", textShadow: "0 2px 12px rgba(155,89,182,0.6)" }}>
              {endingTitle || "剧情结束"}
            </p>
          </div>
          <div style={{ display: "flex", gap: "16px", padding: "0 32px", width: "100%", boxSizing: "border-box" }}>
            <button
              onClick={handleRestart}
              style={{
                flex: 1, padding: "14px 0", borderRadius: "16px",
                background: "linear-gradient(135deg, rgba(232,168,124,0.9) 0%, rgba(155,89,182,0.9) 100%)",
                border: "none", cursor: "pointer", color: "#fff", fontSize: "15px", fontWeight: "600",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                boxShadow: "0 4px 20px rgba(155,89,182,0.4)",
              }}
            >
              <RotateCcw size={15} />
              重新开始
            </button>
            <button
              onClick={() => navigate(-1)}
              style={{
                flex: 1, padding: "14px 0", borderRadius: "16px",
                background: "rgba(255,255,255,0.1)",
                border: "1px solid rgba(255,255,255,0.2)",
                cursor: "pointer", color: "rgba(255,255,255,0.85)", fontSize: "15px", fontWeight: "600",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
              }}
            >
              <ArrowLeft size={15} />
              返回
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
