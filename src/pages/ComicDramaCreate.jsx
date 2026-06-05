/**
 * 漫剧创作页面
 * 
 * 功能：
 * - AI 分镜拆解 (LLM)
 * - 批量并行生成 (文生图 + TTS)
 * - Canvas 实时渲染播放（运镜效果 + 字幕 + AudioContext 同步音频）
 * - 素材包下载 (JSZip)
 * 
 * Friday AppID: 1845054892298448914
 */

import { useState, useEffect, useCallback, useRef } from "react";
import JSZip from "jszip";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Play, Image as ImageIcon, Volume2, Wand2, Plus, Trash2, ChevronLeft, ChevronRight, Sparkles, Check, X, Download, Settings, Zap } from "lucide-react";
import { toast } from "sonner";

// API 配置
const FRIDAY_APP_ID = "1845054892298448914";
// AIGC 图片生成已移除（原 Meituan 内部 API）

// MiMo TTS 配置
const MIMO_API_KEY = "tp-coj66arkt5dcivacopcniii0v2azdxhbh9gbuyzld6wmdfxh";
const MIMO_BASE_URL = "https://token-plan-cn.xiaomimimo.com/v1";

// 豆包 Seedream 配置
const DOUBAO_API_KEY = "ark-7d45285f-7256-428d-8116-e2175751945e-597b5";
const DOUBAO_BASE_URL = "https://ark.cn-beijing.volces.com/api/v3";

// 文生图模型选项
const IMAGE_MODEL_OPTIONS = [
  { value: "agnes", label: "Agnes", desc: "agnes-image-2.1-flash" },
  { value: "doubao", label: "豆包 Seedream", desc: "doubao-seedream-5-0-260128" },
];

// MiMo TTS 音色
const VOICE_OPTIONS = [
  { value: "Chloe", label: "Chloe", desc: "英文女声" },
  { value: "Mia", label: "Mia", desc: "英文女声" },
  { value: "Milo", label: "Milo", desc: "英文男声" },
  { value: "Dean", label: "Dean", desc: "英文男声" },
  { value: "冰糖", label: "冰糖", desc: "中文女声" },
  { value: "茉莉", label: "茉莉", desc: "中文女声" },
  { value: "苏打", label: "苏打", desc: "中文男声" },
  { value: "白桦", label: "白桦", desc: "中文男声" },
  { value: "mimo_default", label: "默认", desc: "中文/英文自动" },
];

// 运镜效果选项
const MOTION_OPTIONS = [
  { value: "static", label: "微动", desc: "轻微呼吸感", filter: "zoom=z='min(zoom+0.0003,1.03)'" },
  { value: "zoom_in", label: "推进", desc: "镜头缓慢推进", filter: "zoom=z='min(zoom+0.0015,1.2)'" },
  { value: "zoom_out", label: "拉远", desc: "镜头缓慢拉远", filter: "zoom=z='if(eq(on,1),1.2,max(zoom-0.0015,1.0))'" },
  { value: "pan_left", label: "左移", desc: "画面向左平移", filter: "zoom=z='1.1':x='iw/2-(iw/zoom/2)-on*2'" },
  { value: "pan_right", label: "右移", desc: "画面向右平移", filter: "zoom=z='1.1':x='iw/2-(iw/zoom/2)+on*2'" },
  { value: "pan_up", label: "上移", desc: "画面向上平移", filter: "zoom=z='1.1':y='ih/2-(ih/zoom/2)-on*2'" },
  { value: "pan_down", label: "下移", desc: "画面向下平移", filter: "zoom=z='1.1':y='ih/2-(ih/zoom/2)+on*2'" },
];

// 风格前缀选项
const STYLE_PREFIXES = [
  { value: "none", label: "无风格", desc: "原图风格" },
  { value: "日系动漫风格，柔和的水彩质感，温暖的色调，细腻的光影变化，", label: "日系动漫", desc: "柔和水彩" },
  { value: "赛博朋克风格，霓虹灯光，深蓝紫色调，高对比度，", label: "赛博朋克", desc: "霓虹科幻" },
  { value: "中国水墨画风格，留白构图，淡雅色调，毛笔质感的线条，", label: "水墨画", desc: "古典淡雅" },
  { value: "写实油画风格，厚重笔触，文艺复兴时期绘画质感，", label: "油画", desc: "古典写实" },
  { value: "3D渲染风格，皮克斯动画质感，柔和光照，鲜艳色彩，", label: "3D动画", desc: "卡通渲染" },
];

