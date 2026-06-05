/**
 * AI 响应解析工具模块
 *
 * 根本性解决 AI 幻觉导致解析出乱码的问题：
 * 1. 结构化约束 prompt —— 从源头减少 AI 输出混乱的可能
 * 2. 分层解析 pipeline —— 预处理 → 结构分割 → 字段提取 → 清洗 → 校验
 * 3. 乱码检测与自动重试 —— 发现异常输出时主动丢弃并重试
 * 4. 终极清理 stripAllMarkers —— 最后一道防线，扫除一切特殊标记残留
 */

// ═══════════════════════════════════════════════════════════════════════════════
// §1  乱码检测
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 检测文本是否包含乱码特征
 * 返回 { isGarbled: boolean, score: number, reasons: string[] }
 */
export function detectGarbledText(text) {
  if (!text || typeof text !== "string") return { isGarbled: true, score: 1, reasons: ["空内容"] };

  const reasons = [];
  let score = 0;

  const garbledPattern = /[\u0000-\u001F\u007F-\u009F]{3,}/g;
  if (garbledPattern.test(text)) {
    reasons.push("包含连续控制字符");
    score += 0.8;
  }

  const invisibleChars = (text.match(/[\u200B-\u200F\u2028-\u202F\uFEFF\uFFFD]/g) || []).length;
  if (invisibleChars > 5) {
    reasons.push(`包含 ${invisibleChars} 个不可见Unicode字符`);
    score += 0.5;
  }

  const repeatPattern = /(.)\1{10,}/g;
  if (repeatPattern.test(text)) {
    reasons.push("存在异常字符重复");
    score += 0.4;
  }

  if (/Ã[€‚ƒ„…†‡ˆ‰Š‹ŒŽ''""•–—˜™š›œžŸ]/.test(text)) {
    reasons.push("包含混合编码特征");
    score += 0.9;
  }

  const unexpectedChars = (text.match(/[\u0E00-\u0E7F\u10A0-\u10FF\u0600-\u06FF\uAC00-\uD7AF]/g) || []).length;
  if (unexpectedChars > 3) {
    reasons.push(`包含 ${unexpectedChars} 个非预期语系字符`);
    score += 0.6;
  }

  const totalLen = text.length;
  if (totalLen > 0) {
    const nonContentLen = (text.match(/[\s\u00A0\u3000]/g) || []).length;
    const ratio = nonContentLen / totalLen;
    if (ratio > 0.6 && totalLen > 50) {
      reasons.push(`空白字符占比过高 (${(ratio * 100).toFixed(0)}%)`);
      score += 0.5;
    }
  }

  return { isGarbled: score >= 0.5, score, reasons };
}

