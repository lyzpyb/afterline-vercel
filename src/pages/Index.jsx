import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { useABVersion, useABTracking, trackABClick } from '@/hooks/useABVersion';
import { Search, Bell, Heart, Play, Home, User, Star, ChevronRight, Sparkles, Phone, PhoneOff, Film } from 'lucide-react'; // ─── Data ────────────────────────────────────────────────────────────────────

const CATEGORIES = ['全部', '危险偏爱', '强占有欲', '追妻火葬场', '禁欲失控', '年上诱惑']; // 角色数据 - 按参考UI风格设计

const FEATURED_ROLES = [
  {
    id: 1,
    dramaId: 2,
    name: '沈彦希',
    role: '同寝校草',
    title: '心动禁区',
    quote: '「别看我，看路。」',
    episodes: 5,
    hearts: '12.8w',
    tags: ['校园', '高冷', '口嫌体正直'],
    tagCategory: '危险偏爱',
    image: 'https://s3plus.meituan.net/mcopilot-pub/nocode-task/chenyanbo/ujnj6kjw27ro1feytk76v2lr4ztv2r/ep1_60s.jpg',
    isTop: true,
  },
  {
    id: 4,
    dramaId: 1,
    name: '陆见深',
    role: '教授',
    title: '糟糕，是心动',
    quote: '「你受伤的样子，让我心疼。」',
    episodes: 9,
    hearts: '6.1w',
    tags: ['医生', '温柔救赎', '双向治愈'],
    tagCategory: '年上诱惑',
    image: 'https://s3plus.meituan.net/mcopilot-pub/nocode_image/default/image-y8tmfj048y6x3cbgxjyo3lmy21eiyf.png',
    isTop: false,
  },
  {
    id: 5,
    dramaId: 3,
    name: '江屹',
    role: '青梅',
    title: '糟糕是心动之织光裁爱',
    quote: '「你身上有我不能说的秘密。」',
    episodes: 5,
    hearts: '5.2w',
    tags: ['转学生', '神秘', '禁忌之恋'],
    tagCategory: '危险偏爱',
    image: 'https://s3plus.meituan.net/mcopilot-pub/nocode_image/default/image-zr9i7477bb69nx8qaauqanuphwv0rq.png',
    isTop: false,
  },
  {
    id: 6,
    dramaId: 4,
    name: '顾星辰',
    role: '前男友',
    title: '糟糕我刚渣的前男友',
    quote: '「我们之间的账，该算算了。」',
    episodes: 5,
    hearts: '8.5w',
    tags: ['前男友', '追妻', '破镜重圆'],
    tagCategory: '追妻火葬场',
    image: 'https://s3plus.meituan.net/mcopilot-pub/nocode_image/default/image-bxc4ymnfdqrm0bt38d3fbpqkxb2sgu.png',
    isTop: false,
  },
];

const TRENDING = [
  {
    id: 2,
    title: '心动禁区',
    genre: '校园言情',
    rating: '4.9',
    image: 'https://s3plus.meituan.net/mcopilot-pub/nocode-task/chenyanbo/7e9f3hxarnd9a9hfjsm60lu6gmak98/0%281%29.jpg',
  },
  {
    id: 1,
    title: '糟糕，是心动',
    genre: '校园爱情',
    rating: '4.9',
    image: 'https://s3plus.meituan.net/mcopilot-pub/nocode_image/default/IMG_20260519_210434-39q1ge0kyorbcfou6q790xbs7vguhq.jpg',
  },
  {
    id: 3,
    title: '糟糕是心动之织光裁爱',
    genre: '校园言情',
    rating: '4.8',
    image: 'https://s3plus.meituan.net/mcopilot-pub/nocode-task/chenyanbo/hx5eovz6t1h7l30vrwq9nvsg5m83o8/duanju3-cover.jpg',
  },
  {
    id: 4,
    title: '糟糕我刚渣的前男友',
    genre: '都市爱情',
    rating: '4.8',
    image: 'https://s3plus.meituan.net/mcopilot-pub/nocode-task/chenyanbo/hqvin4azabltjyyhpwkkwywsh1o2y9/zaogao-cover.jpg',
  },
]; // ─── Role Card (参考UI风格) ───────────────────────────────────────────────────

