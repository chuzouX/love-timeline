import React, { useEffect, useState, useMemo } from 'react';
import { getEvents, getPeriod, type EventItem, type PeriodData } from '../api/client';
import { Lunar } from 'lunar-javascript';

const chinaHolidayRanges2026 = [
  { name: '元旦假期', icon: '🎉', start: '2026-01-01', end: '2026-01-03' },
  { name: '春节假期', icon: '🧧', start: '2026-02-15', end: '2026-02-23' },
  { name: '清明假期', icon: '🌿', start: '2026-04-04', end: '2026-04-06' },
  { name: '劳动节假期', icon: '🧰', start: '2026-05-01', end: '2026-05-05' },
  { name: '端午假期', icon: '🍃', start: '2026-06-19', end: '2026-06-21' },
  { name: '中秋假期', icon: '🥮', start: '2026-09-25', end: '2026-09-27' },
  { name: '国庆假期', icon: '🇨🇳', start: '2026-10-01', end: '2026-10-07' },
];

type Notification = {
  id: string;
  text: string;
  icon: string;
  type: 'event' | 'period' | 'holiday';
};

interface Props {
  onVisibilityChange?: (visible: boolean) => void;
}

const NotificationBanner: React.FC<Props> = ({ onVisibilityChange }) => {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [period, setPeriod] = useState<PeriodData | null>(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [evs, prd] = await Promise.all([getEvents(), getPeriod()]);
        setEvents(evs);
        setPeriod(prd);
      } catch {
        // Silently fail if data can't be fetched
      }
    };
    void fetchData();
  }, []);

  const notifications = useMemo(() => {
    const list: Notification[] = [];
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const currentYear = today.getFullYear();

    // 1. Check Period
    if (period?.prediction?.daysUntilNext !== undefined && period.prediction.daysUntilNext !== null) {
      const days = period.prediction.daysUntilNext;
      if (days <= 3 && days >= 0) {
        list.push({
          id: 'period-prediction',
          text: `生理期预计还有 ${days === 0 ? '今天' : days + ' 天'} 开始，注意保暖哦`,
          icon: '🎀',
          type: 'period'
        });
      }
    }

    // 2. Check Custom Events
    for (const event of events) {
      let eventSolarDate: string | null = null;
      if (event.calendarType === 'lunar') {
        if (event.lunarMonth && event.lunarDay) {
          try {
            const lunarMonth = event.lunarIsLeapMonth ? -event.lunarMonth : event.lunarMonth;
            eventSolarDate = Lunar.fromYmd(currentYear, lunarMonth, event.lunarDay).getSolar().toYmd();
          } catch { /* skip */ }
        }
      } else {
        if (event.recurrence === 'yearly') {
          const monthDay = event.date.slice(5);
          eventSolarDate = `${currentYear}-${monthDay}`;
        } else {
          eventSolarDate = event.date;
        }
      }

      if (eventSolarDate) {
        const diff = Math.ceil((new Date(`${eventSolarDate}T00:00:00`).getTime() - new Date(`${todayStr}T00:00:00`).getTime()) / (1000 * 3600 * 24));
        if (diff >= 0 && diff <= 7) {
          list.push({
            id: `event-${event.id}`,
            text: `${diff === 0 ? '今天' : diff + ' 天后'}是：${event.name}`,
            icon: event.icon,
            type: 'event'
          });
        }
      }
    }

    // 3. Check Holidays
    if (currentYear === 2026) {
      for (const range of chinaHolidayRanges2026) {
        const diff = Math.ceil((new Date(`${range.start}T00:00:00`).getTime() - new Date(`${todayStr}T00:00:00`).getTime()) / (1000 * 3600 * 24));
        if (diff >= 0 && diff <= 7) {
          list.push({
            id: `holiday-${range.name}`,
            text: `${diff === 0 ? '今天' : diff + ' 天后'}开始：${range.name}`,
            icon: range.icon,
            type: 'holiday'
          });
        }
      }
    }

    return list;
  }, [events, period]);

  useEffect(() => {
    const finalVisible = isVisible && notifications.length > 0;
    onVisibilityChange?.(finalVisible);
  }, [isVisible, notifications, onVisibilityChange]);

  if (!isVisible || notifications.length === 0) return null;

  return (
    <div className="relative z-[60] bg-kuromi-black text-white px-4 py-2 overflow-hidden flex items-center h-10 shadow-lg border-b border-white/10">
      <div className="flex-1 flex items-center justify-center gap-12 animate-marquee whitespace-nowrap">
        {/* Duplicate list to ensure seamless marquee if short */}
        {[...notifications, ...notifications].map((note, i) => (
          <div key={`${note.id}-${i}`} className="flex items-center gap-2">
            <span className="text-lg">{note.icon}</span>
            <span className="text-sm font-bold tracking-tight">{note.text}</span>
            <span className="mx-6 opacity-30 text-kuromi-purple">•</span>
          </div>
        ))}
      </div>
      <button 
        onClick={() => setIsVisible(false)}
        className="ml-4 p-1 hover:bg-white/20 rounded-full transition-colors shrink-0"
        aria-label="关闭公告"
      >
        <span className="text-xs">✕</span>
      </button>
      
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 30s linear infinite;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
};

export default NotificationBanner;
