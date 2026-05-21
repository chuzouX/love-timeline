import React, { useEffect, useState } from 'react';
import { ensureUnlocked, getSchedule, saveSchedule, type ScheduleData, type ScheduleItem, type SchedulePerson } from '../api/client';

const personLabels: Record<SchedulePerson, string> = {
  her: '她的',
  him: '他的',
  both: '共同',
};

// Base start times for the slots
const slotStarts = ['08:00', '10:10', '14:00', '16:10', '19:00'];

// End times based on: 50m class + 10m break + 50m class
const getCourseEndTime = (startIndex: number, duration: number) => {
  const baseEnds = ['09:50', '12:00', '15:50', '18:00', '20:50'];
  const actualEndIndex = startIndex + Math.ceil(duration / 2) - 1;
  return baseEnds[Math.min(actualEndIndex, baseEnds.length - 1)];
};

const Schedule: React.FC = () => {
  const [schedule, setSchedule] = useState<ScheduleData>({ days: [], times: [], items: [] });
  const [error, setError] = useState('');

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
    
    const durationInput = window.prompt('持续节数 (如 2 或 4)', String(existing?.duration ?? 2));
    const duration = parseInt(durationInput || '2', 10);

    const nextItem: ScheduleItem = { dayIndex, timeIndex, subject, person, duration };
    const nextItems = existing
      ? schedule.items.map((item) => (item === existing ? { ...existing, ...nextItem } : item))
      : [...schedule.items, nextItem];

    await persistSchedule(nextItems);
  };

  const persistSchedule = async (items: ScheduleItem[]) => {
    try {
      setSchedule(await saveSchedule({ ...schedule, items }));
      setError('');
    } catch {
      setError('保存失败，请检查课程数据。');
    }
  };

  const getCellContent = (item: ScheduleItem | undefined, timeIndex: number) => {
    if (!item) return (
      <div className="h-full w-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity min-h-[7rem] md:min-h-[9rem]">
        <span className="text-[10px] text-kuromi-purple/40 font-black">点击添加</span>
      </div>
    );

    let style = 'bg-kuromi-pink/10 text-kuromi-pink border-kuromi-pink/20 shadow-pink-100/20';
    if (item.person === 'him') style = 'bg-kuromi-purple/10 text-kuromi-purple border-kuromi-purple/20 shadow-purple-100/20';
    if (item.person === 'both') style = 'bg-kuromi-dark-purple text-white border-kuromi-dark-purple shadow-kuromi shadow-purple-900/20 font-black';

    const startTime = slotStarts[timeIndex];
    const endTime = getCourseEndTime(timeIndex, item.duration ?? 2);

    return (
      <div className={`p-4 rounded-[2rem] h-full flex flex-col items-center justify-between text-center transition-all hover:scale-[1.02] border-2 shadow-lg relative group overflow-hidden ${style}`}>
        {/* Background small class markers */}
        <div className="absolute inset-0 pointer-events-none opacity-5 flex flex-col justify-evenly">
          {Array.from({ length: item.duration ?? 2 }).map((_, i) => (
            <div key={i} className="w-full border-t border-current border-dashed first:border-0" />
          ))}
        </div>

        <div className="flex flex-col items-center gap-1.5 z-10">
          <span className="text-xs md:text-sm font-black leading-tight line-clamp-3">{item.subject}</span>
          <span className="text-[9px] opacity-60 font-bold uppercase tracking-widest">{personLabels[item.person]}</span>
        </div>

        <div className="mt-2 flex flex-col items-center gap-1 z-10">
           <div className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-[9px] font-black whitespace-nowrap">
              {startTime} - {endTime}
           </div>
           {item.duration && item.duration > 2 && (
            <div className="hidden md:flex items-center gap-1 text-[8px] font-bold opacity-80">
               <span className="w-1.5 h-1.5 rounded-full bg-current" />
               LONG ({item.duration}P)
            </div>
           )}
        </div>

        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none backdrop-blur-[1px]">
           <span className="text-[10px] font-black underline decoration-2 uppercase">Edit</span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-fadeIn h-full flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 rounded-3xl bg-kuromi-purple/10 flex items-center justify-center shadow-inner">
            <img src="/assets/stickers/clean_12.png" alt="icon" className="h-10 w-10 animate-float" />
          </div>
          <div className="space-y-1">
            <h2 className="text-3xl md:text-5xl font-black text-kuromi-black tracking-tighter">两人的课程表</h2>
            <p className="text-gray-500 font-medium">看准时间，下课就去见你 🏃‍♂️💨</p>
            {error && <p className="text-sm text-red-500 font-bold">{error}</p>}
          </div>
        </div>

        <div className="flex gap-4 p-2 glass-panel rounded-2xl self-start md:self-center">
          <div className="flex items-center gap-2 px-4 py-1.5 bg-kuromi-pink/10 rounded-xl text-xs font-black text-kuromi-pink shadow-sm">她的</div>
          <div className="flex items-center gap-2 px-4 py-1.5 bg-kuromi-purple/10 rounded-xl text-xs font-black text-kuromi-purple shadow-sm">他的</div>
          <div className="flex items-center gap-2 px-4 py-1.5 bg-kuromi-dark-purple rounded-xl text-xs font-black text-white shadow-md">共同</div>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto no-scrollbar glass-panel rounded-4xl md:rounded-5xl p-2 md:p-8">
        <div className="min-w-[1000px] lg:min-w-full">
          <table className="w-full border-separate border-spacing-3 md:border-spacing-4 table-fixed">
            <thead>
              <tr>
                <th className="w-16 md:w-24 p-2"></th>
                {schedule.days.map((day) => (
                  <th key={day} className="p-2 text-kuromi-dark-purple font-black text-sm md:text-xl tracking-tighter md:tracking-widest">{day}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {schedule.times.map((time, timeIndex) => (
                <tr key={time}>
                  <td className="p-2 text-[10px] md:text-xs text-gray-400 font-black uppercase text-right pr-2 md:pr-6 whitespace-nowrap">
                     <div className="flex flex-col items-end">
                        <span className="text-kuromi-black text-sm md:text-base font-black">{time}</span>
                        <span className="opacity-40 text-[8px] md:text-[9px]">START</span>
                     </div>
                  </td>
                  {schedule.days.map((_, dayIndex) => {
                    if (isCellCovered(dayIndex, timeIndex)) return null;
                    
                    const item = getCellItem(dayIndex, timeIndex);
                    const rowSpan = item ? Math.ceil((item.duration ?? 2) / 2) : 1;

                    return (
                      <td 
                        key={dayIndex} 
                        rowSpan={rowSpan}
                        className="relative p-0"
                      >
                        <button 
                          onClick={() => void editCell(dayIndex, timeIndex)} 
                          className={`w-full rounded-[2rem] transition-all cursor-pointer ${!item ? 'h-28 md:h-36 border-2 border-dashed border-gray-200 bg-white/10 hover:bg-white/50' : 'shadow-sm'}`}
                          style={item ? { height: `calc(${rowSpan} * (var(--row-height, 9rem) + 1rem) - 1rem)` } : {}}
                        >
                          <div className="h-full w-full">
                            {getCellContent(item, timeIndex)}
                          </div>
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

      <div className="flex justify-between items-end px-4 mt-4">
        <img src="/assets/stickers/clean_13.png" alt="" className="h-16 md:h-24 animate-float opacity-80" />
        <div className="relative group mb-4">
          <div className="absolute -top-16 -left-16 bg-white p-4 rounded-3xl shadow-2xl text-xs md:text-sm font-black text-kuromi-purple border border-purple-50 opacity-0 group-hover:opacity-100 transition-all -translate-y-2 group-hover:translate-y-0 whitespace-nowrap">
            🍦 嘿！下课请你吃冰淇淋~
          </div>
          <img src="/assets/characters/kuromi_clean_05.png" alt="Kuromi" className="h-28 md:h-44 object-contain cursor-pointer transform transition-transform group-hover:scale-110" />
        </div>
      </div>
    </div>
  );
};

export default Schedule;
