/**
 * AI 能力测试组件
 * 测试 TTS 文字转语音 和 文生图 功能
 *
 * Friday AppID: 1845054892298448914
 */

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Play, Image as ImageIcon, Volume2 } from "lucide-react";

// AIGC API 配置 - 使用 gemini-2.5-flash-image 模型
// AIGC 图片生成已移除（原 Meituan 内部 API）
const FRIDAY_APP_ID = "";
const AIGC_GENERATE_URL = "";
const AIGC_QUERY_URL = (taskId) => "";

/**
 * TTS 大模型系列音色配置
 * 根据文档使用正确的音色名称：meishuwan, tuanshuyu 等
 */
const VOICE_OPTIONS = [
  { value: "meishuwan", label: "🎙️ 美书婉 - 温柔女声", description: "大模型音色，通用场景" },
  { value: "tuanshuyu", label: "👦 团书羽 - 超自然男声", description: "大模型音色，直播场景" },
  { value: "meishuling", label: "💫 美书苓 - 超自然女声", description: "大模型音色，直播场景" },
  { value: "meishuye", label: "✨ 美书叶 - 直播女声", description: "大模型音色，直播场景" },
  { value: "meishujian", label: "🔥 美书简 - 热门女声", description: "大模型音色，直播场景" },
  { value: "meishujie", label: "🌟 美书洁 - 明快女声", description: "大模型音色，直播场景" },
  { value: "meishuqing", label: "💕 美书晴 - 温柔女声", description: "大模型音色，客服场景" },
  { value: "meishuqian", label: "👩 美书倩 - 优质女声", description: "大模型音色，客服场景" },
  { value: "meishunan", label: "🌸 美书楠 - 轻快女声", description: "大模型音色，客服场景" },
  { value: "tuanshutan", label: "👨‍💼 团书谭 - 严肃男声", description: "大模型音色，客服场景" },
  { value: "tuanshushuo", label: "🎭 团书硕 - 温暖男声", description: "大模型音色，客服场景" },
  { value: "tuanshuyang", label: "📢 团书洋 - 标准男声", description: "大模型音色，客服场景" },
  { value: "tuanshuwei", label: "💼 团书伟 - 耐心男声", description: "大模型音色，客服场景" },
  { value: "mingshi_stream", label: "🎙️ 默认 - 明石", description: "传统音色，新闻、通用场景" },
];

