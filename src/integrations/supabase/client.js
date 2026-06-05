// 替代 Supabase client — 直接调用 Vercel Serverless Function

/**
 * 模拟 supabase.functions.invoke 的接口
 * 返回格式与 Supabase 一致: { data: { content: "..." }, error: null }
 */
async function invokeAI(prompt) {
  try {
    const resp = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: prompt }),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ error: resp.statusText }));
      return { data: null, error: err };
    }

    const data = await resp.json();
    return { data, error: null };
  } catch (err) {
    return { data: null, error: { message: err.message } };
  }
}

// 兼容旧代码的 supabase 对象
export const supabase = {
  functions: {
    invoke: async (fnName, { body }) => {
      if (fnName === "nocode-friday-ai") {
        return invokeAI(body.content);
      }
      return { data: null, error: { message: `未实现的函数: ${fnName}` } };
    },
  },
  // stub: 数据库操作（demo 阶段不需要）
  from: () => ({
    insert: async () => ({ error: null }),
    select: () => ({
      eq: () => ({
        single: async () => ({ data: null, error: null }),
      }),
    }),
  }),
  // stub: 存储操作
  storage: {
    from: () => ({
      upload: async () => ({ error: null }),
      getPublicUrl: () => ({ data: { publicUrl: "" } }),
    }),
  },
};
