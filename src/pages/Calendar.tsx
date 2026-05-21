import React, { useEffect, useMemo, useState } from 'react';
import { Lunar } from 'lunar-javascript';
import { createEvent, deleteEvent, ensureUnlocked, getEvents, getPeriod, updateEvent, type EventItem, type PeriodData } from '../api/client';

type CalendarMarker = {
  id: string;
  name: string;
  icon: string;
  kind: 'holiday' | 'festival' | 'event' | 'period';
  description?: string;
  event?: EventItem;
};

type PeriodPhase = 'menstrual' | 'follicular' | 'ovulation' | 'luteal';

const emptyEvent: Omit<EventItem, 'id'> = {
  name: '',
  date: new Date().toISOString().slice(0, 10),
  calendarType: 'solar',
  lunarMonth: null,
  lunarDay: null,
  lunarIsLeapMonth: false,
  time: null,
  startTime: null,
  endTime: null,
  recurrence: 'yearly',
  icon: '💗',
  description: '',
  color: 'bg-pink-100 text-pink-600',
  tag: 'MEMORY',
  sortOrder: 0,
};

const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

const solarFestivals: Record<string, CalendarMarker[]> = {
  '01-01': [{ id: 'solar-new-year', name: '元旦', icon: '🎉', kind: 'festival' }],
  '02-14': [{ id: 'valentine', name: '情人节', icon: '🌹', kind: 'festival' }],
  '05-01': [{ id: 'labor-day', name: '劳动节', icon: '🧰', kind: 'festival' }],
  '10-01': [{ id: 'national-day', name: '国庆节', icon: '🇨🇳', kind: 'festival' }],
};

const lunarFestivals = [
  { month: 1, day: 1, name: '春节', icon: '🧧' },
  { month: 1, day: 15, name: '元宵节', icon: '🏮' },
  { month: 5, day: 5, name: '端午节', icon: '🍃' },
  { month: 7, day: 7, name: '七夕节', icon: '💞' },
  { month: 8, day: 15, name: '中秋节', icon: '🥮' },
  { month: 9, day: 9, name: '重阳节', icon: '🍂' },
];

const chinaHolidayRanges2026 = [
  { name: '元旦假期', icon: '🎉', start: '2026-01-01', end: '2026-01-03' },
  { name: '春节假期', icon: '🧧', start: '2026-02-15', end: '2026-02-23' },
  { name: '清明假期', icon: '🌿', start: '2026-04-04', end: '2026-04-06' },
  { name: '劳动节假期', icon: '🧰', start: '2026-05-01', end: '2026-05-05' },
  { name: '端午假期', icon: '🍃', start: '2026-06-19', end: '2026-06-21' },
  { name: '中秋假期', icon: '🥮', start: '2026-09-25', end: '2026-09-27' },
  { name: '国庆假期', icon: '🇨🇳', start: '2026-10-01', end: '2026-10-07' },
];

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(dateKey: string, amount: number) {
  const date = new Date(`${dateKey}T00:00:00`);
  date.setDate(date.getDate() + amount);
  return toDateKey(date);
}

function getMonthDayKey(dateKey: string) {
  return dateKey.slice(5);
}

function getOccurrenceDate(event: EventItem, year: number, monthIndex: number) {
  if (event.calendarType === 'lunar') {
    if (!event.lunarMonth || !event.lunarDay) return null;
    try {
      const lunarMonth = event.lunarIsLeapMonth ? -event.lunarMonth : event.lunarMonth;
      const solarYmd = Lunar.fromYmd(year, lunarMonth, event.lunarDay).getSolar().toYmd();
      const solarDate = new Date(`${solarYmd}T00:00:00`);
      if (solarDate.getMonth() !== monthIndex) return null;
      return solarYmd;
    } catch {
      return null;
    }
  }

  const [, eventMonth, eventDay] = event.date.split('-').map(Number);
  if (event.recurrence === 'yearly') {
    if (eventMonth !== monthIndex + 1) return null;
    return `${year}-${String(eventMonth).padStart(2, '0')}-${String(eventDay).padStart(2, '0')}`;
  }

  const eventDate = new Date(`${event.date}T00:00:00`);
  if (eventDate.getFullYear() !== year || eventDate.getMonth() !== monthIndex) return null;
  return event.date;
}