export function AIAbilityTest() {
  // TTS 状态
  const [ttsText, setTtsText] = useState("你好，欢迎使用文字转语音服务！这是《心动禁区》互动短剧的语音测试。");
  const [voiceName, setVoiceName] = useState("meishuwan");
  const [ttsLoading, setTtsLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [ttsError, setTtsError] = useState(null);

  // 文生图状态
  const [imagePrompt, setImagePrompt] = useState("A cute orange cat sitting on a desk, wearing a tiny top hat, digital art style");
  const [imageLoading, setImageLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState(null);
  const [imageError, setImageError] = useState(null);
  const [taskId, setTaskId] = useState(null);
  const [pollingCount, setPollingCount] = useState(0);

  // ═══════════════════════════════════════════════════════════════════════════════
  // TTS 文字转语音调用 - 使用大模型系列音色
  // ═══════════════════════════════════════════════════════════════════════════════
  const handleTTS = async () => {
    if (!ttsText.trim()) return;

    setTtsLoading(true);
    setTtsError(null);
    setAudioUrl(null);

    try {
      const { data, error } = await supabase.functions.invoke("nocode-tts", {
        body: {
          content: ttsText,
          voice_name: voiceName
        }
      });

      if (error) {
        throw new Error(`调用失败: ${error.message}`);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setAudioUrl(data.url);
      console.log("TTS 成功，音色:", voiceName, "音频 URL:", data.url);
    } catch (err) {
      console.error("TTS 错误:", err);
      setTtsError(err.message);
    } finally {
      setTtsLoading(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // 文生图调用 - 异步模式：提交任务 + 轮询结果
  // ═══════════════════════════════════════════════════════════════════════════════
  const handleImageGen = async () => {
    if (!imagePrompt.trim()) return;

    setImageLoading(true);
    setImageError(null);
    setImageUrl(null);
    setTaskId(null);
    setPollingCount(0);

    try {
      // 步骤 1: 提交生成任务
      const response = await fetch(AIGC_GENERATE_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${FRIDAY_APP_ID}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: imagePrompt
                }
              ]
            }
          ]
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`提交任务失败: ${response.status} - ${errorText}`);
      }

      // 响应是纯文本 taskId
      const newTaskId = await response.text();
      setTaskId(newTaskId);
      console.log("文生图任务提交成功，taskId:", newTaskId);

      // 步骤 2: 开始轮询查询结果
      pollImageResult(newTaskId, 0);

    } catch (err) {
      console.error("文生图错误:", err);
      setImageError(err.message);
      setImageLoading(false);
    }
  };

  // 轮询查询图片生成结果
  const pollImageResult = async (currentTaskId, count) => {
    setPollingCount(count + 1);

    try {
      // 等待 3 秒后查询
      await new Promise(resolve => setTimeout(resolve, 3000));

      const response = await fetch(AIGC_QUERY_URL(currentTaskId), {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${FRIDAY_APP_ID}`,
          "Accept": "*/*",
        },
      });

      if (!response.ok) {
        throw new Error(`查询失败: ${response.status}`);
      }

      const data = await response.json();
      console.log(`轮询第 ${count + 1} 次结果:`, data);

      // 检查状态
      if (data.status === 1 && data.data) {
        // 任务完成，解析图片
        const candidates = data.data.candidates;
        if (candidates && candidates[0]?.content?.parts) {
          const parts = candidates[0].content.parts;
          const imagePart = parts.find(p => p.inlineData);

          if (imagePart && imagePart.inlineData) {
            // 获取图片 URL
            const imageUrl = imagePart.inlineData.data;
            setImageUrl(imageUrl);
            console.log("文生图成功，图片 URL:", imageUrl);
            setImageLoading(false);
            return;
          }
        }
      }

      // 如果未完成且未超过最大轮询次数，继续轮询
      if (count < 20) {
        pollImageResult(currentTaskId, count + 1);
      } else {
        throw new Error("生成超时，请稍后重试");
      }

    } catch (err) {
      console.error("轮询错误:", err);
      setImageError(err.message);
      setImageLoading(false);
    }
  };

  // 获取当前音色信息
  const currentVoice = VOICE_OPTIONS.find(v => v.value === voiceName);

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-8">
      <h1 className="text-3xl font-bold text-center mb-8">AI 能力测试</h1>

      {/* TTS 测试卡片 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="w-5 h-5" />
            TTS 文字转语音 (大模型音色)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 音色选择 */}
          <div>
            <Label className="mb-2 block">选择音色（大模型系列: meishu* / tuanshu*）</Label>
            <Select value={voiceName} onValueChange={setVoiceName}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="选择音色" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {VOICE_OPTIONS.map((voice) => (
                  <SelectItem key={voice.value} value={voice.value}>
                    <div className="flex flex-col items-start">
                      <span className="font-medium">{voice.label}</span>
                      <span className="text-xs text-gray-500">{voice.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {currentVoice && (
              <p className="text-xs text-gray-500 mt-1">
                当前音色: {currentVoice.label} - {currentVoice.description}
              </p>
            )}
          </div>

          <Textarea
            value={ttsText}
            onChange={(e) => setTtsText(e.target.value)}
            placeholder="输入要转换为语音的文本..."
            rows={4}
          />
          <Button
            onClick={handleTTS}
            disabled={ttsLoading || !ttsText.trim()}
            className="w-full"
          >
            {ttsLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                生成中...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                生成语音
              </>
            )}
          </Button>

          {ttsError && (
            <div className="p-3 bg-red-50 text-red-600 rounded-md text-sm">
              错误: {ttsError}
            </div>
          )}

          {audioUrl && (
            <div className="p-4 bg-green-50 rounded-md space-y-2">
              <p className="text-green-700 font-medium">
                ✅ 语音生成成功！音色: {currentVoice?.label.split(' ')[1] || voiceName}
              </p>
              <audio controls className="w-full">
                <source src={audioUrl} type="audio/mpeg" />
                您的浏览器不支持音频播放
              </audio>
              <p className="text-xs text-gray-500 break-all">URL: {audioUrl}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 文生图测试卡片 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5" />
            文生图 (Gemini 2.5 Flash Image)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-gray-500">
            模型: gemini-2.5-flash-image (异步生成)
          </div>
          <Textarea
            value={imagePrompt}
            onChange={(e) => setImagePrompt(e.target.value)}
            placeholder="输入英文图像描述提示词..."
            rows={3}
          />
          <p className="text-xs text-gray-500">
            💡 提示: 使用英文描述效果更好，例如 &quot;A cute orange cat sitting on a desk...&quot;
          </p>
          <Button
            onClick={handleImageGen}
            disabled={imageLoading || !imagePrompt.trim()}
            className="w-full"
          >
            {imageLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {taskId ? `生成中... (${pollingCount})` : "提交任务..."}
              </>
            ) : (
              <>
                <ImageIcon className="mr-2 h-4 w-4" />
                生成图片
              </>
            )}
          </Button>

          {taskId && imageLoading && (
            <div className="p-3 bg-blue-50 text-blue-600 rounded-md text-sm">
              任务已提交，正在轮询结果... (第 {pollingCount} 次)
            </div>
          )}

          {imageError && (
            <div className="p-3 bg-red-50 text-red-600 rounded-md text-sm">
              错误: {imageError}
            </div>
          )}

          {imageUrl && (
            <div className="p-4 bg-green-50 rounded-md space-y-2">
              <p className="text-green-700 font-medium">✅ 图片生成成功！</p>
              <img
                src={imageUrl}
                alt="生成的图片"
                className="w-full max-w-md mx-auto rounded-lg shadow-md"
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default AIAbilityTest;
