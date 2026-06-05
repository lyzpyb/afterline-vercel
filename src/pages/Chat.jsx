import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useABVersion, trackABClick } from "@/hooks/useABVersion";
import {
  preprocessAIOutput,
  extractVisualMeta,
  parseStoryMode,
  parseChatMode,
  detectGarbledText,
  buildStoryModePrompt,
  buildChatModePrompt,
} from "@/lib/aiResponseParser";
import {
  ArrowLeft,
  Phone,
  MoreVertical,
  Mic,
  MicOff,
  Send,
  Heart,
  Sparkles,
  Volume2,
  VolumeX,
  Loader,
  ChevronRight,
  Lock,
} from "lucide-react";

// ─── Character data ────────────────────────────────────────────────────────────

const CHARACTERS = {
  "1": {
    name: "沈彦希",
    role: "沈氏财阀私生子 · 篮球队学长",
    level: 3,
    levelLabel: "暧昧",
    intimacy: 0,
    intimacyMax: 100,
    image:
      "https://s3plus.meituan.net/mcopilot-pub/nocode-task/chenyanbo/ujnj6kjw27ro1feytk76v2lr4ztv2r/ep1_60s.jpg",
  },
  "3": {
    name: "江辰",
    role: "神秘转学生",
    level: 1,
    levelLabel: "初识",
    intimacy: 0,
    intimacyMax: 100,
    image:
      "https://s3plus.meituan.net/mcopilot-pub/nocode-task/chenyanbo/hx5eovz6t1h7l30vrwq9nvsg5m83o8/duanju3-cover.jpg",
  },
  "4": {
    name: "顾星辰",
    role: "前男友",
    level: 2,
    levelLabel: "纠缠",
    intimacy: 30,
    intimacyMax: 100,
    image:
      "https://s3plus.meituan.net/mcopilot-pub/nocode-task/chenyanbo/hqvin4azabltjyyhpwkkwywsh1o2y9/zaogao-cover.jpg",
  },
};

// ─── Episode Summaries ─────────────────────────────────────────────────────────

const EPISODE_SUMMARIES = {
  1:  "林夏女扮男装入住宿舍遇见沈彦希，阳台初见，心跳漏拍",
  2:  "沈彦希说你腰怎么这么细，透明浴室设计让气氛暧昧升温",
  3:  "林夏洗澡忘拿衣服穿浴袍差点暴露，沈彦希若无其事却眼神深沉",
  4:  "深夜阳台沈彦希说身上味道好闻，两人距离越来越近",
  5:  "篮球场林夏被嘲讽，沈彦希霸气维护，第一次正面交锋",
  6:  "派对上两人共舞，灯光昏暗，彼此都没有退开",
  7:  "大雨困住两人，沈彦希脱下外套披在林夏身上",
  8:  "转学生出现，沈彦希莫名吃醋，态度变得反常",
  9:  "停电夜晚两人摸黑相遇，沈彦希握住林夏的手",
  10: "林夏生病，沈彦希悄悄照顾，却假装若无其事",
  11: "家族秘密揭开，沈彦希的身世让林夏震惊",
  12: "沈彦希主动推开林夏，两人陷入冷战",
  13: "林夏主动道歉，沈彦希沉默后终于和好",
  14: "校庆排练两人被迫搭档，肢体接触让气氛微妙",
  15: "有人开始怀疑林夏的性别，沈彦希帮她打掩护",
  16: "储物间里沈彦希逼问林夏真实身份",
  17: "沈彦希坦白早就知道林夏是女生，一直在等她开口",
};

// ─── Episode Opening Scenes ────────────────────────────────────────────────────
// 每一集的开场场景，包含差异化的 prose 和 dialogue

