import Landing from "./pages/Landing.jsx";
import Index from "./pages/Index.jsx";
import Discover from "./pages/Discover.jsx";
import Crave from "./pages/Crave.jsx";
import MyDrama from "./pages/MyDrama.jsx";
import Profile from "./pages/Profile.jsx";
import Player from "./pages/Player.jsx";
import Chat from "./pages/Chat.jsx";
import Gallery from "./pages/Gallery.jsx";
import Call from "./pages/Call.jsx";
import VideoCreate from "./pages/VideoCreate.jsx";
import VideoPreview from "./pages/VideoPreview.jsx";
import InteractivePlayer from "./pages/InteractivePlayer.jsx";
import Analytics from "./pages/Analytics.jsx";
import AIAbilityTest from "./components/AIAbilityTest.jsx";
import ComicDramaCreate from "./pages/ComicDramaCreate.jsx";
import ComicDemo from "./pages/ComicDemo.jsx";

/**
 * Central place for defining the navigation items. Used for navigation components and routing.
 *
 * AB 版本路由设计：
 * - /            → 展示页（落地页）
 * - /drama       → A 版（短剧版）直接进入心动禁区播放器
 * - /full        → B 版（完整版，含互动）首页
 */
export const navItems = [
  // ── 展示页 ──
  {
    title: "展示页",
    to: "/",
    page: <Landing />,
  },

  // ── A 版：短剧版（直接进入播放器） ──
  {
    title: "短剧版",
    to: "/drama",
    page: <Player />,
  },

  // ── B 版：完整版（含互动） ──
  {
    title: "完整版首页",
    to: "/full",
    page: <Index />,
  },
  {
    title: "追剧",
    to: "/discover",
    page: <Discover />,
  },
  {
    title: "心动",
    to: "/crave",
    page: <Crave />,
  },
  {
    title: "我的",
    to: "/profile",
    page: <Profile />,
  },
  {
    title: "My Drama",
    to: "/my-drama",
    page: <MyDrama />,
  },
  {
    title: "Player",
    to: "/player/:id",
    page: <Player />,
  },
  {
    title: "Chat",
    to: "/chat/:dramaId/:charId",
    page: <Chat />,
  },
  {
    title: "Gallery",
    to: "/gallery/:dramaId",
    page: <Gallery />,
  },
  {
    title: "Call",
    to: "/call/:dramaId",
    page: <Call />,
  },
  {
    title: "VideoCreate",
    to: "/video-create/:dramaId/:ep",
    page: <VideoCreate />,
  },
  {
    title: "VideoPreview",
    to: "/video-preview/:dramaId/:ep",
    page: <VideoPreview />,
  },
  {
    title: "InteractivePlayer",
    to: "/interactive-player",
    page: <InteractivePlayer />,
  },
  {
    title: "Analytics",
    to: "/analytics",
    page: <Analytics />,
  },
  {
    title: "AI能力测试",
    to: "/ai-test",
    page: <AIAbilityTest />,
  },
  {
    title: "漫剧创作",
    to: "/comic-create",
    page: <ComicDramaCreate />,
  },
  {
    title: "漫剧Demo",
    to: "/comic-demo",
    page: <ComicDemo />,
  },
];