// 默认示例场景（10幕《黑猫警告》）
const DEFAULT_SCENES = [
  {
    id: 1,
    sceneText: "深夜办公室，主角疲惫地盯着电脑屏幕，窗外漆黑一片，只有工位一盏灯亮着。",
    imagePrompt: "Cinematic low-angle medium shot, focus on tired side profile of protagonist and glowing computer screen. Cold color tone, main light source from monitor's cold white glow creating high contrast shadows on face, visible eye bags and fatigue. Background is deep dark office environment, distant workstations fading into black. Atmospheric, cinematic lighting.",
    dialogues: [
      { character: "旁白", text: "我盯着屏幕右下角的数字跳成2:00AM，揉了揉干涩的眼睛。整层楼只剩下我工位这一盏灯，窗外是死寂的漆黑。" },
    ],
    motion: "static",
    duration: 20,
  },
  {
    id: 2,
    sceneText: "主角转头，看见一只神秘的黑猫静立在打印机旁，琥珀色眼睛在昏光中闪烁。",
    imagePrompt: "Cinematic composition, close-up combined with medium shot. Foreground shows protagonist's surprised profile turning head, focus shifts back to reveal black cat beside printer. Pure black fur with metallic blue sheen under dim overhead light, amber cat eyes like gemstones staring directly at camera, vertical pupils. Dark environment with single desk lamp illuminating scene. Mysterious atmosphere.",
    dialogues: [
      { character: "旁白", text: "然后我听见了猫叫。很轻，但清晰。我转过头，看见一只黑猫站在打印机旁——纯黑的毛，在昏暗的灯光下泛着幽蓝的光泽，眼睛是琥珀色的。它怎么会在这里？公司严禁带宠物。" },
    ],
    motion: "zoom_in",
    duration: 18,
  },
  {
    id: 3,
    sceneText: "黑猫突然张口说话，主角震惊僵住，难以置信地掐自己大腿。",
    imagePrompt: "Cinematic two-shot close-up. Black cat positioned lower left of frame, looking up, mouth slightly open as if 'speaking', amber eyes reflecting light with intelligence. Protagonist occupies right side of frame, body leaning back, expression mixing fatigue, shock and fear, one hand pinching own thigh. High contrast lighting, dramatic shadows. Surreal moment.",
    dialogues: [
      { character: "黑猫", text: "你还有十五分钟离开大楼。现在，立刻。" },
      { character: "旁白", text: "黑猫开口说话了。声音很平静，像个中年男人的嗓音。我僵住了。一定是我太累了，出现幻听。我用力掐了掐自己的大腿。" },
    ],
    motion: "static",
    duration: 22,
  },
  {
    id: 4,
    sceneText: "黑猫逼近，尾巴竖起，语气紧迫地警告，主角心脏狂跳，开始动摇。",
    imagePrompt: "Cinematic low-angle shot looking up at black cat, making it appear more authoritative and imposing. Black cat standing on office desk near protagonist's keyboard, tail straight up, fur slightly puffed, amber eyes locked on protagonist. Protagonist shown from below looking up, expression shifting from shock to disbelief, hand unconsciously reaching for jacket. Tense atmosphere.",
    dialogues: [
      { character: "黑猫", text: "这不是幻觉。十四分三十秒。你走楼梯，别等电梯。" },
      { character: "旁白", text: "黑猫走近几步，尾巴竖得笔直。我的心脏开始狂跳。理智告诉我该叫保安，但某种本能让我相信了这只猫。" },
      { character: "男主", text: "为什么？我的声音有点抖。" },
    ],
    motion: "zoom_in",
    duration: 25,
  },
  {
    id: 5,
    sceneText: "黑猫揭示十楼实验室危机，主角惊恐站起，椅子发出刺耳声响。",
    imagePrompt: "Cinematic dynamic wide-angle lens. Protagonist suddenly standing up from workstation, motion knocking over chair, chair leg creating motion blur against floor. Black cat still on desk in foreground looking back at protagonist. Protagonist's standing figure shows panic, one hand on desk, eyes wide with horror looking at cat. Office emergency lights casting red warning glow.",
    dialogues: [
      { character: "黑猫", text: "十楼实验室的抑制器两小时前失效了。他们以为能修好，但失败了。现在那些东西已经渗透到通风系统，正在往下降。" },
      { character: "旁白", text: "我猛地站起来，椅子发出刺耳的摩擦声。" },
    ],
    motion: "static",
    duration: 20,
  },
  {
    id: 6,
    sceneText: "黑猫跳上桌子，描述被'东西'碰触的可怕后果，主角后背发凉，开始收拾东西。",
    imagePrompt: "Cinematic tight two-shot close-up. Black cat occupies center of frame, amber eyes staring directly at camera (protagonist's POV), pupils dilated as if transmitting horror. Protagonist's hands at edge of frame hurriedly packing phone and jacket, movements rushed. Light concentrated on cat's face and protagonist's hands, everything else in shadow. Intense psychological tension.",
    dialogues: [
      { character: "男主", text: "什么东西？我问，手已经开始收拾东西。" },
      { character: "黑猫", text: "你不需要知道。你只需要知道被它们碰到会怎样——你的意识会留在原地，身体会继续回家、上班、吃饭，但'你'已经消失了。" },
      { character: "旁白", text: "黑猫跳上我的桌子，琥珀色的眼睛盯着我。我的后背一阵发凉。" },
    ],
    motion: "static",
    duration: 28,
  },
  {
    id: 7,
    sceneText: "楼梯间，主角狂奔下楼，头顶传来诡异的窸窣声，黑猫警告别回头。",
    imagePrompt: "Cinematic following shoulder-mounted camera POV, simulating protagonist's subjective running perspective. Frame shaking, focus on endlessly extending staircase ahead and occasional shadow of black cat at feet. Light only from dim intermittent green emergency lights, casting mottled swaying shadows on walls. Sound visualization: subtle rustling from above stairs. Claustrophobic horror atmosphere.",
    dialogues: [
      { character: "旁白", text: "楼梯间很安静，只有我的脚步声和急促的呼吸。下到十五层时，我听见头顶传来细微的窸窣声，像很多细小的脚在爬行。" },
      { character: "黑猫", text: "别回头。继续走。" },
    ],
    motion: "pan_down",
    duration: 18,
  },
  {
    id: 8,
    sceneText: "十二层安全门玻璃外，同事小李变成眼珠全黑的怪物，带着诡异微笑用头撞门。",
    imagePrompt: "Classic horror film shot. Protagonist's POV looking through dusty and stained safety door glass. Outside glass, shadow of colleague 'Xiao Li' presses face against glass, features squeezed and distorted. Key horror element: eyes are completely black, no whites, like deep holes. Mouth slowly splitting into extremely standard, symmetrical inhuman smile. Emergency light flickering, casting strobing shadows. Nightmare fuel.",
    dialogues: [
      { character: "旁白", text: "我加快脚步。到十二层时，我看见安全门玻璃外有影子在晃动——人形的影子，但动作很奇怪，像提线木偶。" },
      { character: "旁白", text: "其中一个影子转过头，脸贴在玻璃上。那张脸是我的同事小李，但眼睛是全黑的，没有眼白。小李的嘴角慢慢咧开，露出一个标准到可怕的微笑。然后他开始用头撞门。" },
    ],
    motion: "static",
    duration: 25,
  },
  {
    id: 9,
    sceneText: "主角连滚爬下楼梯，墙壁缝隙渗出半透明粘稠物质，黑猫冷静倒计时。",
    imagePrompt: "Cinematic low-angle wide-angle lens showing chaotic and surreal stairwell. Protagonist at lower center of frame tumbling and running down stairs, expression extreme fear. Frame also focuses on side wall: concrete cracks oozing viscous, semi-transparent gelatinous substance, shimmering unnaturally under emergency light. Black cat leading ahead, occasionally looking back. Time running out atmosphere.",
    dialogues: [
      { character: "旁白", text: "我几乎是连滚带爬地往下冲。到八层时，头顶的窣窣声变大了，像潮水一样漫下来。我瞥见墙壁的缝隙里渗出某种粘稠的、半透明的物质，在昏暗的应急灯光下泛着微光。" },
      { character: "黑猫", text: "还有七层。五层。三层。我的腿像灌了铅，肺部像要炸开，但我不敢停。" },
    ],
    motion: "pan_down",
    duration: 22,
  },
  {
    id: 10,
    sceneText: "主角逃出大楼后回望，黑猫揭示真相，手机收到两条令人毛骨悚然的短信。",
    imagePrompt: "Cinematic dual-scene contrast montage. Main frame: On street, protagonist bent over catching breath, looking back up at company building. Building standing silently in deep blue night sky, only scattered lights visible, seemingly normal yet filled with eeriness. Black cat crouching in shadow at protagonist's feet, looking up at building, eyes reflecting distant street lamp light. Cold tone. Overlay: Phone screen showing two message notifications with terrifying content.",
    dialogues: [
      { character: "旁白", text: "一层大厅的应急灯亮着，前台空无一人。我冲向旋转门，却发现它被锁链缠住了。" },
      { character: "黑猫", text: "侧门。" },
      { character: "旁白", text: "我跑过去，推开门——冰冷的夜空气涌入，我从未觉得凌晨的空气如此甜美。我踉跄着跑到人行道上，回头看去。" },
      { character: "黑猫", text: "十七个人没来得及出来。你不在名单里，因为你不加班。" },
      { character: "旁白", text: "黑猫蹲在我脚边，琥珀色的眼睛看着大楼。我的手机突然震动了两下。两条未读消息。第一条：'紧急通知：十楼实验室发生 containment breach，所有人员请立即撤离。'发送时间：凌晨2:15。第二条，来自'小李'，发送时间：凌晨2:47。内容只有四个字：'你在哪呢？'" },
    ],
    motion: "zoom_out",
    duration: 32,
  },
];