const EPISODE_OPENINGS = {
  1: {
    prose: [
      "这个传闻中杀伐果断、高不可攀的男人，此刻正用一种极具侵略性的目光，将你死死钉在原地。",
      "这是你们第一次见面，可他的眼神却像是在审视一件早已属于他的猎物。",
      "他薄唇微启，温热的唇瓣几乎要贴上你的耳垂，用只有你们两个人能听见的低哑气声，带着致命的蛊惑，一字一顿地咬出三个字——",
    ],
    dialogue: `"娇气包。"`,
    choices: [
      { label: "【死鸭子嘴硬】一把推开他的胸膛，粗着嗓子大喊：你叫谁娇气包呢！老子是纯爷们！", next: "ep1_branch_a", intimacyGain: 6, isFixed: true },
      { label: "【物理攻击】趁他不备，一脚狠狠踩上他昂贵的手工皮鞋，趁他吃痛弯腰时落荒而逃。", next: "ep1_branch_b", intimacyGain: 8, isFixed: true },
      { label: "【反向拉扯】破罐子破摔，反手揪住他的领带将他拉得更近，挑衅地迎上他的目光：沈先生对第一次见面的'男人'都这么有兴致吗？", next: "ep1_branch_c", intimacyGain: 12, isFixed: true },
    ],
    inputHint: "心跳飙升到180的你决定——",
    // 旁白补充（在对话前显示的额外描写）
    proseAfterDialogue: [
      "轰的一声，你大脑一片空白，伪装的坚强瞬间溃不成军。他看穿了？！",
      "属于他身上那股清冽的雪松混杂着淡淡烟草的气息，铺天盖地地侵袭进你的呼吸里。太近了。近到你能看清他深邃眼眸里倒映着的、那个穿着宽大西装、脸色涨得通红的'假小子'。",
    ],
  },
  2: {
    prose: [
      "上集说到，你和沈彦希开始了同住一个屋檐下的生活。他看似慵懒冷漠，却总在不经意间让你心跳加速。",
      "今晚你洗完澡出来，发现浴室和卧室之间只有一面半透明的磨砂玻璃墙。这个设计让你既尴尬又紧张。",
      "水汽在玻璃上凝结成雾气，你擦着头发走出来，睡衣因为潮湿而贴在身上。",
      "沈彦希正靠在窗边玩手机，听见水声停了，他抬眼看你。",
      "那一瞬间，他的目光在你身上停了半秒，从发梢到肩膀，再到……",
      "空气里有沐浴露的味道，你突然意识到睡衣有点透，慌忙用手臂挡住胸前。",
    ],
    dialogue: `"腰怎么这么细。"`,
    choices: [
      { label: "胡说什么，快让开", next: "s1", intimacyGain: 5 },
      { label: "……你看什么呢", next: "s1", intimacyGain: 8 },
      { label: "别看了，转过去", next: "s1", intimacyGain: 6 },
      { label: "那你觉得呢？", next: "s1", intimacyGain: 10 },
    ],
    inputHint: "你该怎么回应他的调侃？",
  },
  3: {
    prose: [
      "经历了昨晚浴室的尴尬，你和沈彦希之间的气氛变得更加微妙。他看你的眼神，似乎多了一些说不清道不明的东西。",
      "今天你洗澡的时候忘记把换洗衣服拿进浴室了。水声哗哗地响，你站在花洒下，突然意识到这个问题。",
      "宿舍里只有你们两个人，祁霖不在。你犹豫了很久，最后只能裹紧浴巾，深吸一口气推开了浴室门。",
      "你裹紧浴袍冲出来，头发还在滴水，水珠顺着脖颈滑进领口。",
      "沈彦希坐在床边看书，听见声音抬起头，目光在你裸露的锁骨上停留了一瞬，又在你湿漉漉的发梢上游移。",
      "他若无其事地低下头继续看书，但你注意到他翻页的手顿了一下，指节微微泛白。",
    ],
    dialogue: `"忘拿衣服了？"`,
    choices: [
      { label: "嗯……帮我递一下", next: "s1", intimacyGain: 7 },
      { label: "不用你管", next: "s1", intimacyGain: 4 },
      { label: "转过去，别看我", next: "s1", intimacyGain: 6 },
      { label: "你怎么知道？", next: "s1", intimacyGain: 9 },
    ],
    inputHint: "你该怎么化解这个尴尬？",
  },
  4: {
    prose: [
      "夜风微凉，宿舍阳台的感应灯忽明忽暗。你做贼心虚地缩在角落的阴影里，手里紧紧攥着那件刚洗完、还没来得及晾上去的黑色蕾丝内衣。",
      "心跳得像擂鼓，身后突然压过来一道极具侵略性的阴影。熟悉的冷冽薄荷香气瞬间将你整个人死死包裹。",
      "沈彦希低沉微哑的嗓音在耳畔毫无预兆地炸响，带着一丝不易察觉的戏谑。你浑身猛地一僵，血液仿佛瞬间倒流。",
      "还没等你结结巴巴地编出借口，一只骨节分明的大手已经从你背后探了过来。他温热的胸膛几乎贴上了你的后背，体温隔着薄薄的衣料传导过来。",
      "那双修长的手看似漫不经心，却带着不容拒绝的力道，从你僵硬发抖的手指间，一点点抽出了那团致命的布料。",
      "借着微弱的月光，那件属于女生的贴身衣物在他指尖晃了晃，显得格外刺眼。空气在这一秒彻底凝固。",
    ],
    dialogue: `"眼光不错。"`,
    proseAfterDialogue: [
      "沈彦希没有退开，反而微微俯下身，温热的呼吸暧昧又危险地洒在你的颈窝。他低低地轻笑了一声，那声音像是带电的羽毛刮过耳膜，却让你如坠冰窟。",
      "他顿了顿，语气里带着绝对的笃定与玩味，一字一顿地戳破了你死守的谎言——",
      '"所以……其实你是女生吧。"',
    ],
    choices: [
      { label: '【死鸭子嘴硬】"放屁！这是我给我异地恋女朋友洗的！我是纯爷们！"（试图一把抢回内衣）', next: "ep4_branch_a", intimacyGain: 6, isFixed: true },
      { label: '【秒怂滑跪】"沈哥，希哥！我错了！"（眼泪汪汪地拽住他的衣角）', next: "ep4_branch_b", intimacyGain: 8, isFixed: true },
      { label: '【反客为主】"是又怎样？看够了吗？"（猛地转身，红着脸把他反壁咚在阳台栏杆上）', next: "ep4_branch_c", intimacyGain: 12, isFixed: true },
    ],
    inputHint: "心跳疯狂飙升，面对沈彦希的贴脸开大，你决定如何应对？",
  },
  5: {
    prose: [
      "昨晚阳台的对话让你辗转难眠。他说你身上味道好闻，那句话在脑海里循环播放了一整夜。",
      "今天是系里的篮球友谊赛，你原本不想参加，但被室友硬拉了过去。你穿着宽松的运动服，努力让自己看起来像个普通男生。",
      "赛场边围满了女生，她们大多是来看沈彦希的。他穿着红色球衣，在球场上如鱼得水，每一个动作都引得观众尖叫。",
      "篮球场上人声鼎沸，你刚投丢一个球，旁边传来嘲讽的笑声。有人说你动作太娘，不配打篮球。",
      "你攥紧拳头，还没开口反驳，就看见沈彦希从场边走过来，把球捡在手里，眼神冷冷地扫过那群人。",
      "他把球递给你，指尖擦过你的手背，那一瞬间的触感让你心跳漏了一拍。",
    ],
    dialogue: `"我的人，你也敢笑？"`,
    choices: [
      { label: "谁是你的人……", next: "s1", intimacyGain: 8 },
      { label: "谢谢", next: "s1", intimacyGain: 6 },
      { label: "我自己能处理", next: "s1", intimacyGain: 5 },
      { label: "那你要罩着我吗？", next: "s1", intimacyGain: 10 },
    ],
    inputHint: "他当众维护你，你该怎么回应？",
  },
  6: {
    prose: [
      "自从篮球场上沈彦希当众说出「我的人」三个字，你们的关系就变得微妙起来。班里的同学开始有意无意地调侃你们。",
      "今晚是学生会举办的迎新派对，你被室友拉着一起去。你穿着简单的白衬衫和牛仔裤，努力在人群中保持低调。",
      "但低调是不可能的。因为你一进场，就看见沈彦希靠在吧台边，目光穿过人群直直地看向你。",
      "派对的音乐震耳欲聋，灯光忽明忽暗，有人推了你一把，你踉跄着向前几步。",
      "沈彦希不知什么时候站在你面前，向你伸出手。他的手指修长，指甲修剪得干干净净。",
      "周围的人在起哄，他的眼神在闪烁的灯光下格外深邃，仿佛全世界只剩下你一个人。",
    ],
    dialogue: `"跳舞吗。"`,
    choices: [
      { label: "……好", next: "s1", intimacyGain: 9 },
      { label: "我不会跳舞", next: "s1", intimacyGain: 5 },
      { label: "你认真的？", next: "s1", intimacyGain: 7 },
      { label: "这么多人看着呢", next: "s1", intimacyGain: 6 },
    ],
    inputHint: "昏暗的灯光下，你会接受他的邀请吗？",
  },
  7: {
    prose: [
      "派对上的那一支舞，让你和沈彦希之间的距离近得能听见彼此的心跳。他的手搭在你的腰上，温度透过薄薄的衣料传递过来。",
      "今天你下课晚了，刚出教学楼就听见雷声轰鸣。转眼间，大雨倾盆而下，毫无预兆。",
      "你没带伞，站在屋檐下等雨停。天色渐暗，雨势却越来越大，你开始担心今晚要怎么回宿舍。",
      "这时，你看见沈彦希从便利店走出来，手里拿着一把伞。他也看见了你，径直向你走来。",
      "你只穿了一件薄外套，冷得缩了缩肩膀，双手抱紧自己的手臂。",
      "沈彦希看了你一眼，二话不说脱下自己的外套，披在你肩上。外套还带着他的体温，和淡淡的薄荷香气。",
    ],
    dialogue: `"披着，别感冒。"`,
    choices: [
      { label: "那你呢？", next: "s1", intimacyGain: 8 },
      { label: "……谢谢", next: "s1", intimacyGain: 6 },
      { label: "不用，你自己穿", next: "s1", intimacyGain: 5 },
      { label: "你身上好暖", next: "s1", intimacyGain: 11 },
    ],
    inputHint: "他的外套还残留着体温，你该怎么回应？",
  },
  8: {
    prose: [
      "那个雨夜之后，你和沈彦希的关系似乎更近了。他会记得你爱喝的奶茶口味，会默默帮你占图书馆的座位。",
      "但平静的日子没有持续多久。今天班里来了一个转学生，叫苏瑾，长得漂亮，性格也开朗。",
      "更巧的是，苏瑾坐在你旁边，成为你的同桌。她对你很热情，下课总找你聊天，还约你一起吃饭。",
      "你礼貌地回应她，却不知道这一切都被沈彦希看在眼里。",
      "午休时，转学生苏瑾微笑着向你打招呼，约你一起去食堂。你礼貌地回应。",
      "余光瞥见沈彦希站在走廊尽头，脸色不太好。他转身走了，背影带着明显的冷意和……你读不懂的情绪。",
    ],
    dialogue: `"……笑得挺开心啊。"`,
    choices: [
      { label: "你什么意思？", next: "s1", intimacyGain: 6 },
      { label: "吃醋了？", next: "s1", intimacyGain: 10 },
      { label: "只是打个招呼而已", next: "s1", intimacyGain: 5 },
      { label: "你在意啊？", next: "s1", intimacyGain: 9 },
    ],
    inputHint: "他明显的醋意，你该怎么化解？",
  },
  9: {
    prose: [
      "沈彦希吃醋的反应让你心里有些窃喜，但又隐隐担忧。你不知道自己女扮男装的秘密还能隐瞒多久。",
      "苏瑾对你的热情丝毫未减，而沈彦希则开始有意无意地出现在你身边，像是在宣示主权。",
      "今晚宿舍区突然停电了，整栋楼陷入一片黑暗。你正在洗澡，突如其来的黑暗让你惊叫一声。",
      "你胡乱擦干身体，摸黑走出浴室。你不知道沈彦希在哪里，也不知道祁霖有没有回来。",
      "你站在原地不敢动，心跳得厉害。突然有一只手抓住了你的手腕，温热的触感让你心跳漏了一拍。",
      "你闻到他身上熟悉的味道，紧绷的神经瞬间放松下来，却又因为这份靠近而更加紧张。",
    ],
    dialogue: `"别怕，是我。"`,
    choices: [
      { label: "……我没怕", next: "s1", intimacyGain: 6 },
      { label: "你怎么知道我在哪", next: "s1", intimacyGain: 8 },
      { label: "别松开", next: "s1", intimacyGain: 11 },
      { label: "你的手好暖", next: "s1", intimacyGain: 10 },
    ],
    inputHint: "黑暗中他的声音格外清晰，你该如何回应？",
  },
  10: {
    prose: [
      "停电那一夜，沈彦希握着你的手，直到电力恢复。你们谁都没有提那一刻，但你知道有些东西已经改变了。",
      "这几天天气转凉，你在篮球场上淋了雨，当天晚上就开始发烧。你强撑着没有告诉任何人，怕暴露自己的脆弱。",
      "你烧得迷迷糊糊，躺在床上起不来，浑身发冷。宿舍里静悄悄的，你以为沈彦希出去了。",
      "隐约感觉到有人进来，轻轻把湿毛巾敷在你额头上。那动作很轻，带着小心翼翼的温柔。",
      "你睁开眼，视线模糊，却看清了坐在床边的人。沈彦希手里拿着一杯水，眉头微微皱着。",
      "他看见你醒了，眼神闪烁了一下，像是不习惯被看见这样的一面。",
    ],
    dialogue: `"醒了？喝点水。"`,
    choices: [
      { label: "……你怎么在这", next: "s1", intimacyGain: 7 },
      { label: "谢谢", next: "s1", intimacyGain: 6 },
      { label: "你一直在这？", next: "s1", intimacyGain: 9 },
      { label: "头好痛", next: "s1", intimacyGain: 5 },
    ],
    inputHint: "他趁你生病时来照顾你，你该怎么回应？",
  },
  11: {
    prose: [
      "你病好了之后，沈彦希对你的态度似乎更温柔了。他会记得你喜欢的口味，会在你熬夜时递上一杯热牛奶。",
      "但你总觉得他有什么心事，有时看着他，会发现他在发呆，眼神里有化不开的忧郁。",
      "今天是你值日，打扫图书馆时，你意外发现了一扇通往旧书库的门。你好奇地走进去，却听到了不该听的对话。",
      "沈氏财阀、私生子、继承权、威胁……这些词让你震惊。原来他背负着这样的秘密。",
      "门突然打开，沈彦希站在门口，脸色苍白。他看见你，眼神复杂，有惊讶，有慌乱，还有一丝……解脱？",
      "你们就这样对视着，空气凝固成冰。",
    ],
    dialogue: `"你都听到了。"`,
    choices: [
      { label: "我……不是故意的", next: "s1", intimacyGain: 6 },
      { label: "你没事吧？", next: "s1", intimacyGain: 9 },
      { label: "对不起", next: "s1", intimacyGain: 5 },
      { label: "我不在乎那些", next: "s1", intimacyGain: 11 },
    ],
    inputHint: "你知道了他的秘密，该如何面对他？",
  },
  12: {
    prose: [
      "自从你知道了沈彦希的身世，他就开始刻意疏远你。你试图和他谈谈，但他总是找借口离开。",
      "你明白他的顾虑。他是沈氏财阀的私生子，身份的敏感让他不敢与人深交。他在保护你，也在保护他自己。",
      "但明白归明白，心里还是难过。你已经习惯了有他在身边的日子，习惯了他的气息，他的声音。",
      "这几天沈彦希一直躲着你，早出晚归，甚至申请了调换宿舍。你终于忍不住拦住他。",
      "他却冷冷地看着你，那种疏离的眼神让你心里一沉，仿佛你们之间从未有过那些暧昧的时刻。",
      "他的手在身侧攥成拳头，像是在极力克制什么。",
    ],
    dialogue: `"别靠近我，对你不好。"`,
    choices: [
      { label: "什么意思？", next: "s1", intimacyGain: 6 },
      { label: "你在说什么啊", next: "s1", intimacyGain: 5 },
      { label: "我不怕", next: "s1", intimacyGain: 10 },
      { label: "发生什么事了？", next: "s1", intimacyGain: 7 },
    ],
    inputHint: "他突然的冷淡让你困惑，你该怎么办？",
  },
  13: {
    prose: [
      "男寝的空气在这一刻仿佛凝固了。",
      "夕阳的余晖透过百叶窗，切割在沈彦希那张清俊得近乎妖孽的脸上。他单手撑在你的床沿，高大的身躯微微俯下，将你整个人圈禁在他的阴影里。清冽的薄荷雪松香气扑面而来，瞬间侵占了你的全部呼吸。",
      "那双深邃的桃花眼直勾勾地锁住你，眸底翻涌着你看不懂的暗流。他修长的手指突然探过来，指腹轻轻擦过你的耳廓，低哑的嗓音在安静的寝室里炸开，带着致命的蛊惑——",
    ],
    dialogue: `"阿妍。"`,
    proseAfterDialogue: [
      "轰的一声，你的大脑瞬间空白。",
      "看着你像受惊的兔子般瞪大眼睛，沈彦希喉结微滚，溢出一声低沉的轻笑。他温热的手掌顺势揉了揉你的发顶，语气温柔得能掐出水来——",
      '"等我回来。"',
      "直到寝室门'咔哒'一声关上，你才猛地回过神来，双腿一软跌坐在床上。头顶似乎还残留着他掌心的温度，那句低柔的'阿妍'像带电的藤蔓，死死缠绕着你的心脏，酥麻感流窜全身。",
      "空荡荡的寝室里，你甚至能听见自己震耳欲聋的心跳声。明明他才刚离开不到十分钟，看着对面那张整洁的空床，一种名为'想念'和'慌乱'交织的情绪竟像野草般疯长，让你坐立难安。",
    ],
    choices: [
      { label: "【忍不住】拨通他的语音通话", next: "ep13_branch_a", intimacyGain: 8, isFixed: true },
      { label: "【鬼使神差】爬上他的床，把脸埋进他还有着薄荷雪松香味的被子里深吸一口气", next: "ep13_branch_b", intimacyGain: 10, isFixed: true },
      { label: '【强装镇定】发一条微信试探："你刚刚叫我什么？我没听清"', next: "ep13_branch_c", intimacyGain: 7, isFixed: true },
    ],
    inputHint: "你看着他空荡荡的床铺，心里的悸动怎么也压不下去，此时的你决定怎么做？",
  },
  14: {
    prose: [
      "你和沈彦希终于和好了。那个晚上他说了很多，关于他的恐惧，他的不安，以及……他对你的在意。",
      "你们约定，不再隐瞒，一起面对未来的困难。你不知道未来会怎样，但有他在身边，你就有了勇气。",
      "今天是校庆排练的第一天，你被选为学生代表，要表演一段舞蹈。而更巧的是，你的搭档是沈彦希。",
      "校庆排练室空无一人，只有你们两个。音乐响起，是一首慢节奏的华尔兹。",
      "他的手搭在你的腰上，距离近得能听见彼此的呼吸，感受到对方的心跳。",
      "你的心跳快得不正常，脸颊发烫，不敢看他的眼睛。",
    ],
    dialogue: `"专心，看着我。"`,
    choices: [
      { label: "……好", next: "s1", intimacyGain: 9 },
      { label: "太近了", next: "s1", intimacyGain: 6 },
      { label: "你手放哪呢", next: "s1", intimacyGain: 7 },
      { label: "我做不到", next: "s1", intimacyGain: 5 },
    ],
    inputHint: "肢体接触让气氛暧昧，你该如何应对？",
  },
  15: {
    prose: [
      "校庆排练之后，你和沈彦希之间的关系更加亲密了。你们开始像真正的恋人一样相处，虽然只是心照不宣。",
      "但麻烦也随之而来。有人开始怀疑你的身份，注意到你从未在公共浴室洗澡，从未穿过短裤，也从未和其他男生一起打过篮球。",
      "今天你在厕所隔间里，听见外面有人在议论。她们说林夏太娘了，怀疑他是女生假扮的。",
      "你躲在墙角不敢出声，心跳快得像要跳出胸腔。如果被揭穿，你该怎么办？",
      "沈彦希的声音突然响起，语气冰冷得像是在压抑着怒意。",
      "他说了什么，那群人灰溜溜地散了，你听见她们的脚步声渐渐远去。",
    ],
    dialogue: `"她的事，用不着你们操心。"`,
    choices: [
      { label: "……谢谢", next: "s1", intimacyGain: 8 },
      { label: "你听到了？", next: "s1", intimacyGain: 6 },
      { label: "她说什么了？", next: "s1", intimacyGain: 5 },
      { label: "你为什么要帮我", next: "s1", intimacyGain: 7 },
    ],
    inputHint: "他又一次保护了你，你该如何回应？",
  },
  16: {
    prose: [
      "身份被怀疑的事情让你心神不宁，沈彦希却表现得异常冷静。他说他会处理，让你相信他。",
      "但你看得出来，他的眉头皱得比以前更紧了。他在担心什么？你不敢问。",
      "今天你回宿舍拿东西，推开门却发现沈彦希已经在里面。他的表情严肃，像是在等你。",
      "还没等你开口，储物间的门突然被关上，你被沈彦希困在墙角。空间狭小，他的呼吸就在你耳边。",
      "他的声音低得像是在压抑什么，带着一丝颤抖。你知道瞒不住了，这一刻迟早会来。",
      "你闭上眼睛，等待着审判。",
    ],
    dialogue: `"你是女生，对不对。"`,
    choices: [
      { label: "……你怎么知道", next: "s1", intimacyGain: 7 },
      { label: "你什么时候发现的", next: "s1", intimacyGain: 8 },
      { label: "我可以解释", next: "s1", intimacyGain: 6 },
      { label: "是，我是", next: "s1", intimacyGain: 10 },
    ],
    inputHint: "秘密被揭穿，你该如何面对他？",
  },
  17: {
    prose: [
      "你从未想过，真相会以这样的方式揭开。更未想过，沈彦希的反应会是这样。",
      "原来他早就知道。从你入住的第一天起，他就察觉了端倪——你走路的姿势，你说话的声音，你看他的眼神。",
      "但他选择了沉默，选择了等待。他在等你亲口告诉他，等他真正成为你信任的人。",
      "他终于说出了真相，声音沙哑却温柔。原来他一直都知道，一直在等你主动开口。",
      "你们之间的距离从未如此近，也从未如此远。近到能听见彼此的心跳，远到隔着几个月的隐瞒和试探。",
      "你看着他的眼睛，那里有理解，有包容，还有深深的爱意。",
    ],
    dialogue: `"我一直在等你亲口告诉我。"`,
    choices: [
      { label: "对不起，骗了你这么久", next: "s1", intimacyGain: 10 },
      { label: "你为什么不早说", next: "s1", intimacyGain: 8 },
      { label: "那你还愿意让我住这吗", next: "s1", intimacyGain: 9 },
      { label: "……谢谢你的等待", next: "s1", intimacyGain: 11 },
    ],
    inputHint: "他坦诚了心意，你该如何回应这份等待？",
  },
};