// ═══════════════════════════════════════════════════════════════════════════════
// §2  终极清理（最关键的一道防线）
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 终极清理：移除文本中所有 AI 结构标记、特殊符号、分隔符残留
 *
 * 这是用户看到文本前的最后一道防线。
 * 不管 AI 产生什么幻觉、不管前面的解析漏掉了什么标记，
 * 只要走到这里，所有不属于正常小说对话/旁白内容的东西都会被干掉。
 *
 * 清理范围：
 * - 结构标签：[PROSE][/PROSE] [DIALOGUE][/DIALOGUE] [CHOICES][/CHOICES] [INPUT_HINT][/INPUT_HINT]
 * - 元数据标签：===VISUAL_META=== ===/VISUAL_META=== [VISUAL_META][/VISUAL_META] 【VISUAL_META】【/VISUAL_META】
 * - 元数据字段行：scene_mood: / location: / lighting: / key_action: / emotion_tag:
 * - 分隔符碎片：=== <<< >>> <<<< >>>> 以及任何 2+ 连续的 = < >
 * - Markdown 残留：``` ```json ** __ ##
 * - 不完整标签：[/PROS [/DIALOG [/CHOIC 等截断标签
 * - AI 说明前缀：以下是： 注意： 提示： 说明： 备注：
 */
function stripAllMarkers(text) {
  if (!text || typeof text !== "string") return "";

  let s = text;

  // 1. 移除完整的结构标签（英文方括号 + 全角方括号，含可能的多余空格）
  s = s.replace(/\[\/?\s*(PROSE|DIALOGUE|CHOICES|INPUT_HINT|VISUAL_META)\s*\]/gi, "");
  s = s.replace(/【\/?\s*(PROSE|DIALOGUE|CHOICES|INPUT_HINT|VISUAL_META)\s*】/gi, "");

  // 2. 移除 ===...=== 格式的分隔标记（完整标记 + 碎片）
  s = s.replace(/===\/?\s*VISUAL_META\s*===/gi, "");
  s = s.replace(/=={2,}/g, ""); // 任何 2+ 连续 = 号

  // 3. 移除 <<< >>> 系列分隔符碎片
  s = s.replace(/<{2,}>?/g, "");
  s = s.replace(/>{2,}/g, "");

  // 4. 移除裸元数据字段行
  s = s.replace(/^(scene_mood|location|lighting|key_action|emotion_tag)\s*[：:].*$/gim, "");

  // 5. 移除不完整/截断的标签
  s = s.replace(/\[\/?\s*(PROS|DIALOG|CHOIC|INPUT|VISUAL)[^\]]{0,30}\]?/gi, "");
  s = s.replace(/【\/?\s*(PROS|DIALOG|CHOIC|INPUT|VISUAL)[^】]{0,30}】?/gi, "");

  // 6. 移除 AI 常见说明前缀
  s = s.replace(/^(以下是|注意[:：]|提示[:：]|说明[:：]|备注[:：]|好的[，,]|当然[，,]|没问题[，,]).*$/gmi, "");

  // 7. 清理 markdown 残留
  s = s.replace(/```[a-z]*\n?/gi, "").replace(/```/g, "");
  s = s.replace(/^[#*_]{2,}\s*/gm, "");

  // 8. 清理多余空行 + 首尾空白
  s = s.replace(/\n{2,}/g, "\n").trim();

  return s;
}

// ═══════════════════════════════════════════════════════════════════════════════
// §3  通用预处理
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 预处理 AI 原始输出，统一清理常见噪音
 */
export function preprocessAIOutput(raw) {
  if (!raw || typeof raw !== "string") return "";
  let text = raw;

  // 1. 清理 markdown 代码块包裹
  text = text.replace(/```[a-z]*\n?/gi, "").replace(/```/g, "");

  // 2. 清理 HTML 标签
  text = text.replace(/<[^>]+>/g, "");

  // 3. 清理常见的 AI 说明文字前缀
  text = text.replace(/^(以下是|注意[:：]|提示[:：]|说明[:：]|备注[:：]|好的[，,]|当然[，,]|没问题[，,]).*$/gmi, "");

  // 4. 清理多余空行
  text = text.replace(/\n{3,}/g, "\n\n").trim();

  return text;
}

// ═══════════════════════════════════════════════════════════════════════════════
// §4  VISUAL_META 提取（Chat.jsx 使用）
// ═══════════════════════════════════════════════════════════════════════════════

const META_KEYS = ["scene_mood", "location", "lighting", "key_action", "emotion_tag"];

/**
 * 从文本中提取 VISUAL_META 数据
 * 返回 { meta: object|null, cleanedText: string }
 */
export function extractVisualMeta(text) {
  let cleanedText = text;
  let meta = null;

  // 辅助函数：从元数据文本中解析字段
  const parseMetaFromText = (metaText) => {
    const trimmed = metaText.trim();
    const parseField = (key) => {
      const m = trimmed.match(new RegExp(`${key}[：:]\\s*(.+)`));
      return m ? m[1].trim() : "";
    };
    const result = {};
    for (const key of META_KEYS) {
      result[key] = parseField(key);
    }
    result.round = Date.now();
    return result;
  };

  // 尝试匹配所有已知格式，优先级：=== > 【】 > []
  const blockMatch =
    text.match(/===VISUAL_META===([\s\S]*?)===\/VISUAL_META===/i) ||
    text.match(/【VISUAL_META】([\s\S]*?)【\/VISUAL_META】/) ||
    text.match(/\[VISUAL_META\]([\s\S]*?)\[\/VISUAL_META\]/i);

  if (blockMatch) {
    meta = parseMetaFromText(blockMatch[1]);
  }

  // 无论是否匹配到完整块，都从文本中移除所有 VISUAL_META 相关内容
  cleanedText = cleanedText
    .replace(/===VISUAL_META===[\s\S]*?===\/VISUAL_META===/gi, "")
    .replace(/【VISUAL_META】[\s\S]*?【\/VISUAL_META】/g, "")
    .replace(/\[VISUAL_META\][\s\S]*?\[\/VISUAL_META\]/gi, "");

  // 移除裸输出的元数据字段（AI 有时不加标签直接拼在内容后）
  cleanedText = cleanedText
    .replace(
      /(scene_mood|location|lighting|key_action|emotion_tag)[：:][^\n]*((\n|)(scene_mood|location|lighting|key_action|emotion_tag)[：:][^\n]*)*/gi,
      ""
    )
    .trim();

  // 清理残留的 【...】 格式标注（VISUAL_META 相关的全角方括号标注）
  cleanedText = cleanedText.replace(/【[^】]*】/g, "");

  // 注意：这里不能调用 stripAllMarkers！
  // stripAllMarkers 会移除 [PROSE]/[CHOICES] 等结构标签，
  // 而 parseStoryMode 还需要这些标签来提取内容。
  // stripAllMarkers 只在最终的 cleanDialogue/cleanProse/cleanChoices 中使用。

  // 只清理 VISUAL_META 分隔符碎片（=== <<< >>> 等）
  cleanedText = cleanedText
    .replace(/=={2,}/g, "")
    .replace(/<{2,}>?/g, "")
    .replace(/>{2,}/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return { meta, cleanedText };
}

// ═══════════════════════════════════════════════════════════════════════════════
// §5  剧情模式解析（Chat.jsx 剧情分支使用）
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 解析剧情模式 AI 输出
 * 输入：预处理后的文本（已提取 VISUAL_META）
 * 输出：{ prose: string[], dialogue: string|null, choices: string[], inputHint: string|null }
 */
export function parseStoryMode(raw) {
  let text = raw;

  // ── 标签粘连修复 ──
  text = text
    .replace(/\[\/PROSE\]\[/g, "[/PROSE] [")
    .replace(/\[\/DIALOGUE\]\[/g, "[/DIALOGUE] [")
    .replace(/\[\/CHOICES\]\[/g, "[/CHOICES] [")
    .replace(/\[\/INPUT_HINT\]\[/g, "[/INPUT_HINT] [");

  // ── 清理残留的不完整标签（末尾截断的标签） ──
  text = text.replace(/\[\/?(PROS|DIALOG|CHOIC|INPUT)[^\]]{0,20}$/gi, "").trim();

  // ── 多模式正则匹配 ──
  const prosePatterns = [
    /\[PROSE\]([\s\S]*?)\[\/PROSE\]/i,
    /【PROSE】([\s\S]*?)【\/PROSE】/i,
    /PROSE[:：]([\s\S]*?)(?=\[|\n\n|$)/i,
    /场景描写[:：]([\s\S]*?)(?=\[|\n\n|$)/i,
  ];

  const dialoguePatterns = [
    /\[DIALOGUE\]([\s\S]*?)\[\/DIALOGUE\]/i,
    /【DIALOGUE】([\s\S]*?)【\/DIALOGUE】/i,
    /\[DIALOGUE\]([^\[]*)/i,
    /DIALOGUE[:：]([\s\S]*?)(?=\[|\n\n|$)/i,
    /对话[:：]([\s\S]*?)(?=\[|\n\n|$)/i,
  ];

  const choicesPatterns = [
    /\[CHOICES\]([\s\S]*?)\[\/CHOICES\]/i,
    /【CHOICES】([\s\S]*?)【\/CHOICES】/i,
    /\[CHOICES\]([^\[]*)/i,
    /CHOICES[:：]([\s\S]*?)(?=\[|\n\n|$)/i,
    /选项[:：]([\s\S]*?)(?=\[|\n\n|$)/i,
  ];

  const inputHintPatterns = [
    /\[INPUT_HINT\]([\s\S]*?)\[\/INPUT_HINT\]/i,
    /【INPUT_HINT】([\s\S]*?)【\/INPUT_HINT】/i,
    /INPUT_HINT[:：]([\s\S]*?)(?=\[|\n\n|$)/i,
    /输入提示[:：]([\s\S]*?)(?=\[|\n\n|$)/i,
  ];

  const tryMatch = (patterns, t) => {
    for (const pattern of patterns) {
      const match = t.match(pattern);
      if (match && match[1]?.trim()) return match[1].trim();
    }
    return null;
  };

  let proseContent = tryMatch(prosePatterns, text);
  let dialogueContent = tryMatch(dialoguePatterns, text);
  let choicesContent = tryMatch(choicesPatterns, text);
  let inputHintContent = tryMatch(inputHintPatterns, text);

  // ── 降级处理：标签不完整时按标签分割 ──
  if (!proseContent && !dialogueContent && !choicesContent) {
    const hasProseStart = text.includes("[PROSE]") || text.includes("【PROSE】");
    const hasDialogueStart = text.includes("[DIALOGUE]") || text.includes("【DIALOGUE】");

    if (hasProseStart || hasDialogueStart) {
      const parts = text.split(/\[(PROSE|DIALOGUE|CHOICES)[\]】]|\[(\/PROSE|\/DIALOGUE|\/CHOICES)[\]】]/gi);
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i]?.toUpperCase();
        if (part === "PROSE" && parts[i + 1]) proseContent = parts[i + 1].trim();
        else if (part === "DIALOGUE" && parts[i + 1]) dialogueContent = parts[i + 1].trim();
        else if (part === "CHOICES" && parts[i + 1]) choicesContent = parts[i + 1].trim();
      }
    }

    // ── 降级处理：按段落智能分割 ──
    if (!proseContent && !dialogueContent) {
      const paragraphs = text.split(/\n\n+/).filter((s) => s.trim().length > 5);

      if (paragraphs.length >= 2) {
        const lastPara = paragraphs[paragraphs.length - 1];
        const isLikelyDialogue =
          lastPara.length < 100 &&
          (/["""'].+["""']/.test(lastPara) || lastPara.includes("：") || lastPara.includes(":"));

        if (isLikelyDialogue) {
          dialogueContent = lastPara.replace(/["""']/g, "").trim();
          proseContent = paragraphs.slice(0, -1).join("\n\n");
        } else {
          proseContent = paragraphs.join("\n\n");
        }
      } else if (paragraphs.length === 1) {
        const single = paragraphs[0];
        if (single.length < 80 || single.includes("：") || /^["""']/.test(single)) {
          dialogueContent = single.replace(/["""']/g, "").trim();
        } else {
          proseContent = single;
        }
      }
    }
  }

  // ── 清洗（内部会调用 stripAllMarkers 做终极清理） ──
  const prose = cleanProse(proseContent);
  const dialogue = cleanDialogue(dialogueContent);
  const choices = cleanChoices(choicesContent);
  const inputHint = inputHintContent ? stripAllMarkers(inputHintContent).slice(0, 30) : null;

  return { prose, dialogue, choices, inputHint };
}

// ═══════════════════════════════════════════════════════════════════════════════
// §6  对话模式解析（Chat.jsx 对话分支使用）
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 解析对话模式 AI 输出
 * 输入：预处理后的文本（已提取 VISUAL_META）
 * 输出：{ dialogue: string }
 */
export function parseChatMode(raw) {
  let text = raw;

  // 粗粒度截断 VISUAL_META 块（终极清理由 cleanDialogue → stripAllMarkers 完成）
  text = text
    .replace(/===VISUAL_META===[\s\S]*?===\/VISUAL_META===/gi, "")
    .replace(/\[VISUAL_META\][\s\S]*?(\[\/VISUAL_META\]|$)/gi, "")
    .replace(/(scene_mood|location|lighting|key_action|emotion_tag)[：:][\s\S]*/gi, "")
    .replace(/\n{2,}/g, "\n")
    .trim();

  const dialogue = cleanDialogue(text) || text.slice(0, 200).trim() || "……";
  return { dialogue };
}

// ═══════════════════════════════════════════════════════════════════════════════
// §7  JSON 解析（VideoCreate.jsx 使用）
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 健壮地解析 AI 输出的 JSON 数组
 * 多层修复策略：中文引号 → 单引号 → 换行 → 尾逗号 → 截断修复
 */
export function parseAIJsonArray(rawContent) {
  if (!rawContent || typeof rawContent !== "string") {
    return { success: false, data: null, error: "空内容" };
  }

  const jsonMatch = rawContent.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    return { success: false, data: null, error: "未找到JSON数组" };
  }

  let jsonStr = jsonMatch[0];

  // 中文引号 → 英文双引号
  jsonStr = jsonStr.replace(/[\u201c\u201d\u300c\u300d\u2018\u2019]/g, '"');

  // 单引号字符串值 → 双引号
  jsonStr = jsonStr.replace(/:\s*'([^']*)'/g, ': "$1"');

  // 字符串值内部的换行替换为空格
  jsonStr = jsonStr.replace(/"((?:[^"\\]|\\.)*)"/g, (match) =>
    match.replace(/\n/g, " ").replace(/\r/g, "")
  );

  // 移除尾逗号
  jsonStr = jsonStr.replace(/,\s*([}\]])/g, "$1");

  try {
    const parsed = JSON.parse(jsonStr);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return { success: false, data: null, error: "解析结果非数组或为空" };
    }
    return { success: true, data: parsed, error: null };
  } catch (e) {
    try {
      let aggressive = jsonStr.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
      aggressive = fixUnclosedStrings(aggressive);
      aggressive = fixUnclosedBrackets(aggressive);

      const parsed = JSON.parse(aggressive);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        return { success: false, data: null, error: "修复后解析结果非数组或为空" };
      }
      return { success: true, data: parsed, error: null };
    } catch (e2) {
      return { success: false, data: null, error: `JSON解析失败: ${e2.message}` };
    }
  }
}

function fixUnclosedStrings(str) {
  let inString = false;
  let lastValidEnd = -1;
  for (let i = 0; i < str.length; i++) {
    if (str[i] === '"' && (i === 0 || str[i - 1] !== '\\')) {
      inString = !inString;
      if (!inString) lastValidEnd = i;
    }
  }
  if (inString && lastValidEnd >= 0) {
    return fixUnclosedBrackets(str.substring(0, lastValidEnd + 1));
  }
  return str;
}

function fixUnclosedBrackets(str) {
  const stack = [];
  let inStr = false;
  for (let i = 0; i < str.length; i++) {
    if (str[i] === '"' && (i === 0 || str[i - 1] !== '\\')) {
      inStr = !inStr;
      continue;
    }
    if (inStr) continue;
    if (str[i] === '[' || str[i] === '{') stack.push(str[i]);
    else if (str[i] === ']') { if (stack.length && stack[stack.length - 1] === '[') stack.pop(); }
    else if (str[i] === '}') { if (stack.length && stack[stack.length - 1] === '{') stack.pop(); }
  }
  while (stack.length) {
    const top = stack.pop();
    str += top === '[' ? ']' : '}';
  }
  return str;
}

// ═══════════════════════════════════════════════════════════════════════════════
// §8  清洗辅助函数（每个都调用 stripAllMarkers 做终极清理）
// ═══════════════════════════════════════════════════════════════════════════════

function cleanDialogue(text) {
  if (!text) return null;
  // 终极清理所有特殊标记 → 清理引号
  let cleaned = stripAllMarkers(text);
  cleaned = cleaned.replace(/^[\s"""'「『]+|[\s"""'」』]+$/g, "").trim();
  return cleaned || null;
}

function cleanProse(text) {
  if (!text) return [];
  let cleaned = stripAllMarkers(text);
  cleaned = cleaned
    .replace(/\n+/g, "|")
    .replace(/\d+[.、]\s*/g, "|")
    .replace(/\|+/g, "|")
    .replace(/第[一二三四五12345]段[:：]?/g, "|");
  return cleaned
    .split("|")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function cleanChoices(text) {
  if (!text) return [];
  let cleaned = stripAllMarkers(text);
  return cleaned
    .replace(/\n+/g, "|")
    .replace(/\d+[.、]\s*/g, "|")
    .replace(/\|+/g, "|")
    .split("|")
    .map((s) =>
      s
        .trim()
        .replace(/^[\s"""''「『【\[]+|[\s"""''」』】\]]+$/g, "")
        .trim()
    )
    .filter((s) => s.length > 0 && s.length < 80)
    .slice(0, 3);
}

// ═══════════════════════════════════════════════════════════════════════════════
// §9  优化后的 Prompt 模板
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 生成剧情模式 prompt（强化格式约束，减少幻觉）
 */
export function buildStoryModePrompt({ epSummary, branchContext, currentSceneProse, currentSceneDialogue, userText, episodeProgress }) {
  return `你是一位沉浸式言情小说作者，正在为互动短剧《心动禁区》续写剧情。

## 角色设定
- 沈彦希：沈氏财阀私生子，篮球队学长，外表慵懒冷漠，实则细腻体贴。和林夏同住一个宿舍，早已察觉林夏女扮男装却从未点破，对她有深藏的好感，总用行动和话里有话来表达，从不直说。
- 林夏（用户扮演）：女扮男装的普通女大学生，和沈彦希同住一个宿舍。

## 当前剧情进度（第${episodeProgress}集）
${epSummary}
${branchContext}
## 当前场景上下文
${currentSceneProse} ${currentSceneDialogue}

林夏做了/说了："${userText}"

## 写作要求
请续写下一个场景，约500字剧情旁白，分4-5个自然段。要求：
- 充分描绘环境氛围、人物动作、内心独白、感官细节（气味/触感/声音/光线），营造强烈沉浸感
- 旁白要有小说质感，语言克制但情绪饱满，暧昧张力贯穿始终
- 沈彦希的行为和神态要符合人设：危险暧昧，话里有话，让人心跳

## 输出格式（必须严格按此格式，禁止输出任何其他内容）

[PROSE]段落1|段落2|段落3|段落4|段落5[/PROSE][DIALOGUE]沈彦希的一句对话，简短撩人，符合人设[/DIALOGUE][CHOICES]推进感情的选项|制造冲突或张力的选项|保持距离或逃避的选项[/CHOICES][INPUT_HINT]给林夏的自由输入提示，如：你想对他说什么？[/INPUT_HINT]

===VISUAL_META===
scene_mood: 用2-4个中文词描述场景氛围
location: 场景地点
lighting: 光线描述
key_action: 本轮最核心动作(10字内)
emotion_tag: 男主情绪标签
===/VISUAL_META===

## 关键规则
- 必须用 [PROSE]...[/PROSE] 等英文方括号标签包裹各部分
- PROSE 内各段用 | 分隔，不要用换行
- DIALOGUE 内不要加引号
- CHOICES 内3个选项用 | 分隔，不要加序号
- 视觉元数据必须放在 ===VISUAL_META=== 和 ===/VISUAL_META=== 之间
- 不要输出任何解释、说明、备注，只输出上述格式化内容`;
}

/**
 * 生成对话模式 prompt（强化格式约束，减少幻觉）
 */
export function buildChatModePrompt({ epSummary, branchContext, currentSceneDialogue, userText, episodeProgress }) {
  return `你是一位擅长写沉浸式对话的言情小说作者，正在为《心动禁区》创作沈彦希的回复。参考猫箱式活人感对话风格。

## 角色设定
- 沈彦希：沈氏财阀私生子，篮球队学长，外表慵懒冷漠，实则细腻体贴。他和林夏同住一个宿舍，早已察觉林夏女扮男装却从未点破，对她有深藏的好感。
- 他说话风格：简短、暧昧、话里有话、危险又温柔，从不直白表达感情，但每句话都暗藏深意。
- 林夏（用户扮演）：女扮男装的普通女大学生，和沈彦希同住一个宿舍。

## 当前剧情进度（第${episodeProgress}集）
${epSummary}
${branchContext}
## 对话上下文
${currentSceneDialogue || "你们正在对话中"}

林夏说："${userText}"

## 写作风格（猫箱式活人感）
使用格式：（微动作+神态+心理描写）"说出来的话"（微动作）"后续的话"...

### 核心要求
1. **格式**：动作描写用全角括号（）包裹，对话用引号或直接说出
2. **多轮交替**：一次回复可以包含多段（动作+对话）的组合
3. **短句停顿**：多用"……"、"嗯？"、逗号制造呼吸感
4. **微动作细节**：推眼镜顿了一下、指尖停顿、呼吸/心跳变化、耳尖泛红
5. **感官描写**：气息拂过、温度、淡淡的气味（薄荷/烟草/沐浴露）
6. **情绪层次**：表面慵懒→内心波动，话到嘴边停住
7. **互动感**：观察用户反应，适时"逗弄→温柔"切换
8. **话里有话**：暧昧但不直白说"我喜欢你"

### 字数限制
- 总长度：150-300字
- 保持呼吸感，说完一段让用户有机会接话

### 参考示例
（手电筒光在你脸上定格，他坐起身，一脸狐疑）"哟，还压嗓子呢？"（目光在你脸上打量，嘴角微微上扬）"你这身高才一米七，我们宿舍最矮的都一米七五。"（凑近，声音放低）"你这小身板，比我妹妹还娇弱。"

## 输出格式（严格按此格式，禁止输出任何其他内容）

主体内容：（微动作、神态、心理描写）"沈彦希说的话"（微动作）"后续的话"...

然后在主体内容之后，另起一行输出以下视觉元数据块：

===VISUAL_META===
scene_mood: 用2-4个中文词描述场景氛围
location: 场景地点
lighting: 光线描述
key_action: 本轮最核心动作(10字内)
emotion_tag: 男主情绪标签
===/VISUAL_META===

## 关键规则
- 视觉元数据必须放在 ===VISUAL_META=== 和 ===/VISUAL_META=== 之间
- 不要输出任何解释、说明、备注
- 不要在对话内容中混入 scene_mood/location 等元数据字段`;
}

/**
 * 生成分镜 prompt（强化 JSON 格式约束）
 */
export function buildStoryboardPrompt(visualMetas) {
  return `You are a professional film storyboard director. Based on the visual metadata from an interactive drama session, create 4-6 cinematic storyboard shots.

## Story Background
Drama: "Heartbeat Forbidden Zone" (心动禁区), Episode 1.
- Female lead Lin Xia (林夏): short black hair, petite build, dark red school uniform — disguised as a boy living in the dormitory.
- Male lead Shen Yanxi (沈彦希): silver-gray wavy hair past the ears, gold semi-rimmed glasses, dark red school uniform worn open/unbuttoned — Lin Xia's roommate.

## Visual Metadata from Player Interaction
${JSON.stringify(visualMetas, null, 2)}

## Requirements
- Merge multiple rounds into 4-6 coherent shots (each shot = 5-8 seconds of video).
- Merge consecutive content with the same location and emotion into one shot.
- Start a new shot at scene or emotion transitions.
- Each shot must include a complete video_prompt in English.

## Output Format
Output ONLY a valid JSON array. No markdown. No explanation. No code blocks. No text before or after the JSON.

Example format:
[{"id":1,"desc":"中文场景描述","act":"中文动作","cam":"镜头","mood":"暧昧","dur":6,"prompt":"English video generation prompt. No subtitles, no text overlay, no watermark, no captions, no on-screen text. Cinematic quality, romantic drama style."}]

## Critical Rules
1. Output ONLY the JSON array, nothing else
2. All strings must use double quotes ("), never single quotes
3. No newlines inside string values
4. No trailing commas
5. Every object must have all 7 keys: id, desc, act, cam, mood, dur, prompt
6. dur must be a number (5-8)
7. desc and act must be in Chinese
8. prompt must be in English and end with: No subtitles, no text overlay, no watermark, no captions, no on-screen text. Cinematic quality, romantic drama style.`;
}
