# AfterLine - Vercel 部署版

## 部署步骤

1. 将代码推到 GitHub：
```bash
git init
git add .
git commit -m "init: afterline for vercel"
git remote add origin https://github.com/你的用户名/afterline.git
git push -u origin main
```

2. 在 [Vercel](https://vercel.com) 导入该 GitHub 仓库

3. 设置环境变量（在 Vercel Dashboard → Settings → Environment Variables）：
   - `MIMO_API_KEY` = `tp-coj66arkt5dcivacopcniii0v2azdxhbh9gbuyzld6wmdfxh`

4. 部署完成！

## 本地开发

```bash
# 安装依赖
npm install

# 启动前端
npm run dev

# 启动 API 代理（需要安装 vercel cli）
vercel dev
```

## 架构

- **前端**：Vite + React（静态构建）
- **API**：Vercel Serverless Function（`/api/chat` → 代理到 mimo LLM）
- **路由**：HashRouter（无需服务端配置）

## 与原版的差异

- ❌ 移除了美团 NoCode SDK 依赖
- ❌ 移除了 Supabase（数据库、存储、Edge Functions）
- ❌ 移除了 TTS 语音合成（原 Meituan 内部 API）
- ❌ 移除了 AIGC 图片生成（原 Meituan 内部 API）
- ✅ AI 聊天通过 `/api/chat` 代理到 mimo API
- ✅ 图片/视频 CDN 链接保持不变（s3plus.meituan.net 公开资源）