const RoleCard = ({ role, onClick, index }) => (
  <div
    onClick={onClick}
    className='relative overflow-hidden cursor-pointer'
    style={{
      minHeight: '160px',
      background: 'linear-gradient(135deg, #0f1420 0%, #1a1f2e 100%)',
      borderBottom: '1px solid rgba(255,255,255,0.04)',
    }}
  >
    {/* Background Image - Right side with darker overlay (stretched to full card height) */}
    <div
      className='absolute right-0 top-0 bottom-0 w-1/2'
      style={{
        minHeight: '100%',
      }}
    >
      <img
        src={role.image}
        alt={role.name}
        className='mx-auto object-cover w-full h-full'
        style={{
          objectPosition: 'center 15%',
          position: 'absolute',
          inset: 0,
        }}
      />
      {/* Dark blue gradient overlay */}
      <div
        className='absolute inset-0'
        style={{
          background: 'linear-gradient(to right, #0f1420 0%, #0f1420e6 25%, transparent 60%, transparent 100%)',
        }}
      />
    </div>

    {/* Content - Left side (relative, stretches card height) */}
    <div
      className='relative px-4 py-3 flex flex-col justify-between'
      style={{
        minHeight: '160px',
      }}
    >
      {/* Top row: TOP badge & hearts */}
      <div className='flex items-center justify-between'>
        {role.isTop ? (
          <div
            className='flex items-center gap-1 px-1.5 py-0.5'
            style={{
              background: 'rgba(232,168,124,0.15)',
              border: '1px solid rgba(232,168,124,0.3)',
              borderRadius: '3px',
            }}
          >
            <Heart
              size={8}
              fill='#E8A87C'
              style={{
                color: '#E8A87C',
              }}
            />
            <span
              className='font-sans text-[10px]'
              style={{
                color: '#E8A87C',
              }}
            >
              人气TOP1
            </span>
          </div>
        ) : (
          <div />
        )}
        <div className='flex items-center gap-1'>
          <Heart
            size={10}
            fill='#E8A87C'
            style={{
              color: '#E8A87C',
            }}
          />
          <span
            className='font-sans text-[10px]'
            style={{
              color: 'rgba(245,240,235,0.6)',
            }}
          >
            {role.hearts}
          </span>
        </div>
      </div>

      {/* Middle: Drama Title & Name & Role & Quote */}
      <div className='flex-1 flex flex-col justify-center'>
        {/* 短剧名称 */}
        <p
          className='font-sans text-[10px] mb-1'
          style={{
            color: 'rgba(232,168,124,0.6)',
          }}
        >
          《{role.title}》
        </p>
        <h3
          className='font-sans text-lg font-medium mb-0.5'
          style={{
            color: '#E8A87C',
            letterSpacing: '0.02em',
          }}
        >
          {role.name}
        </h3>
        <p
          className='font-sans text-xs mb-1'
          style={{
            color: 'rgba(245,240,235,0.6)',
            height: '16px',
            flex: '0 0 auto',
            alignSelf: 'auto',
          }}
        >
          {role.role}
        </p>
        <p
          className='font-sans text-xs'
          style={{
            color: 'rgba(245,240,235,0.4)',
          }}
        >
          {role.quote}
        </p>
      </div>

      {/* Bottom: Tags & Continue button */}
      <div className='flex items-end justify-between'>
        {/* Tags */}
        <div className='flex flex-wrap gap-1'>
          {role.tags.slice(0, 2).map((tag, __dnd_i) => (
            <span
              key={tag}
              className='font-sans px-1.5 py-0.5 text-[10px]'
              style={{
                background: 'rgba(255,255,255,0.05)',
                color: 'rgba(245,240,235,0.45)',
                borderRadius: '3px',
              }}
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Continue Button */}
        <button
          className='flex items-center gap-1 px-2 py-1 font-sans text-[10px]'
          style={{
            background: 'rgba(255,255,255,0.06)',
            color: 'rgba(245,240,235,0.7)',
            borderRadius: '3px',
          }}
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
        >
          {role.episodes}集 · 继续
          <Play size={10} fill='currentColor' />
        </button>
      </div>
    </div>
  </div>
); // ─── Trending Card (2-col grid, tall) ────────────────────────────────────────

const TrendingCard = ({ item, onClick }) => (
  <div
    onClick={onClick}
    className='relative rounded-2xl overflow-hidden cursor-pointer active:scale-95 transition-transform duration-200'
    style={{
      aspectRatio: '3/4',
    }}
  >
    <img src={item.image} alt={item.title} className='mx-auto object-cover w-full h-full' />
    <div
      className='absolute inset-0'
      style={{
        background: 'linear-gradient(to top, rgba(10,10,10,0.92) 0%, rgba(10,10,10,0.2) 55%, transparent 75%)',
      }}
    />
    {/* AI badge */}
    <div
      className='absolute top-2 right-2 px-1.5 py-0.5 rounded font-sans'
      style={{
        background: 'rgba(13,13,13,0.75)',
        border: '1px solid rgba(255,255,255,0.15)',
        color: 'rgba(245,240,235,0.7)',
        fontSize: '9px',
        backdropFilter: 'blur(4px)',
      }}
    >
      Ai
    </div>
    <div className='absolute bottom-0 left-0 right-0 p-3'>
      <p
        className='font-sans leading-snug mb-1'
        style={{
          color: '#F5F0EB',
          fontSize: '13px',
          fontWeight: '600',
        }}
      >
        {item.title}
      </p>
      <div className='flex items-center justify-between'>
        <span
          className='font-sans'
          style={{
            color: 'rgba(245,240,235,0.5)',
            fontSize: '11px',
          }}
        >
          {item.genre}
        </span>
        <div className='flex items-center gap-0.5'>
          <Star
            size={10}
            fill='#E8A87C'
            style={{
              color: '#E8A87C',
            }}
          />
          <span
            className='font-sans'
            style={{
              color: '#E8A87C',
              fontSize: '11px',
            }}
          >
            {item.rating}
          </span>
        </div>
      </div>
    </div>
  </div>
); // ─── Bottom Navigation ────────────────────────────────────────────────────────

const BottomNav = ({ active, onNavigate, hideInteractive }) => {
  const { isDrama } = useABVersion();
  // A 版隐藏"心动" tab，只显示3个tab
  const allTabs = [
    {
      id: 'home',
      label: '首页',
      icon: Home,
      path: isDrama ? '/drama' : '/full',
    },
    {
      id: 'watch',
      label: '追剧',
      icon: Play,
      path: isDrama ? '/drama/player/2' : '/player/2',
    },
    {
      id: 'crave',
      label: '心动',
      icon: Heart,
      path: '/crave',
    },
    {
      id: 'me',
      label: '我的',
      icon: User,
      path: '/profile',
    },
  ];
  const tabs = (hideInteractive || isDrama) ? allTabs.filter((t) => t.id !== 'crave') : allTabs;
  return createPortal(
    <div
      className='fixed bottom-0 left-0 right-0 z-50'
      style={{
        background: 'rgba(13,13,13,0.96)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div className='flex items-center justify-around px-2 py-2'>
        {tabs.map((tab, __dnd_i) => {
          const Icon = tab.icon;
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onNavigate(tab.path, tab.id)}
              className='flex flex-col items-center gap-1'
              style={{
                minWidth: '60px',
              }}
            >
              <div className='relative'>
                <Icon
                  size={22}
                  style={{
                    color: isActive ? '#E8A87C' : 'rgba(245,240,235,0.35)',
                    transition: 'color 0.2s',
                  }}
                />
                {isActive && (
                  <div
                    className='absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full'
                    style={{
                      background: '#E8A87C',
                    }}
                  />
                )}
              </div>
              <span
                className='font-sans'
                style={{
                  fontSize: '9px',
                  color: isActive ? '#E8A87C' : 'rgba(245,240,235,0.35)',
                  letterSpacing: '0.02em',
                  transition: 'color 0.2s',
                }}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>,
    document.body,
  );
}; // ─── Incoming Call Banner ────────────────────────────────────────────────────

const CALLER_INFO = {
  name: '沈彦希',
  role: '篮球队学长',
  image: 'https://s3plus.meituan.net/mcopilot-pub/nocode-task/chenyanbo/ujnj6kjw27ro1feytk76v2lr4ztv2r/ep1_60s.jpg',
};

const IncomingCallBanner = ({ dramaId, onAccept, onDecline }) =>
  createPortal(
    <div
      style={{
        position: 'fixed',
        top: 'calc(env(safe-area-inset-top, 0px) + 12px)',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 32px)',
        maxWidth: '440px',
        zIndex: 9999,
        borderRadius: '20px',
        background: 'rgba(28,28,32,0.97)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid rgba(232,168,124,0.25)',
        boxShadow: '0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(232,168,124,0.1)',
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        animation: 'callBannerIn 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards',
      }}
    >
      <style>{`
        @keyframes callBannerIn {
          from { opacity: 0; transform: translateX(-50%) translateY(-24px) scale(0.95); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0)    scale(1); }
        }
        @keyframes callAvatarPulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(232,168,124,0.5); }
          50%     { box-shadow: 0 0 0 8px rgba(232,168,124,0); }
        }
      `}</style>

      {/* Avatar */}
      <div
        style={{
          position: 'relative',
          flexShrink: 0,
        }}
      >
        <img
          src={CALLER_INFO.image}
          alt={CALLER_INFO.name}
          className='mx-auto object-cover'
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            border: '2px solid rgba(232,168,124,0.6)',
            animation: 'callAvatarPulse 1.6s ease-in-out infinite',
          }}
        />
      </div>

      {/* Info */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
        }}
      >
        <p
          style={{
            color: 'rgba(245,240,235,0.5)',
            fontSize: '11px',
            fontFamily: 'sans-serif',
            marginBottom: '2px',
            letterSpacing: '0.05em',
          }}
        >
          来电
        </p>
        <p
          style={{
            color: '#F5F0EB',
            fontSize: '16px',
            fontWeight: '700',
            fontFamily: 'serif',
            margin: 0,
            lineHeight: 1.2,
          }}
        >
          {CALLER_INFO.name}
        </p>
        <p
          style={{
            color: 'rgba(232,168,124,0.7)',
            fontSize: '12px',
            fontFamily: 'sans-serif',
            marginTop: '2px',
          }}
        >
          {CALLER_INFO.role}
        </p>
      </div>

      {/* Buttons */}
      <div
        style={{
          display: 'flex',
          gap: '10px',
          flexShrink: 0,
        }}
      >
        <button
          onClick={onDecline}
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg,#E53935,#C62828)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(229,57,53,0.4)',
          }}
        >
          <PhoneOff size={20} color='#fff' />
        </button>
        <button
          onClick={onAccept}
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg,#43A047,#2E7D32)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(67,160,71,0.4)',
          }}
        >
          <Phone size={20} color='#fff' />
        </button>
      </div>
    </div>,
    document.body,
  ); // ─── Index Page ───────────────────────────────────────────────────────────────

