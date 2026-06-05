// Vercel Serverless Function — 代理 LLM API
// 支持非流式和流式(SSE)两种模式

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { content, stream } = req.body;

  if (!content) {
    return res.status(400).json({ error: "缺少 content 参数" });
  }

  const API_HOST = "token-plan-cn.xiaomimimo.com";
  const API_PATH = "/v1/chat/completions";
  const API_KEY = process.env.MIMO_API_KEY || "";

  if (!API_KEY) {
    return res.status(500).json({ error: "未配置 MIMO_API_KEY" });
  }

  const payload = {
    model: "mimo-v2.5-pro",
    messages: [{ role: "user", content }],
    stream: !!stream,
    thinking: { type: "disabled" },
  };

  try {
    const https = await import("https");

    const options = {
      hostname: API_HOST,
      port: 443,
      path: API_PATH,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
    };

    return new Promise((resolve) => {
      const proxyReq = https.request(options, (proxyRes) => {
        if (stream) {
          // 流式 SSE 模式
          res.setHeader("Content-Type", "text/event-stream");
          res.setHeader("Cache-Control", "no-cache");
          res.setHeader("Connection", "keep-alive");
          res.status(proxyRes.statusCode);
          proxyRes.pipe(res);
          proxyRes.on("end", () => resolve());
        } else {
          // 非流式模式 — 收集完整响应
          let body = "";
          proxyRes.on("data", (chunk) => (body += chunk));
          proxyRes.on("end", () => {
            try {
              const parsed = JSON.parse(body);
              const content = parsed.choices?.[0]?.message?.content || "";
              res.status(200).json({ content });
            } catch {
              res.status(502).json({ error: "解析 LLM 响应失败", raw: body });
            }
            resolve();
          });
        }
      });

      proxyReq.on("error", (err) => {
        console.error("LLM proxy error:", err.message);
        res.status(502).json({ error: "代理错误: " + err.message });
        resolve();
      });

      proxyReq.write(JSON.stringify(payload));
      proxyReq.end();
    });
  } catch (err) {
    return res.status(500).json({ error: "服务器错误: " + err.message });
  }
}