// ─── Story Scenes ──────────────────────────────────────────────────────────────
// Each scene: { id, prose: string[], dialogue?: string, choices: [{label, next, intimacyGain}] }

const STORY_SCENES = {
  "1": [
    // ── 第一集第一部分：写死的三条支线 ──────────────────────────────────────
    {
      id: "ep1_branch_a",
      prose: [
        "你一把推开他的胸膛，手掌触到他胸口的瞬间，那种结实的温热让你心跳猛地漏了一拍。",
        "他没有后退，反而低低笑出声，那笑声像是从胸腔里滚出来的，带着某种漫不经心的残忍。",
        "他的目光从你涨红的脸颊上缓缓移开，嘴角的弧度加深了一分。",
      ],
      dialogue: `"纯爷们。"`,
      proseAfterDialogue: [
        "他重复了一遍，像是在品味这三个字，'有意思。'",
        "你攥紧拳头，强迫自己不去想刚才那一秒的触感。",
      ],
      choices: [
        { label: "哼，谁稀罕你夸。转身走开", next: null, intimacyGain: 5 },
        { label: "……你到底看出什么了", next: null, intimacyGain: 8 },
        { label: "你笑什么笑！再笑我真踹你", next: null, intimacyGain: 6 },
      ],
      isFixedBranch: true,
      inputHint: "他的笑让你心跳乱了节奏，你想说什么？",
    },
    {
      id: "ep1_branch_b",
      prose: [
        "皮鞋踩下去的瞬间，你感觉到他微微弯腰，吃痛的气息从他喉咙里逸出来。",
        "你转身就跑，心跳快得像要炸开——",
        "然后一只手轻描淡写地扣住了你的手腕。",
      ],
      dialogue: `"跑什么。"`,
      proseAfterDialogue: [
        "不是疑问句。",
        "他的手腕力道不大，却像一道无形的锁链，让你的脚步彻底僵在原地。",
        "你不敢回头，却能感觉到他的目光落在你后颈上，带着某种说不清的温度。",
      ],
      choices: [
        { label: "松开。我自己能走", next: null, intimacyGain: 5 },
        { label: "……你为什么拦我", next: null, intimacyGain: 8 },
        { label: "慢慢回头，直视他的眼睛", next: null, intimacyGain: 10 },
      ],
      isFixedBranch: true,
      inputHint: "被他拦住的你，现在想怎么办？",
    },
    {
      id: "ep1_branch_c",
      prose: [
        "领带被拽紧的一秒，他的呼吸明显停顿了。",
        "你们之间的距离近到极致，你能看见他眼底那一瞬间的愣神——",
        "随即，他反手将领带从你指间缓缓抽出，嘴角勾起一个弧度。那是一种被猎物咬了一口、却更感兴趣的表情。",
      ],
      dialogue: `"沈先生？"`,
      proseAfterDialogue: [
        "他低声重复，声音里带着某种危险的玩味，'你叫我沈先生。'",
        "他的眼神变了。不再是审视，而是……猎人发现猎物比想象中更有趣时，才会有的那种目光。",
      ],
      choices: [
        { label: "松开领带，后退一步，维持镇定", next: null, intimacyGain: 6 },
        { label: "那又怎样，沈先生", next: null, intimacyGain: 10 },
        { label: "……你、你别误会，我只是——", next: null, intimacyGain: 7 },
      ],
      isFixedBranch: true,
      inputHint: "他的眼神让你心跳加速，你想说什么？",
    },
    // ── 第四集第一部分：写死的三条支线 ──────────────────────────────────────
    {
      id: "ep4_branch_a",
      prose: [
        "你猛地伸手去抢，指尖刚碰到那团布料，他却轻描淡写地往上一抬，让你扑了个空。",
        "他低头看着你气急败坏的样子，嘴角的弧度加深了一分。",
        "异地恋女朋友。他重复了一遍，语气里带着明显的不信任，'那她的尺码，和你一样？'",
      ],
      dialogue: `"有意思的借口。"`,
      proseAfterDialogue: [
        "他把那件内衣在指尖转了一圈，漫不经心地递还给你，却没有退开半步。",
        "你攥着那团布料，脸烫得像要着火，却还在死撑着最后一口气。",
      ],
      choices: [
        { label: "……尺码的事你管不着！（夺过来转身就跑）", next: null, intimacyGain: 5 },
        { label: "你、你别乱说话！（声音已经在抖）", next: null, intimacyGain: 7 },
        { label: "（沉默，低着头，不敢看他）", next: null, intimacyGain: 8 },
      ],
      isFixedBranch: true,
      inputHint: "谎言已经千疮百孔，你还能撑多久？",
    },
    {
      id: "ep4_branch_b",
      prose: [
        "你眼眶一热，真的扯住了他的衣角，仰头看他，眼泪在眼眶里打转。",
        "他愣了一秒。",
        "这大概是他第一次见到你这副模样——不再是那个梗着脖子跟他对峙的'假小子'，而是一个真实的、慌乱的、快要哭出来的女生。",
      ],
      dialogue: `"……哭什么。"`,
      proseAfterDialogue: [
        "他的声音低了下去，带着某种说不清的情绪。",
        "他没有推开你，也没有说话，只是低头看着你攥着他衣角的手，沉默了很久。",
      ],
      choices: [
        { label: "（哽咽）你不会说出去吧……", next: null, intimacyGain: 9 },
        { label: "（抬头，红着眼眶直视他）你打算怎样？", next: null, intimacyGain: 7 },
        { label: "（松开手，低头）……随你。", next: null, intimacyGain: 6 },
      ],
      isFixedBranch: true,
      inputHint: "眼泪已经出卖了你，他会怎么做？",
    },
    {
      id: "ep4_branch_c",
      prose: [
        "你猛地转身，双手撑上他身后的栏杆，将他反壁咚在阳台边缘。",
        "他明显愣了——这大概是他第一次被人这样堵住。",
        "月光落在你们之间，你们的距离近到能感受到彼此的呼吸。你脸红得像要烧起来，却死死维持着那个挑衅的表情。",
      ],
      dialogue: `"……你胆子不小。"`,
      proseAfterDialogue: [
        "他没有推开你，反而微微低下头，目光落在你涨红的脸颊上，带着某种危险的兴味。",
        "他的声音压得很低，'就这样？'",
      ],
      choices: [
        { label: "（维持姿势，声音发抖）是又怎样。", next: null, intimacyGain: 10 },
        { label: "（后退一步，转移话题）……你先把那个还我。", next: null, intimacyGain: 7 },
        { label: "（破功，红着脸低下头）……我、我就是——", next: null, intimacyGain: 8 },
      ],
      isFixedBranch: true,
      inputHint: "你把他壁咚了，但接下来怎么收场？",
    },
    // ── 第十三集第一部分：写死的三条支线 ──────────────────────────────────────
    {
      id: "ep13_branch_a",
      prose: [
        "手机屏幕亮起，通话界面跳出来，你盯着那个纯黑色的头像，手指颤抖着按下了拨号键。",
        "嘟——嘟——",
        "两声之后，电话接通了。",
        "那端传来轻微的环境音，还有他低沉的呼吸声。他没有先开口，像是在等你。",
      ],
      dialogue: `"……嗯？"`,
      proseAfterDialogue: [
        "就一个字。低沉，慵懒，带着一丝若有若无的笑意，像是早就知道你会打来。",
        "你攥着手机，心跳快得像要从喉咙里蹦出来，脑子里一片空白，完全不知道该说什么。",
      ],
      choices: [
        { label: "（声音发抖）你……你刚才叫我什么？", next: null, intimacyGain: 8 },
        { label: "（装作若无其事）没事，就是……想确认你到哪了。", next: null, intimacyGain: 6 },
        { label: "（沉默了三秒，然后挂掉）", next: null, intimacyGain: 7 },
      ],
      isFixedBranch: true,
      inputHint: "电话接通了，他在等你开口，你要说什么？",
    },
    {
      id: "ep13_branch_b",
      prose: [
        "你鬼使神差地站起来，走到他的床边，犹豫了一秒，然后整个人爬了上去。",
        "被子叠得整整齐齐，带着他惯用的洗衣液的气息，还有那股若有若无的薄荷雪松香。",
        "你把脸埋进去，深深地吸了一口气。",
        "那个气味瞬间将你淹没——熟悉的、属于他的、让你心跳乱掉的气息。",
      ],
      dialogue: `"……在干什么。"`,
      proseAfterDialogue: [
        "你猛地抬起头。",
        "沈彦希不知道什么时候回来了，就站在宿舍门口，手里拎着东西，一双桃花眼直直地看着你，眸底有什么东西在涌动。",
        "空气瞬间凝固。",
      ],
      choices: [
        { label: "（脸红到耳根，从他床上滚下来）我、我什么都没干！", next: null, intimacyGain: 7 },
        { label: "（维持姿势，硬撑）……你回来了。", next: null, intimacyGain: 9 },
        { label: "（把脸重新埋进被子里，假装自己不存在）", next: null, intimacyGain: 10 },
      ],
      isFixedBranch: true,
      inputHint: "他回来了，正好撞见你埋在他被子里，现在怎么办？",
    },
    {
      id: "ep13_branch_c",
      prose: [
        "你深吸一口气，强迫自己的手指停止颤抖，打开微信，找到他的对话框。",
        "光标在输入框里闪烁，你盯着那行字看了很久，才终于按下发送。",
        "消息发出去的瞬间，你的心跳几乎停了一拍。",
        "然后——对话框里出现了'对方正在输入……'的提示。",
      ],
      dialogue: `"听清了。"`,
      proseAfterDialogue: [
        "就两个字。",
        "你盯着屏幕，等了三秒，他又发来一条——",
        '"故意的。"',
        "你的手机差点从手里滑落。",
      ],
      choices: [
        { label: "（手抖，回复）……什么意思。", next: null, intimacyGain: 8 },
        { label: "（盯着屏幕发呆，迟迟没有回复）", next: null, intimacyGain: 7 },
        { label: "（深吸一口气，回复）那你等我回消息。", next: null, intimacyGain: 10 },
      ],
      isFixedBranch: true,
      inputHint: "他说'故意的'，你的心跳乱成一团，怎么回复？",
    },
    // ── 后续场景（AI 生成接入点）────────────────────────────────────────────
    {
      id: "s1",
      prose: [
        "宿舍走廊的灯光昏黄，你抱着洗漱包低头走路，心里默念：别遇见他，别遇见他。",
        "然后你抬起头。",
        "沈彦希就靠在宿舍门口，一只手插兜，银灰色的发在廊灯下泛着浅光。他看见你，慢慢把嘴角扯起一个弧度。",
      ],
      dialogue: `"回来了。"`,
      choices: [
        { label: "嗯。低头绕过他", next: "s2a", intimacyGain: 4 },
        { label: "你堵门口干什么？", next: "s2b", intimacyGain: 7 },
        { label: "假装没看见他，径直走进去", next: "s2c", intimacyGain: 5 },
        { label: "停下来，对视", next: "s2d", intimacyGain: 8 },
      ],
    },
    {
      id: "s2a",
      prose: [
        "你低着头从他身边侧身过去，肩膀差点蹭到他的手臂。",
        "空气里有他身上的气味，淡淡的，你说不清是什么——就是干净，又有点熟悉，让人心跳乱一拍。",
        "身后传来他轻轻的一声笑，不大，像是自言自语。",
      ],
      dialogue: `"躲什么。"`,
      choices: [
        { label: "谁躲你了。", next: "s3", intimacyGain: 8 },
        { label: "当没听见，走到自己床边", next: "s3", intimacyGain: 3 },
        { label: "回头看他一眼，不说话", next: "s3", intimacyGain: 6 },
      ],
    },
    {
      id: "s2b",
      prose: [
        "他没动，就那样看着你，像是在认真考虑这个问题。",
        "等你。他说，语气平平的，像在说今天天气不错。",
        "你的心漏跳了半拍，但你没让他看出来。",
      ],
      dialogue: `"有件事想跟你说。"`,
      choices: [
        { label: "什么事？", next: "s3", intimacyGain: 9 },
        { label: "改天吧，我累了。", next: "s3", intimacyGain: 4 },
        { label: "抬眼看他，不说话，等他开口", next: "s3", intimacyGain: 7 },
      ],
    },
    {
      id: "s2c",
      prose: [
        "你走进去，他跟在后面，门在身后关上。",
        "宿舍里静得能听见对面楼的音乐隐约传来。祁霖不在，只有你们两个。",
        "你开始整理东西，背对着他——但你知道他一直在看你。",
      ],
      dialogue: `"你今天又去打球了？"`,
      choices: [
        { label: "你怎么知道？回头", next: "s3", intimacyGain: 8 },
        { label: "嗯。不回头", next: "s3", intimacyGain: 3 },
        { label: "你注意我干什么。", next: "s3", intimacyGain: 7 },
      ],
    },
    {
      id: "s2d",
      prose: [
        "你们就这样对视。",
        "他没有移开眼睛，你也没有。走廊很静，远处有人说话的声音，但那些都很远。",
        "他眼神里有什么东西，你说不清楚，但它让你的手指收紧了。",
      ],
      dialogue: `"以后别一个人晚归。"`,
      choices: [
        { label: "关你什么事。", next: "s3", intimacyGain: 6 },
        { label: "……谢谢。低下眼睛", next: "s3", intimacyGain: 10 },
        { label: "你是在关心我吗？", next: "s3", intimacyGain: 9 },
      ],
    },
    {
      id: "s3",
      prose: [
        "夜深了。宿舍灯关了，只有窗外城市的浅光透进来。",
        "沈彦希在上铺翻了个身，发出一声轻响。",
        "你盯着黑暗里的天花板，心想：你不是故意要注意他的，只是他太难不注意了。",
      ],
      dialogue: `"睡了吗。"`,
      choices: [
        { label: "不回答，闭上眼睛", next: "s4a", intimacyGain: 5 },
        { label: "没有。", next: "s4b", intimacyGain: 8 },
        { label: "你有什么事吗。", next: "s4c", intimacyGain: 7 },
      ],
    },
    {
      id: "s4a",
      prose: [
        "沉默。",
        "然后是他轻轻的笑声，很低，像是只说给自己听的。",
        "骗人。他说。",
        "你把被子拉高了一点。",
      ],
      dialogue: null,
      choices: [
        { label: "把被子盖过头", next: "end", intimacyGain: 5 },
        { label: "悄悄笑了", next: "end", intimacyGain: 9 },
      ],
    },
    {
      id: "s4b",
      prose: [
        "嗯。他也说没睡。",
        "又是一段沉默，但这次不一样——它不沉，它轻。",
        "窗外有风，把窗帘吹起来，又放下。",
      ],
      dialogue: `"你怕黑吗。"`,
      choices: [
        { label: "不怕，你呢？", next: "end", intimacyGain: 8 },
        { label: "有点。", next: "end", intimacyGain: 11 },
        { label: "问这个干嘛。", next: "end", intimacyGain: 6 },
      ],
    },
    {
      id: "s4c",
      prose: [
        "没事。他说。",
        "那你说话干什么。",
        "他没有立刻回答。你等了几秒，以为他睡着了。",
      ],
      dialogue: `"就是想知道你在不在。"`,
      choices: [
        { label: "心跳漏了一拍，没说话", next: "end", intimacyGain: 10 },
        { label: "……在。", next: "end", intimacyGain: 9 },
        { label: "神经病。但嘴角弯了", next: "end", intimacyGain: 11 },
      ],
    },
    {
      id: "end",
      prose: [
        "宿舍又安静下来。",
        "你不知道他有没有睡着，你也没有。",
        "只是这个夜晚，好像比昨天多了什么东西，藏在黑暗里，很轻，又很重。",
      ],
      dialogue: null,
      choices: [],
    },
  ],
};