export function ComicDramaCreate() {
  const navigate = useNavigate();

  // 页面状态
  const [step, setStep] = useState("edit"); // edit | preview
  const [scenes, setScenes] = useState(DEFAULT_SCENES);
  const [currentScene, setCurrentScene] = useState(0);
  const [generatingScene, setGeneratingScene] = useState(null); // "all" | null
  const [generatingSceneIds, setGeneratingSceneIds] = useState(new Set()); // 并发时记录各场景
  const [generatedScenes, setGeneratedScenes] = useState({});
  const [voiceName, setVoiceName] = useState("茉莉");
  const [stylePrefix, setStylePrefix] = useState("男主非常帅，白发狼尾，下颌线清晰，画风参考心动禁区，半写实半动漫，光影精细，电影感构图，");
  const [imageModel, setImageModel] = useState("agnes");
  
  // 风格一致性 - 参考图（默认使用预设参考图）
  const [referenceImage, setReferenceImage] = useState("");
  const [useReferenceImage, setUseReferenceImage] = useState(true); // 是否启用参考图模式
  const [seed, setSeed] = useState(null); // 固定 seed 保持风格一致（如使用 LongCat 模型）
  const [consistencyPrompt, setConsistencyPrompt] = useState("保持与前面场景相同的画风、色彩调和角色造型。"); // 一致性约束提示词

  // 切换参考图使用状态
  const toggleReferenceImage = () => {
    setUseReferenceImage(!useReferenceImage);
    if (useReferenceImage) {
      toast.info("已关闭参考图模式，每张图独立生成");
    } else {
      toast.info("已开启参考图模式，使用第一张图作为风格参考");
    }
  };

  const [isGeneratingStory, setIsGeneratingStory] = useState(false);
  const [storyPrompt, setStoryPrompt] = useState("校园女生吃了没熟的野蘑菇，获得看见他人心声弹幕的能力，却发现暗恋的学长头顶一片空白，难道他对自己真的毫无感觉？");
  // 预览界面状态（必须在顶层声明，不能在条件分支里）
  const [previewIdx, setPreviewIdx] = useState(0);
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);

  // Canvas 播放器状态
  const [isPlaying, setIsPlaying] = useState(false);
  const [playEnded, setPlayEnded] = useState(false);
  const [currentPlayScene, setCurrentPlayScene] = useState(0);
  const playCanvasRef = useRef(null);
  const playRafRef = useRef(null);     // requestAnimationFrame handle
  const playAudioCtxRef = useRef(null);
  const playStopRef = useRef(false);   // 停止标志

  // 下载素材包状态
  const [isDownloading, setIsDownloading] = useState(false);
  
  // 错误信息显示
  const [errorMessage, setErrorMessage] = useState(null);
  
  // 生成步骤状态显示
  const [generationStep, setGenerationStep] = useState(null); // 'image' | 'tts' | null

  const addScene = () => {
    if (scenes.length >= 4) {
      toast.error("最多只能有4个场景");
      return;
    }
    const newId = Math.max(...scenes.map(s => s.id), 0) + 1;
    setScenes([...scenes, {
      id: newId,
      sceneText: "",
      imagePrompt: "",
      character: "",
      dialogue: "",
      motion: "static",
      duration: 5,
    }]);
    setCurrentScene(scenes.length);
  };

  const removeScene = (id) => {
    if (scenes.length <= 1) {
      toast.error("至少保留一个场景");
      return;
    }
    setScenes(scenes.filter(s => s.id !== id));
    if (currentScene >= scenes.length - 1) {
      setCurrentScene(Math.max(0, scenes.length - 2));
    }
  };

  const updateScene = (id, field, value) => {
    setScenes(scenes.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // AI 生成剧情
  // ═══════════════════════════════════════════════════════════════════════════════
  const generateStory = async () => {
    if (!storyPrompt.trim()) {
      toast.error("请输入剧情主题");
      return;
    }

    setIsGeneratingStory(true);
    toast.info("AI 创作中...");

    try {
      const prompt = `你是皮克斯动画分镜导演。请将以下主题创作为短视频分镜，最多4个场景。

主题：${storyPrompt}

规则：
1. 最多生成4个场景，按叙事节奏自然断句
2. 每个场景必须包含：
   - sceneText: 中文旁白文本（口语化，有画面感，每句15-30字）
   - imagePrompt: 英文画面描述（详见下方规范）
   - character: 角色名（可选）
   - dialogue: 角色台词（可选）
   - motion: 运镜方式（zoom_in/zoom_out/pan_left/pan_right/pan_up/pan_down/static）
   - duration: 时长秒数（根据旁白长度估算，每句约3-5秒）

3. 英文画面描述规范（必须严格遵守）：
   - 场景描述：拒绝单一词汇（如"公园"），需用「空间结构+环境元素+动态细节」，如"樱花草坪旁的木质长椅，花瓣随风飘落"
   - 主体刻画：人物用「基础特征+微动作+表情符号」，如"嘴角上扬，手攥着气球绳，眼睛弯成月牙"；避免"开心"等模糊词
   - 光影质感：不说"暖光"，而说"下午3点的阳光斜射进来，在地面投下长条形光斑，照亮主体侧脸"
   - 视角构图：不说"中景"，而说"中景视角，主体占画面60%，背景清晰但不抢镜"
   - 风格统一：所有场景使用相同艺术风格（如日系动漫/赛博朋克/水墨画等）

4. 运镜选择：
   - zoom_in: 情感特写、悬疑揭示
   - zoom_out: 结尾、全景展示
   - pan_left/right/up/down: 场景扫视、追随
   - static: 对话、静态陈述
   - 严禁连续两个场景使用相同运镜

5. 根据故事主角性别、性格、故事风格，推荐合适的旁白音色（MiMo TTS）：
   - Chloe: 英文女声，自然亲切
   - Mia: 英文女声，温柔知性
   - Milo: 英文男声，阳光活泼
   - Dean: 英文男声，沉稳磁性
   - 冰糖: 中文女声，甜美可爱
   - 茉莉: 中文女声，温柔知性
   - 苏打: 中文男声，年轻活力
   - 白桦: 中文男声，沉稳可靠
   - mimo_default: 默认音色，中英自动适配

输出严格JSON格式：
{
  "voice_name": "音色code",
  "voice_reason": "选择理由",
  "scenes": [
    {
      "scene_number": 1,
      "sceneText": "中文旁白",
      "imagePrompt": "英文画面描述（详细，含场景/主体/光影/视角）",
      "character": "角色名",
      "dialogue": "台词",
      "motion": "zoom_in",
      "duration": 5
    }
  ]
}

重要：必须输出纯JSON，不要markdown代码块标记或其他文字说明。`;

      console.log("调用 Friday AI...");
      let content;
      
      try {
        // 先尝试调用本地函数
        const { data, error } = await supabase.functions.invoke("nocode-friday-ai", {
          body: { content: prompt }
        });
        
        if (error) throw error;
        if (!data?.content) throw new Error("空响应");
        content = data.content;
      } catch (funcErr) {
        console.log("本地函数调用失败，使用备用 API:", funcErr.message);
        
        // 备用：调用 Vercel API
        const resp = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: prompt,
            stream: false
          })
        });
        
        if (!resp.ok) throw new Error(`API 错误: ${resp.status}`);
        
        const respText = await resp.text();
        // 解析响应
        const result = await resp.json();
        content = result.content || "";
      }

      content = content.trim();
      console.log("AI 返回内容:", content);
      console.log("内容长度:", content.length);

      // 尝试提取 JSON - 多种策略
      let jsonStr = null;
      
      // 策略1: 直接找方括号包裹的数组
      const arrayMatch = content.match(/\[[\s\S]*\]/);
      if (arrayMatch) {
        jsonStr = arrayMatch[0];
        console.log("策略1成功: 找到方括号数组");
      }
      
      // 策略2: 找 JSON 代码块
      if (!jsonStr) {
        const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (codeBlockMatch) {
          const innerArray = codeBlockMatch[1].match(/\[[\s\S]*\]/);
          if (innerArray) {
            jsonStr = innerArray[0];
            console.log("策略2成功: 从代码块提取数组");
          }
        }
      }
      
      // 策略3: 找花括号对象数组（AI可能返回对象而不是数组）
      if (!jsonStr) {
        // 尝试找多个 {...} 结构
        const objectMatches = content.match(/\{[\s\S]*?"sceneText"[\s\S]*?\}/g);
        if (objectMatches && objectMatches.length > 0) {
          jsonStr = "[" + objectMatches.join(",") + "]";
          console.log("策略3成功: 从多个对象构造数组");
        }
      }

      if (!jsonStr) {
        console.error("无法从内容中提取 JSON，原始内容:", content);
        toast.error("AI 返回格式异常，请查看控制台日志");
        throw new Error("AI 返回格式不正确。原始内容已打印到控制台，请检查。");
      }

      // 清理可能的非法字符
      jsonStr = jsonStr.trim();
      
      let parsedScenes;
      try {
        parsedScenes = JSON.parse(jsonStr);
      } catch (parseErr) {
        console.error("JSON 解析失败:", parseErr);
        console.error("尝试解析的字符串:", jsonStr);
        
        // 尝试修复常见的 JSON 错误
        let fixedJson = jsonStr
          .replace(/,\s*([}\]])/g, "$1")  // 移除尾随逗号
          .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?\s*:/g, '"$2":');  // 标准化引号
        
        try {
          parsedScenes = JSON.parse(fixedJson);
          console.log("JSON 修复成功");
        } catch (fixErr) {
          console.error("JSON 修复也失败:", fixErr);
          throw new Error("JSON 解析失败，请查看控制台了解详情");
        }
      }

      // 处理新的返回格式（包含 voice_name 和 scenes）
      let scenesData = parsedScenes;
      
      // 如果是对象格式（包含 voice_name 和 scenes）
      if (!Array.isArray(parsedScenes) && parsedScenes.scenes && Array.isArray(parsedScenes.scenes)) {
        console.log("检测到新格式，包含 voice_name:", parsedScenes.voice_name);
        // 自动设置推荐的音色
        if (parsedScenes.voice_name && VOICE_OPTIONS.find(v => v.value === parsedScenes.voice_name)) {
          setVoiceName(parsedScenes.voice_name);
          toast.info(`已自动选择音色: ${parsedScenes.voice_name}${parsedScenes.voice_reason ? ' - ' + parsedScenes.voice_reason : ''}`);
        }
        scenesData = parsedScenes.scenes;
      }

      if (!Array.isArray(scenesData)) {
        console.error("解析结果不是数组:", scenesData, "原始:", parsedScenes);
        throw new Error("AI 返回的不是数组格式");
      }

      const newScenes = scenesData.map((s, idx) => ({
        id: idx + 1,
        sceneText: s.sceneText || s.narration || "",
        imagePrompt: s.imagePrompt || s.visual_prompt || "",
        character: s.character || "",
        dialogue: s.dialogue || "",
        motion: s.motion || "static",
        duration: s.duration || 5,
      }));

      setScenes(newScenes);
      setGeneratedScenes({});
      setCurrentScene(0);
      toast.success(`创作完成！共 ${newScenes.length} 个场景`);
    } catch (err) {
      console.error("生成剧情错误:", err);
      toast.error(`创作失败: ${err.message}`);
    } finally {
      setIsGeneratingStory(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // 生成单个场景（文生图 + TTS）- 分步执行
  // ═══════════════════════════════════════════════════════════════════════════════
  const generateScene = async (scene) => {
    setErrorMessage(null);
    
    // 检查必填字段
    if (!scene.imagePrompt?.trim()) {
      const err = `场景 ${scene.id} 缺少画面描述`;
      setErrorMessage(err);
      throw new Error(err);
    }
    if (!scene.sceneText?.trim()) {
      const err = `场景 ${scene.id} 缺少旁白文本`;
      setErrorMessage(err);
      throw new Error(err);
    }
    
    setGeneratingSceneIds(prev => new Set([...prev, scene.id]));
    const result = { imageUrl: null, audioUrl: null, audioDuration: 0, status: "generating" };
    setGeneratedScenes(prev => ({ ...prev, [scene.id]: result }));

    try {
      // 步骤1: 生成图片
      setGenerationStep({ step: 'image', status: 'pending', message: '准备生成图片...' });
      // 判断是否是第一张图（用于风格一致性）
      const isFirstScene = !referenceImage;
      const imageUrl = await generateImage(scene, isFirstScene);
      result.imageUrl = imageUrl;
      setGeneratedScenes(prev => ({ ...prev, [scene.id]: { ...result } }));
      
      // 保存第一张图为参考图（用于后续场景风格一致性）
      if (isFirstScene && useReferenceImage) {
        setReferenceImage(imageUrl);
        console.log("已保存参考图，用于后续场景风格一致性");
      }
      
      // 步骤2: 生成语音
      setGenerationStep({ step: 'tts', status: 'pending', message: '准备生成语音...' });
      const audioResult = await generateTTS(scene);
      result.audioUrl = audioResult.url;
      result.audioDuration = audioResult.duration;
      
      // 更新场景时长为音频实际时长
      updateScene(scene.id, "duration", Math.ceil(audioResult.duration));
      
      result.status = "completed";
      setGeneratedScenes(prev => ({ ...prev, [scene.id]: { ...result } }));
      setGenerationStep(null);
      toast.success(`场景 ${scene.id} 完成！`);
    } catch (err) {
      const errorMsg = `场景 ${scene.id} 生成失败: ${err.message}`;
      setErrorMessage(errorMsg);
      result.status = "error";
      result.error = err.message;
      setGeneratedScenes(prev => ({ ...prev, [scene.id]: { ...result } }));
      setGenerationStep(prev => prev ? { ...prev, status: 'error', message: err.message } : null);
      throw err;
    } finally {
      setGeneratingSceneIds(prev => { const s = new Set(prev); s.delete(scene.id); return s; });
    }
  };

  // Agnes API Key
  const AGNES_API_KEY = "sk-Q6tUbM2bxOsKkQb7bTHPlfJglji5XOpA5BomqJSFGDOqXFu6";

  // 文生图 - 支持 Agnes / 豆包 Seedream，返回图片 URL 后上传 Supabase Storage
  const generateImage = async (scene, isFirstScene = false) => {
    const prefix = stylePrefix === "none" ? "" : stylePrefix;
    
    // 风格一致性处理
    let consistencyText = "";
    if (!isFirstScene && useReferenceImage && referenceImage) {
      consistencyText = consistencyPrompt + " ";
    }
    
    const fullPrompt = prefix + consistencyText + scene.imagePrompt;
    
    setGenerationStep({ step: 'image', status: 'running', message: '正在生成图片...' });
    
    // ── 根据所选模型调用不同 API ──────────────────────────────────────────
    let rawImageUrl;
    try {
      if (imageModel === "doubao") {
        // 豆包 Seedream API（OpenAI 兼容格式）
        const response = await fetch(`${DOUBAO_BASE_URL}/images/generations`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${DOUBAO_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(Object.assign(
            {
              model: 'doubao-seedream-5-0-260128',
              prompt: fullPrompt,
              size: '1600x2848',
              response_format: 'url'
            },
            (!isFirstScene && useReferenceImage && referenceImage)
              ? { image: referenceImage }
              : {}
          ))
        });
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`豆包图片生成失败: ${response.status} ${errorText}`);
        }
        const data = await response.json();
        rawImageUrl = data?.data?.[0]?.url;
        if (!rawImageUrl) {
          console.error('豆包响应:', data);
          throw new Error('图片生成失败: 豆包未返回图片 URL');
        }
      } else {
        // Agnes API（默认）
        const response = await fetch('https://apihub.agnes-ai.com/v1/images/generations', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${AGNES_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'agnes-image-2.1-flash',
            prompt: fullPrompt,
            size: '768x1024'
          })
        });
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`图片生成失败: ${response.status} ${errorText}`);
        }
        const data = await response.json();
        const imageData = data?.data?.[0];
        if (!imageData) {
          console.error('Agnes 响应:', data);
          throw new Error('图片生成失败: 未返回图片数据');
        }
        rawImageUrl = imageData?.url;
        if (!rawImageUrl) {
          console.error('Agnes 响应:', data);
          throw new Error('图片生成失败: 未返回图片 URL');
        }
      }
    } catch (err) {
      throw new Error(`图片生成失败: ${err.message}`);
    }

    // ── 以下转存逻辑两个模型共用 ─────────────────────────────────────────
    try {
      const agnesUrl = rawImageUrl; // 复用变量名，逻辑不变

      // 尝试把图片转存到 Supabase Storage（解决跨域问题）
      setGenerationStep({ step: 'image', status: 'running', message: '正在保存图片...' });

      try {
        // 尝试直接 fetch Agnes 图片（测试是否有 CORS 头）
        const imgResp = await fetch(agnesUrl);
        if (imgResp.ok) {
          const imgBlob = await imgResp.blob();
          const mimeType = imgBlob.type || 'image/png';
          const ext = mimeType.split('/')[1] || 'png';
          const timestamp = Date.now();
          const randomId = Math.random().toString(36).substring(2, 10);
          const fileName = `comic_${timestamp}_${randomId}.${ext}`;

          const { error: uploadError } = await supabase.storage
            .from('images')
            .upload(fileName, imgBlob, { contentType: mimeType, upsert: false });

          if (!uploadError) {
            const { data: publicUrlData } = supabase.storage
              .from('images')
              .getPublicUrl(fileName);
            console.log('图片已转存 Storage:', publicUrlData.publicUrl);
            setGenerationStep({ step: 'image', status: 'success', message: '图片生成成功！' });
            return publicUrlData.publicUrl;
          }
          console.warn('Storage 上传失败:', uploadError);
        }
      } catch (fetchErr) {
        console.warn('fetch Agnes 图片失败（跨域？）:', fetchErr.message);
      }

      // 降级：通过 Edge Function 服务端转存（服务端无跨域）
      try {
        const { data: proxyData, error: proxyError } = await supabase.functions.invoke('nocode-image', {
          body: { action: 'proxy', imageUrl: agnesUrl }
        });
        if (!proxyError && proxyData?.url) {
          console.log('图片已通过 Edge Function 转存:', proxyData.url);
          setGenerationStep({ step: 'image', status: 'success', message: '图片生成成功！' });
          return proxyData.url;
        }
        console.warn('Edge Function 转存失败:', proxyError);
      } catch (efErr) {
        console.warn('Edge Function 调用失败:', efErr.message);
      }

      // 最终降级：直接返回原始 URL（可能外网无法访问图片，但内网可用）
      console.warn('所有转存方式失败，使用原始图片 URL（仅内网可用）');
      setGenerationStep({ step: 'image', status: 'success', message: '图片生成成功（内网模式）' });
      return agnesUrl;
      
    } catch (err) {
      console.error('图片转存错误:', err);
      throw new Error(`图片生成失败: ${err.message}`);
    }
  };

  // TTS - 直接调用 MiMo API
  const generateTTS = async (scene) => {
    // 拼接旁白+所有对白作为 TTS 文本
    const dialogueParts = (scene.dialogues || []).map(d =>
      d.character === "旁白" ? d.text : `${d.character}说：${d.text}`
    );
    const text = dialogueParts.length > 0
      ? dialogueParts.join("。")
      : scene.sceneText;
    
    setGenerationStep({ step: 'tts', status: 'running', message: '正在生成语音...' });

    try {
      // 直接调用 MiMo TTS API
      const response = await fetch(`${MIMO_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": MIMO_API_KEY,
        },
        body: JSON.stringify({
          model: "mimo-v2.5-tts",
          messages: [
            {
              role: "user",
              content: "自然流畅的语调，适中的语速",
            },
            {
              role: "assistant",
              content: text,
            }
          ],
          audio: {
            format: "wav",
            voice: voiceName,
          }
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`MiMo TTS 调用失败: HTTP ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      // 提取 base64 音频数据
      const audioBase64 = data?.choices?.[0]?.message?.audio?.data;
      if (!audioBase64) {
        throw new Error("MiMo TTS 返回数据格式错误，缺少音频数据");
      }

      // base64 解码为 ArrayBuffer
      const binaryString = atob(audioBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      // 创建 Blob 和 URL
      const blob = new Blob([bytes.buffer], { type: "audio/wav" });
      const audioUrl = URL.createObjectURL(blob);
      
      // 估算音频时长 (WAV 16kHz 16bit mono = 32000 bytes/sec)
      const duration = blob.size / 32000;
      
      setGenerationStep({ step: 'tts', status: 'success', message: `语音生成成功！时长 ${duration.toFixed(1)}秒` });
      return { url: audioUrl, duration };
      
    } catch (err) {
      console.error("TTS 生成错误:", err);
      throw new Error(`TTS 生成失败: ${err.message}`);
    }
  };

  // 批量生成所有场景（并发）
  const generateAllScenes = async () => {
    setGeneratingScene("all");
    
    const alreadyDone = scenes.filter(s => generatedScenes[s.id]?.status === "completed").length;
    const pendingScenes = scenes.filter(s => generatedScenes[s.id]?.status !== "completed");
    
    if (pendingScenes.length === 0) {
      toast.success("所有场景已生成完毕！");
      setGeneratingScene(null);
      return;
    }
    
    toast.info(`并发生成 ${pendingScenes.length} 个场景，请稍候...`);
    
    const results = await Promise.allSettled(
      pendingScenes.map(scene => generateScene(scene))
    );
    
    const successCount = results.filter(r => r.status === "fulfilled").length + alreadyDone;
    const failCount = results.filter(r => r.status === "rejected").length;
    
    setGeneratingScene(null);
    
    if (failCount === 0) {
      toast.success(`批量生成完成！共 ${successCount} 个场景`);
    } else {
      toast.warning(`生成完成: ${successCount} 成功, ${failCount} 失败`);
    }
  };


  // ═══════════════════════════════════════════════════════════════════════════════
  // Canvas 实时渲染播放器（不生成视频文件，纯前端实时渲染）
  // 方案：requestAnimationFrame 驱动 Canvas 逐场景渲染图片+运镜+字幕
  //       AudioContext 同步播放每个场景的 TTS 音频
  // ═══════════════════════════════════════════════════════════════════════════════
  const startPlayback = async () => {
    const completedScenes = scenes.filter(s => generatedScenes[s.id]?.status === "completed");
    if (completedScenes.length === 0) {
      toast.error("请先生成场景");
      return;
    }

    // 关闭旧的 AudioContext
    if (playAudioCtxRef.current) {
      try { playAudioCtxRef.current.close(); } catch (_) {}
    }

    setIsPlaying(true);
    setPlayEnded(false);
    setCurrentPlayScene(0);
    playStopRef.current = false;

    // ── 第一步：加载所有图片（不设 crossOrigin，直接加载）──────────────
    toast.info("加载素材中...");
    const assets = [];
    for (let i = 0; i < completedScenes.length; i++) {
      const scene = completedScenes[i];
      const gen = generatedScenes[scene.id];
      const motion = MOTION_OPTIONS.find(m => m.value === scene.motion) || MOTION_OPTIONS[0];
      const img = new Image(); // 不设 crossOrigin
      await new Promise((res) => {
        img.onload = res;
        img.onerror = res; // 加载失败也继续
        img.src = gen.imageUrl;
      });
      assets.push({ scene, gen, img, motion, duration: gen.audioDuration || scene.duration || 3 });
    }

    // ── 第二步：用 AudioContext 预解码并调度所有音频 ──────────────────────
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const audioCtx = new AudioCtx();
    playAudioCtxRef.current = audioCtx;

    // 记录每个场景的 audioCtx 开始时间（相对于 audioCtx.currentTime）
    const sceneStartTimes = [];
    let scheduleTime = audioCtx.currentTime + 0.1;
    for (const asset of assets) {
      sceneStartTimes.push(scheduleTime);
      if (asset.gen.audioUrl) {
        try {
          const resp = await fetch(asset.gen.audioUrl);
          const ab = await resp.arrayBuffer();
          const decoded = await audioCtx.decodeAudioData(ab);
          const src = audioCtx.createBufferSource();
          src.buffer = decoded;
          src.connect(audioCtx.destination);
          src.start(scheduleTime);
        } catch (e) {
          console.warn('音频解码失败，跳过', e);
        }
      }
      scheduleTime += asset.duration;
    }

    // ── 第三步：rAF 循环按时间驱动 Canvas 渲染 ──────────────────────────
    const canvas = playCanvasRef.current;
    if (!canvas) {
      setIsPlaying(false);
      return;
    }
    const ctx = canvas.getContext('2d');
    const startRealTime = performance.now();
    const totalDuration = assets.reduce((s, a) => s + a.duration, 0);

    const renderFrame = () => {
      if (playStopRef.current) {
        setIsPlaying(false);
        return;
      }

      const elapsed = (performance.now() - startRealTime) / 1000; // 秒

      if (elapsed >= totalDuration) {
        // 播放完毕 - 画最后一帧
        const last = assets[assets.length - 1];
        drawSceneWithMotion(ctx, canvas, last.img, last.motion, 1);
        drawSubtitle(ctx, canvas, last.scene);
        setCurrentPlayScene(assets.length - 1);
        setIsPlaying(false);
        setPlayEnded(true);
        return;
      }

      // 找当前场景
      let cumTime = 0;
      let si = 0;
      for (let i = 0; i < assets.length; i++) {
        if (elapsed < cumTime + assets[i].duration) { si = i; break; }
        cumTime += assets[i].duration;
      }
      const progress = (elapsed - cumTime) / assets[si].duration;
      setCurrentPlayScene(si);

      drawSceneWithMotion(ctx, canvas, assets[si].img, assets[si].motion, Math.min(progress, 1));
      drawSubtitle(ctx, canvas, assets[si].scene);

      playRafRef.current = requestAnimationFrame(renderFrame);
    };

    playRafRef.current = requestAnimationFrame(renderFrame);
  };

  // 停止播放
  const stopPlayback = () => {
    playStopRef.current = true;
    if (playRafRef.current) cancelAnimationFrame(playRafRef.current);
    if (playAudioCtxRef.current) {
      try { playAudioCtxRef.current.close(); } catch (_) {}
    }
    setIsPlaying(false);
  };

  // 下载素材包（JSZip）
  const downloadAssets = async () => {
    const completedScenes = scenes.filter(s => generatedScenes[s.id]?.status === "completed");
    if (completedScenes.length === 0) {
      toast.error("请先生成场景");
      return;
    }
    setIsDownloading(true);
    toast.info("正在打包素材...");
    try {
      const zip = new JSZip();

      // 生成 SRT 字幕
      let srt = "";
      let srtIdx = 1;
      let timeAcc = 0;
      for (const scene of completedScenes) {
        const gen = generatedScenes[scene.id];
        const dur = gen.audioDuration || scene.duration || 3;
        const toSrtTime = (s) => {
          const h = Math.floor(s / 3600).toString().padStart(2, '0');
          const m = Math.floor((s % 3600) / 60).toString().padStart(2, '0');
          const sec = Math.floor(s % 60).toString().padStart(2, '0');
          const ms = Math.floor((s % 1) * 1000).toString().padStart(3, '0');
          return `${h}:${m}:${sec},${ms}`;
        };
        const srtText = (scene.dialogues || []).map(d => d.text).join(" ") || scene.sceneText;
        srt += `${srtIdx}\n${toSrtTime(timeAcc)} --> ${toSrtTime(timeAcc + dur)}\n${srtText}\n\n`;
        srtIdx++;
        timeAcc += dur;
      }
      zip.file("subtitles.srt", srt);

      // 下载图片和音频
      for (let i = 0; i < completedScenes.length; i++) {
        const scene = completedScenes[i];
        const gen = generatedScenes[scene.id];
        const idx = String(i + 1).padStart(2, '0');

        if (gen.imageUrl) {
          try {
            const r = await fetch(gen.imageUrl);
            const blob = await r.blob();
            zip.file(`scene_${idx}_image.jpg`, blob);
          } catch (e) { console.warn('图片下载失败', e); }
        }
        if (gen.audioUrl) {
          try {
            const r = await fetch(gen.audioUrl);
            const blob = await r.blob();
            zip.file(`scene_${idx}_audio.mp3`, blob);
          } catch (e) { console.warn('音频下载失败', e); }
        }
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = "comic_assets.zip";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("素材包下载完成！");
    } catch (err) {
      console.error("下载失败:", err);
      toast.error(`下载失败: ${err.message}`);
    } finally {
      setIsDownloading(false);
    }
  };

  // 绘制场景（带运镜效果）
  const drawSceneWithMotion = (ctx, canvas, image, motion, progress) => {
    const cw = canvas.width;
    const ch = canvas.height;
    
    // 计算运镜参数
    let scale = 1;
    let tx = 0;
    let ty = 0;
    
    switch (motion.value) {
      case 'zoom_in':
        scale = 1 + progress * 0.2; // 1.0 -> 1.2
        break;
      case 'zoom_out':
        scale = 1.2 - progress * 0.2; // 1.2 -> 1.0
        break;
      case 'pan_left':
        scale = 1.1;
        tx = progress * 100; // 向右移动，画面左移效果
        break;
      case 'pan_right':
        scale = 1.1;
        tx = -progress * 100;
        break;
      case 'pan_up':
        scale = 1.1;
        ty = progress * 100;
        break;
      case 'pan_down':
        scale = 1.1;
        ty = -progress * 100;
        break;
      case 'static':
      default:
        scale = 1 + progress * 0.03; // 轻微呼吸感
        break;
    }
    
    // 清空画布
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, cw, ch);
    
    // 计算图片绘制尺寸（保持比例填充画布）
    const imgRatio = image.width / image.height;
    const canvasRatio = cw / ch;
    
    let drawW, drawH;
    if (imgRatio > canvasRatio) {
      drawH = ch / scale;
      drawW = drawH * imgRatio;
    } else {
      drawW = cw / scale;
      drawH = drawW / imgRatio;
    }
    
    const drawX = (cw - drawW) / 2 + tx;
    const drawY = (ch - drawH) / 2 + ty;
    
    ctx.drawImage(image, drawX, drawY, drawW, drawH);
  };

  // 绘制字幕 - 显示 dialogues 中第一条台词（旁白优先，否则取第一条）
  const drawSubtitle = (ctx, canvas, scene) => {
    const dialogues = scene.dialogues || [];
    const narration = dialogues.find(d => d.character === "旁白");
    const firstLine = narration || dialogues[0];
    const text = firstLine?.text || scene.sceneText;
    if (!text) return;
    
    const cw = canvas.width;
    const ch = canvas.height;
    const padding = 80;
    const maxWidth = cw - padding * 2;
    
    // 设置字体
    ctx.font = 'bold 48px "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    
    // 自动换行
    const words = text.split('');
    const lines = [];
    let currentLine = '';
    
    for (const word of words) {
      const testLine = currentLine + word;
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && currentLine.length > 0) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    lines.push(currentLine);
    
    // 限制行数，每行最多2行
    const displayLines = lines.slice(0, 2);
    const lineHeight = 60;
    const startY = ch - 150;
    
    // 绘制文字（描边+填充）
    displayLines.forEach((line, i) => {
      const y = startY - (displayLines.length - 1 - i) * lineHeight;
      
      // 描边
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.lineWidth = 6;
      ctx.strokeText(line, cw / 2, y);
      
      // 填充
      ctx.fillStyle = '#fff';
      ctx.fillText(line, cw / 2, y);
    });
  };

  // 检查是否全部生成完成
  const allScenesGenerated = scenes.every(s => generatedScenes[s.id]?.status === "completed");
  const completedCount = scenes.filter(s => generatedScenes[s.id]?.status === "completed").length;

  const scene = scenes[currentScene];
  const generated = generatedScenes[scene?.id];

  // 深色主题样式
  const styles = {
    page: { background: "#0D0D0D", minHeight: "100vh", color: "#fff" },
    header: { background: "rgba(13,13,13,0.95)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,0.06)" },
    card: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "14px" },
    sceneItem: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" },
    sceneItemActive: { background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.4)" },
    gradientBtn: { background: "linear-gradient(135deg, #7c3aed, #a855f7)" },
    label: { color: "rgba(255,255,255,0.6)", fontSize: "13px", marginBottom: "8px", display: "block" },
  };

  if (step === "edit") {
    return (
      <div style={styles.page}>
        {/* 顶部导航 */}
        <div style={styles.header} className="sticky top-0 z-20 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-white hover:bg-white/10">
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-semibold text-lg text-white">漫剧创作</h1>
              <p className="text-xs text-white/40">AI 视频生成</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setStep("preview")}
              disabled={completedCount === 0}
              variant="outline"
              className="bg-white/5 border-white/10 text-white hover:bg-white/10"
            >
              <Play className="w-4 h-4 mr-1" />
              预览
            </Button>
          </div>
        </div>

        <div className="container mx-auto p-4 max-w-7xl pb-32">
          {/* AI 创作区 */}
          <div style={styles.card} className="p-4 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-purple-400" />
              <span className="font-semibold text-white">AI 剧情创作</span>
            </div>
            <div className="flex gap-3">
              <Input
                value={storyPrompt}
                onChange={(e) => setStoryPrompt(e.target.value)}
                placeholder="输入剧情主题，如：校园暗恋、霸道总裁..."
                className="flex-1 bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
              <Button
                onClick={generateStory}
                disabled={isGeneratingStory || !storyPrompt.trim()}
                style={styles.gradientBtn}
                className="text-white border-0"
              >
                {isGeneratingStory ? (
                  <><Loader2 className="w-4 h-4 mr-1 animate-spin" />创作中</>
                ) : (
                  <><Wand2 className="w-4 h-4 mr-1" />生成剧情</>
                )}
              </Button>
            </div>
          </div>

          {/* 全局设置 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div style={styles.card} className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Settings className="w-4 h-4 text-white/60" />
                <span className="text-sm text-white/80">画风风格</span>
              </div>

              {/* 文生图模型选择 */}
              <div className="mb-3">
                <label className="text-xs text-white/50 mb-1 block">文生图模型</label>
                <Select value={imageModel} onValueChange={setImageModel}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1a] border-white/10">
                    {IMAGE_MODEL_OPTIONS.map((m) => (
                      <SelectItem key={m.value} value={m.value} className="text-white focus:bg-white/10">
                        <span>{m.label}</span>
                        <span className="text-white/40 ml-2 text-xs">{m.desc}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* 自定义输入 */}
              <Textarea
                value={stylePrefix === "none" ? "" : stylePrefix}
                onChange={(e) => setStylePrefix(e.target.value || "none")}
                placeholder="输入画风描述，如：日系动漫风格，柔和的水彩质感..."
                rows={2}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30 resize-none mb-3"
              />
              
              {/* 快捷标签 */}
              <div className="flex flex-wrap gap-2">
                {STYLE_PREFIXES.filter(s => s.value !== "none").map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setStylePrefix(s.value)}
                    className="px-2 py-1 text-xs rounded bg-white/10 text-white/60 hover:bg-white/20 hover:text-white transition-colors"
                  >
                    {s.label}
                  </button>
                ))}
                <button
                  onClick={() => setStylePrefix("none")}
                  className="px-2 py-1 text-xs rounded bg-white/5 text-white/40 hover:bg-white/10 transition-colors"
                >
                  清空
                </button>
              </div>
            </div>

            <div style={styles.card} className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Volume2 className="w-4 h-4 text-white/60" />
                <span className="text-sm text-white/80">旁白音色</span>
              </div>
              <Select value={voiceName} onValueChange={setVoiceName}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-white/10">
                  {VOICE_OPTIONS.map((v) => (
                    <SelectItem key={v.value} value={v.value} className="text-white focus:bg-white/10">
                      <span>{v.label}</span>
                      <span className="text-white/40 ml-2">{v.desc}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div style={styles.card} className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-white/60" />
                  <span className="text-sm text-white/80">风格一致性</span>
                </div>
                <button
                  onClick={toggleReferenceImage}
                  className={`px-2 py-1 rounded text-xs transition-colors ${
                    useReferenceImage 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-white/10 text-white/40'
                  }`}
                >
                  {useReferenceImage ? '已启用' : '已关闭'}
                </button>
              </div>
              <div className="flex items-center gap-2">
                {referenceImage ? (
                  <>
                    <img 
                      src={referenceImage} 
                      alt="参考图" 
                      className="w-8 h-8 rounded object-cover border border-white/20"
                    />
                    <span className="text-xs text-white/60">已设置参考图</span>
                  </>
                ) : (
                  <span className="text-xs text-white/40">
                    {useReferenceImage ? '生成首张图后自动设置' : '参考图模式已关闭'}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* 左侧：场景列表 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white">场景 ({scenes.length}/4)</span>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={addScene} 
                  disabled={scenes.length >= 4}
                  className="bg-white/5 border-white/10 text-white hover:bg-white/10 disabled:opacity-30"
                >
                  <Plus className="w-4 h-4 mr-1" />
                </Button>
              </div>

              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {scenes.map((s, idx) => (
                  <div
                    key={s.id}
                    className="p-3 rounded-lg cursor-pointer transition-all"
                    style={currentScene === idx ? styles.sceneItemActive : styles.sceneItem}
                    onClick={() => setCurrentScene(idx)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm text-white">场景 {idx + 1}</span>
                      <div className="flex items-center gap-1">
                        {generatedScenes[s.id]?.status === "completed" && (
                          <Check className="w-4 h-4 text-green-400" />
                        )}
                        {generatingSceneIds.has(s.id) && (
                          <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-white/40 hover:text-white hover:bg-white/10"
                          onClick={(e) => { e.stopPropagation(); removeScene(s.id); }}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-white/40 truncate mt-1">
                      {s.sceneText?.slice(0, 20) || "无描述"}...
                    </p>
                  </div>
                ))}
              </div>

              {/* 批量操作 */}
              <Button
                className="w-full text-white border-0"
                onClick={generateAllScenes}
                disabled={generatingScene === "all" || generatingSceneIds.size > 0}
                style={styles.gradientBtn}
              >
                {generatingScene === "all" || generatingSceneIds.size > 0 ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> 批量生成中...</>
                ) : (
                  <><Zap className="mr-2 h-4 w-4" /> 批量生成所有场景</>
                )}
              </Button>

              {completedCount > 0 && (
                <Button
                  className="w-full text-white border-0"
                  onClick={() => setStep("preview")}
                  style={styles.gradientBtn}
                >
                  <Play className="mr-2 h-4 w-4" /> 播放预览
                </Button>
              )}
              {completedCount > 0 && (
                <Button
                  className="w-full text-white/70 border-white/20"
                  onClick={downloadAssets}
                  disabled={isDownloading}
                  variant="outline"
                >
                  {isDownloading ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> 打包中...</>
                  ) : (
                    <><Download className="mr-2 h-4 w-4" /> 下载素材包</>
                  )}
                </Button>
              )}
            </div>

            {/* 中间：编辑区 */}
            <div className="lg:col-span-2 space-y-3">
              <span className="font-semibold text-white">场景编辑</span>

              <div style={styles.card} className="p-4 space-y-4">
                <div>
                  <label style={styles.label}>场景旁白</label>
                  <Textarea
                    value={scene?.sceneText || ""}
                    onChange={(e) => updateScene(scene.id, "sceneText", e.target.value)}
                    placeholder="输入场景描述..."
                    rows={2}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30 resize-none"
                  />
                </div>

                <div>
                  <label style={styles.label}>画面描述（英文）</label>
                  <Textarea
                    value={scene?.imagePrompt || ""}
                    onChange={(e) => updateScene(scene.id, "imagePrompt", e.target.value)}
                    placeholder="输入英文图像描述..."
                    rows={2}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30 resize-none"
                  />
                </div>

                {/* 对白编辑 */}
                <div>
                  <label style={styles.label}>对白（1-3条）</label>
                  {(scene?.dialogues || [{ character: "旁白", text: "" }]).map((d, di) => (
                    <div key={di} className="flex gap-2 mb-2">
                      <Input
                        value={d.character}
                        onChange={(e) => {
                          const newD = [...(scene.dialogues || [])];
                          newD[di] = { ...newD[di], character: e.target.value };
                          updateScene(scene.id, "dialogues", newD);
                        }}
                        placeholder="角色"
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/30 w-24 shrink-0"
                      />
                      <Input
                        value={d.text}
                        onChange={(e) => {
                          const newD = [...(scene.dialogues || [])];
                          newD[di] = { ...newD[di], text: e.target.value };
                          updateScene(scene.id, "dialogues", newD);
                        }}
                        placeholder="台词内容"
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/30 flex-1"
                      />
                      {(scene.dialogues || []).length > 1 && (
                        <Button size="icon" variant="ghost" className="text-white/40 hover:text-red-400 shrink-0"
                          onClick={() => {
                            const newD = (scene.dialogues || []).filter((_, i) => i !== di);
                            updateScene(scene.id, "dialogues", newD);
                          }}>
                          <X className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                  {(scene?.dialogues || []).length < 3 && (
                    <Button size="sm" variant="ghost" className="text-white/40 hover:text-white/70 text-xs mt-1"
                      onClick={() => {
                        const newD = [...(scene.dialogues || []), { character: "", text: "" }];
                        updateScene(scene.id, "dialogues", newD);
                      }}>
                      <Plus className="w-3 h-3 mr-1" /> 添加对白
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label style={styles.label}>运镜</label>
                    <Select 
                      value={scene?.motion || "static"} 
                      onValueChange={(v) => updateScene(scene.id, "motion", v)}
                    >
                      <SelectTrigger className="bg-white/5 border-white/10 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1a1a] border-white/10">
                        {MOTION_OPTIONS.map((m) => (
                          <SelectItem key={m.value} value={m.value} className="text-white focus:bg-white/10">
                            <span>{m.label}</span>
                            <span className="text-white/40 ml-2">{m.desc}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* 错误信息显示 */}
                {errorMessage && (
                  <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
                    <p className="text-red-300 text-sm font-medium">❌ 错误</p>
                    <p className="text-red-200 text-sm">{errorMessage}</p>
                  </div>
                )}
                
                {/* 生成步骤状态 */}
                {generationStep && generatingSceneIds.has(scene?.id) && (
                  <div className="p-3 bg-blue-500/20 border border-blue-500/50 rounded-lg space-y-2">
                    <p className="text-blue-300 text-sm font-medium">🔄 生成进度</p>
                    
                    {/* 图片步骤 */}
                    <div className="flex items-center gap-2">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                        generationStep.step === 'image' 
                          ? 'bg-blue-500 text-white' 
                          : generationStep.status === 'success' 
                            ? 'bg-green-500 text-white' 
                            : 'bg-gray-600'
                      }`}>
                        {generationStep.step === 'image' && generationStep.status === 'running' ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : generationStep.status === 'success' && generationStep.step !== 'image' ? (
                          '✓'
                        ) : (
                          '1'
                        )}
                      </div>
                      <span className={`text-sm ${
                        generationStep.step === 'image' ? 'text-blue-300' : 'text-gray-400'
                      }`}>
                        {generationStep.step === 'image' ? generationStep.message : '图片生成'}
                      </span>
                    </div>
                    
                    {/* TTS步骤 */}
                    <div className="flex items-center gap-2">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                        generationStep.step === 'tts' 
                          ? 'bg-blue-500 text-white' 
                          : generationStep.status === 'success' && generationStep.step === 'tts'
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-600'
                      }`}>
                        {generationStep.step === 'tts' && generationStep.status === 'running' ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : generationStep.status === 'success' && generationStep.step === 'tts' ? (
                          '✓'
                        ) : (
                          '2'
                        )}
                      </div>
                      <span className={`text-sm ${
                        generationStep.step === 'tts' ? 'text-blue-300' : 'text-gray-400'
                      }`}>
                        {generationStep.step === 'tts' ? generationStep.message : '语音生成'}
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    onClick={() => generateScene(scene)}
                disabled={generatingSceneIds.has(scene?.id)}
                style={generatingSceneIds.has(scene?.id) ? {} : styles.gradientBtn}
                  >
                    {generatingSceneIds.has(scene?.id) ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> 生成中...</>
                    ) : (
                      <><Wand2 className="mr-2 h-4 w-4" /> 生成场景</>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* 右侧：预览区 */}
            <div className="space-y-3">
              <span className="font-semibold text-white">效果预览</span>

              {generated?.status === "completed" ? (
                <div style={styles.card} className="p-4 space-y-4">
                  {generated.imageUrl && (
                    <div className="space-y-2">
                      <label style={styles.label}>画面</label>
                      <img
                        src={generated.imageUrl}
                        alt="场景"
                        className="w-full rounded-lg"
                      />
                      {/* 图片链接展示 */}
                      <div className="flex items-center gap-2 mt-2">
                        <input
                          type="text"
                          value={generated.imageUrl}
                          readOnly
                          className="flex-1 bg-white/10 border border-white/20 rounded px-2 py-1 text-xs text-white/70 truncate"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs px-2 py-1 h-auto"
                          onClick={() => {
                            navigator.clipboard.writeText(generated.imageUrl);
                            toast.success("图片链接已复制");
                          }}
                        >
                          复制
                        </Button>
                      </div>
                    </div>
                  )}

                  {generated.audioUrl && (
                    <div>
                      <label style={styles.label}>语音 ({generated.audioDuration.toFixed(1)}s)</label>
                      <audio 
                        controls 
                        className="w-full" 
                        src={generated.audioUrl}
                        preload="metadata"
                      />
                    </div>
                  )}

                  <div className="bg-white/5 p-3 rounded-lg">
                    <p className="text-white/80 text-sm">{scene?.sceneText}</p>
                    {(scene?.dialogues || []).filter(d => d.text).map((d, i) => (
                      <p key={i} className="mt-1 text-purple-300 text-sm">
                        <span className="text-white/50 text-xs">{d.character}：</span>「{d.text}」
                      </p>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center rounded-lg border border-dashed border-white/20">
                  <div className="text-center text-white/40">
                    <ImageIcon className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p>点击生成预览</p>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    );
  }

  // 预览界面 - 左右滑动翻页式漫剧 + Canvas 播放器
  const completedPreviewScenes = scenes.filter(s => generatedScenes[s.id]?.imageUrl);

  const goPrev = () => setPreviewIdx(i => Math.max(0, i - 1));
  const goNext = () => setPreviewIdx(i => Math.min(completedPreviewScenes.length - 1, i + 1));

  const handleTouchStart = (e) => {
    if (isPlaying) return;
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };
  const handleTouchEnd = (e) => {
    if (isPlaying) return;
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = Math.abs(e.changedTouches[0].clientY - touchStartY.current);
    if (Math.abs(dx) > 50 && Math.abs(dx) > dy) {
      if (dx < 0) goNext(); else goPrev();
    }
    touchStartX.current = null;
  };

  const curScene = completedPreviewScenes[previewIdx];
  const curGen = curScene ? generatedScenes[curScene.id] : null;

  return (
    <div
      className="fixed inset-0 bg-black flex flex-col"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* ── Canvas 播放层（isPlaying 时覆盖全屏）────────────────────────── */}
      <canvas
        ref={playCanvasRef}
        width={1080}
        height={1920}
        className="fixed inset-0 w-full h-full z-30 bg-black"
        style={{ display: isPlaying || playEnded ? "block" : "none", objectFit: "contain" }}
      />

      {/* Canvas 播放时的顶部 HUD */}
      {(isPlaying || playEnded) && (
        <div className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 pt-4 pb-2"
          style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)" }}>
          <Button variant="ghost" size="icon"
            onClick={() => { stopPlayback(); setPlayEnded(false); }}
            className="text-white hover:bg-white/10">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <span className="text-white/60 text-sm">
            {isPlaying ? `场景 ${currentPlayScene + 1} / ${completedPreviewScenes.length}` : "播放完毕"}
          </span>
          {isPlaying ? (
            <Button variant="ghost" size="icon" onClick={stopPlayback} className="text-white hover:bg-white/10">
              <X className="w-5 h-5" />
            </Button>
          ) : (
            <div className="w-9" />
          )}
        </div>
      )}

      {/* 播放结束后的操作按钮 */}
      {playEnded && (
        <div className="fixed bottom-16 left-0 right-0 z-40 flex justify-center gap-3 px-6">
          <Button
            style={styles.gradientBtn}
            className="text-white border-0 flex-1"
            onClick={() => { setPlayEnded(false); startPlayback(); }}
          >
            <Play className="w-4 h-4 mr-2" /> 重播
          </Button>
          <Button
            variant="outline"
            className="text-white/80 border-white/30 flex-1"
            onClick={downloadAssets}
            disabled={isDownloading}
          >
            {isDownloading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> 打包中...</>
            ) : (
              <><Download className="w-4 h-4 mr-2" /> 下载素材包</>
            )}
          </Button>
        </div>
      )}

      {/* ── 图片翻页模式（非播放时显示）────────────────────────────────── */}
      {/* 顶部栏 */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 pt-4 pb-2"
        style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)" }}>
        <Button variant="ghost" size="icon" onClick={() => { stopPlayback(); setStep("edit"); }} className="text-white hover:bg-white/10">
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <span className="text-white/60 text-sm">
          {completedPreviewScenes.length > 0 ? `${previewIdx + 1} / ${completedPreviewScenes.length}` : "暂无内容"}
        </span>
        {completedPreviewScenes.length > 0 && (
          <Button
            size="sm"
            style={styles.gradientBtn}
            className="text-white border-0 text-xs px-3"
            onClick={startPlayback}
          >
            <Play className="w-3 h-3 mr-1" /> 播放
          </Button>
        )}
      </div>

      {/* 主图区 */}
      {completedPreviewScenes.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-white/40 space-y-3">
          <ImageIcon className="w-12 h-12 opacity-30" />
          <p className="text-sm">请先生成场景</p>
          <Button variant="outline" className="border-white/20 text-white/60" onClick={() => setStep("edit")}>
            返回编辑
          </Button>
        </div>
      ) : (
        <div className="flex-1 relative overflow-hidden">
          {/* 图片 */}
          <img
            key={curScene?.id}
            src={curGen?.imageUrl}
            alt=""
            className="mx-auto object-cover h-full w-full"
            style={{ maxWidth: "100vw" }}
          />

          {/* 底部字幕层 */}
          <div className="absolute bottom-0 left-0 right-0 z-10"
            style={{ background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)" }}>
            <div className="px-6 pb-16 pt-12">
              {(curScene?.dialogues || []).filter(d => d.text).length > 0 ? (
                <div className="space-y-2">
                  {curScene.dialogues.filter(d => d.text).map((d, i) => (
                    <div key={i}>
                      {d.character !== "旁白" && (
                        <p className="text-white/50 text-xs mb-0.5">{d.character}</p>
                      )}
                      <p className={`leading-snug ${
                        d.character === "旁白" ? "text-white/70 text-sm" : "text-white text-base font-medium"
                      }`}>「{d.text}」</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-white text-base leading-relaxed">{curScene?.sceneText}</p>
              )}
            </div>
          </div>

          {/* 左右点击区域（桌面端） */}
          <button
            className="absolute left-0 top-0 bottom-0 w-1/4 z-10 flex items-center justify-start pl-2 opacity-0 hover:opacity-100 transition-opacity"
            onClick={goPrev}
            disabled={previewIdx === 0}
          >
            <div className="bg-black/40 rounded-full p-2">
              <ChevronLeft className="w-5 h-5 text-white" />
            </div>
          </button>
          <button
            className="absolute right-0 top-0 bottom-0 w-1/4 z-10 flex items-center justify-end pr-2 opacity-0 hover:opacity-100 transition-opacity"
            onClick={goNext}
            disabled={previewIdx === completedPreviewScenes.length - 1}
          >
            <div className="bg-black/40 rounded-full p-2">
              <ChevronRight className="w-5 h-5 text-white" />
            </div>
          </button>
        </div>
      )}

      {/* 底部页码点 */}
      {completedPreviewScenes.length > 1 && !isPlaying && !playEnded && (
        <div className="absolute bottom-6 left-0 right-0 z-20 flex justify-center gap-1.5">
          {completedPreviewScenes.map((_, i) => (
            <button
              key={i}
              onClick={() => setPreviewIdx(i)}
              className={`rounded-full transition-all duration-300 ${
                i === previewIdx ? "bg-white w-4 h-1.5" : "bg-white/40 w-1.5 h-1.5"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default ComicDramaCreate;
