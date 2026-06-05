/**
 * 漫剧 Demo 演示页面
 * Mock流程：输入创意 → 生成剧本 → 分镜拆解 → 视频合成 → 完成播放
 * 后台同时静默调用真实 Coze 工作流 API
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles, FileText, Film, Play, ChevronLeft, Check, RefreshCw, Camera, ChevronDown, ChevronUp, Bug } from "lucide-react";
import { toast } from "sonner";

// ── Coze 代理地址（token 已在服务端，前端无需携带）─────────────────────────
const COZE_BASE = "https://coze-proxy-wcvnewholf.cn-hangzhou.fcapp.run";

// ── Mock 数据 ────────────────────────────────────────────────────────────────
const MOCK_SCRIPT = `《黑猫警告》

类型：悬疑惊悚
主角：加班男主，白发狼尾，下颌线清晰
配角：神秘黑猫，琥珀色眼睛，会说人话
设定：深夜加班时遇到黑猫警告，必须在15分钟内逃离大楼

第一幕：
男主独自加班到凌晨2点，整层楼只剩他一盏灯。

第二幕：
打印机旁突然出现一只黑猫，琥珀色眼睛在昏暗中闪烁。

第三幕：
黑猫突然开口说话："你还有15分钟离开大楼，现在立刻。"

第四幕：
黑猫逼近警告：这不是幻觉，走楼梯，别等电梯。

第五幕：
黑猫揭示真相：十楼实验室抑制器失效，"那些东西"正在往下渗透。

第六幕：
黑猫描述可怕后果：被碰到的人，意识会消失，只剩空壳身体。

第七幕：
男主狂奔下楼，头顶传来诡异窸窣声，黑猫警告别回头。

第八幕：
十二层安全门外，同事小李变成眼珠全黑的怪物，用头撞门。

第九幕：
墙壁缝隙渗出半透明粘稠物质，黑猫冷静倒计时楼层。

第十幕：
逃出大楼后，黑猫揭示：17个人没来得及出来。手机收到两条消息——一条是2:15的撤离通知，另一条是2:47来自"小李"的："你在哪呢？"`;

const MOCK_SHOTS = [
  { id: 1, desc: "深夜办公室，男主疲惫盯着电脑屏幕", motion: "微动", color: "#1e3a5f" },
  { id: 2, desc: "打印机旁出现神秘黑猫，琥珀色眼睛闪烁", motion: "推进", color: "#0f172a" },
  { id: 3, desc: "黑猫突然开口说话，男主震惊掐腿", motion: "微动", color: "#312e81" },
  { id: 4, desc: "黑猫逼近警告：走楼梯，别等电梯", motion: "推进", color: "#4c1d95" },
  { id: 5, desc: "黑猫揭示十楼实验室抑制器失效", motion: "微动", color: "#581c87" },
  { id: 6, desc: "黑猫描述被碰触的可怕后果", motion: "微动", color: "#701a75" },
  { id: 7, desc: "楼梯间狂奔，头顶传来窸窣声", motion: "下移", color: "#1e293b" },
  { id: 8, desc: "十二层门外，同事小李眼珠全黑撞门", motion: "微动", color: "#0f172a" },
  { id: 9, desc: "墙壁渗出粘稠物质，黑猫倒计时", motion: "下移", color: "#312e81" },
  { id: 10, desc: "逃出大楼，手机收到恐怖短信", motion: "拉远", color: "#1e3a5f" },
];

const COMPOSE_STAGES = [
  { text: "正在合成视频…", delay: 0 },
  { text: "添加运镜效果…", delay: 1500 },
  { text: "叠加字幕…", delay: 3000 },
  { text: "渲染完成 ✨", delay: 4500 },
];

const DEMO_VIDEO_URL = "https://s3plus.meituan.net/mcopilot-pub/nocode-task/chenyanbo/45gogge0juewe0hy0qrrgkihai9hej/comic-demo-v2.mp4";

// ── 步骤配置 ─────────────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: "生成剧本", icon: FileText },
  { id: 2, label: "分镜拆解", icon: Camera },
  { id: 3, label: "视频合成", icon: Film },
  { id: 4, label: "完成播放", icon: Play },
];

// ── 打字机 Hook ───────────────────────────────────────────────────────────────
function useTypewriter(text, speed = 18, active = false) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  const indexRef = useRef(0);

  useEffect(() => {
    if (!active) return;
    setDisplayed("");
    setDone(false);
    indexRef.current = 0;
    const timer = setInterval(() => {
      if (indexRef.current < text.length) {
        setDisplayed(text.slice(0, indexRef.current + 1));
        indexRef.current++;
      } else {
        clearInterval(timer);
        setDone(true);
      }
    }, speed);
    return () => clearInterval(timer);
  }, [text, speed, active]);

  return { displayed, done };
}

// ── 圆形进度环 ────────────────────────────────────────────────────────────────
function CircleProgress({ percent }) {
  const r = 54;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - percent / 100);
  return (
    <svg width="140" height="140" viewBox="0 0 140 140">
      {/* 背景圆 */}
      <circle cx="70" cy="70" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
      {/* 进度圆 */}
      <circle
        cx="70" cy="70" r={r}
        fill="none"
        stroke="url(#progressGrad)"
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform="rotate(-90 70 70)"
        style={{ transition: "stroke-dashoffset 0.25s ease" }}
      />
      <defs>
        <linearGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#c026d3" />
        </linearGradient>
      </defs>
      {/* 百分比文字 */}
      <text x="70" y="70" textAnchor="middle" dominantBaseline="central"
        fill="white" fontSize="22" fontWeight="bold"
      >
        {percent}%
      </text>
    </svg>
  );
}