// ─── Keyframe styles ───────────────────────────────────────────────────────────

const STYLES = `
  @keyframes proseReveal {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes choiceIn {
    from { opacity: 0; transform: translateY(18px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes dialogueIn {
    from { opacity: 0; transform: translateX(-10px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes cursorBlink {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0; }
  }
  @keyframes intimacyPop {
    0%   { transform: scale(1); }
    50%  { transform: scale(1.18); }
    100% { transform: scale(1); }
  }
  @keyframes shimmerChoice {
    0%   { background-position: -300% center; }
    100% { background-position:  300% center; }
  }
  @keyframes spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
@keyframes fadeIn {
from { opacity: 0; }
to   { opacity: 1; }
}
@keyframes pulse {
0%, 100% { transform: scale(1); box-shadow: 0 4px 20px rgba(124,58,237,0.5); }
50% { transform: scale(1.05); box-shadow: 0 6px 28px rgba(168,85,247,0.7); }
}
@keyframes pulseGlow {
    0%, 100% { box-shadow: 0 0 0 0 rgba(232,168,124,0.3); }
    50%      { box-shadow: 0 0 0 6px rgba(232,168,124,0); }
  }
  @keyframes introCursorBlink {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0; }
  }
  @keyframes introFadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes introFadeOut {
    from { opacity: 1; }
    to   { opacity: 0; }
  }
  @keyframes introSubFadeIn {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes introLineDraw {
    from { width: 0; }
    to   { width: 100%; }
  }
  @keyframes storyFadeIn {
    from { opacity: 0; transform: translateY(30px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes bgImageFadeIn {
    from { opacity: 0; transform: scale(1.05); }
    to   { opacity: 1; transform: scale(1); }
  }
`;

// ─── Prose Block ───────────────────────────────────────────────────────────────

const ProseBlock = ({ paragraphs, delay = 0, visibleIndices }) => {
  // 确保从空开始逐步显示：如果没有指定 visibleIndices，显示所有；否则只显示指定的
  const hasStaggerEffect = visibleIndices !== undefined;
  
  return (
    <div
      style={{
        // 只有非逐步显示时才使用入场动画
        animation: hasStaggerEffect ? "none" : `proseReveal 0.6s ease ${delay}s both`,
        padding: "0 24px",
        marginBottom: "8px",
      }}
    >
      {paragraphs.map((p, i) => {
        // 逐步显示模式：检查当前段落索引是否在可见列表中
        const isVisible = !hasStaggerEffect || visibleIndices.includes(i);
        // 计算延迟：每个段落之间间隔 0.8s
        const paragraphDelay = hasStaggerEffect ? visibleIndices.indexOf(i) * 0.8 : 0;
        
        return (
          <p
            key={i}
            className="font-sans"
            style={{
              color: "rgba(212,201,190,0.7)",
              fontSize: "14px",
              lineHeight: "1.9",
              marginBottom: i < paragraphs.length - 1 ? "16px" : "0",
              letterSpacing: "0.01em",
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? "translateY(0)" : "translateY(20px)",
              transition: hasStaggerEffect 
                ? `opacity 0.5s ease ${paragraphDelay}s, transform 0.5s ease ${paragraphDelay}s`
                : "opacity 0.6s ease, transform 0.6s ease",
              // 隐藏时不可交互，不占用布局空间
              display: isVisible ? "block" : "none",
            }}
          >
            {p}
          </p>
        );
      })}
    </div>
  );
};

// ─── Dialogue Line ─────────────────────────────────────────────────────────────

const DialogueLine = ({ text, charName, delay = 0 }) => (
  <div
    style={{
      animation: `dialogueIn 0.5s ease ${delay}s both`,
      padding: "0 24px",
      marginBottom: "8px",
    }}
  >
    <p
      className="font-serif"
      style={{
        color: "#E8A87C",
        fontSize: "16px",
        lineHeight: "1.8",
        fontStyle: "italic",
        letterSpacing: "0.01em",
      }}
    >
      {text}
    </p>
    <p
      className="font-sans"
      style={{
        color: "rgba(232,168,124,0.45)",
        fontSize: "11px",
        marginTop: "4px",
        letterSpacing: "0.06em",
        textTransform: "uppercase",
      }}
    >
      — {charName}
    </p>
  </div>
);

// ─── Shared Custom Input Component ─────────────────────────────────────────────

const CustomInputBox = ({ customText, onCustomChange, onCustomSend, disabled, inputHint, variant = "default" }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: variant === "chat" ? "10px" : "8px",
      padding: variant === "chat" ? "12px 16px" : "11px 14px",
      borderRadius: "14px",
      background: variant === "chat" ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.03)",
      border: variant === "chat" ? "1px solid rgba(232,168,124,0.18)" : "1px solid rgba(232,168,124,0.12)",
    }}
  >
    <input
      type="text"
      value={customText}
      onChange={(e) => onCustomChange(e.target.value)}
      onKeyDown={(e) => e.key === "Enter" && customText.trim() && onCustomSend()}
      placeholder={inputHint || (variant === "chat" ? "输入你想说的话…" : "输入你想做或说的…")}
      disabled={disabled}
      className="flex-1 bg-transparent outline-none font-sans"
      style={{
        color: variant === "chat" ? "#F5F0EB" : "rgba(245,240,235,0.6)",
        fontSize: variant === "chat" ? "14px" : "13px",
        caretColor: "#E8A87C",
      }}
    />
    <button
      onClick={onCustomSend}
      disabled={disabled || !customText.trim()}
      style={{
        width: variant === "chat" ? "36px" : "30px",
        height: variant === "chat" ? "36px" : "30px",
        borderRadius: "50%",
        background: customText.trim()
          ? "linear-gradient(135deg, #E8A87C, #C8906A)"
          : "rgba(255,255,255,0.06)",
        border: customText.trim() ? "none" : "1px solid rgba(255,255,255,0.1)",
        cursor: customText.trim() && !disabled ? "pointer" : "not-allowed",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        transition: "all 0.2s ease",
        opacity: disabled ? 0.4 : 1,
      }}
    >
      {variant === "chat" ? (
        <Send size={14} style={{ color: customText.trim() ? "#1A0E08" : "rgba(245,240,235,0.3)" }} />
      ) : (
        <ChevronRight size={14} style={{ color: customText.trim() ? "#1A0E08" : "rgba(245,240,235,0.3)" }} />
      )}
    </button>
  </div>
);

// ─── Choice Panel (Story Mode - with choices + input) ──────────────────────────

const ChoicePanel = ({ choices, onSelect, disabled, customText, onCustomChange, onCustomSend, inputHint }) => (
  <div
    style={{
      padding: "24px 20px 8px",
      animation: "choiceIn 0.5s ease both",
    }}
  >
    {/* Section label */}
    <div className="flex items-center gap-2 mb-4">
      <div style={{ flex: 1, height: "1px", background: "rgba(232,168,124,0.15)" }} />
      <span
        className="font-sans"
        style={{
          color: "#E8A87C",
          fontSize: "11px",
          fontWeight: "700",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
        }}
      >
        选择分支
      </span>
      <div style={{ flex: 1, height: "1px", background: "rgba(232,168,124,0.15)" }} />
    </div>

    {/* Choice buttons */}
    <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
      {choices.map((choice, i) => (
        <button
          key={choice.label}
          disabled={disabled}
          onClick={() => onSelect(choice)}
          style={{
            width: "100%",
            padding: "14px 16px",
            borderRadius: "14px",
            textAlign: "left",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(232,168,124,0.18)",
            cursor: disabled ? "not-allowed" : "pointer",
            opacity: disabled ? 0.5 : 1,
            transition: "all 0.2s ease",
            animation: `choiceIn 0.4s ease ${i * 0.08}s both`,
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <Sparkles
            size={13}
            style={{ color: "rgba(232,168,124,0.6)", flexShrink: 0 }}
          />
          <span
            className="font-sans"
            style={{
              color: "#E8D5C0",
              fontSize: "14px",
              lineHeight: "1.5",
            }}
          >
            {choice.label}
          </span>
        </button>
      ))}
    </div>

    {/* Divider with "or" label */}
    <div className="flex items-center gap-3 mb-3">
      <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.07)" }} />
      <span
        className="font-sans"
        style={{
          color: "rgba(245,240,235,0.3)",
          fontSize: "11px",
          letterSpacing: "0.06em",
          whiteSpace: "nowrap",
        }}
      >
        或者，写下你想做的事…
      </span>
      <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.07)" }} />
    </div>

    {/* Custom input */}
    <CustomInputBox
      customText={customText}
      onCustomChange={onCustomChange}
      onCustomSend={onCustomSend}
      disabled={disabled}
      inputHint={inputHint}
      variant="default"
    />
  </div>
);

