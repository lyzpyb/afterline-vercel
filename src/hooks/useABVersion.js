import { useLocation } from "react-router-dom";
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * AB 版本 hook
 *
 * 根据当前 URL 路径判断用户处于哪个版本：
 * - /drama  → A 版（短剧版，无互动）
 * - /full   → B 版（完整版，含互动）
 * - /       → 展示页（不属于任何版本）
 *
 * 返回：
 * - version: 'A' | 'B' | null
 * - isFull: boolean（是否为 B 版完整版）
 * - isDrama: boolean（是否为 A 版短剧版）
 */
export function useABVersion() {
  const location = useLocation();
  const path = location.pathname;

  const version = path.startsWith("/drama") ? "A" : path.startsWith("/full") ? "B" : null;
  const isFull = version === "B";
  const isDrama = version === "A";

  return { version, isFull, isDrama };
}

/**
 * 获取或创建 session ID（持久化在 localStorage）
 */
function getSessionId() {
  let id = localStorage.getItem("ab_session_id");
  if (!id) {
    id = `s_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem("ab_session_id", id);
  }
  return id;
}

/**
 * 记录页面访问到 ab_visits 表
 *
 * @param {object} params
 * @param {'A'|'B'} params.version - 版本标识
 * @param {string} params.page - 页面路径
 * @param {string} [params.event] - 事件类型（默认 'page_view'）
 * @param {object} [params.meta] - 额外元数据
 */
export async function trackABVisit({ version, page, event = "page_view", meta = {} }) {
  try {
    const sessionId = getSessionId();
    const { error } = await supabase.from("ab_visits").insert({
      version,
      page,
      event,
      session_id: sessionId,
      meta,
    });
    if (error) {
      console.warn("AB visit track error:", error.message);
    }
  } catch (e) {
    console.warn("AB visit track failed:", e);
  }
}

/**
 * 自动追踪页面访问 + 停留时长的 hook
 * - 页面挂载时记录 page_view 事件
 * - 页面卸载时记录 page_stay 事件，meta 中包含 duration_sec（停留秒数）
 */
export function useABTracking() {
  const { version } = useABVersion();
  const trackedRef = useRef(false);
  const enterTimeRef = useRef(Date.now());

  useEffect(() => {
    enterTimeRef.current = Date.now();

    if (version && !trackedRef.current) {
      trackedRef.current = true;
      trackABVisit({
        version,
        page: window.location.hash.replace("#", "") || "/",
        event: "page_view",
      });
    }

    return () => {
      if (version) {
        const durationSec = Math.round((Date.now() - enterTimeRef.current) / 1000);
        trackABVisit({
          version,
          page: window.location.hash.replace("#", "") || "/",
          event: "page_stay",
          meta: { duration_sec: durationSec },
        });
      }
    };
  }, [version]);
}

/**
 * 便捷函数：追踪点击事件
 * 在按钮/交互元素的 onClick 中调用
 *
 * @param {'A'|'B'} version - 版本标识
 * @param {string} action - 点击动作名称
 * @param {object} [meta] - 额外元数据
 */
export function trackABClick(version, action, meta = {}) {
  if (!version) return;
  trackABVisit({
    version,
    page: window.location.hash.replace("#", "") || "/",
    event: "click",
    meta: { action, ...meta },
  });
}
