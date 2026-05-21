import React, { useEffect, useMemo, useState } from 'react';
import { ensureUnlocked, getSchedule, saveSchedule, type ScheduleData, type ScheduleItem, type SchedulePerson } from '../api/client';

const personLabels: Record<SchedulePerson, string> = {
  her: '她的',
  him: '他的',
  both: '共同',
};

const slotStarts = ['08:00', '10:10', '14:00', '16:10', '19:00'];

const getCourseEndTime = (startIndex: number, duration: number) => {
  const baseEnds = ['09:50', '12:00', '15:50', '18:00', '20:50'];
  const actualEndIndex = startIndex + Math.ceil(duration / 2) - 1;
  return baseEnds[Math.min(actualEndIndex, baseEnds.length - 1)];
};

function getPersonStyle(person: SchedulePerson) {
  if (person === 'him') return 'bg-kuromi-purple/10 text-kuromi-purple border-kuromi-purple/20 shadow-purple-100/20';
  if (person === 'both') return 'bg-kuromi-dark-purple text-white border-kuromi-dark-purple shadow-kuromi shadow-purple-900/20 font-black';
  return 'bg-kuromi-pink/10 text-kuromi-pink border-kuromi-pink/20 shadow-pink-100/20';
}

const Schedule: React.FC = () => {
  const [schedule, setSchedule] = useState<ScheduleData>({ days: [], times: [], items: [] });
  const [error, setError] = useState('');
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);

  const loadSchedule = async () => {
    try {
      setSchedule(await getSchedule());
      setError('');
    } catch {
      setError('无法加载课程表，请确认后端已启动。');
    }
  };

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadSchedule();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, []);

  const activeDayIndex = schedule.days.length === 0 ? 0 : Math.min(selectedDayIndex, schedule.days.length - 1);

  const selectedDayItems = useMemo(() => {
    return schedule.items
      .filter((item) => item.dayIndex === activeDayIndex)
      .sort((a, b) => a.timeIndex - b.timeIndex);
  }, [schedule.items, activeDayIndex]);

  const getCellItem = (dayIndex: number, timeIndex: number) => {
    return schedule.items.find((item) => item.dayIndex === dayIndex && item.timeIndex === timeIndex);
  };

  const isCellCovered = (dayIndex: number, timeIndex: number) => {
    return schedule.items.some((item) => {
      if (item.dayIndex !== dayIndex) return false;
      const rowSpan = Math.ceil((item.duration ?? 2) / 2);
      return timeIndex > item.timeIndex && timeIndex < item.timeIndex + rowSpan;
    });
  };

  const persistSchedule = async (items: ScheduleItem[]) => {
    try {
      setSchedule(await saveSchedule({ ...schedule, items }));
      setError('');
    } catch {
      setError('保存失败，请检查课程数据。');
    }
  };

  const editCell = async (dayIndex: number, timeIndex: number) => {
    if (!(await ensureUnlocked())) return;

    const existing = getCellItem(dayIndex, timeIndex);
    if (existing && window.confirm(`删除「${existing.subject}」吗？点击取消则编辑。`)) {
      await persistSchedule(schedule.items.filter((item) => item !== existing));
      return;
    }

    const subject = window.prompt('课程名称', existing?.subject ?? '');
    if (!subject) return;

    const personInput = window.prompt('归属：her / him / both', existing?.person ?? 'both') as SchedulePerson | null;
    const person = personInput === 'her' || personInput === 'him' || personInput === 'both' ? personInput : 'both';

    const durationInput = window.prompt('持续节数（例如 2 或 4）', String(existing?.duration ?? 2));
    const duration = parseInt(durationInput || '2', 10);

    const nextItem: ScheduleItem = { dayIndex, timeIndex, subject, person, duration };
    const nextItems = existing
      ? schedule.items.map((item) => (item === existing ? { ...existing, ...nextItem } : item))
      : [...schedule.items, nextItem];

    await persistSchedule(nextItems);
  };

  const getCellContent = (item: ScheduleItem | undefined, timeIndex: number) => {
    if (!item) {
      return (
        <div className="flex h-full min-h-[9rem] w-full items-center justify-center opacity-0 transition-opacity hover:opacity-100">
          <span className="text-[10px] font-black text-kuromi-purple/40">点击添加</span>
        </div>
      );
    }

    const startTime = slotStarts[timeIndex];
    const endTime = getCourseEndTime(timeIndex, item.duration ?? 2);

    return (
      <div className={`group relative flex h-full flex-col items-center justify-between overflow-hidden rounded-[2rem] border-2 p-4 text-center shadow-lg transition-all hover:scale-[1.02] ${getPersonStyle(item.person)}`}>
        <div className="pointer-events-none absolute inset-0 flex flex-col justify-evenly opacity-5">
          {Array.from({ length: item.duration ?? 2 }).map((_, index) => (
            <div key={index} className="w-full border-t border-current border-dashed first:border-0" />
          ))}
        </div>

        <div className="z-10 flex flex-col items-center gap-1.5">
          <span className="line-clamp-3 text-sm font-black leading-tight">{item.subject}</span>
          <span className="text-[9px] font-bold uppercase tracking-widest opacity-60">{personLabels[item.person]}</span>
        </div>

        <div className="z-10 mt-2 flex flex-col items-center gap-1">
          <div className="whitespace-nowrap rounded-full bg-white/20 px-3 py-1 text-[9px] font-black backdrop-blur-sm">
            {startTime} - {endTime}
          </div>
          {item.duration && item.duration > 2 && (
            <div className="flex items-center gap-1 text-[8px] font-bold opacity-80">
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              LONG ({item.duration}P)
            </div>
          )}
        </div>

        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white/10 opacity-0 backdrop-blur-[1px] transition-opacity group-hover:opacity-100">
          <span className="text-[10px] font-black uppercase underline decoration-2">Edit</span>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-full flex-col space-y-6 animate-fadeIn md:space-y-8">
      <div className="flex flex-col justify-between gap-5 px-1 md:flex-row md:items-center md:gap-6 md:px-2">
        <div className="flex min-w-0 items-center gap-4 md:gap-6">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl bg-kuromi-purple/10 shadow-inner md:h-16 md:w-16">
            <img src="/assets/stickers/clean_12.png" alt="icon" className="h-10 w-10 animate-float" />
          </div>
          <div className="min-w-0 space-y-1">
            <h2 className="text-3xl font-black tracking-tighter text-kuromi-black md:text-5xl">两人的课程表</h2>
            <p className="text-sm font-medium text-gray-500 md:text-base">看准时间，下课就去见你</p>
            {error && <p className="text-sm font-bold text-red-500">{error}</p>}
          </div>
        </div>

        <div className="flex w-full gap-2 overflow-x-auto rounded-2xl p-2 glass-panel no-scrollbar md:w-auto md:gap-4 md:self-center">
          <div className="shrink-0 rounded-xl bg-kuromi-pink/10 px-3 py-1.5 text-xs font-black text-kuromi-pink shadow-sm md:px-4">她的</div>
          <div className="shrink-0 rounded-xl bg-kuromi-purple/10 px-3 py-1.5 text-xs font-black text-kuromi-purple shadow-sm md:px-4">他的</div>
          <div className="shrink-0 rounded-xl bg-kuromi-dark-purple px-3 py-1.5 text-xs font-black text-white shadow-md md:px-4">共同</div>
        </div>
      </div>

      <div className="space-y-4 md:hidden">
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {schedule.days.map((day, dayIndex) => (
            <button
              key={day}
              type="button"
              onClick={() => setSelectedDayIndex(dayIndex)}
              className={`min-w-16 shrink-0 rounded-2xl px-4 py-3 text-sm font-black transition-all ${
                activeDayIndex === dayIndex ? 'bg-kuromi-dark-purple text-white shadow-kuromi' : 'bg-white/70 text-gray-500'
              }`}
            >
              {day}
            </button>
          ))}
        </div>

        <div className="rounded-[1.5rem] bg-white/55 p-3 shadow-inner">
          <div className="mb-3 flex items-center justify-between px-1">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-gray-400">Today View</p>
              <h3 className="text-2xl font-black text-kuromi-black">{schedule.days[activeDayIndex] ?? '-'}</h3>
            </div>
            <span className="rounded-full bg-kuromi-purple/10 px-3 py-1 text-xs font-black text-kuromi-purple">
              {selectedDayItems.length} 门课
            </span>
          </div>

          <div className="space-y-3">
            {schedule.times.map((time, timeIndex) => {
              if (isCellCovered(activeDayIndex, timeIndex)) return null;

              const item = getCellItem(activeDayIndex, timeIndex);
              const endTime = item ? getCourseEndTime(timeIndex, item.duration ?? 2) : getCourseEndTime(timeIndex, 2);

              return (
                <button
                  key={time}
                  type="button"
                  onClick={() => void editCell(activeDayIndex, timeIndex)}
                  className="flex w-full items-stretch gap-3 rounded-3xl bg-white/75 p-2 text-left shadow-sm transition active:scale-[0.99]"
                >
                  <div className="flex w-16 shrink-0 flex-col items-center justify-center rounded-2xl bg-kuromi-light-pink text-center">
                    <span className="text-sm font-black text-kuromi-black">{time}</span>
                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">start</span>
                  </div>

                  {item ? (
                    <div className={`min-h-24 flex-1 rounded-3xl border-2 p-4 shadow-lg ${getPersonStyle(item.person)}`}>
                      <div className="flex h-full flex-col justify-between gap-4">
                        <div>
                          <div className="flex items-start justify-between gap-3">
                            <p className="min-w-0 text-lg font-black leading-snug">{item.subject}</p>
                            <span className="shrink-0 rounded-full bg-white/25 px-2 py-1 text-[10px] font-black">{personLabels[item.person]}</span>
                          </div>
                          {item.duration && item.duration > 2 && <p className="mt-1 text-xs font-bold opacity-70">{item.duration} 节连上</p>}
                        </div>
                        <div className="w-fit rounded-full bg-white/25 px-3 py-1 text-[11px] font-black">
                          {slotStarts[timeIndex]} - {endTime}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex min-h-24 flex-1 items-center justify-between rounded-3xl border-2 border-dashed border-gray-200 bg-white/40 px-4">
                      <span className="text-sm font-black text-gray-400">点击添加课程</span>
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-kuromi-purple/10 text-lg font-black text-kuromi-purple">+</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="hidden flex-1 overflow-x-auto rounded-4xl p-2 glass-panel no-scrollbar md:block md:rounded-5xl md:p-8">
        <div className="min-w-[1000px] lg:min-w-full">
          <table className="w-full table-fixed border-separate border-spacing-4">
            <thead>
              <tr>
                <th className="w-24 p-2"></th>
                {schedule.days.map((day) => (
                  <th key={day} className="p-2 text-xl font-black tracking-widest text-kuromi-dark-purple">
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {schedule.times.map((time, timeIndex) => (
                <tr key={time}>
                  <td className="whitespace-nowrap p-2 pr-6 text-right text-xs font-black uppercase text-gray-400">
                    <div className="flex flex-col items-end">
                      <span className="text-base font-black text-kuromi-black">{time}</span>
                      <span className="text-[9px] opacity-40">START</span>
                    </div>
                  </td>
                  {schedule.days.map((_, dayIndex) => {
                    if (isCellCovered(dayIndex, timeIndex)) return null;

                    const item = getCellItem(dayIndex, timeIndex);
                    const rowSpan = item ? Math.ceil((item.duration ?? 2) / 2) : 1;

                    return (
                      <td key={dayIndex} rowSpan={rowSpan} className="relative p-0">
                        <button
                          type="button"
                          onClick={() => void editCell(dayIndex, timeIndex)}
                          className={`w-full cursor-pointer rounded-[2rem] transition-all ${!item ? 'h-36 border-2 border-dashed border-gray-200 bg-white/10 hover:bg-white/50' : 'shadow-sm'}`}
                          style={item ? { height: `calc(${rowSpan} * (var(--row-height, 9rem) + 1rem) - 1rem)` } : {}}
                        >
                          <div className="h-full w-full">{getCellContent(item, timeIndex)}</div>
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-end justify-between px-2 pt-1 md:px-4 md:pt-4">
        <img src="/assets/stickers/clean_13.png" alt="" className="h-14 opacity-80 animate-float md:h-24" />
        <div className="group relative mb-1 md:mb-4">
          <div className="absolute -top-16 right-0 whitespace-nowrap rounded-3xl border border-purple-50 bg-white p-4 text-xs font-black text-kuromi-purple opacity-0 shadow-2xl transition-all -translate-y-2 group-hover:translate-y-0 group-hover:opacity-100 md:-left-16 md:right-auto md:text-sm">
            下课请你吃冰淇淋
          </div>
          <img src="/assets/characters/kuromi_clean_05.png" alt="Kuromi" className="h-24 cursor-pointer object-contain transition-transform group-hover:scale-110 md:h-44" />
        </div>
      </div>
    </div>
  );
};

export default Schedule;
