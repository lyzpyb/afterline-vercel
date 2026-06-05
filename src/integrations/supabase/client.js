// 替代 Supabase client — 直接调用 Vercel Serverless Function（支持流式）

/**
 * 流式调用 AI API — 实时收集 SSE 数据流
 * @param {string} prompt - 用户 prompt
 * @param {function} onChunk - 每收到一块数据时回调 (chunk: string) => void
 * @returns {Promise<{data: {content: string}, error: null} | {data: null, error: object}>}
 */
async function invokeAIStream(prompt, onChunk) {
  try {
    const resp = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: prompt, stream: true }),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ error: resp.statusText }));
      return { data: null, error: err };
    }

    // 读取 SSE 流
    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let fullContent = "";
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop(); // 保留不完整的行

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();
        if (data === "[DONE]") continue;

        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) {
            fullContent += delta;
            if (onChunk) onChunk(fullContent);
          }
        } catch {
          // 非 JSON 行，跳过
        }
      }
    }

    return { data: { content: fullContent }, error: null };
  } catch (err) {
    return { data: null, error: { message: err.message } };
  }
}

/**
 * 非流式调用（兼容旧接口）
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
        return invokeAIStream(body.content, body._onChunk);
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
