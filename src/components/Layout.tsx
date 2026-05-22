import React, { useEffect, useState } from 'react';
import NotificationBanner from './NotificationBanner';
import { getUmamiStats } from '../analytics';

const navItems = [
  { icon: '💕', href: '#home', label: '主页' },
  { icon: '🖼️', href: '#gallery', label: '画廊' },
  { icon: '📅', href: '#calendar', label: '重要日子' },
  { icon: '🎀', href: '#period', label: '关怀' },
  { icon: '📚', href: '#schedule', label: '课程表' },
];

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isBannerVisible, setIsBannerVisible] = useState(false);
  const [witnessCount, setWitnessCount] = useState<number | null>(null);
  
  // Theme logic: Calculate if it should be dark based on time (18:00 - 06:00)
  const isNightTime = () => {
    const hour = new Date().getHours();
    return hour >= 18 || hour < 6;
  };

  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('kuromi_theme');
    if (saved) return saved;
    return isNightTime() ? 'dark' : 'light';
  });
  
  const isDark = theme === 'dark';

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('kuromi_theme', theme);
  }, [theme]);

  useEffect(() => {
    let isMounted = true;

    getUmamiStats()
      .then((stats) => {
        if (isMounted) {
          setWitnessCount(stats?.pageviews ?? null);
        }
      })
      .catch(() => {
        if (isMounted) {
          setWitnessCount(null);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Auto-switch theme based on time if user hasn't manually set one in this session
  // or just to keep it fresh if the app stays open
  useEffect(() => {
    const checkTheme = () => {
      // If the user has NEVER set a theme, or we want to follow time strictly when no manual override is in localStorage
      // For a better UX, we only auto-switch if the user hasn't explicitly clicked the toggle in the current session
      // But based on request: "automatic follow time", we'll implement a check.
      const saved = localStorage.getItem('kuromi_theme_manual');
      if (!saved) {
        const nextTheme = isNightTime() ? 'dark' : 'light';
        setTheme(nextTheme);
      }
    };

    const interval = setInterval(checkTheme, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('kuromi_theme_manual', 'true'); // Mark that user made a manual choice
  };

  const formattedWitnessCount = witnessCount === null ? '' : new Intl.NumberFormat('zh-CN').format(witnessCount);

  return (
    <div className="relative min-h-screen w-full max-w-full overflow-x-clip selection:bg-kuromi-pink/30">
      <div className="bg-mesh" />
      <div
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-50 mix-blend-overlay"
        style={{ backgroundImage: 'url("/assets/backgrounds/image-gen-2.png")' }}
      />

      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[5%] left-[8%] h-24 w-24 rounded-full bg-kuromi-purple/20 blur-3xl animate-pulse-soft md:h-32 md:w-32" />
        <div className="absolute bottom-[10%] right-[8%] h-32 w-32 rounded-full bg-kuromi-pink/20 blur-3xl animate-pulse-soft md:h-48 md:w-48" style={{ animationDelay: '2s' }} />
        <img src="/assets/stickers/clean_03.png" alt="" className="absolute top-[12%] left-[4%] w-12 animate-float opacity-70 md:w-20" />
        <img src="/assets/stickers/clean_04.png" alt="" className="absolute top-[20%] right-[6%] w-10 animate-float opacity-70 md:w-16" style={{ animationDelay: '1s' }} />
      </div>

      <div className="fixed top-0 left-0 right-0 z-50 flex flex-col">
        <NotificationBanner onVisibilityChange={setIsBannerVisible} />
        <header className="glass-nav flex h-16 items-center px-3 shadow-md sm:px-4 md:h-20 md:px-8">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={toggleTheme}
              className={`theme-toggle-logo flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-lg transition-all active:scale-95 md:h-12 md:w-12 ${
                isDark ? 'bg-kuromi-purple ring-2 ring-white/30' : 'bg-kuromi-black'
              }`}
              aria-label={isDark ? '切换到日间模式' : '切换到夜间模式'}
              title={isDark ? '切换到日间模式' : '切换到夜间模式'}
            >
              <img src="/assets/stickers/clean_02.png" alt="logo" className="h-8 w-8 object-contain" />
            </button>
            <a href="#home" className="flex items-center gap-2 min-w-0 group">
              <img src="/assets/titles/kuromi_text_clean_02_face_fixed.png" alt="Kuromi" className="hidden h-8 max-w-44 object-contain sm:block md:h-10" />
              <span className="font-love text-2xl font-bold tracking-normal bg-gradient-to-r from-kuromi-purple to-kuromi-pink bg-clip-text text-transparent transition-all group-hover:scale-105 md:text-4xl">
                Y&Z Love
              </span>
            </a>
          </div>

          <nav className="ml-auto hidden items-center gap-2 md:flex">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded-2xl px-4 py-2.5 font-bold text-gray-500 transition-all hover:bg-white/60 hover:text-kuromi-black"
              >
                <span className="flex items-center gap-2">
                  <span className="text-xl">{item.icon}</span>
                  {item.label}
                </span>
              </a>
            ))}
          </nav>

          <div className="flex flex-1 items-center justify-end md:hidden">
            {/* Mobile layout keeps items to the right if needed, but the title is already on the left */}
          </div>
        </header>
      </div>

      <main
        className={`relative z-10 mx-auto flex w-full max-w-7xl min-w-0 flex-col gap-5 px-3 pb-28 transition-[padding] duration-300 sm:px-4 md:gap-8 md:px-8 md:pb-12 ${
          isBannerVisible ? 'pt-28 md:pt-32' : 'pt-20 md:pt-24'
        }`}
      >
        {children}
      </main>

      {witnessCount !== null && (
        <footer className="relative z-10 mx-auto w-full max-w-7xl px-3 pb-24 text-center sm:px-4 md:px-8 md:pb-10">
          <p className="inline-flex items-center justify-center rounded-full border border-white/50 bg-white/55 px-5 py-2 text-xs font-black text-kuromi-purple shadow-sm backdrop-blur-sm md:text-sm">
            幸福被 <span className="mx-1 text-kuromi-pink">{formattedWitnessCount}</span> 次见证
          </p>
        </footer>
      )}

      <nav className="fixed bottom-3 left-3 right-3 z-50 grid grid-cols-5 gap-1 rounded-3xl border border-white/40 bg-white/85 p-2 shadow-kuromi backdrop-blur-md md:hidden">
        {navItems.map((item) => (
          <a key={item.href} href={item.href} className="min-w-0 rounded-2xl px-1 py-2 text-center transition active:scale-95">
            <span className="block text-xl leading-none">{item.icon}</span>
            <span className="mt-1 block truncate text-[10px] font-black text-gray-500">{item.label}</span>
          </a>
        ))}
      </nav>
    </div>
  );
};

export default Layout;