// ─── Chat Input Panel (for Chat Mode) ──────────────────────────────────────────

const ChatInputPanel = ({ customText, onCustomChange, onCustomSend, disabled, inputHint }) => (
  <div style={{ animation: "fadeIn 0.4s ease both" }}>
    <CustomInputBox
      customText={customText}
      onCustomChange={onCustomChange}
      onCustomSend={onCustomSend}
      disabled={disabled}
      inputHint={inputHint}
      variant="chat"
    />
  </div>
);

// ─── Chat Bubbles (for Chat Mode) ──────────────────────────────────────────────

// 用户消息气泡（右侧）
const UserChatBubble = ({ text }) => (
  <div
    style={{
      padding: "8px 16px",
      animation: "fadeIn 0.3s ease both",
      display: "flex",
      justifyContent: "flex-end",
    }}
  >
    <div
      style={{
        maxWidth: "75%",
        padding: "12px 16px",
        borderRadius: "18px 18px 4px 18px",
        background: "linear-gradient(135deg, #E8A87C, #C8906A)",
        color: "#1A0E08",
        fontSize: "14px",
        lineHeight: "1.5",
        wordBreak: "break-word",
      }}
    >
      {text}
    </div>
  </div>
);

// 解析对话文本，分离动作描写（括号内）和台词
const parseDialogueText = (text) => {
  if (!text) return [];
  
  const segments = [];
  // 匹配（动作描写）或普通对话
  const regex = /(（[^）]+）)|([^（）]+)/g;
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    if (match[1]) {
      // 括号内的动作描写
      segments.push({ type: "action", content: match[1] });
    } else if (match[2]) {
      // 普通对话
      const content = match[2].trim();
      if (content) {
        segments.push({ type: "dialogue", content });
      }
    }
  }
  
  return segments;
};

// 角色消息气泡（左侧）- 支持动作描写（括号内）浅色显示
const CharacterChatBubble = ({ text, charName, avatar }) => {
  const segments = parseDialogueText(text);
  
  return (
    <div
      style={{
        padding: "8px 16px",
        animation: "fadeIn 0.3s ease both",
        display: "flex",
        justifyContent: "flex-start",
        gap: "10px",
      }}
    >
      {/* 头像 */}
      <div
        style={{
          width: "36px",
          height: "36px",
          borderRadius: "50%",
          background: "rgba(232,168,124,0.15)",
          border: "1px solid rgba(232,168,124,0.3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          fontSize: "12px",
          color: "#E8A87C",
          overflow: "hidden",
        }}
      >
        {avatar ? (
          <img src={avatar} alt={charName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          charName?.charAt(0)
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "4px", maxWidth: "75%" }}>
        <span
          style={{
            fontSize: "11px",
            color: "rgba(245,240,235,0.5)",
            marginLeft: "4px",
          }}
        >
          {charName}
        </span>
        <div
          style={{
            padding: "12px 16px",
            borderRadius: "18px 18px 18px 4px",
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.1)",
            fontSize: "14px",
            lineHeight: "1.6",
            wordBreak: "break-word",
          }}
        >
          {segments.map((seg, i) => (
            <span
              key={i}
              style={{
                color: seg.type === "action" 
                  ? "rgba(212,201,190,0.55)" // 动作描写：浅色
                  : "#F5F0EB", // 对话：正常颜色
                fontStyle: seg.type === "action" ? "italic" : "normal",
              }}
            >
              {seg.content}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── Selected Choice Echo (普通模式使用) ───────────────────────────────────────

const ChoiceEcho = ({ text }) => (
  <div
    style={{
      padding: "10px 24px",
      animation: "fadeIn 0.4s ease both",
    }}
  >
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "8px 14px",
        borderRadius: "20px",
        background: "rgba(232,168,124,0.1)",
        border: "1px solid rgba(232,168,124,0.25)",
      }}
    >
      <Sparkles size={11} style={{ color: "#E8A87C" }} />
      <span
        className="font-sans"
        style={{ color: "#E8A87C", fontSize: "13px", fontStyle: "italic" }}
      >
        {text}
      </span>
    </div>
  </div>
);

// ─── Intimacy Toast ────────────────────────────────────────────────────────────

const IntimacyToast = ({ gain }) => (
  <div
    style={{
      position: "fixed",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      zIndex: 999,
      padding: "10px 20px",
      borderRadius: "20px",
      background: "rgba(22,10,32,0.95)",
      border: "1px solid rgba(232,168,124,0.4)",
      boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
      display: "flex",
      alignItems: "center",
      gap: "8px",
      animation: "proseReveal 0.3s ease both",
      pointerEvents: "none",
    }}
  >
    <Heart size={14} fill="#E8A87C" style={{ color: "#E8A87C" }} />
    <span className="font-sans" style={{ color: "#E8A87C", fontSize: "13px", fontWeight: "600" }}>
      +{gain} 亲密度
    </span>
  </div>
);

// ─── Level Unlock Animation ────────────────────────────────────────────────────

const LevelUnlockAnimation = ({ level, onComplete }) => {
  const [showSparkles, setShowSparkles] = useState(false);
  
  useEffect(() => {
    // 1.5秒后触发完成回调
    const timer = setTimeout(() => {
      onComplete();
    }, 2500);
    
    // 0.3秒后显示闪光效果
    const sparkleTimer = setTimeout(() => {
      setShowSparkles(true);
    }, 300);
    
    return () => {
      clearTimeout(timer);
      clearTimeout(sparkleTimer);
    };
  }, [onComplete]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.92)",
        backdropFilter: "blur(12px)",
        animation: "fadeIn 0.4s ease",
      }}
    >
      <style>{`
        @keyframes levelPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.9; }
        }
        @keyframes sparkle {
          0%, 100% { opacity: 0; transform: scale(0) rotate(0deg); }
          50% { opacity: 1; transform: scale(1) rotate(180deg); }
        }
        @keyframes floatUp {
          0% { transform: translateY(0); opacity: 1; }
          100% { transform: translateY(-30px); opacity: 0; }
        }
      `}</style>

      {/* 闪光效果 */}
      {showSparkles && (
        <>
          {[...Array(8)].map((_, i) => (
            <Sparkles
              key={i}
              size={20}
              style={{
                position: "absolute",
                color: "#E8A87C",
                opacity: 0,
                animation: `sparkle 0.8s ease ${i * 0.1}s`,
                left: `${50 + 35 * Math.cos((i * Math.PI) / 4)}%`,
                top: `${50 + 35 * Math.sin((i * Math.PI) / 4)}%`,
              }}
            />
          ))}
        </>
      )}

      {/* 主内容 */}
      <div
        style={{
          textAlign: "center",
          animation: "levelPulse 1s ease-in-out",
        }}
      >
        {/* 等级图标 */}
        <div
          style={{
            width: "100px",
            height: "100px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #E8A87C 0%, #C2185B 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px",
            boxShadow: "0 0 60px rgba(232,168,124,0.5), 0 0 100px rgba(194,24,89,0.3)",
            position: "relative",
          }}
        >
          <Heart size={48} fill="#fff" style={{ color: "#fff" }} />
        </div>

        {/* 解锁提示 */}
        <p
          className="font-sans mb-2"
          style={{
            color: "rgba(245,240,235,0.6)",
            fontSize: "14px",
            letterSpacing: "0.1em",
          }}
        >
          亲密度等级提升
        </p>

        {/* 等级数字 */}
        <h2
          className="font-sans"
          style={{
            color: "#E8A87C",
            fontSize: "48px",
            fontWeight: "700",
            marginBottom: "8px",
            textShadow: "0 0 30px rgba(232,168,124,0.5)",
          }}
        >
          Lv.{level}
        </h2>

        {/* 解锁内容提示 */}
        <p
          className="font-sans"
          style={{
            color: "rgba(245,240,235,0.8)",
            fontSize: "16px",
          }}
        >
          解锁专属心动剧情
        </p>
      </div>
    </div>
  );
};

// ─── POV Unlock Modal ──────────────────────────────────────────────────────────

const UnlockModal = ({ onClose, onEnter }) => (
  <div
    style={{
      position: "fixed",
      inset: 0,
      zIndex: 1000,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "rgba(0,0,0,0.85)",
      backdropFilter: "blur(8px)",
      animation: "fadeIn 0.3s ease both",
    }}
    onClick={onClose}
  >
    <div
      style={{
        width: "90%",
        maxWidth: "400px",
        padding: "28px 24px",
        borderRadius: "20px",
        background: "linear-gradient(145deg, rgba(22,12,30,0.98), rgba(15,8,22,0.98))",
        border: "1px solid rgba(232,168,124,0.3)",
        boxShadow: "0 20px 60px rgba(0,0,0,0.6), 0 0 40px rgba(232,168,124,0.1)",
        animation: "proseReveal 0.4s ease 0.1s both",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* 右上角关闭 */}
      <button
        onClick={onClose}
        style={{
          position: "absolute",
          top: "14px",
          right: "14px",
          width: "28px",
          height: "28px",
          borderRadius: "50%",
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.12)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "rgba(255,255,255,0.45)",
          fontSize: "14px",
          lineHeight: 1,
        }}
      >
        ✕
      </button>

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "24px" }}>
        <div
          style={{
            width: "60px",
            height: "60px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #E8A87C, #C8906A)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 14px",
            boxShadow: "0 8px 24px rgba(232,168,124,0.3)",
          }}
        >
          <Heart size={28} fill="#1A0E08" style={{ color: "#1A0E08" }} />
        </div>

        {/* 主标题 */}
        <h3
          className="font-serif"
          style={{
            color: "#E8A87C",
            fontSize: "18px",
            fontWeight: "600",
            marginBottom: "8px",
          }}
        >
          解锁心动 POV
        </h3>

        {/* 小剧场副标题 */}
        <p
          className="font-serif"
          style={{
            color: "rgba(245,235,220,0.88)",
            fontSize: "15px",
            fontWeight: "500",
            marginBottom: "6px",
            letterSpacing: "0.04em",
          }}
        >
          《停电夜的越界》
        </p>

        {/* 亲密度说明 */}
        <p
          className="font-sans"
          style={{
            color: "rgba(245,240,235,0.45)",
            fontSize: "12px",
            marginBottom: "0",
          }}
        >
          亲密度达到 3 级 · 开启专属剧情
        </p>
      </div>

      {/* 描述文字 */}
      <div
        style={{
          background: "rgba(232,168,124,0.06)",
          border: "1px solid rgba(232,168,124,0.15)",
          borderRadius: "12px",
          padding: "14px 16px",
          marginBottom: "24px",
          textAlign: "center",
        }}
      >
        <p
          className="font-serif"
          style={{
            color: "rgba(245,235,220,0.75)",
            fontSize: "14px",
            lineHeight: "1.7",
            margin: 0,
          }}
        >
          深夜停电，你们独处宿舍…
          <br />
          选择你的故事走向
        </p>
      </div>

      {/* 进入小剧场按钮 */}
      <div style={{ display: "flex", justifyContent: "center" }}>
        <button
          onClick={onEnter}
          style={{
            width: "100%",
            padding: "14px 32px",
            borderRadius: "14px",
            background: "linear-gradient(135deg, #E8A87C 0%, #9B59B6 100%)",
            border: "none",
            color: "#fff",
            fontSize: "15px",
            fontWeight: "600",
            cursor: "pointer",
            letterSpacing: "0.04em",
            boxShadow: "0 6px 20px rgba(155,89,182,0.4)",
            transition: "opacity 0.2s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
        >
          进入小剧场 →
        </button>
      </div>
    </div>
  </div>
);

// ─── Scene Divider ─────────────────────────────────────────────────────────────

const SceneDivider = () => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: "12px",
      padding: "8px 24px",
      animation: "fadeIn 0.5s ease both",
    }}
  >
    <div style={{ flex: 1, height: "1px", background: "linear-gradient(90deg, transparent, rgba(232,168,124,0.2))" }} />
    <div
      style={{
        width: "6px",
        height: "6px",
        borderRadius: "50%",
        background: "rgba(232,168,124,0.4)",
      }}
    />
    <div style={{ flex: 1, height: "1px", background: "linear-gradient(90deg, rgba(232,168,124,0.2), transparent)" }} />
  </div>
);

// ─── Main Chat Page ────────────────────────────────────────────────────────────

