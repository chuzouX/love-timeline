import React, { useEffect, useState } from 'react';
import { differenceInDays } from 'date-fns';
import { ensureUnlocked, getProfile, updateProfile, type Profile } from '../api/client';

const Home: React.FC = () => {
  const [daysTogether, setDaysTogether] = useState(0);
  const [randomKuromi, setRandomKuromi] = useState(() => String(Math.floor(Math.random() * 17) + 1).padStart(2, '0'));
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      getProfile()
        .then((nextProfile) => {
          setProfile(nextProfile);
          setDaysTogether(differenceInDays(new Date(), new Date(`${nextProfile.relationshipStartDate}T00:00:00`)));
        })
        .catch(() => setError('无法连接后端，请确认 API 服务已启动。'));
    }, 0);

    return () => window.clearTimeout(timeout);
  }, []);

  const changeKuromi = () => {
    setRandomKuromi(String(Math.floor(Math.random() * 17) + 1).padStart(2, '0'));
  };

  const changeStartDate = async () => {
    if (!profile || !(await ensureUnlocked())) return;

    const relationshipStartDate = window.prompt('恋爱起始日期 YYYY-MM-DD', profile.relationshipStartDate);
    if (!relationshipStartDate) return;

    try {
      const nextProfile = await updateProfile({ ...profile, relationshipStartDate });
      setProfile(nextProfile);
      setDaysTogether(differenceInDays(new Date(), new Date(`${nextProfile.relationshipStartDate}T00:00:00`)));
      setError('');
    } catch {
      setError('保存失败，请检查日期格式。');
    }
  };

  return (
    <div className="w-full min-w-0">
      <div className="flex min-w-0 flex-col items-center justify-between gap-8 lg:flex-row lg:gap-12">
        <div className="order-2 min-w-0 flex-1 space-y-6 text-center lg:order-1 lg:text-left">
          <div className="space-y-2">
            <h2 className="text-base font-bold uppercase tracking-widest text-kuromi-purple/60 sm:text-xl md:text-2xl">Our Love Story</h2>
            <h1 className="text-4xl font-black leading-tight text-kuromi-black sm:text-5xl md:text-6xl">
              在一起的第
              <br className="hidden sm:block" />
              <span className="inline-block text-kuromi-pink animate-pulse-soft">{daysTogether}</span> 天
            </h1>
          </div>

          <p className="mx-auto max-w-md text-base font-medium text-gray-500 sm:text-lg lg:mx-0">
            从那天起，我的世界因为有了你而变得五彩斑斓。希望未来的每一天，都能和你一起度过。
          </p>

          {profile && <p className="text-sm font-bold text-kuromi-purple">起始日期：{profile.relationshipStartDate}</p>}
          {error && <p className="text-sm font-bold text-red-500">{error}</p>}

          <div className="flex flex-col justify-center gap-3 sm:flex-row sm:flex-wrap lg:justify-start">
            <button
              onClick={changeStartDate}
              className="w-full rounded-2xl bg-kuromi-purple px-6 py-3.5 font-bold text-white shadow-kuromi transition-all active:scale-95 sm:w-auto sm:px-8 sm:py-4"
            >
              修改起始日
            </button>
            <a
              href="#gallery"
              className="w-full rounded-2xl border-2 border-kuromi-purple/20 bg-white px-6 py-3.5 text-center font-bold text-kuromi-purple transition-all hover:bg-kuromi-purple/5 sm:w-auto sm:px-8 sm:py-4"
            >
              查看相册
            </a>
          </div>
        </div>

        <div className="order-1 flex min-w-0 flex-1 items-center justify-center lg:order-2">
          <div className="relative max-w-full">
            <div className="absolute inset-0 scale-110 rounded-full bg-kuromi-pink/10 animate-pulse-soft" />
            <div className="absolute inset-0 scale-125 rounded-full bg-kuromi-purple/5 animate-pulse-soft" style={{ animationDelay: '1s' }} />
            <button
              type="button"
              className="relative z-10 h-56 w-56 max-w-[72vw] overflow-hidden rounded-full border-4 border-white shadow-2xl glass-panel sm:h-64 sm:w-64 md:h-80 md:w-80 lg:h-96 lg:w-96"
              onClick={changeKuromi}
            >
              <img src={`/assets/人物/kuromi_clean_${randomKuromi}.png`} alt="Kuromi" className="h-full w-full object-contain p-6 transition-transform duration-500 hover:scale-110 sm:p-8" />
            </button>
            <img src="/assets/贴纸/clean_07.png" alt="" className="absolute -right-3 -top-4 w-12 animate-float sm:-right-6 sm:-top-6 sm:w-16" />
            <img src="/assets/贴纸/clean_08.png" alt="" className="absolute -bottom-4 -left-3 w-12 animate-float sm:-bottom-6 sm:-left-6 sm:w-16" style={{ animationDelay: '0.5s' }} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
