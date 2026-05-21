import React, { useEffect, useMemo, useState } from 'react';
import { Lunar } from 'lunar-javascript';
import { getEvents, getPeriod, type EventItem, type PeriodData } from '../api/client';

const chinaHolidayRanges2026 = [
  { name: '元旦假期', icon: '🎉', start: '2026-01-01' },
  { name: '春节假期', icon: '🧧', start: '2026-02-15' },
  { name: '清明假期', icon: '🌿', start: '2026-04-04' },
  { name: '劳动节假期', icon: '🧰', start: '2026-05-01' },
  { name: '端午假期', icon: '🍃', start: '2026-06-19' },
  { name: '中秋假期', icon: '🥮', start: '2026-09-25' },
  { name: '国庆假期', icon: '🇨🇳', start: '2026-10-01' },
];

type Notification = {
  id: string;
  text: string;
  icon: string;
  type: 'event' | 'period' | 'holiday';
};

type Props = {
  onVisibilityChange?: (visible: boolean) => void;
};

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function daysBetween(fromDate: string, toDate: string) {
  return Math.ceil((Date.parse(`${toDate}T00:00:00`) - Date.parse(`${fromDate}T00:00:00`)) / 86_400_000);
}

const NotificationBanner: React.FC<Props> = ({ onVisibilityChange }) => {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [period, setPeriod] = useState<PeriodData | null>(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [nextEvents, nextPeriod] = await Promise.all([getEvents(), getPeriod()]);
        setEvents(nextEvents);
        setPeriod(nextPeriod);
      } catch {
        // 公告是辅助信息，接口失败时不阻塞页面。
      }
    };

    void fetchData();
  }, []);

  const notifications = useMemo(() => {
    const list: Notification[] = [];
    const today = toDateKey(new Date());
    const currentYear = new Date().getFullYear();

    if (period?.prediction.daysUntilNext != null && period.prediction.daysUntilNext >= 0 && period.prediction.daysUntilNext <= 3) {
      const days = period.prediction.daysUntilNext;
      list.push({
        id: 'period-next',
        text: `生理期预计${days === 0 ? '今天' : `${days} 天后`}开始，注意保暖`,
        icon: '🎀',
        type: 'period',
      });
    }

    if (period?.prediction.daysUntilOvulationWindow != null && period.prediction.daysUntilOvulationWindow >= 0 && period.prediction.daysUntilOvulationWindow <= 3) {
      const days = period.prediction.daysUntilOvulationWindow;
      list.push({
        id: 'period-ovulation',
        text: `排卵期预计${days === 0 ? '今天' : `${days} 天后`}开始`,
        icon: '🌙',
        type: 'period',
      });
    }

    for (const event of events) {
      let eventSolarDate: string | null = null;

      if (event.calendarType === 'lunar' && event.lunarMonth && event.lunarDay) {
        try {
          const lunarMonth = event.lunarIsLeapMonth ? -event.lunarMonth : event.lunarMonth;
          eventSolarDate = Lunar.fromYmd(currentYear, lunarMonth, event.lunarDay).getSolar().toYmd();
        } catch {
          // Ignore invalid lunar dates for this year.
        }
      } else if (event.recurrence === 'yearly') {
        eventSolarDate = `${currentYear}-${event.date.slice(5)}`;
      } else {
        eventSolarDate = event.date;
      }

      if (!eventSolarDate) continue;
      const diff = daysBetween(today, eventSolarDate);
      if (diff >= 0 && diff <= 7) {
        list.push({
          id: `event-${event.id}`,
          text: `${diff === 0 ? '今天' : `${diff} 天后`}是：${event.name}`,
          icon: event.icon,
          type: 'event',
        });
      }
    }

    if (currentYear === 2026) {
      for (const range of chinaHolidayRanges2026) {
        const diff = daysBetween(today, range.start);
        if (diff >= 0 && diff <= 7) {
          list.push({
            id: `holiday-${range.name}`,
            text: `${diff === 0 ? '今天' : `${diff} 天后`}开始：${range.name}`,
            icon: range.icon,
            type: 'holiday',
          });
        }
      }
    }

    return list;
  }, [events, period]);

  useEffect(() => {
    onVisibilityChange?.(isVisible && notifications.length > 0);
  }, [isVisible, notifications.length, onVisibilityChange]);

  if (!isVisible || notifications.length === 0) return null;

  const marqueeItems = notifications.length === 1 ? [...notifications, ...notifications, ...notifications, ...notifications] : notifications;
  const marqueePairs = Array.from({ length: Math.ceil(marqueeItems.length / 2) }, (_, index) => {
    const first = marqueeItems[index * 2];
    const second = marqueeItems[index * 2 + 1] ?? marqueeItems[0];
    return [first, second];
  });

  return (
    <div className="relative z-[60] flex h-10 items-center overflow-hidden border-b border-white/10 bg-[#0e0a16] text-white shadow-lg">
      <div className="min-w-0 flex-1 overflow-hidden">
        <div className="marquee-track flex w-max whitespace-nowrap">
          {[0, 1].map((groupIndex) => (
            <div key={groupIndex} className="flex min-w-screen shrink-0 items-center justify-around gap-10 pr-10">
              {marqueePairs.map((pair, pairIndex) => (
                <div key={`${groupIndex}-pair-${pairIndex}`} className="flex items-center gap-5">
                  {pair.map((note, itemIndex) => (
                    <div key={`${note.id}-${pairIndex}-${itemIndex}`} className="flex items-center gap-2">
                      <span className="text-lg drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]">{note.icon}</span>
                      <span className="text-sm font-bold tracking-tight text-white/95 drop-shadow-[0_0_5px_rgba(168,85,247,0.3)]">{note.text}</span>
                    </div>
                  ))}
                  <span className="mx-2 text-kuromi-purple/40">•</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={() => setIsVisible(false)}
        className="relative z-10 mr-3 ml-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-black transition-colors hover:bg-white/20"
        aria-label="关闭公告"
      >
        ×
      </button>

      <style>{`
        @keyframes seamless-marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }

        .marquee-track {
          animation: seamless-marquee 28s linear infinite;
        }

        .marquee-track:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
};

export default NotificationBanner;
