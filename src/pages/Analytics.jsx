import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Users, Clock, MousePointerClick, Eye, TrendingUp, BarChart3 } from "lucide-react";

// ─── Color Constants ────────────────────────────────────────────────
const COLORS = {
  A: "#E8A87C",
  B: "#C2185B",
  A_bg: "rgba(232,168,124,0.15)",
  B_bg: "rgba(194,24,91,0.15)",
  text: "#F5F0EB",
  textDim: "rgba(245,240,235,0.5)",
  textMuted: "rgba(245,240,235,0.25)",
  bg: "#0D0D0D",
  card: "rgba(255,255,255,0.04)",
  border: "rgba(255,255,255,0.08)",
};

const Analytics = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("7d");

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const daysMap = { "1d": 1, "7d": 7, "30d": 30 };
      const days = daysMap[timeRange] || 7;
      const since = new Date(Date.now() - days * 86400000).toISOString();

      const { data: rows, error } = await supabase
        .from("ab_visits")
        .select("version, page, event, session_id, meta, created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setData(processData(rows || []));
    } catch (e) {
      console.error("Analytics fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  const processData = (rows) => {
    const result = { A: makeEmpty(), B: makeEmpty(), daily: {} };

    for (const row of rows) {
      const v = row.version;
      if (!result[v]) continue;

      if (row.event === "page_view") {
        result[v].pv++;
        if (!result[v].sessions.has(row.session_id)) {
          result[v].sessions.add(row.session_id);
          result[v].uv++;
        }
      }

      if (row.event === "page_stay" && row.meta?.duration_sec) {
        result[v].totalDuration += row.meta.duration_sec;
        result[v].stayCount++;
      }

      if (row.event === "click") {
        result[v].clicks++;
        const action = row.meta?.action || "unknown";
        result[v].clickActions[action] = (result[v].clickActions[action] || 0) + 1;
      }

      const day = row.created_at?.slice(0, 10);
      if (day) {
        if (!result.daily[day]) result.daily[day] = { A: { pv: 0, clicks: 0 }, B: { pv: 0, clicks: 0 } };
        if (row.event === "page_view") result.daily[day][v].pv++;
        if (row.event === "click") result.daily[day][v].clicks++;
      }
    }

    return result;
  };

  const makeEmpty = () => ({
    pv: 0, uv: 0, totalDuration: 0, stayCount: 0, clicks: 0,
    sessions: new Set(), clickActions: {},
  });

  const fmt = (n) => (n >= 10000 ? (n / 10000).toFixed(1) + "万" : n.toLocaleString());
  const avgDuration = (v) => (data?.[v]?.stayCount ? Math.round(data[v].totalDuration / data[v].stayCount) : 0);
  const fmtDuration = (sec) => {
    if (!sec) return "0秒";
    if (sec < 60) return `${sec}秒`;
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return s > 0 ? `${m}分${s}秒` : `${m}分钟`;
  };

  const topClickActions = (v) => {
    if (!data?.[v]?.clickActions) return [];
    return Object.entries(data[v].clickActions)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  };

  const dailyLabels = data?.daily ? Object.keys(data.daily).sort() : [];
  const maxDailyPV = Math.max(
    ...dailyLabels.map((d) => Math.max(data.daily[d].A.pv, data.daily[d].B.pv)),
    1
  );

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: COLORS.bg,
        maxWidth: "480px",
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-5"
        style={{
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 14px)",
          paddingBottom: "14px",
          borderBottom: `1px solid ${COLORS.border}`,
        }}
      >
        <button onClick={() => navigate(-1)}>
          <ArrowLeft size={22} style={{ color: COLORS.text }} />
        </button>
        <div>
          <h1 className="font-sans" style={{ color: COLORS.text, fontSize: "18px", fontWeight: 700 }}>
            AB 数据面板
          </h1>
          <p className="font-sans" style={{ color: COLORS.textDim, fontSize: "11px" }}>
            版本对比 · 实时统计
          </p>
        </div>
      </div>

      {/* Time Range Tabs */}
      <div className="flex gap-2 px-5 py-3" style={{ borderBottom: `1px solid ${COLORS.border}` }}>
        {["1d", "7d", "30d"].map((range) => (
          <button
            key={range}
            onClick={() => setTimeRange(range)}
            className="font-sans px-3 py-1 rounded-full text-xs transition-all"
            style={{
              background: timeRange === range ? "rgba(232,168,124,0.2)" : "transparent",
              color: timeRange === range ? COLORS.A : COLORS.textDim,
              border: `1px solid ${timeRange === range ? "rgba(232,168,124,0.3)" : COLORS.border}`,
            }}
          >
            {{ "1d": "今天", "7d": "近7天", "30d": "近30天" }[range]}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-4" style={{ paddingBottom: "40px" }}>
        {loading ? (
          <div className="flex items-center justify-center" style={{ height: "300px" }}>
            <p className="font-sans" style={{ color: COLORS.textDim }}>加载中...</p>
          </div>
        ) : !data ? (
          <div className="flex items-center justify-center" style={{ height: "300px" }}>
            <p className="font-sans" style={{ color: COLORS.textDim }}>暂无数据</p>
          </div>
        ) : (
          <>
            {/* ── Overview Cards ── */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <StatCard icon={<Eye size={16} />} label="页面浏览量" valueA={fmt(data.A.pv)} valueB={fmt(data.B.pv)} />
              <StatCard icon={<Users size={16} />} label="独立访客" valueA={fmt(data.A.uv)} valueB={fmt(data.B.uv)} />
              <StatCard icon={<Clock size={16} />} label="平均停留时长" valueA={fmtDuration(avgDuration("A"))} valueB={fmtDuration(avgDuration("B"))} />
              <StatCard icon={<MousePointerClick size={16} />} label="交互点击" valueA={fmt(data.A.clicks)} valueB={fmt(data.B.clicks)} />
            </div>

            {/* ── Total Duration ── */}
            <div className="rounded-2xl p-4 mb-5" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={14} style={{ color: COLORS.A }} />
                <span className="font-sans" style={{ color: COLORS.textDim, fontSize: "12px", fontWeight: 600 }}>累计停留时长</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <DurationBlock label="A 版 · 短剧" seconds={data.A.totalDuration} color={COLORS.A} />
                <DurationBlock label="B 版 · 互动" seconds={data.B.totalDuration} color={COLORS.B} />
              </div>
            </div>

            {/* ── Daily Trend Chart ── */}
            {dailyLabels.length > 0 && (
              <div className="rounded-2xl p-4 mb-5" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 size={14} style={{ color: COLORS.A }} />
                  <span className="font-sans" style={{ color: COLORS.textDim, fontSize: "12px", fontWeight: 600 }}>每日 PV 趋势</span>
                </div>
                <div className="flex items-end gap-1" style={{ height: "120px" }}>
                  {dailyLabels.map((day) => (
                    <div key={day} className="flex-1 flex flex-col items-center gap-1">
                      <div className="flex gap-0.5 items-end" style={{ height: "100px" }}>
                        <BarCol height={(data.daily[day].A.pv / maxDailyPV) * 96} color={COLORS.A} />
                        <BarCol height={(data.daily[day].B.pv / maxDailyPV) * 96} color={COLORS.B} />
                      </div>
                      <span className="font-sans" style={{ color: COLORS.textMuted, fontSize: "9px" }}>{day.slice(5)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Click Breakdown ── */}
            <div className="rounded-2xl p-4 mb-5" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
              <div className="flex items-center gap-2 mb-4">
                <MousePointerClick size={14} style={{ color: COLORS.A }} />
                <span className="font-sans" style={{ color: COLORS.textDim, fontSize: "12px", fontWeight: 600 }}>点击行为分布</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <ClickBreakdown label="A 版 · 短剧" actions={topClickActions("A")} color={COLORS.A} />
                <ClickBreakdown label="B 版 · 互动" actions={topClickActions("B")} color={COLORS.B} />
              </div>
            </div>

            {/* ── Per-User Metrics ── */}
            <div className="rounded-2xl p-4" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
              <div className="flex items-center gap-2 mb-3">
                <Users size={14} style={{ color: COLORS.A }} />
                <span className="font-sans" style={{ color: COLORS.textDim, fontSize: "12px", fontWeight: 600 }}>人均指标</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <PerUserCard label="A 版" pvPerUser={data.A.uv ? (data.A.pv / data.A.uv).toFixed(1) : "-"} clicksPerUser={data.A.uv ? (data.A.clicks / data.A.uv).toFixed(1) : "-"} avgStay={fmtDuration(avgDuration("A"))} color={COLORS.A} />
                <PerUserCard label="B 版" pvPerUser={data.B.uv ? (data.B.pv / data.B.uv).toFixed(1) : "-"} clicksPerUser={data.B.uv ? (data.B.clicks / data.B.uv).toFixed(1) : "-"} avgStay={fmtDuration(avgDuration("B"))} color={COLORS.B} />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ─── Sub-components ──────────────────────────────────────────────────

const StatCard = ({ icon, label, valueA, valueB }) => (
  <div className="rounded-2xl p-3" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
    <div className="flex items-center gap-1.5 mb-2">
      {icon}
      <span className="font-sans" style={{ color: COLORS.textDim, fontSize: "10px" }}>{label}</span>
    </div>
    <div className="flex items-baseline gap-1.5 mb-0.5">
      <span style={{ width: "14px", height: "14px", borderRadius: "4px", background: COLORS.A_bg, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "8px", color: COLORS.A, fontWeight: 700 }}>A</span>
      <span className="font-sans" style={{ color: COLORS.text, fontSize: "16px", fontWeight: 700 }}>{valueA}</span>
    </div>
    <div className="flex items-baseline gap-1.5">
      <span style={{ width: "14px", height: "14px", borderRadius: "4px", background: COLORS.B_bg, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "8px", color: COLORS.B, fontWeight: 700 }}>B</span>
      <span className="font-sans" style={{ color: COLORS.text, fontSize: "16px", fontWeight: 700 }}>{valueB}</span>
    </div>
  </div>
);

const DurationBlock = ({ label, seconds, color }) => {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const display = hours > 0 ? `${hours}h${mins}m` : mins > 0 ? `${mins}m` : `${seconds}s`;
  return (
    <div className="rounded-xl p-3 text-center" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${COLORS.border}` }}>
      <p className="font-sans mb-1" style={{ color: COLORS.textMuted, fontSize: "10px" }}>{label}</p>
      <p className="font-sans" style={{ color, fontSize: "22px", fontWeight: 700 }}>{display}</p>
      <p className="font-sans" style={{ color: COLORS.textMuted, fontSize: "10px" }}>{seconds.toLocaleString()}秒</p>
    </div>
  );
};

const BarCol = ({ height, color }) => (
  <div
    style={{
      width: "10px",
      height: `${Math.max(height, 2)}px`,
      borderRadius: "3px 3px 0 0",
      background: color,
      opacity: 0.8,
      transition: "height 0.3s ease",
    }}
  />
);

const ClickBreakdown = ({ label, actions, color }) => (
  <div>
    <p className="font-sans mb-2" style={{ color: COLORS.textMuted, fontSize: "10px" }}>{label}</p>
    {actions.length === 0 ? (
      <p className="font-sans" style={{ color: COLORS.textMuted, fontSize: "11px" }}>暂无点击</p>
    ) : (
      <div className="space-y-2">
        {actions.map(([action, count]) => {
          const maxCount = actions[0]?.[1] || 1;
          return (
            <div key={action}>
              <div className="flex justify-between mb-0.5">
                <span className="font-sans" style={{ color: COLORS.text, fontSize: "10px" }}>
                  {ACTION_LABELS[action] || action}
                </span>
                <span className="font-sans" style={{ color, fontSize: "10px", fontWeight: 600 }}>{count}</span>
              </div>
              <div style={{ height: "4px", borderRadius: "2px", background: "rgba(255,255,255,0.06)" }}>
                <div style={{ height: "100%", width: `${(count / maxCount) * 100}%`, borderRadius: "2px", background: color, opacity: 0.7 }} />
              </div>
            </div>
          );
        })}
      </div>
    )}
  </div>
);

const PerUserCard = ({ label, pvPerUser, clicksPerUser, avgStay, color }) => (
  <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${COLORS.border}` }}>
    <p className="font-sans mb-2" style={{ color, fontSize: "11px", fontWeight: 600 }}>{label}</p>
    <div className="space-y-1">
      <div className="flex justify-between">
        <span className="font-sans" style={{ color: COLORS.textMuted, fontSize: "10px" }}>人均 PV</span>
        <span className="font-sans" style={{ color: COLORS.text, fontSize: "11px", fontWeight: 600 }}>{pvPerUser}</span>
      </div>
      <div className="flex justify-between">
        <span className="font-sans" style={{ color: COLORS.textMuted, fontSize: "10px" }}>人均点击</span>
        <span className="font-sans" style={{ color: COLORS.text, fontSize: "11px", fontWeight: 600 }}>{clicksPerUser}</span>
      </div>
      <div className="flex justify-between">
        <span className="font-sans" style={{ color: COLORS.textMuted, fontSize: "10px" }}>平均停留</span>
        <span className="font-sans" style={{ color: COLORS.text, fontSize: "11px", fontWeight: 600 }}>{avgStay}</span>
      </div>
    </div>
  </div>
);

const ACTION_LABELS = {
  click_enter_drama: "进入短剧版",
  click_enter_full: "进入互动版",
  click_role_card: "点击角色卡片",
  click_trending_card: "点击推荐卡片",
  click_episode: "切换剧集",
  click_start_story: "开始故事",
  click_choice: "选择剧情分支",
  click_send_message: "发送消息",
};

export default Analytics;