const Chat = () => {
  const navigate = useNavigate();
  const { dramaId, charId: rawCharId } = useParams();
  const charId = CHARACTERS[rawCharId] ? rawCharId : "1";
  const char = CHARACTERS[charId];
  const scenes = STORY_SCENES[charId] || STORY_SCENES["1"];

  // Build scene map for quick lookup
  const sceneMap = {};
  scenes.forEach((s) => { sceneMap[s.id] = s; });

  // ── Episode progress from localStorage ──
  const [episodeProgress] = useState(() => {
    try { return Number(localStorage.getItem("xindongjinqu_progress")) || 1; }
    catch { return 1; }
  });

  // ── 聊天存档 key（按角色隔离）──
  const chatSaveKey = `chat_save_${dramaId}_${charId}`;

  // ── 从 localStorage 恢复存档的工具函数 ──
  const loadSave = (field, fallback) => {
    try {
      const raw = localStorage.getItem(chatSaveKey);
      if (!raw) return fallback;
      const save = JSON.parse(raw);
      return save[field] !== undefined ? save[field] : fallback;
    } catch { return fallback; }
  };

  const [currentSceneId, setCurrentSceneId] = useState(() => loadSave("currentSceneId", "s1"));
  const [history, setHistory] = useState(() => loadSave("history", []));
  const [choicesDisabled, setChoicesDisabled] = useState(false);
  const [customText, setCustomText] = useState("");
  const [intimacy, setIntimacy] = useState(() => loadSave("intimacy", char.intimacy));
  const [intimacyAnim, setIntimacyAnim] = useState(false);
  const [intimacyGain, setIntimacyGain] = useState(0);
  const [showIntimacyToast, setShowIntimacyToast] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const [visibleParagraphs, setVisibleParagraphs] = useState([]); // 逐步显示的段落索引
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true); // 控制是否自动滚动
  const newContentRef = useRef(null); // 新内容的引用
  const [isChatMode, setIsChatMode] = useState(() => loadSave("isChatMode", false)); // 对话模式/剧情模式切换
  const [chatRound, setChatRound] = useState(() => loadSave("chatRound", 0)); // 对话模式下的聊天轮数
  const [showUnlockModal, setShowUnlockModal] = useState(false); // 解锁POV弹窗
  const [povUnlocked, setPovUnlocked] = useState(() => loadSave("povUnlocked", false)); // 是否已解锁POV
  const [showLevelUnlockAnimation, setShowLevelUnlockAnimation] = useState(false); // 等级解锁动画
  const [showExclusiveDrawer, setShowExclusiveDrawer] = useState(false); // 专属剧情抽屉
  const [visualMetas, setVisualMetas] = useState(() => loadSave("visualMetas", [])); // 每轮 AI 回复的视觉元数据
  const [activeBranch, setActiveBranch] = useState(() => loadSave("activeBranch", null)); // 当前激活的写死支线 id

  const scrollRef = useRef(null);
  const bottomRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }, []);

  // 滚动到新内容开始位置
  const scrollToNewContent = useCallback(() => {
    setTimeout(() => {
      newContentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }, []);

  // ── 自动持久化聊天状态到 localStorage ──────────────────────────────────────────
  useEffect(() => {
    try {
      const save = {
        history,
        currentSceneId,
        intimacy,
        isChatMode,
        chatRound,
        povUnlocked,
        visualMetas,
        activeBranch,
      };
      localStorage.setItem(chatSaveKey, JSON.stringify(save));
    } catch { /* 忽略 quota exceeded 等错误 */ }
  }, [history, currentSceneId, intimacy, isChatMode, chatRound, povUnlocked, visualMetas, activeBranch, chatSaveKey]);

  // Initialize: render opening scene based on episode progress (with staggered text reveal)
  useEffect(() => {
    // 获取当前集数的开场场景，如果不存在则使用第1集
    // ── 有存档则直接恢复，跳过开场初始化 ──
    try {
      const raw = localStorage.getItem(chatSaveKey);
      if (raw) {
        const save = JSON.parse(raw);
        if (save.history && save.history.length > 0) {
          // 存档已在 useState 初始化时恢复，这里只需显示全部段落
          setVisibleParagraphs(Array.from({ length: 20 }, (_, i) => i));
          return;
        }
      }
    } catch { /* 无存档，继续初始化 */ }

    const opening = EPISODE_OPENINGS[episodeProgress] || EPISODE_OPENINGS[1];
    const proseParagraphs = opening.prose;
    // proseAfterDialogue：对话后的补充旁白（第一集专用）
    const proseAfterDialogue = opening.proseAfterDialogue || [];
    // 总段落数 = 前置旁白 + 对话后旁白（对话本身不算段落索引）
    const totalParagraphs = proseParagraphs.length + proseAfterDialogue.length;
    
    const openingScene = {
      id: "opening_s1",
      prose: proseParagraphs,
      proseAfterDialogue,
      dialogue: opening.dialogue,
      choices: opening.choices,
      inputHint: opening.inputHint,
    };
    
    setHistory([{ type: "scene", scene: openingScene, key: "init_s1" }]);
    
    // 逐步显示段落（前置旁白 + 对话后旁白合并计数）
    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex < totalParagraphs) {
        setVisibleParagraphs((prev) => [...prev, currentIndex]);
        currentIndex++;
      } else {
        clearInterval(interval);
      }
    }, 800); // 每 800ms 显示一段
    
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 自动滚动控制：只在初始化时滚动到底部，用户操作后不自动滚动
  useEffect(() => {
    if (shouldAutoScroll) {
      scrollToBottom();
    }
  }, [shouldAutoScroll, scrollToBottom]);

  // Trigger intimacy animation
  const triggerIntimacy = useCallback((gain) => {
    setIntimacy((v) => Math.min(v + gain, char.intimacyMax));
    setIntimacyGain(gain);
    setIntimacyAnim(true);
    setShowIntimacyToast(true);
    setTimeout(() => {
      setIntimacyAnim(false);
      setShowIntimacyToast(false);
    }, 1800);
  }, [char.intimacyMax]);

  // ── 公共 AI 生成函数（选项和自由输入都走这里）──
  const generateScene = useCallback(async (text, isRetry = false) => {
    setChoicesDisabled(true);
    setIsGenerating(true);

    // 获取当前场景，如果 currentSceneId 为 null，使用兜底场景
    const currentScene = currentSceneId && sceneMap[currentSceneId] 
      ? sceneMap[currentSceneId] 
      : { prose: ["你们正在宿舍中..."], dialogue: "" };
    const epSummary = EPISODE_SUMMARIES[episodeProgress] || EPISODE_SUMMARIES[1];

    // 构建支线背景上下文
    let branchContext = "";
    if (activeBranch && sceneMap[activeBranch]) {
      const branchScene = sceneMap[activeBranch];
      const parts = [];
      if (branchScene.prose && branchScene.prose.length > 0) {
        parts.push(branchScene.prose.join(" "));
      }
      if (branchScene.dialogue) {
        parts.push(`沈彦希说："${branchScene.dialogue}"`);
      }
      if (branchScene.proseAfterDialogue && branchScene.proseAfterDialogue.length > 0) {
        parts.push(branchScene.proseAfterDialogue.join(" "));
      }
      if (parts.length > 0) {
        branchContext = `\n## 刚刚发生的剧情（支线背景）\n${parts.join(" ")}\n`;
      }
    }
    
    // 根据模式生成不同的 prompt（使用统一的 prompt 构建器，强化格式约束减少幻觉）
    const systemPrompt = isChatMode
      ? buildChatModePrompt({
          epSummary,
          branchContext,
          currentSceneDialogue: currentScene?.dialogue || "你们正在对话中",
          userText: text,
          episodeProgress,
        })
      : buildStoryModePrompt({
          epSummary,
          branchContext,
          currentSceneProse: currentScene?.prose?.join(" ") || "",
          currentSceneDialogue: currentScene?.dialogue || "",
          userText: text,
          episodeProgress,
        });

    try {
      setStreamingText("");
      const { data, error } = await supabase.functions.invoke("nocode-friday-ai", {
        body: {
          content: systemPrompt,
          _onChunk: (fullText) => {
            // streaming 时只提取纯叙事文本（过滤标记、选项、元数据）
            const cleaned = fullText
              .replace(/<<<VISUAL_META>>>[\s\S]*?<<<END_VISUAL_META>>>/g, "")
              .replace(/^\s*\[[A-Z]\].*$/gm, "")  // 去掉 [A] [B] 选项行
              .replace(/^\s*【.*$/gm, "")  // 去掉 【提示】行
              .replace(/^\s*>>>.*$/gm, "")  // 去掉 >>> 标记行
              .replace(/^\s*---+\s*$/gm, "")  // 去掉分隔线
              .replace(/^\s*###.*$/gm, "")  // 去掉 markdown 标题
              .trim();
            setStreamingText(cleaned);
          },
        },
      });

      // 如果出错且不是重试，则重试一次
      if ((error || !data?.content) && !isRetry) {
        console.log("AI请求失败，正在重试...");
        setStreamingText("");
        return generateScene(text, true);
      }

      setIsGenerating(false);
      setStreamingText("");

      let proseArr = isChatMode ? [] : ["故事继续..."];
      let dialogueLine = null;
      let parsedChoices = null;
      let inputHint = null;

      if (!error && data?.content) {
        // ═══ 使用解析 pipeline 替代原有的内联解析逻辑 ═══
        // Step 1: 预处理（清理 markdown/HTML/说明文字等噪音）
        let raw = preprocessAIOutput(data.content);

        // Step 2: 乱码检测 —— 发现异常输出时丢弃并重试
        const garbleCheck = detectGarbledText(raw);
        if (garbleCheck.isGarbled && !isRetry) {
          console.warn("AI输出乱码检测触发:", garbleCheck.reasons);
          return generateScene(text, true);
        }

        // Step 3: 提取 VISUAL_META 并从文本中移除
        // 同时支持新的 <<<>>> 分隔符和旧的 【】/[] 格式
        const { meta, cleanedText } = extractVisualMeta(raw);
        if (meta) {
          setVisualMetas((prev) => [...prev, meta]);
        }
        raw = cleanedText;

        // extractVisualMeta 内部已处理所有格式（=== 【】 []）并调用 stripAllMarkers 终极清理
        // 如果 extractVisualMeta 没有匹配到 meta，这里再做一次 === 格式匹配作为兜底
        if (!meta) {
          const newMetaMatch = raw.match(/===VISUAL_META===([\s\S]*?)===\/VISUAL_META===/i);
          if (newMetaMatch) {
            const metaText = newMetaMatch[1].trim();
            const parseMetaField = (key) => {
              const m = metaText.match(new RegExp(`${key}[：:]\\s*(.+)`));
              return m ? m[1].trim() : "";
            };
            const newMeta = {
              scene_mood: parseMetaField("scene_mood"),
              location: parseMetaField("location"),
              lighting: parseMetaField("lighting"),
              key_action: parseMetaField("key_action"),
              emotion_tag: parseMetaField("emotion_tag"),
              round: Date.now(),
            };
            setVisualMetas((prev) => [...prev, newMeta]);
            raw = raw.replace(/===VISUAL_META===[\s\S]*?===\/VISUAL_META===/gi, "").trim();
          }
        }

        // Step 5: 根据模式分别解析
        if (!isChatMode) {
          const storyResult = parseStoryMode(raw);
          proseArr = storyResult.prose.length > 0
            ? storyResult.prose
            : (storyResult.dialogue ? ["你们继续交谈着..."] : ["故事继续..."]);
          dialogueLine = storyResult.dialogue || "嗯……";

          if (storyResult.choices.length > 0) {
            parsedChoices = storyResult.choices.map((label) => ({
              label,
              next: currentSceneId,
              intimacyGain: 6,
            }));
          }
          inputHint = storyResult.inputHint;
        } else {
          const chatResult = parseChatMode(raw);
          dialogueLine = chatResult.dialogue;
          proseArr = [];
        }
      }

      // 根据模式构建不同的场景对象
      const aiScene = isChatMode
        ? {
            id: `ai_${Date.now()}`,
            prose: proseArr, // 对话模式下也有简短场景描写
            dialogue: dialogueLine || "……",
            choices: [], // 对话模式下没有预设选项
            inputHint: "你想对沈彦希说什么？",
            isCustom: true,
            isChatMode: true, // 标记为对话模式
          }
        : {
            id: `ai_${Date.now()}`,
            prose: proseArr,
            dialogue: dialogueLine,
            choices: parsedChoices?.length > 0
              ? parsedChoices
              : [{ label: "继续故事...", next: currentSceneId, intimacyGain: 5 }],
            inputHint: inputHint || "你想做什么或者说什么？",
            isCustom: true,
          };

      triggerIntimacy(isChatMode ? 3 : 6); // 对话模式亲密度增加较少
      setHistory((prev) => [
        ...prev,
        { type: "divider", key: `div_${Date.now()}` },
        { type: "scene", scene: aiScene, key: `ai_scene_${Date.now()}` },
      ]);
      setChoicesDisabled(false);
      // 新内容生成后，滚动到新内容的开始位置（divider 位置）
      scrollToNewContent();
      
      // 增加轮数并检查解锁条件（剧情推动和对话推动都触发）
      setChatRound((prev) => {
        const newRound = prev + 1;
        // 检查解锁条件：轮数>=3 且 未解锁过（demo 版本去掉亲密度限制）
        if (newRound >= 3 && !povUnlocked) {
          setPovUnlocked(true);
          // 先显示等级解锁动画，2.5秒后显示POV视频
          setShowLevelUnlockAnimation(true);
        }
        return newRound;
      });
    } catch (err) {
      setIsGenerating(false);
      setChoicesDisabled(false);
      
      // 如果是重试后仍失败，显示友好错误提示
      if (isRetry) {
        setHistory((prev) => [
          ...prev,
          { type: "divider", key: `div_${Date.now()}` },
          { 
            type: "scene", 
            scene: {
              id: `error_${Date.now()}`,
              prose: [],
              dialogue: "「连接好像出了点问题...请稍后再试」",
              choices: [{ label: "重新尝试", next: currentSceneId, intimacyGain: 0 }],
              inputHint: "点击重新尝试继续故事",
              isCustom: true,
            }, 
            key: `error_scene_${Date.now()}` 
          },
        ]);
      }
    }
  }, [currentSceneId, sceneMap, episodeProgress, triggerIntimacy, scrollToNewContent, isChatMode, povUnlocked, setHistory]);

  // 写死场景跳转（isFixed 选项专用）
  const handleFixedScene = useCallback((choice) => {
    const targetScene = sceneMap[choice.next];
    if (!targetScene) return;
    setShouldAutoScroll(false);
    triggerIntimacy(choice.intimacyGain || 6);
    setHistory((prev) => [
      ...prev,
      { type: "choice_echo", text: choice.label, key: `echo_${Date.now()}`, isChatMode: false },
      { type: "divider", key: `div_${Date.now()}` },
      // choices 清空，避免写死场景的选项重复显示
      { type: "scene", scene: { ...targetScene, choices: [] }, key: `fixed_${choice.next}_${Date.now()}` },
    ]);
    setCurrentSceneId(choice.next);
    setActiveBranch(choice.next);
    scrollToNewContent();
    // 800ms 后自动触发 AI 续写
    setTimeout(() => {
      generateScene(choice.label);
    }, 800);
  }, [sceneMap, triggerIntimacy, scrollToNewContent, generateScene]);

  // 选项点击 → AI 生成 或 写死场景
  const handleChoiceSelect = useCallback((choice) => {
    if (choicesDisabled) return;
    trackABClick("B", "click_choice", { label: choice.label });
    // isFixed 选项：走写死场景
    if (choice.isFixed) {
      handleFixedScene(choice);
      return;
    }
    // 用户点击选项后，禁用自动滚动到底部
    setShouldAutoScroll(false);
      setHistory((prev) => [
        ...prev,
        { type: "choice_echo", text: choice.label, key: `echo_${Date.now()}`, isChatMode },
      ]);
      generateScene(choice.label);
    }, [choicesDisabled, generateScene, isChatMode, handleFixedScene]);

  // 自由输入 → AI 生成
  const handleCustomSend = useCallback(() => {
    const text = customText.trim();
    if (!text || choicesDisabled) return;
    trackABClick("B", "click_send_message", { text_length: text.length });
    // 用户发送消息后，禁用自动滚动到底部
    setShouldAutoScroll(false);
    setCustomText("");
      setHistory((prev) => [
        ...prev,
        { type: "choice_echo", text, key: `echo_${Date.now()}`, isChatMode },
      ]);
      generateScene(text);
    }, [customText, choicesDisabled, generateScene, isChatMode]);

  const progressPercent = (intimacy / char.intimacyMax) * 100;

  // 计算用户发送的消息数量（choice_echo 类型即为用户消息）
  const userMessageCount = history.filter(b => b.type === "choice_echo").length;
  const showVideoBtn = userMessageCount >= 1;

  // 点击「生成视频」按钮
  const handleGenerateVideo = useCallback(() => {
    const ep = episodeProgress || 1;
    localStorage.setItem("creative-messages", JSON.stringify(history));
    localStorage.setItem("creative-visual-metas", JSON.stringify(visualMetas));
    navigate(`/video-create/${dramaId}/${ep}`);
  }, [history, visualMetas, dramaId, episodeProgress, navigate]);

  return (

    <div
      className="flex flex-col"
      style={{
        background: "#0D0D0D",
        maxWidth: "480px",
        margin: "0 auto",
        height: "100vh",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <style>{STYLES}</style>

      {/* Ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(155,89,182,0.06) 0%, transparent 60%)",
          zIndex: 0,
        }}
      />

      {/* ── MINIMAL HEADER ── */}
      <div
        className="absolute top-0 left-0 right-0 z-30"
        style={{
          background: "linear-gradient(to bottom, rgba(13,13,13,0.8) 0%, rgba(13,13,13,0.4) 50%, transparent 100%)",
          paddingTop: "max(12px, env(safe-area-inset-top, 12px))",
          paddingBottom: "20px",
        }}
      >
        <div
          className="flex items-center gap-3 px-4 py-2"
          onDoubleClick={() => {
            if (confirm("确定要清空对话重新开始吗？")) {
              localStorage.clear();
              location.reload();
            }
          }}
        >
          {/* Back */}
          <button
            onClick={() => navigate("/")}
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(232,168,124,0.15)",
            }}
          >
            <ArrowLeft size={16} style={{ color: "#F5F0EB" }} />
          </button>

          {/* Name only */}
          <span
            className="font-serif flex-1"
            style={{ color: "#F5F0EB", fontSize: "16px", fontWeight: "600" }}
          >
            {char.name}
          </span>

          {/* Mode Toggle */}
          <button
            onClick={() => setIsChatMode(!isChatMode)}
            className="text-xs px-3 py-1.5 rounded-full transition-colors mr-2"
            style={{
              background: isChatMode 
                ? "rgba(244,114,182,0.8)" 
                : "rgba(255,255,255,0.1)",
              border: "1px solid rgba(232,168,124,0.2)",
              color: "#F5F0EB",
            }}
          >
            {isChatMode ? "对话推动" : "剧情推动"}
          </button>

          {/* 专属剧情入口 */}
          <button
            onClick={() => setShowExclusiveDrawer(true)}
            className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs"
            style={{
              background: povUnlocked
                ? "linear-gradient(135deg, rgba(232,168,124,0.25), rgba(155,89,182,0.25))"
                : "rgba(255,255,255,0.06)",
              border: povUnlocked
                ? "1px solid rgba(232,168,124,0.4)"
                : "1px solid rgba(255,255,255,0.1)",
              color: povUnlocked ? "#E8A87C" : "rgba(245,240,235,0.45)",
              fontFamily: "sans-serif",
              letterSpacing: "0.02em",
              position: "relative",
            }}
          >
            {povUnlocked && (
              <span style={{
                position: "absolute", top: "-3px", right: "-3px",
                width: "8px", height: "8px", borderRadius: "50%",
                background: "#E8A87C",
                boxShadow: "0 0 6px rgba(232,168,124,0.8)",
              }} />
            )}
            专属剧情
          </button>

          {/* Menu */}
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setShowMenu((v) => !v)}
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(232,168,124,0.15)",
              }}
            >
              <MoreVertical size={14} style={{ color: "rgba(245,240,235,0.7)" }} />
            </button>
            {showMenu && (
              <div
                className="absolute right-0 top-10 rounded-xl overflow-hidden z-50"
                style={{
                  background: "rgba(22,12,30,0.97)",
                  backdropFilter: "blur(16px)",
                  border: "1px solid rgba(232,168,124,0.15)",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
                  minWidth: "160px",
                }}
              >
                {["重新开始", "角色资料", "剧集信息", "举报"].map((item, i) => (
                  <button
                    key={item}
                    onClick={() => {
                      setShowMenu(false);
                      if (item === "重新开始") {
                        const ep = episodeProgress || 1;
                        const opening = EPISODE_OPENINGS[ep] || EPISODE_OPENINGS[1];
                        const proseAfterDialogue = opening.proseAfterDialogue || [];
                        const totalParagraphs = opening.prose.length + proseAfterDialogue.length;
        const openingScene = {
          id: "opening_s1",
          prose: opening.prose,
          proseAfterDialogue,
          dialogue: opening.dialogue,
          choices: opening.choices,
                          inputHint: opening.inputHint,
                        };
                        // 重置段落显示
                        setVisibleParagraphs([]);
                        setHistory([{ type: "scene", scene: openingScene, key: `restart_${Date.now()}` }]);
                        setCurrentSceneId("s1");
                        setChoicesDisabled(false);
                        setIsGenerating(false);
                        setCustomText("");
                        setIntimacy(char.intimacy);
                        try { localStorage.removeItem("xindongjinqu_chat_history"); } catch (e) {}
                        // 重新开始逐步显示
                        let currentIndex = 0;
                        const interval = setInterval(() => {
                          if (currentIndex < totalParagraphs) {
                            setVisibleParagraphs((prev) => [...prev, currentIndex]);
                            currentIndex++;
                          } else {
                            clearInterval(interval);
                          }
                        }, 800);
                      }
                    }}
                    className="w-full text-left px-4 py-3 font-sans transition-colors"
                    style={{
                      color: i === 3 ? "rgba(229,57,53,0.8)" : "rgba(245,240,235,0.75)",
                      fontSize: "13px",
                      borderBottom: i < 3 ? "1px solid rgba(255,255,255,0.05)" : "none",
                    }}
                  >
                    {item}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── CHARACTER BACKGROUND (1/3 screen) ── */}
      <div
        className="relative flex-shrink-0 overflow-hidden"
        style={{
          height: "33.333vh",
          animation: "bgImageFadeIn 1.2s ease both",
        }}
      >
        {/* Background Image - 显示人物头部 */}
        <img
          src={char.image}
          alt={char.name}
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            filter: "brightness(0.7) saturate(0.9)",
            objectPosition: "center 15%", // 显示图片上方15%位置，以头部为主
            maskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 60%, rgba(0,0,0,0) 100%)",
            WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 60%, rgba(0,0,0,0) 100%)",
          }}
        />
        {/* Gradient overlay for depth */}
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(to bottom, rgba(13,13,13,0.3) 0%, rgba(13,13,13,0.1) 50%, rgba(13,13,13,0.95) 100%)",
          }}
        />
        {/* Character name overlay */}
        <div
          className="absolute bottom-4 left-0 right-0 px-6"
          style={{
            animation: "storyFadeIn 0.8s ease 0.4s both",
          }}
        >
          <p
            className="font-serif"
            style={{
              color: "rgba(245,240,235,0.5)",
              fontSize: "12px",
              letterSpacing: "0.1em",
              marginBottom: "4px",
            }}
          >
            与你的故事
          </p>
          <h2
            className="font-serif"
            style={{
              color: "#F5F0EB",
              fontSize: "24px",
              fontWeight: "600",
              textShadow: "0 2px 20px rgba(0,0,0,0.5)",
            }}
          >
            {char.name}
          </h2>
        </div>
      </div>

      {/* ── STORY SCROLL AREA ── */}
      <div
        ref={scrollRef}
        className="relative z-10 flex-1 overflow-y-auto scrollbar-hide"
        style={{
          paddingTop: "20px",
          paddingBottom: "16px",
          animation: "storyFadeIn 0.8s ease 0.6s both",
        }}
        onClick={() => showMenu && setShowMenu(false)}
      >
        {history.map((block, index) => {
          if (block.type === "divider") {
            // 只在最新的 divider（即新内容的起始位置）添加 ref
            const isLatestDivider = block.key?.includes("div_") && 
              !history.slice(index + 1).some(b => b.type === "divider");
            return (
              <div 
                key={block.key} 
                ref={isLatestDivider ? newContentRef : null}
              >
                <SceneDivider />
              </div>
            );
          }

          if (block.type === "choice_echo") {
            // 根据当前切换后的模式决定显示样式（用户选择时的模式）
            const isChatModeEcho = block.isChatMode || false;
            return isChatModeEcho 
              ? <UserChatBubble key={block.key} text={block.text} />
              : <ChoiceEcho key={block.key} text={block.text} />;
          }

          if (block.type === "scene") {
            const { scene } = block;
            const isLast = block.key === history[history.length - 1]?.key;
            const isFirstScene = block.key?.includes("init_");
            // 每个场景保持自己生成时的模式样式，不随当前模式切换而改变
            const isChatModeScene = scene.isChatMode || (!scene.prose?.length && scene.dialogue && !scene.choices?.length);
            // 写死支线场景：显示完后直接接 AI 输入框
            const isFixedBranch = scene.isFixedBranch || false;
            // 对话后旁白（第一集专用）
            const proseAfterDialogue = scene.proseAfterDialogue || [];
            // 前置旁白显示完毕后才显示对话
            const proseReady = !isFirstScene || visibleParagraphs.length >= (scene.prose?.length || 0);
            // 对话后旁白的可见索引（从前置旁白长度开始计数）
            const proseAfterVisibleIndices = isFirstScene
              ? visibleParagraphs.filter(i => i >= (scene.prose?.length || 0)).map(i => i - (scene.prose?.length || 0))
              : proseAfterDialogue.map((_, i) => i);
            // 选项必须等 proseAfterDialogue 全部显示完毕后才出现
            const totalProseCount = (scene.prose?.length || 0) + proseAfterDialogue.length;
            const choicesReady = !isFirstScene || visibleParagraphs.length >= totalProseCount;
            return (
              <div key={block.key}>
                {/* Prose paragraphs - 剧情模式显示 */}
                {!isChatModeScene && (
                  <ProseBlock 
                    paragraphs={scene.prose} 
                    visibleIndices={isFirstScene ? visibleParagraphs : undefined}
                  />
                )}

                {/* Dialogue - 根据场景自身模式决定显示样式 */}
                {scene.dialogue && (isChatModeScene || proseReady) && (
                  <div style={{ marginTop: isChatModeScene ? "4px" : "20px", marginBottom: "8px" }}>
                    {isChatModeScene ? (
                      <CharacterChatBubble 
                        text={scene.dialogue} 
                        charName={char.name.split(" ")[0]} 
                        avatar={char.image} 
                      />
                    ) : (
                      <DialogueLine text={scene.dialogue} charName={char.name.split(" ")[0]} />
                    )}
                  </div>
                )}

                {/* 对话后旁白（第一集专用，在对话之后逐步显示） */}
                {!isChatModeScene && proseAfterDialogue.length > 0 && proseReady && (
                  <div style={{ marginTop: "16px" }}>
                    <ProseBlock
                      paragraphs={proseAfterDialogue}
                      visibleIndices={proseAfterVisibleIndices}
                    />
                  </div>
                )}

                {/* 输入控件 - 根据当前模式显示，避免重复 */}
                {isLast && !scene.isEnd && choicesReady && (
                  <>
                    {/* 写死支线场景有选项：显示选项面板，选完后触发 AI */}
                    {isFixedBranch && scene.choices.length > 0 && (
                      <div style={{ marginTop: "16px" }}>
                        <ChoicePanel
                          choices={scene.choices}
                          onSelect={handleChoiceSelect}
                          disabled={choicesDisabled}
                          customText={customText}
                          onCustomChange={setCustomText}
                          onCustomSend={handleCustomSend}
                          inputHint={scene.inputHint}
                        />
                      </div>
                    )}
                    {/* 写死支线场景无选项：直接显示输入框接 AI */}
                    {isFixedBranch && scene.choices.length === 0 && (
                      <div style={{ marginTop: "16px", padding: "0 20px" }}>
                        <CustomInputBox
                          customText={customText}
                          onCustomChange={setCustomText}
                          onCustomSend={handleCustomSend}
                          disabled={choicesDisabled || isGenerating}
                          inputHint={scene.inputHint}
                          variant="default"
                        />
                      </div>
                    )}
                    {/* 剧情模式：显示选项面板（包含输入框） */}
                    {!isFixedBranch && !isChatMode && scene.choices.length > 0 && (
                      <div style={{ marginTop: "16px" }}>
                        <ChoicePanel
                          choices={scene.choices}
                          onSelect={handleChoiceSelect}
                          disabled={choicesDisabled}
                          customText={customText}
                          onCustomChange={setCustomText}
                          onCustomSend={handleCustomSend}
                          inputHint={scene.inputHint}
                        />
                      </div>
                    )}
                    {/* 剧情模式但无选项：只显示输入框 */}
                    {!isFixedBranch && !isChatMode && scene.choices.length === 0 && (
                      <div style={{ marginTop: "16px", padding: "0 20px" }}>
                        <CustomInputBox
                          customText={customText}
                          onCustomChange={setCustomText}
                          onCustomSend={handleCustomSend}
                          disabled={choicesDisabled}
                          inputHint={scene.inputHint}
                          variant="default"
                        />
                      </div>
                    )}
                    {/* 对话模式：显示聊天输入框 */}
                    {!isFixedBranch && isChatMode && (
                      <div style={{ marginTop: "16px" }}>
                        <ChatInputPanel
                          customText={customText}
                          onCustomChange={setCustomText}
                          onCustomSend={handleCustomSend}
                          disabled={choicesDisabled}
                          inputHint={scene.inputHint}
                        />
                      </div>
                    )}
                  </>
                )}

                {/* End card */}
                {scene.isEnd && (
                  <div
                    style={{
                      margin: "32px 24px 16px",
                      padding: "20px",
                      borderRadius: "16px",
                      background: "rgba(232,168,124,0.06)",
                      border: "1px solid rgba(232,168,124,0.2)",
                      textAlign: "center",
                      animation: "fadeIn 0.6s ease both",
                    }}
                  >
                    <p
                      className="font-serif"
                      style={{ color: "#E8A87C", fontSize: "15px", marginBottom: "8px" }}
                    >
                      章节完成
                    </p>
                    <p
                      className="font-sans"
                      style={{ color: "rgba(245,240,235,0.4)", fontSize: "12px", marginBottom: "16px" }}
                    >
                      你的选择塑造了这个故事。
                    </p>
                    <button
                      onClick={() => navigate("/")}
                      style={{
                        padding: "10px 24px",
                        borderRadius: "999px",
                        background: "linear-gradient(135deg, #E8A87C, #C8906A)",
                        border: "none",
                        cursor: "pointer",
                        color: "#1A0E08",
                        fontSize: "13px",
                        fontFamily: "sans-serif",
                        fontWeight: "600",
                      }}
                    >
                      返回剧集
                    </button>
                  </div>
                )}
              </div>
            );
          }

          return null;
        })}

        {/* AI generating indicator / streaming text */}
        {isGenerating && (
          <div
            style={{
              padding: "16px 24px",
              animation: "fadeIn 0.3s ease both",
            }}
          >
            {streamingText ? (
              <div style={{ color: "rgba(245,240,235,0.85)", fontSize: "14px", lineHeight: "1.8" }}>
                {streamingText}
                <span style={{ animation: "blink 1s infinite", marginLeft: "2px" }}>▌</span>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Loader
                  size={14}
                  style={{ color: "rgba(232,168,124,0.6)", animation: "spin 1s linear infinite" }}
                />
                <span
                  className="font-sans italic"
                  style={{ color: "rgba(232,168,124,0.5)", fontSize: "13px" }}
                >
                  正在构思...
                </span>
              </div>
            )}
          </div>
        )}

        <div ref={bottomRef} style={{ height: "8px" }} />
      </div>

      {/* 生成视频浮动按钮已移除 */}

      {/* Intimacy toast */}
      {showIntimacyToast && <IntimacyToast gain={intimacyGain} />}

      {/* 等级解锁动画 */}
      {showLevelUnlockAnimation && (
        <LevelUnlockAnimation
          level={3}
          onComplete={() => {
            setShowLevelUnlockAnimation(false);
            setShowUnlockModal(true);
          }}
        />
      )}

      {/* POV Unlock Modal */}
{showUnlockModal && (
<UnlockModal
onClose={() => setShowUnlockModal(false)}
onEnter={() => { setShowUnlockModal(false); navigate("/interactive-player"); }}
/>
      )}

      {/* ── 专属剧情抽屉 ── */}
      {showExclusiveDrawer && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 200,
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
          }}
          onClick={() => setShowExclusiveDrawer(false)}
        >
          {/* 半透明遮罩 */}
          <div style={{
            position: "absolute", inset: 0,
            background: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(4px)",
          }} />

          {/* 抽屉主体 */}
          <div
            style={{
              position: "relative",
              background: "linear-gradient(180deg, rgba(18,8,28,0.98) 0%, rgba(10,5,18,0.99) 100%)",
              borderRadius: "20px 20px 0 0",
              border: "1px solid rgba(232,168,124,0.15)",
              borderBottom: "none",
              maxHeight: "80vh",
              overflowY: "auto",
              animation: "slideUpDrawer 0.32s cubic-bezier(0.32,0.72,0,1) both",
              paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 顶部拖拽条 */}
            <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 4px" }}>
              <div style={{ width: "36px", height: "4px", borderRadius: "2px", background: "rgba(255,255,255,0.15)" }} />
            </div>

            {/* 标题栏 */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "8px 20px 16px",
            }}>
              <h3 style={{ color: "#F5F0EB", fontSize: "17px", fontWeight: "700", fontFamily: "serif", letterSpacing: "0.02em" }}>
                专属剧情
              </h3>
              <button
                onClick={() => setShowExclusiveDrawer(false)}
                style={{
                  width: "28px", height: "28px", borderRadius: "50%",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  cursor: "pointer", display: "flex", alignItems: "center",
                  justifyContent: "center", color: "rgba(255,255,255,0.45)", fontSize: "14px",
                }}
              >✕</button>
            </div>

            {/* 剧情卡片列表 */}
            <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: "12px" }}>

              {/* 卡片1：已解锁 */}
              <div
                style={{
                  borderRadius: "16px",
                  overflow: "hidden",
                  background: "linear-gradient(135deg, rgba(155,89,182,0.35) 0%, rgba(100,55,150,0.4) 100%)",
                  border: "1px solid rgba(232,168,124,0.25)",
                  cursor: "pointer",
                  transition: "transform 0.15s",
                }}
                onClick={() => { setShowExclusiveDrawer(false); navigate("/interactive-player"); }}
                onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.98)")}
                onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
              >
                {/* 卡片背景图 */}
                <div style={{ position: "relative", height: "120px", overflow: "hidden" }}>
                  <img
                    src="https://s3plus.meituan.net/mcopilot-pub/nocode-task/chenyanbo/ujnj6kjw27ro1feytk76v2lr4ztv2r/ep1_60s.jpg"
                    alt="停电夜的越界"
                    style={{ width: "100%", height: "100%", objectFit: "cover", filter: "brightness(0.55) saturate(0.8)", objectPosition: "center 20%" }}
                  />
                  <div style={{
                    position: "absolute", inset: 0,
                    background: "linear-gradient(to bottom, rgba(100,55,150,0.2) 0%, rgba(10,5,18,0.75) 100%)",
                  }} />
                  {/* 已解锁标签 */}
                  <div style={{
                    position: "absolute", top: "10px", left: "12px",
                    display: "flex", alignItems: "center", gap: "5px",
                  }}>
                    <Heart size={12} fill="#E8A87C" style={{ color: "#E8A87C" }} />
                    <span style={{ color: "#E8A87C", fontSize: "11px", fontWeight: "600" }}>已解锁</span>
                  </div>
                  {/* 卡片序号水印 */}
                  <div style={{
                    position: "absolute", bottom: "-10px", right: "12px",
                    fontSize: "72px", fontWeight: "900",
                    color: "rgba(155,89,182,0.2)", lineHeight: 1, fontFamily: "serif",
                    userSelect: "none",
                  }}>1</div>
                </div>
                {/* 卡片内容 */}
                <div style={{ padding: "12px 14px 14px" }}>
                  <p style={{ color: "#F5F0EB", fontSize: "15px", fontWeight: "600", marginBottom: "4px", fontFamily: "serif" }}>
                    《停电夜的越界》
                  </p>
                  <p style={{ color: "rgba(245,240,235,0.55)", fontSize: "12px", marginBottom: "12px", lineHeight: "1.5" }}>
                    深夜停电，你们独处宿舍…选择你的故事走向
                  </p>
                  <div style={{
                    width: "100%", padding: "9px",
                    borderRadius: "10px", textAlign: "center",
                    background: "linear-gradient(135deg, rgba(232,168,124,0.2), rgba(155,89,182,0.2))",
                    border: "1px solid rgba(232,168,124,0.3)",
                    color: "#E8A87C", fontSize: "13px", fontWeight: "600",
                  }}>
                    立即进入 →
                  </div>
                </div>
              </div>

              {/* 卡片2：未解锁 Lv.5 */}
              <div style={{
                borderRadius: "16px", overflow: "hidden",
                background: "rgba(30,15,45,0.7)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}>
                <div style={{
                  height: "130px", display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center", gap: "10px",
                  position: "relative", overflow: "hidden",
                }}>
                  <div style={{
                    position: "absolute", fontSize: "90px", fontWeight: "900",
                    color: "rgba(100,60,140,0.15)", lineHeight: 1, fontFamily: "serif",
                    right: "10px", bottom: "-15px", userSelect: "none",
                  }}>2</div>
                  <Lock size={22} style={{ color: "rgba(255,255,255,0.3)" }} />
                  <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "13px" }}>达到 Lv.5 后解锁剧情</p>
                </div>
              </div>

              {/* 卡片3：未解锁 Lv.7 */}
              <div style={{
                borderRadius: "16px", overflow: "hidden",
                background: "rgba(30,15,45,0.7)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}>
                <div style={{
                  height: "130px", display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center", gap: "10px",
                  position: "relative", overflow: "hidden",
                }}>
                  <div style={{
                    position: "absolute", fontSize: "90px", fontWeight: "900",
                    color: "rgba(100,60,140,0.15)", lineHeight: 1, fontFamily: "serif",
                    right: "10px", bottom: "-15px", userSelect: "none",
                  }}>3</div>
                  <Lock size={22} style={{ color: "rgba(255,255,255,0.3)" }} />
                  <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "13px" }}>达到 Lv.7 后解锁剧情</p>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUpDrawer {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default Chat;
