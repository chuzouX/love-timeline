import React, { useEffect, useState } from 'react';
import {
  createPeriodRecord,
  deletePeriodRecord,
  ensureUnlocked,
  getPeriod,
  updatePeriodConfig,
  updatePeriodRecord,
  type PeriodData,
  type PeriodRecord,
} from '../api/client';

const PeriodTracker: React.FC = () => {
  const [period, setPeriod] = useState<PeriodData | null>(null);
  const [error, setError] = useState('');

  const loadPeriod = async () => {
    try {
      setPeriod(await getPeriod());
      setError('');
    } catch {
      setError('无法加载关怀记录，请确认后端已启动。');
    }
  };

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadPeriod();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, []);

  const editConfig = async () => {
    if (!period || !(await ensureUnlocked())) return;

    const cycleDays = Number(window.prompt('平均周期天数', String(period.config.cycleDays)));
    const periodDays = Number(window.prompt('持续天数', String(period.config.periodDays)));
    if (!Number.isInteger(cycleDays) || !Number.isInteger(periodDays)) return;

    try {
      setPeriod(await updatePeriodConfig({ cycleDays, periodDays }));
    } catch {
      setError('保存失败，周期需要在 15-60 天，持续天数需要在 1-14 天。');
    }
  };

  const upsertRecord = async (record?: PeriodRecord) => {
    if (!(await ensureUnlocked())) return;

    const startDate = window.prompt('开始日期 YYYY-MM-DD', record?.startDate ?? new Date().toISOString().slice(0, 10));
    if (!startDate) return;
    const endDate = window.prompt('结束日期 YYYY-MM-DD，可留空', record?.endDate ?? '') || null;
    const note = window.prompt('备注，可留空', record?.note ?? '') || null;
    const symptoms = (window.prompt('症状，用逗号分隔，可留空', record?.symptoms.join(',') ?? '') || '')
      .split(',')
      .map((symptom) => symptom.trim())
      .filter(Boolean);

    try {
      if (record) {
        await updatePeriodRecord({ ...record, startDate, endDate, note, symptoms });
      } else {
        await createPeriodRecord({ startDate, endDate, note, symptoms });
      }
      await loadPeriod();
    } catch {
      setError('保存失败，请检查日期格式。');
    }
  };

  const removeRecord = async (record: PeriodRecord) => {
    if (!(await ensureUnlocked()) || !window.confirm(`删除 ${record.startDate} 的记录吗？`)) return;
    await deletePeriodRecord(record.id);
    await loadPeriod();
  };

  const latestRecord = period?.records[0];
  const daysUntilNext = period?.prediction.daysUntilNext ?? 0;
  const cycleDays = period?.config.cycleDays ?? 28;
  const progress = Math.max(0, Math.min(282, Math.round(((cycleDays - daysUntilNext) / cycleDays) * 282)));

  return (
    <div className="space-y-10 animate-fadeIn h-full flex flex-col">
      <div className="flex items-center gap-6">
        <div className="w-16 h-16 rounded-3xl bg-kuromi-pink/10 flex items-center justify-center">
          <img src="/assets/贴纸/clean_09.png" alt="icon" className="h-10 w-10" />
        </div>
        <div className="space-y-1">
          <h2 className="text-3xl md:text-5xl font-black text-kuromi-black">暖心关怀</h2>
          <p className="text-gray-500 font-medium">身体不舒服的时候，一定要告诉我哦</p>
          {error && <p className="text-sm text-red-500 font-bold">{error}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 md:gap-8">
        <div className="lg:col-span-2 glass-panel p-4 md:p-12 rounded-[1.5rem] md:rounded-[3rem] bg-gradient-to-br from-pink-50 to-white relative overflow-hidden flex flex-col md:flex-row items-center gap-6 md:gap-12">
          <div className="relative">
            <svg className="w-48 h-48 md:w-64 md:h-64 transform -rotate-90">
              <circle cx="50%" cy="50%" r="45%" fill="none" stroke="#E5E7EB" strokeWidth="12" />
              <circle
                cx="50%"
                cy="50%"
                r="45%"
                fill="none"
                stroke="#EC4899"
                strokeWidth="12"
                strokeDasharray={`${progress} 282`}
                strokeLinecap="round"
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-gray-400 text-sm font-bold uppercase tracking-widest">Next in</span>
              <span className="text-6xl md:text-8xl font-black text-kuromi-pink">{daysUntilNext}</span>
              <span className="text-gray-400 text-sm font-bold uppercase tracking-widest">Days</span>
            </div>
            <img src="/assets/贴纸/clean_10.png" alt="" className="absolute -top-4 -left-4 w-16 animate-float" />
          </div>

          <div className="flex-1 space-y-6 w-full">
            <div className="bg-white/60 p-6 rounded-2xl border border-white shadow-sm">
              <span className="text-xs text-gray-400 font-black uppercase tracking-widest">Last Cycle Started</span>
              <p className="text-2xl font-black text-kuromi-black mt-1">{latestRecord?.startDate ?? '-'}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/60 p-6 rounded-2xl border border-white shadow-sm">
                <span className="text-xs text-gray-400 font-black uppercase tracking-widest">Avg Cycle</span>
                <p className="text-2xl font-black text-kuromi-black mt-1">{period?.config.cycleDays ?? '-'}d</p>
              </div>
              <div className="bg-white/60 p-6 rounded-2xl border border-white shadow-sm">
                <span className="text-xs text-gray-400 font-black uppercase tracking-widest">Duration</span>
                <p className="text-2xl font-black text-kuromi-black mt-1">{period?.config.periodDays ?? '-'}d</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button onClick={() => void upsertRecord()} className="w-full py-4 bg-kuromi-pink text-white rounded-2xl font-black shadow-lg shadow-pink-200 hover:shadow-xl transition-all active:scale-95">
                记录今天
              </button>
              <button onClick={editConfig} className="w-full py-4 bg-white text-kuromi-pink border-2 border-pink-100 rounded-2xl font-black hover:bg-pink-50 transition-all active:scale-95">
                调整周期
              </button>
            </div>
          </div>
        </div>

        <div className="glass-panel p-4 md:p-8 rounded-[1.5rem] md:rounded-[3rem] space-y-6 flex flex-col">
          <h3 className="text-2xl font-black text-kuromi-black">记录</h3>
          <div className="flex-1 space-y-3 overflow-y-auto max-h-80 pr-1">
            {period?.records.map((record) => (
              <div key={record.id} className="p-4 bg-white/50 rounded-2xl border border-white/50 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-black text-kuromi-black">{record.startDate}</span>
                  <span className="text-xs text-gray-400">{record.endDate ?? '进行中'}</span>
                </div>
                {record.note && <p className="text-sm text-gray-500">{record.note}</p>}
                <div className="flex gap-2">
                  <button onClick={() => void upsertRecord(record)} className="px-3 py-1 rounded-lg bg-kuromi-purple/10 text-kuromi-purple text-xs font-black">编辑</button>
                  <button onClick={() => void removeRecord(record)} className="px-3 py-1 rounded-lg bg-pink-50 text-kuromi-pink text-xs font-black">删除</button>
                </div>
              </div>
            ))}
          </div>
          <img src="/assets/人物/kuromi_clean_15.png" alt="" className="h-40 object-contain self-center animate-float" />
        </div>
      </div>
    </div>
  );
};

export default PeriodTracker;