function getLunarFestivalMarkers(year: number) {
  const markers = new Map<string, CalendarMarker[]>();
  for (const festival of lunarFestivals) {
    try {
      const dateKey = Lunar.fromYmd(year, festival.month, festival.day).getSolar().toYmd();
      markers.set(dateKey, [
        ...(markers.get(dateKey) ?? []),
        { id: `lunar-${festival.month}-${festival.day}`, name: festival.name, icon: festival.icon, kind: 'festival' },
      ]);
    } catch {
      // Ignore lunar dates that do not exist in a specific year.
    }
  }
  return markers;
}

function getHolidayMarkers(year: number) {
  const markers = new Map<string, CalendarMarker[]>();
  if (year !== 2026) return markers;

  for (const range of chinaHolidayRanges2026) {
    for (let dateKey = range.start; dateKey <= range.end; dateKey = addDays(dateKey, 1)) {
      markers.set(dateKey, [
        ...(markers.get(dateKey) ?? []),
        { id: `holiday-${range.name}-${dateKey}`, name: range.name, icon: range.icon, kind: 'holiday' },
      ]);
    }
  }
  return markers;
}

function describeEventDate(event: EventItem) {
  if (event.calendarType === 'lunar') {
    return `农历${event.lunarIsLeapMonth ? '闰' : ''}${event.lunarMonth}月${event.lunarDay}日`;
  }
  return event.date;
}

function describeEventTime(event: EventItem) {
  const start = event.startTime ?? event.time;
  if (start && event.endTime) return `${start}-${event.endTime}`;
  if (start) return start;
  return '全天';
}

function markerClass(kind: CalendarMarker['kind']) {
  if (kind === 'holiday') return 'bg-red-50 text-red-500 border-red-100';
  if (kind === 'festival') return 'bg-purple-50 text-kuromi-purple border-purple-100';
  if (kind === 'period') return 'bg-pink-50 text-kuromi-pink border-pink-100';
  return 'bg-kuromi-pink/10 text-kuromi-pink border-pink-100';
}

function getPhaseLabel(phase?: PeriodPhase) {
  if (phase === 'menstrual') return '经期';
  if (phase === 'follicular') return '卵泡期';
  if (phase === 'ovulation') return '排卵日';
  if (phase === 'luteal') return '黄体期';
  return null;
}