// ── 主组件 ────────────────────────────────────────────────────────────────────
export default function ComicDemo() {
  const [idea, setIdea] = useState("");
  const [currentStep, setCurrentStep] = useState(0); // 0=输入, 1~4=步骤
  const [loading, setLoading] = useState(false);
  const [scriptReady, setScriptReady] = useState(false);

  // 第2步：分镜
  const [shotLoading, setShotLoading] = useState(false);
  const [shotsVisible, setShotsVisible] = useState(false);

  // 第3步：进度
  const [composeProgress, setComposeProgress] = useState(0);
  const [composeStageIdx, setComposeStageIdx] = useState(0);
  const [composeDone, setComposeDone] = useState(false);
  const [videoEnded, setVideoEnded] = useState(false);

  // ── 真实 API 调试状态 ──
  const [debugOpen, setDebugOpen] = useState(false);
  const [apiTaskId, setApiTaskId] = useState(null);
  const [apiStatus, setApiStatus] = useState(null); // null | 'submitting' | 'polling' | 'completed' | 'failed'
  const [apiResult, setApiResult] = useState(null);
  const [apiError, setApiError] = useState(null);
  const [apiElapsed, setApiElapsed] = useState(0); // 已等待秒数
  const apiStartRef = useRef(null);
  const apiPollTimerRef = useRef(null);
  const apiElapsedTimerRef = useRef(null);

  // 清理轮询定时器
  const clearApiTimers = useCallback(() => {
    if (apiPollTimerRef.current) clearTimeout(apiPollTimerRef.current);
    if (apiElapsedTimerRef.current) clearInterval(apiElapsedTimerRef.current);
  }, []);

  useEffect(() => () => clearApiTimers(), [clearApiTimers]);

  // 后台静默提交 + 轮询
  const submitRealApi = useCallback(async (storyIdea) => {
    setApiStatus("submitting");
    setApiTaskId(null);
    setApiResult(null);
    setApiError(null);
    setApiElapsed(0);
    apiStartRef.current = Date.now();

    // 计时器
    apiElapsedTimerRef.current = setInterval(() => {
      setApiElapsed(Math.floor((Date.now() - apiStartRef.current) / 1000));
    }, 1000);

    try {
      // 通过阿里云 FC 代理调用 Coze API
      const submitRes = await fetch(`${COZE_BASE}/async_run`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          story_idea: storyIdea,
          story_prompt: "",
          character_prompt: "",
          storyboard_prompt: "",
          voice_prompt: "",
        }),
      });
      const submitData = await submitRes.json();
      const taskId = submitData?.task_id || submitData?.id || submitData?.data?.task_id;
      if (!taskId) throw new Error(`提交失败，无 task_id：${JSON.stringify(submitData)}`);

      setApiTaskId(taskId);
      setApiStatus("polling");

      // 轮询
      const poll = async () => {
        try {
          const pollRes = await fetch(`${COZE_BASE}/task/${taskId}`);
          const pollData = await pollRes.json();
          const status = pollData?.status || pollData?.data?.status;

          if (status === "completed" || status === "success") {
            clearApiTimers();
            setApiStatus("completed");
            setApiResult(pollData);
          } else if (status === "failed" || status === "error") {
            clearApiTimers();
            setApiStatus("failed");
            setApiError(JSON.stringify(pollData, null, 2));
          } else {
            // 继续轮询
            apiPollTimerRef.current = setTimeout(poll, 3000);
          }
        } catch (e) {
          clearApiTimers();
          setApiStatus("failed");
          setApiError(e.message);
        }
      };
      poll();

    } catch (e) {
      clearApiTimers();
      setApiStatus("failed");
      setApiError(e.message);
    }
  }, [clearApiTimers]);

  // 打字机
  const { displayed: scriptText, done: scriptDone } = useTypewriter(MOCK_SCRIPT, 14, scriptReady);

  // 字数检查
  const ideaLen = idea.trim().length;
  const canStart = ideaLen >= 50 && ideaLen <= 100;

  // ── 进入第2步 ──
  const enterStep2 = useCallback(async () => {
    setCurrentStep(2);
    setShotLoading(true);
    await new Promise(r => setTimeout(r, 2000));
    setShotLoading(false);
    setShotsVisible(true);
  }, []);

  // ── 进入第3步 ──
  const enterStep3 = useCallback(() => {
    setCurrentStep(3);
    setComposeProgress(0);
    setComposeStageIdx(0);
    setComposeDone(false);

    // 进度：5秒跑完 0→100
    const totalMs = 5000;
    const interval = 80;
    const step = 100 / (totalMs / interval);
    let current = 0;
    const timer = setInterval(() => {
      current += step;
      if (current >= 100) {
        setComposeProgress(100);
        clearInterval(timer);
        setTimeout(() => setComposeDone(true), 300);
      } else {
        setComposeProgress(Math.round(current));
      }
    }, interval);

    // 文字阶段
    COMPOSE_STAGES.forEach((s, i) => {
      setTimeout(() => setComposeStageIdx(i), s.delay);
    });
  }, []);

  // ── 开始按钮（仅 mock 流程）──
  const handleStart = async () => {
    if (!canStart) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 3000));
    setLoading(false);
    setCurrentStep(1);
    setTimeout(() => setScriptReady(true), 300);
  };

  // ── 重新开始 ──
  const handleRestart = () => {
    setIdea("");
    setCurrentStep(0);
    setLoading(false);
    setScriptReady(false);
    setShotLoading(false);
    setShotsVisible(false);
    setComposeProgress(0);
    setComposeStageIdx(0);
    setComposeDone(false);
    setVideoEnded(false);
    clearApiTimers();
    setApiTaskId(null);
    setApiStatus(null);
    setApiResult(null);
    setApiError(null);
    setApiElapsed(0);
  };

  // 紫色渐变按钮样式
  const purpleBtn = {
    background: "linear-gradient(135deg, #7c3aed, #a855f7)",
    boxShadow: "0 4px 24px rgba(124,58,237,0.4)"
  };

  return (
    <div
      style={{ minHeight: "100dvh", background: "linear-gradient(135deg, #0f0c1a 0%, #1a1030 50%, #0d1a2e 100%)" }}
      className="text-white flex flex-col"
    >
      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-white/10">
        <button className="text-white/60 hover:text-white transition-colors p-1" onClick={() => window.history.back()}>
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-base font-semibold text-white">漫剧创作 Demo</h1>
          <p className="text-xs text-white/40">AI 自动生成漫剧短视频</p>
        </div>
        {currentStep > 0 && (
          <button className="text-white/40 hover:text-white/70 transition-colors" onClick={handleRestart}>
            <RefreshCw className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ── 步骤指示器 ── */}
      {currentStep > 0 && (
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-center justify-between">
            {STEPS.map((step, idx) => {
              const stepNum = idx + 1;
              const isDone = currentStep > stepNum;
              const isActive = currentStep === stepNum;
              const isPending = currentStep < stepNum;
              return (
                <div key={step.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center gap-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500
                      ${isDone ? "bg-green-500 text-white" : ""}
                      ${isActive ? "bg-purple-500 text-white ring-2 ring-purple-400/50 ring-offset-2 ring-offset-transparent" : ""}
                      ${isPending ? "bg-white/10 text-white/30" : ""}
                    `}>
                      {isDone ? <Check className="w-4 h-4" /> : <step.icon className="w-3.5 h-3.5" />}
                    </div>
                    <span className={`text-[10px] whitespace-nowrap transition-colors duration-300
                      ${isActive ? "text-purple-300 font-medium" : ""}
                      ${isDone ? "text-green-400" : ""}
                      ${isPending ? "text-white/25" : ""}
                    `}>
                      {step.label}
                    </span>
                  </div>
                  {idx < STEPS.length - 1 && (
                    <div className="flex-1 mx-1 mb-4">
                      <div className={`h-[2px] rounded-full transition-all duration-700
                        ${currentStep > stepNum ? "bg-green-500" : "bg-white/10"}
                      `} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 内容区 ── */}
      <div className="flex-1 px-4 py-4 overflow-auto">

        {/* ── Step 0：输入创意 ── */}
        {currentStep === 0 && (
          <div className="space-y-5">
            <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-4 space-y-2">
              <div className="flex items-center gap-2 text-purple-300">
                <Sparkles className="w-4 h-4" />
                <span className="text-sm font-medium">输入你的漫剧创意</span>
              </div>
              <p className="text-xs text-white/50 leading-relaxed">描述一个短剧场景或故事创意，AI 将自动生成剧本、分镜和视频。限 50~100 字。</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs text-white/60">创意描述</label>
                <span className={`text-xs transition-colors ${ideaLen < 50 ? "text-white/30" : ideaLen <= 100 ? "text-green-400" : "text-red-400"}`}>
                  {ideaLen} / 100
                </span>
              </div>
              <Textarea
                value={idea}
                onChange={e => setIdea(e.target.value)}
                placeholder="例如：深夜加班后，在公司楼下遇到了暗恋已久的同事，他递给我一份多买的外卖，我鼓起勇气想要告白，却在最后关头说不出口……"
                className="min-h-[140px] resize-none bg-white/5 border-white/15 text-white placeholder:text-white/25 text-sm rounded-xl focus:border-purple-500/50"
              />
              {ideaLen > 100 && <p className="text-xs text-red-400">超出字数限制，请精简描述</p>}
              {ideaLen > 0 && ideaLen < 50 && <p className="text-xs text-white/40">还需要 {50 - ideaLen} 个字</p>}
            </div>

            <div
              className="rounded-xl border border-white/10 bg-white/[0.03] p-3 cursor-pointer hover:border-purple-500/30 hover:bg-purple-500/5 transition-all"
              onClick={() => setIdea("男主今晚一个人在公司加班到2点，此时突然出现一只小黑猫，黑猫对他说你赶紧在15分钟之内离开大楼，快！到底有着怎样的秘密呢？")}
            >
              <p className="text-xs text-white/40 mb-1">💡 点击使用示例</p>
              <p className="text-xs text-white/60 leading-relaxed line-clamp-2">男主今晚一个人在公司加班到2点，此时突然出现一只小黑猫，黑猫对他说你赶紧在15分钟之内离开大楼，快！到底有着怎样的秘密呢？</p>
            </div>

            {/* 真实生成按钮 */}
            <Button
              className="w-full h-12 rounded-xl font-semibold text-sm transition-all"
              style={canStart && !apiStatus ? {
                background: "linear-gradient(135deg, #059669, #10b981)",
                boxShadow: "0 4px 24px rgba(5,150,105,0.4)"
              } : {}}
              disabled={!canStart || !!apiStatus}
              onClick={() => {
                if (!canStart) return;
                submitRealApi(idea);
                setDebugOpen(true);
              }}
            >
              {apiStatus === "submitting" || apiStatus === "polling" ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />真实生成中… {apiElapsed}s</>
              ) : apiStatus === "completed" ? (
                <><Check className="mr-2 h-4 w-4" />真实生成已完成</>
              ) : apiStatus === "failed" ? (
                <><span className="mr-2">✗</span>真实生成失败</>
              ) : (
                <><Sparkles className="mr-2 h-4 w-4" />真实生成（调用 API）</>
              )}
            </Button>

            {/* Mock 流程按钮 */}
            <Button
              className="w-full h-11 rounded-xl font-semibold text-sm transition-all"
              style={canStart ? purpleBtn : {}}
              disabled={!canStart || loading}
              onClick={handleStart}
            >
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />AI 创作中…</> : <><Play className="mr-2 h-4 w-4" />Demo 演示</>}
            </Button>
          </div>
        )}

        {/* ── Step 1：生成剧本 ── */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-purple-300">
              <FileText className="w-4 h-4" />
              <span className="text-sm font-semibold">AI 剧本</span>
              {!scriptDone ? <Loader2 className="w-3 h-3 animate-spin text-white/40" /> : <span className="text-xs text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">生成完成</span>}
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 min-h-[340px]">
              <pre className="text-sm text-white/85 leading-relaxed whitespace-pre-wrap" style={{ fontFamily: "inherit" }}>
                {scriptText}
                {!scriptDone && <span className="inline-block w-[2px] h-[1em] bg-purple-400 ml-0.5 animate-pulse align-middle" />}
              </pre>
            </div>
            {scriptDone && (
              <Button className="w-full h-12 rounded-xl font-semibold text-sm" style={purpleBtn} onClick={enterStep2}>
                <Camera className="mr-2 h-4 w-4" />下一步：分镜拆解
              </Button>
            )}
          </div>
        )}

        {/* ── Step 2：分镜拆解 ── */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-purple-300">
              <Camera className="w-4 h-4" />
              <span className="text-sm font-semibold">分镜拆解</span>
              {shotLoading && <Loader2 className="w-3 h-3 animate-spin text-white/40" />}
              {shotsVisible && <span className="text-xs text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">7 个分镜</span>}
            </div>

            {shotLoading && (
              <div className="flex flex-col items-center justify-center py-16 space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
                <p className="text-sm text-white/50">正在拆解分镜…</p>
              </div>
            )}

            {shotsVisible && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  {MOCK_SHOTS.map((shot, idx) => (
                    <div
                      key={shot.id}
                      className="rounded-xl border border-white/10 bg-white/[0.03] p-2.5 hover:border-purple-500/30 transition-all"
                    >
                      {/* 序号 + 运镜标签 */}
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ background: `${shot.color}44` }}>
                          <span className="text-[10px] font-bold" style={{ color: shot.color }}>{shot.id}</span>
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                          style={{ background: `${shot.color}33`, color: shot.color }}>
                          {shot.motion}
                        </span>
                      </div>
                      {/* 场景描述 */}
                      <p className="text-xs text-white/70 leading-relaxed">{shot.desc}</p>
                    </div>
                  ))}
                </div>

                <Button className="w-full h-12 rounded-xl font-semibold text-sm" style={purpleBtn} onClick={enterStep3}>
                  <Film className="mr-2 h-4 w-4" />下一步：合成视频
                </Button>
              </>
            )}
          </div>
        )}

        {/* ── Step 3：视频合成 ── */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-purple-300">
              <Film className="w-4 h-4" />
              <span className="text-sm font-semibold">视频合成</span>
              {!composeDone && <Loader2 className="w-3 h-3 animate-spin text-white/40" />}
              {composeDone && <span className="text-xs text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">合成完成</span>}
            </div>

            {/* 圆形进度环 */}
            <div className="flex flex-col items-center justify-center py-6 space-y-5">
              <CircleProgress percent={composeProgress} />

              {/* 阶段文字 */}
              <div className="space-y-2 w-full max-w-xs">
                {COMPOSE_STAGES.map((s, i) => (
                  <div key={i} className={`flex items-center gap-2 transition-all duration-500 ${i <= composeStageIdx ? "opacity-100" : "opacity-20"}`}>
                    {i < composeStageIdx ? (
                      <Check className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                    ) : i === composeStageIdx ? (
                      <div className="w-3.5 h-3.5 flex-shrink-0 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                      </div>
                    ) : (
                      <div className="w-3.5 h-3.5 flex-shrink-0 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                      </div>
                    )}
                    <span className={`text-sm ${i === composeStageIdx ? "text-purple-300 font-medium" : i < composeStageIdx ? "text-green-400" : "text-white/30"}`}>
                      {s.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {composeDone && (
              <Button className="w-full h-12 rounded-xl font-semibold text-sm" style={purpleBtn} onClick={() => setCurrentStep(4)}>
                <Play className="mr-2 h-4 w-4" />播放视频
              </Button>
            )}
          </div>
        )}

        {/* ── Step 4：完成播放 ── */}
        {currentStep === 4 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-400">
              <Check className="w-4 h-4" />
              <span className="text-sm font-semibold">漫剧生成完成</span>
            </div>

            {/* 9:16 视频播放器 */}
            <div className="relative w-full rounded-2xl overflow-hidden border border-white/10"
              style={{ aspectRatio: "9/16", background: "#000", maxHeight: "60vh" }}>
              <video
                src={DEMO_VIDEO_URL}
                controls
                autoPlay
                playsInline
                className="w-full h-full object-contain"
                style={{ background: "#000" }}
                onEnded={() => setVideoEnded(true)}
              />

              {/* 视频结束互动浮层 */}
              {videoEnded && (
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6"
                  style={{
                    background: "rgba(0,0,0,0.75)",
                    animation: "fadeIn 0.4s ease",
                  }}
                >
                  <style>{`@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`}</style>
                  <p className="text-white font-semibold text-base mb-2">✨ 你的漫剧已生成</p>
                  <button
                    className="w-full max-w-xs py-3 rounded-xl font-semibold text-sm text-white"
                    style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
                    onClick={() => toast.success("继续创作下一集功能即将上线！")}
                  >
                    继续创作下一集
                  </button>
                  <button
                    className="w-full max-w-xs py-3 rounded-xl font-semibold text-sm text-white border border-white/30 bg-transparent hover:bg-white/10 transition-colors"
                    onClick={() => toast.info("换个画风重新生成功能即将上线！")}
                  >
                    换个画风重新生成
                  </button>
                  <button
                    className="w-full max-w-xs py-3 rounded-xl font-semibold text-sm text-white border border-white/30 bg-transparent hover:bg-white/10 transition-colors"
                    onClick={() => toast.info("社区分享功能即将上线！")}
                  >
                    分享到社区
                  </button>
                </div>
              )}
            </div>

            {/* 重新开始 */}
            <Button
              variant="outline"
              className="w-full h-12 rounded-xl font-semibold text-sm border-white/15 text-white/70 hover:bg-white/10 hover:text-white"
              onClick={handleRestart}
            >
              <RefreshCw className="mr-2 h-4 w-4" />重新创作
            </Button>
          </div>
        )}

      </div>

      {/* ── API 调试折叠区域 ── */}
      {apiStatus && (
        <div className="mx-4 mb-4 rounded-2xl border border-white/10 overflow-hidden" style={{ background: "rgba(255,255,255,0.03)" }}>
          {/* 折叠头 */}
          <button
            className="w-full flex items-center justify-between px-4 py-3 text-left"
            onClick={() => setDebugOpen(v => !v)}
          >
            <div className="flex items-center gap-2">
              <Bug className="w-3.5 h-3.5 text-white/40" />
              <span className="text-xs text-white/50 font-medium">API 调试</span>
              {/* 状态徽标 */}
              {apiStatus === "submitting" && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400">提交中</span>}
              {apiStatus === "polling" && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 flex items-center gap-1"><Loader2 className="w-2.5 h-2.5 animate-spin" />轮询中 {apiElapsed}s</span>}
              {apiStatus === "completed" && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-400">✓ 完成</span>}
              {apiStatus === "failed" && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400">✗ 失败</span>}
            </div>
            {debugOpen ? <ChevronUp className="w-3.5 h-3.5 text-white/30" /> : <ChevronDown className="w-3.5 h-3.5 text-white/30" />}
          </button>

          {/* 折叠内容 */}
          {debugOpen && (
            <div className="px-4 pb-4 space-y-3 border-t border-white/10 pt-3">
              {/* 基本信息 */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-white/5 px-3 py-2">
                  <p className="text-white/40 mb-0.5">Task ID</p>
                  <p className="text-white/70 font-mono break-all">{apiTaskId || "—"}</p>
                </div>
                <div className="rounded-lg bg-white/5 px-3 py-2">
                  <p className="text-white/40 mb-0.5">已等待</p>
                  <p className="text-white/70">{apiElapsed}s</p>
                </div>
              </div>

              {/* 错误信息 */}
              {apiError && (
                <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3">
                  <p className="text-xs text-red-400 font-mono break-all whitespace-pre-wrap">{apiError}</p>
                </div>
              )}

              {/* 结果 JSON */}
              {apiResult && (
                <div className="space-y-2">
                  <p className="text-xs text-white/40">返回 JSON</p>
                  <pre className="rounded-lg bg-white/5 p-3 text-[10px] text-green-300/80 font-mono overflow-auto max-h-48 whitespace-pre-wrap break-all">
                    {JSON.stringify(apiResult, null, 2)}
                  </pre>
                </div>
              )}

              {/* 如果有 video_url，展示播放器 */}
              {(() => {
                const vUrl = apiResult?.video_url
                  || apiResult?.data?.video_url
                  || apiResult?.result?.video_url;
                if (!vUrl) return null;
                return (
                  <div className="space-y-1">
                    <p className="text-xs text-white/40">真实生成视频</p>
                    <video
                      src={vUrl}
                      controls
                      playsInline
                      className="w-full rounded-xl"
                      style={{ background: "#000", maxHeight: "50vh" }}
                    />
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