const Index = ({ hideInteractive = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDrama, version } = useABVersion();
  const shouldHideInteractive = hideInteractive || isDrama;

  // AB 版本访问追踪
  useABTracking();

  const [activeTab, setActiveTab] = useState('home');
  const [activeCategory, setActiveCategory] = useState('Alpha');
  const scrollRef = useRef(null);
  const [incomingCall, setIncomingCall] = useState(null); // dramaId string or null
  // 一次性清除旧缓存（版本号变更时触发）
  useEffect(() => {
    const CACHE_VERSION = 'v2';
    if (localStorage.getItem('cache_version') !== CACHE_VERSION) {
      ['xindongjinqu_chat_history', 'xindongjinqu_progress', 'story_history', 'watch_history'].forEach((k) => {
        try {
          localStorage.removeItem(k);
        } catch (_) {}
      });
      localStorage.setItem('cache_version', CACHE_VERSION);
    }
  }, []); // 从 location.state 读取来电信息（Player 返回时传入）
  useEffect(() => {
    if (location.state?.incomingCall) {
      const dramaId = location.state.incomingCall; // 清除 state 防止刷新重复触发
      window.history.replaceState({}, '', '/');
      setTimeout(() => setIncomingCall(dramaId), 600);
    }
  }, [location.state]);
  const handleAcceptCall = () => {
    setIncomingCall(null);
    navigate(`/call/${incomingCall}`);
  };
  const handleDeclineCall = () => {
    setIncomingCall(null);
  };
  const handleNavigate = (path, tabId) => {
    if (tabId) setActiveTab(tabId);
    navigate(path);
  };
  // A 版导航路径适配
  const dramaNavBase = isDrama ? '/drama' : '/full';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#0D0D0D',
        maxWidth: '480px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* ── Sticky Header ── */}
      <div
        className='flex-shrink-0 px-5 py-3'
        style={{
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 14px)',
          background: '#0D0D0D',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          zIndex: 10,
        }}
      >
        <div className='flex items-center justify-between mb-1'>
          <span
            className='font-sans'
            style={{
              color: '#F5F0EB',
              fontSize: '22px',
              fontWeight: '700',
              letterSpacing: '-0.02em',
            }}
          >
            AfterLine
          </span>
          <button onClick={() => navigate(isDrama ? '/drama/discover' : '/discover')} className='flex items-center gap-1'>
            <Search
              size={20}
              style={{
                color: 'rgba(245,240,235,0.6)',
              }}
            />
          </button>
        </div>
        <p
          className='font-sans text-xs'
          style={{
            color: 'rgba(245,240,235,0.4)',
          }}
        >
          {shouldHideInteractive ? '沉浸追剧，每一帧都心动' : '用你的决定，重塑与他的未来'}
        </p>
      </div>

      {/* ── Scrollable Body ── */}
      <div
        ref={scrollRef}
        className='flex-1 overflow-y-auto'
        style={{
          scrollbarWidth: 'none',
          paddingBottom: '80px',
        }}
      >
        {/* Featured Roles - Vertical List */}
        <div>
          {/* Role Cards List */}
          <div className='space-y-0'>
            {FEATURED_ROLES.map((role, index) => (
              <RoleCard key={role.id} role={role} index={index} onClick={() => { trackABClick(isDrama ? "A" : "B", "click_role_card", { dramaId: role.dramaId, name: role.name }); navigate(isDrama ? `/drama/player/${role.dramaId}` : `/player/${role.dramaId}`); }} />
            ))}
          </div>
        </div>

        {/* Trending Now */}
        <div className='px-5 pt-8'>
          {/* Section label */}
          <div className='flex items-center gap-3 mb-4'>
            <Star
              size={12}
              fill='#E8A87C'
              style={{
                color: '#E8A87C',
              }}
            />
            <span
              className='font-sans tracking-widest uppercase'
              style={{
                color: 'rgba(245,240,235,0.6)',
                fontSize: '11px',
                fontWeight: '600',
                letterSpacing: '0.15em',
              }}
            >
              TRENDING NOW
            </span>
            <Star
              size={12}
              fill='#E8A87C'
              style={{
                color: '#E8A87C',
              }}
            />
          </div>

          {/* 2-column grid */}
          <div className='grid grid-cols-2 gap-3'>
            {TRENDING.map((item, __dnd_i) => (
              <TrendingCard key={item.id} item={item} onClick={() => { trackABClick(isDrama ? "A" : "B", "click_trending_card", { dramaId: item.id }); navigate(isDrama ? `/drama/player/${item.id}` : `/player/${item.id}`); }} />
            ))}
          </div>
        </div>

        {/* AI 创作工具入口 */}
        <div className='px-5 pt-6 pb-2'>
          <p className='font-sans text-xs font-semibold mb-3' style={{ color: 'rgba(245,240,235,0.4)', letterSpacing: '0.08em' }}>AI 创作工具</p>
          <div className='grid grid-cols-2 gap-3'>
            {/* 短剧创作 */}
            <button
              onClick={() => navigate('/comic-create')}
              className='flex flex-col items-start rounded-2xl active:scale-95 transition-transform duration-150'
              style={{
                background: 'linear-gradient(135deg, #0d1f3a 0%, #1a1030 100%)',
                border: '1px solid rgba(59,130,246,0.3)',
                padding: '16px',
              }}
            >
              <div
                className='flex items-center justify-center rounded-xl mb-3'
                style={{
                  width: '44px',
                  height: '44px',
                  background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                  boxShadow: '0 4px 14px rgba(37,99,235,0.4)',
                }}
              >
                <Film size={20} color='#fff' />
              </div>
              <p className='font-sans font-semibold text-sm mb-0.5' style={{ color: '#F5F0EB' }}>短剧创作</p>
              <p className='font-sans text-xs' style={{ color: 'rgba(245,240,235,0.4)' }}>AI 生成分镜&短剧</p>
            </button>
            {/* AI 漫剧 Demo */}
            <button
              onClick={() => navigate('/comic-demo')}
              className='flex flex-col items-start rounded-2xl active:scale-95 transition-transform duration-150'
              style={{
                background: 'linear-gradient(135deg, #1a1030 0%, #0d1a2e 100%)',
                border: '1px solid rgba(124,58,237,0.3)',
                padding: '16px',
              }}
            >
              <div
                className='flex items-center justify-center rounded-xl mb-3'
                style={{
                  width: '44px',
                  height: '44px',
                  background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
                  boxShadow: '0 4px 14px rgba(124,58,237,0.4)',
                }}
              >
                <Sparkles size={20} color='#fff' />
              </div>
              <p className='font-sans font-semibold text-sm mb-0.5' style={{ color: '#F5F0EB' }}>漫剧 Demo</p>
              <p className='font-sans text-xs' style={{ color: 'rgba(245,240,235,0.4)' }}>一句话生成漫剧</p>
            </button>
          </div>
        </div>
      </div>

      <BottomNav active={activeTab} onNavigate={handleNavigate} hideInteractive={shouldHideInteractive} />

      {/* ── Incoming Call Banner (only in full version) ── */}
      {!shouldHideInteractive && incomingCall && <IncomingCallBanner dramaId={incomingCall} onAccept={handleAcceptCall} onDecline={handleDeclineCall} />}
    </div>
  );
};
export default Index;