const Calendar: React.FC = () => {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [periodData, setPeriodData] = useState<PeriodData | null>(null);
  const [visibleMonth, setVisibleMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => toDateKey(new Date()));
  const [error, setError] = useState('');

  const monthStart = useMemo(() => new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1), [visibleMonth]);
  const monthTitle = `${monthStart.getFullYear()} 年 ${monthStart.getMonth() + 1} 月`;

  const calendarDays = useMemo(() => {
    const firstDay = monthStart.getDay();
    const daysInMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();
    const cells: Array<Date | null> = Array.from({ length: firstDay }, () => null);

    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push(new Date(monthStart.getFullYear(), monthStart.getMonth(), day));
    }

    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [monthStart]);

  const phasesByDate = useMemo(() => {
    const phases = new Map<string, PeriodPhase>();
    if (!periodData || periodData.records.length === 0) return phases;

    const { cycleDays, periodDays } = periodData.config;
    const sortedRecords = [...periodData.records].sort((a, b) => b.startDate.localeCompare(a.startDate));
    const gridStart = calendarDays.find((day) => day !== null);
    const gridEnd = [...calendarDays].reverse().find((day) => day !== null);
    if (!gridStart || !gridEnd) return phases;

    const startMs = gridStart.getTime() - 30 * 24 * 3600 * 1000;
    const endMs = gridEnd.getTime() + 30 * 24 * 3600 * 1000;

    for (let ms = startMs; ms <= endMs; ms += 24 * 3600 * 1000) {
      const current = new Date(ms);
      const currentStr = toDateKey(current);
      const lastRecord = sortedRecords.find((record) => record.startDate <= currentStr);
      if (!lastRecord) continue;

      const lastStart = new Date(`${lastRecord.startDate}T00:00:00`);
      const daysSinceStart = Math.floor((current.getTime() - lastStart.getTime()) / (24 * 3600 * 1000));
      const dayInCycle = (daysSinceStart % cycleDays) + 1;

      if (dayInCycle <= periodDays) phases.set(currentStr, 'menstrual');
      else if (dayInCycle < Math.floor(cycleDays / 2)) phases.set(currentStr, 'follicular');
      else if (dayInCycle === Math.floor(cycleDays / 2)) phases.set(currentStr, 'ovulation');
      else phases.set(currentStr, 'luteal');
    }

    return phases;
  }, [periodData, calendarDays]);

  const markersByDate = useMemo(() => {
    const grouped = new Map<string, CalendarMarker[]>();
    const holidayMarkers = getHolidayMarkers(monthStart.getFullYear());
    const lunarMarkers = getLunarFestivalMarkers(monthStart.getFullYear());

    for (const [dateKey, markers] of holidayMarkers) grouped.set(dateKey, [...(grouped.get(dateKey) ?? []), ...markers]);
    for (const [dateKey, markers] of lunarMarkers) grouped.set(dateKey, [...(grouped.get(dateKey) ?? []), ...markers]);

    for (const day of calendarDays) {
      if (!day) continue;
      const dateKey = toDateKey(day);
      const fixedSolarMarkers = solarFestivals[getMonthDayKey(dateKey)] ?? [];
      if (fixedSolarMarkers.length > 0) grouped.set(dateKey, [...(grouped.get(dateKey) ?? []), ...fixedSolarMarkers]);
    }

    for (const event of events) {
      const occurrenceDate = getOccurrenceDate(event, monthStart.getFullYear(), monthStart.getMonth());
      if (!occurrenceDate) continue;
      grouped.set(occurrenceDate, [
        ...(grouped.get(occurrenceDate) ?? []),
        {
          id: `event-${event.id}`,
          name: event.name,
          icon: event.icon,
          kind: 'event',
          description: `${describeEventTime(event)} ${event.description}`.trim(),
          event,
        },
      ]);
    }

    return grouped;
  }, [calendarDays, events, monthStart]);

  const selectedMarkers = markersByDate.get(selectedDate) ?? [];
  const selectedPhaseLabel = getPhaseLabel(phasesByDate.get(selectedDate));
  const selectedDetailMarkers: CalendarMarker[] = selectedPhaseLabel
    ? [{ id: `period-${selectedDate}`, name: selectedPhaseLabel, icon: '🎀', kind: 'period' }, ...selectedMarkers]
    : selectedMarkers;
  const selectedCustomEvents = selectedMarkers.flatMap((marker) => (marker.event ? [marker.event] : []));

  const loadData = async () => {
    try {
      const [evs, prd] = await Promise.all([getEvents(), getPeriod()]);
      setEvents(evs);
      setPeriodData(prd);
      setError('');
    } catch {
      setError('无法加载数据，请确认后端已启动。');
    }
  };

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadData(), 0);
    return () => window.clearTimeout(timeout);
  }, []);

  const changeMonth = (amount: number) => {
    const nextMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + amount, 1);
    setVisibleMonth(nextMonth);
    setSelectedDate(toDateKey(nextMonth));
  };

  const upsertEvent = async (event?: EventItem, dateOverride?: string) => {
    if (!(await ensureUnlocked())) return;

    const name = window.prompt('名称', event?.name ?? emptyEvent.name);
    if (!name) return;

    const calendarTypeInput = window.prompt('日期类型：solar 公历 / lunar 农历', event?.calendarType ?? emptyEvent.calendarType);
    const calendarType: EventItem['calendarType'] = calendarTypeInput === 'lunar' ? 'lunar' : 'solar';
    let date = event?.date ?? dateOverride ?? emptyEvent.date;
    let lunarMonth = event?.lunarMonth ?? null;
    let lunarDay = event?.lunarDay ?? null;
    let lunarIsLeapMonth: boolean;

    if (calendarType === 'lunar') {
      lunarMonth = Number(window.prompt('农历月份 1-12', String(lunarMonth ?? 1)));
      lunarDay = Number(window.prompt('农历日期 1-30', String(lunarDay ?? 1)));
      lunarIsLeapMonth = window.confirm('是否为闰月？');
      if (!Number.isInteger(lunarMonth) || !Number.isInteger(lunarDay)) return;
      date = `${new Date().getFullYear()}-${String(lunarMonth).padStart(2, '0')}-${String(lunarDay).padStart(2, '0')}`;
    } else {
      const dateInput = window.prompt('公历日期 YYYY-MM-DD', date);
      if (!dateInput) return;
      date = dateInput;
      lunarMonth = null;
      lunarDay = null;
      lunarIsLeapMonth = false;
    }

    const startTime = window.prompt('开始时间 HH:mm，可留空', event?.startTime ?? event?.time ?? '') || null;
    const endTime = window.prompt('结束时间 HH:mm，可留空', event?.endTime ?? '') || null;
    const recurrenceInput = window.prompt('触发周期：yearly 每年 / none 仅一次', event?.recurrence ?? emptyEvent.recurrence);
    const recurrence: EventItem['recurrence'] = recurrenceInput === 'none' ? 'none' : 'yearly';
    const icon = window.prompt('图标', event?.icon ?? emptyEvent.icon) || emptyEvent.icon;
    const description = window.prompt('描述', event?.description ?? emptyEvent.description) || '';
    const tag = window.prompt('标签', event?.tag ?? emptyEvent.tag) || emptyEvent.tag;

    try {
      const payload = { name, date, calendarType, lunarMonth, lunarDay, lunarIsLeapMonth, time: startTime, startTime, endTime, recurrence, icon, description, tag };
      if (event) await updateEvent({ ...event, ...payload });
      else await createEvent({ ...emptyEvent, ...payload, sortOrder: events.length + 1 });
      await loadData();
      setSelectedDate(dateOverride ?? date);
    } catch {
      setError('保存失败，请检查日期、农历月日和时间格式。');
    }
  };

  const removeEvent = async (event: EventItem) => {
    if (!(await ensureUnlocked()) || !window.confirm(`删除「${event.name}」吗？`)) return;
    await deleteEvent(event.id);
    await loadData();
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div className="space-y-2">
          <h2 className="text-3xl font-black text-kuromi-black md:text-5xl">重要日子</h2>
          <p className="font-medium text-gray-500">点击日历某一天，在下方查看当天日程或创建新日程。</p>
          {error && <p className="text-sm font-bold text-red-500">{error}</p>}
        </div>
        <button onClick={() => void upsertEvent(undefined, selectedDate)} className="flex items-center justify-center gap-2 rounded-xl bg-kuromi-purple/10 px-6 py-3 font-bold text-kuromi-purple transition-all hover:bg-kuromi-purple/20">
          添加新日子 <span className="text-xl">+</span>
        </button>
      </div>

      <section className="space-y-4 rounded-3xl p-3 glass-panel md:p-5">
        <div className="flex items-center justify-between gap-3">
          <button onClick={() => changeMonth(-1)} className="h-9 w-9 rounded-xl bg-white/60 font-black text-kuromi-purple transition-colors hover:bg-kuromi-purple hover:text-white">
            ←
          </button>
          <h3 className="text-xl font-black text-kuromi-black md:text-2xl">{monthTitle}</h3>
          <button onClick={() => changeMonth(1)} className="h-9 w-9 rounded-xl bg-white/60 font-black text-kuromi-purple transition-colors hover:bg-kuromi-purple hover:text-white">
            →
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1.5 text-center">
          {weekDays.map((day) => (
            <div key={day} className="py-1 text-[11px] font-black text-kuromi-dark-purple md:text-xs">
              周{day}
            </div>
          ))}
          {calendarDays.map((day, index) => {
            const dateKey = day ? toDateKey(day) : '';
            const markers = dateKey ? markersByDate.get(dateKey) ?? [] : [];
            const isToday = dateKey === toDateKey(new Date());
            const isSelected = dateKey === selectedDate;

            return (
              <button
                key={`${dateKey}-${index}`}
                type="button"
                onClick={() => day && setSelectedDate(dateKey)}
                className={`min-h-16 rounded-xl border p-1.5 text-left transition-colors md:min-h-20 ${
                  day ? 'border-white/50 bg-white/50 hover:bg-white/80' : 'pointer-events-none border-white/20 bg-white/20'
                } ${isToday ? 'ring-2 ring-kuromi-pink' : ''} ${isSelected ? 'outline outline-2 outline-kuromi-purple' : ''}`}
              >
                {day && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-black md:text-sm ${isToday ? 'text-kuromi-pink' : 'text-gray-500'}`}>{day.getDate()}</span>
                      {markers.length > 0 && <span className="text-[9px] font-black text-kuromi-purple">{markers.length}</span>}
                    </div>
                    <div className="mt-1 space-y-0.5">
                      {markers.slice(0, 2).map((marker) => (
                        <div key={marker.id} title={marker.description ?? marker.name} className={`truncate rounded-lg border px-1.5 py-0.5 text-[9px] font-bold md:text-[10px] ${markerClass(marker.kind)}`}>
                          <span className="mr-1">{marker.icon}</span>
                          {marker.name}
                        </div>
                      ))}
                      {markers.length > 2 && <div className="px-1 text-[9px] font-bold text-gray-400">+{markers.length - 2}</div>}
                    </div>
                  </>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-[1.5rem] p-4 glass-panel md:rounded-[2rem] md:p-6">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h3 className="text-2xl font-black text-kuromi-black">{selectedDate} 的日程</h3>
            <p className="mt-1 text-sm font-medium text-gray-500">是否创建这一天的新日程？</p>
          </div>
          <button onClick={() => void upsertEvent(undefined, selectedDate)} className="rounded-xl bg-kuromi-black px-5 py-3 text-sm font-black text-white shadow-lg transition-all hover:bg-kuromi-purple active:scale-95">
            创建日程
          </button>
        </div>

        <div className="mt-5 space-y-3">
          {selectedDetailMarkers.length === 0 ? (
            <p className="rounded-2xl bg-white/50 p-4 text-center text-sm font-bold text-gray-400">当天还没有日程或节日标注。</p>
          ) : (
            selectedDetailMarkers.map((marker) => (
              <div key={marker.id} className={`rounded-2xl border p-4 ${markerClass(marker.kind)}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-base font-black">
                      <span className="mr-2">{marker.icon}</span>
                      {marker.name}
                    </p>
                    <p className="mt-1 text-xs font-bold opacity-70">{marker.description || marker.kind}</p>
                  </div>
                  {marker.event && (
                    <div className="flex shrink-0 gap-2">
                      <button onClick={() => void upsertEvent(marker.event as EventItem, selectedDate)} className="rounded-xl bg-white/60 px-3 py-2 text-xs font-black transition hover:bg-kuromi-purple hover:text-white">
                        编辑
                      </button>
                      <button onClick={() => void removeEvent(marker.event as EventItem)} className="rounded-xl bg-white/60 px-3 py-2 text-xs font-black transition hover:bg-kuromi-pink hover:text-white">
                        删除
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {selectedCustomEvents.length > 0 && (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {selectedCustomEvents.map((event) => (
            <div key={event.id} className="relative overflow-hidden rounded-[1.5rem] p-4 glass-panel md:p-6">
              <div className={`absolute -right-4 -bottom-4 h-24 w-24 rounded-full opacity-10 ${event.color}`} />
              <div className="relative z-10 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <span className="text-4xl">{event.icon}</span>
                  <span className="rounded-full border border-white/50 bg-white/50 px-3 py-1 text-sm font-bold text-gray-400">{event.tag}</span>
                </div>
                <div>
                  <h3 className="text-2xl font-black text-kuromi-black">{event.name}</h3>
                  <p className="mt-1 text-sm text-gray-400">{event.description}</p>
                </div>
                <div className="border-t border-gray-100 pt-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Date</p>
                  <p className="text-xl font-black text-kuromi-pink">{describeEventDate(event)}</p>
                  <p className="text-xs font-bold text-gray-400">
                    {describeEventTime(event)} · {event.recurrence === 'yearly' ? '每年触发' : '仅一次'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
};

export default Calendar;
