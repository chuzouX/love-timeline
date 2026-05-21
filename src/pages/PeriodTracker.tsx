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

const phaseStyles: Record<string, string> = {
  menstrual: 'bg-pink-100 text-kuromi-pink border-pink-200',
  follicular: 'bg-purple-50 text-kuromi-purple border-purple-100',
  ovulation: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  luteal: 'bg-blue-50 text-blue-600 border-blue-100',
};

const phaseTips: Record<string, string> = {
  menstrual: '经期中，注意保暖、休息和补水。',
  follicular: '卵泡期，身体状态通常在恢复上升。',
  ovulation: '排卵期，按下次经期前 14 天估算，并覆盖前 5 天到后 1 天。',
  luteal: '黄体期，可能更容易疲惫或情绪波动。',
};

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
    const timeout = window.setTimeout(() => void loadPeriod(), 0);
    return () => window.clearTimeout(timeout);
  }, []);

  const editConfig = async () => {
    if (!period || !(await ensureUnlocked())) return;

    const cycleDays = Number(window.prompt('平均周期天数', String(period.config.cycleDays)));
    const periodDays = Number(window.prompt('经期持续天数', String(period.config.periodDays)));
    if (!Number.isInteger(cycleDays) || !Number.isInteger(periodDays)) return;

    try {
      setPeriod(await updatePeriodConfig({ cycleDays, periodDays }));
      setError('');
    } catch {
      setError('保存失败，周期需要在 15-60 天，经期持续天数需要在 1-14 天。');
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
      if (record) await updatePeriodRecord({ ...record, startDate, endDate, note, symptoms });
      else await createPeriodRecord({ startDate, endDate, note, symptoms });
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

  const prediction = period?.prediction;
  const daysUntilNext = prediction?.daysUntilNext ?? 0;
  const cycleDays = period?.config.cycleDays ?? 28;
  const elapsedDays = Math.max(0, cycleDays - daysUntilNext);
  const progress = Math.max(0, Math.min(282, Math.round((elapsedDays / cycleDays) * 282)));
  const currentPhase = prediction?.currentPhase ?? null;
  const currentPhaseLabel = prediction?.currentPhaseLabel ?? '暂无预测';
  const currentPhaseStyle = currentPhase ? phaseStyles[currentPhase] : 'bg-white/60 text-gray-500 border-white';

  return (
    <div className="flex h-full flex-col space-y-8 animate-fadeIn">
      <div className="flex items-center gap-4 md:gap-6">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl bg-kuromi-pink/10 md:h-16 md:w-16">
          <img src="/assets/stickers/clean_09.png" alt="icon" className="h-10 w-10" />
        </div>
        <div className="min-w-0 space-y-1">
          <h2 className="text-3xl font-black text-kuromi-black md:text-5xl">暖心关怀</h2>
          <p className="font-medium text-gray-500">按最近一次记录估算经期、排卵期和当前阶段。</p>
          {error && <p className="text-sm font-bold text-red-500">{error}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 md:gap-8 lg:grid-cols-3">
        <div className="relative flex flex-col items-center gap-6 overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-pink-50 to-white p-4 glass-panel md:flex-row md:gap-12 md:rounded-[3rem] md:p-12 lg:col-span-2">
          <div className="relative shrink-0">
            <svg className="h-48 w-48 -rotate-90 transform md:h-64 md:w-64">
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
              <span className="text-sm font-bold uppercase tracking-widest text-gray-400">Next in</span>
              <span className="text-6xl font-black text-kuromi-pink md:text-8xl">{daysUntilNext}</span>
              <span className="text-sm font-bold uppercase tracking-widest text-gray-400">Days</span>
            </div>
            <img src="/assets/stickers/clean_10.png" alt="" className="absolute -top-4 -left-4 w-16 animate-float" />
          </div>

          <div className="w-full min-w-0 flex-1 space-y-5">
            <div className={`rounded-2xl border p-5 shadow-sm ${currentPhaseStyle}`}>
              <span className="text-xs font-black uppercase tracking-widest opacity-70">Current Phase</span>
              <p className="mt-1 text-3xl font-black">{currentPhaseLabel}</p>
              <p className="mt-2 text-sm font-bold opacity-75">{currentPhase ? phaseTips[currentPhase] : '请先添加一次经期记录。'}</p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white bg-white/60 p-5 shadow-sm">
                <span className="text-xs font-black uppercase tracking-widest text-gray-400">下次经期</span>
                <p className="mt-1 text-2xl font-black text-kuromi-black">{prediction?.nextStartDate ?? '-'}</p>
                <p className="text-sm font-bold text-gray-400">{prediction?.daysUntilNext != null ? `${prediction.daysUntilNext} 天后` : '暂无预测'}</p>
              </div>
              <div className="rounded-2xl border border-yellow-100 bg-yellow-50/80 p-5 shadow-sm">
                <span className="text-xs font-black uppercase tracking-widest text-yellow-600/70">排卵期</span>
                <p className="mt-1 text-xl font-black text-yellow-700">
                  {prediction?.ovulationWindowStart && prediction?.ovulationWindowEnd ? `${prediction.ovulationWindowStart} 至 ${prediction.ovulationWindowEnd}` : '-'}
                </p>
                <p className="text-sm font-bold text-yellow-600/70">排卵日：{prediction?.ovulationDate ?? '-'}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl border border-white bg-white/60 p-5 shadow-sm">
                <span className="text-xs font-black uppercase tracking-widest text-gray-400">平均周期</span>
                <p className="mt-1 text-2xl font-black text-kuromi-black">{period?.config.cycleDays ?? '-'}d</p>
              </div>
              <div className="rounded-2xl border border-white bg-white/60 p-5 shadow-sm">
                <span className="text-xs font-black uppercase tracking-widest text-gray-400">经期天数</span>
                <p className="mt-1 text-2xl font-black text-kuromi-black">{period?.config.periodDays ?? '-'}d</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button onClick={() => void upsertRecord()} className="w-full rounded-2xl bg-kuromi-pink py-4 font-black text-white shadow-lg shadow-pink-200 transition-all hover:shadow-xl active:scale-95">
                记录今天
              </button>
              <button onClick={editConfig} className="w-full rounded-2xl border-2 border-pink-100 bg-white py-4 font-black text-kuromi-pink transition-all hover:bg-pink-50 active:scale-95">
                调整周期
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col space-y-6 rounded-[1.5rem] p-4 glass-panel md:rounded-[3rem] md:p-8">
          <h3 className="text-2xl font-black text-kuromi-black">记录</h3>
          <div className="max-h-80 flex-1 space-y-3 overflow-y-auto pr-1">
            {period?.records.map((record) => (
              <div key={record.id} className="space-y-2 rounded-2xl border border-white/50 bg-white/50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-black text-kuromi-black">{record.startDate}</span>
                  <span className="text-xs text-gray-400">{record.endDate ?? '进行中'}</span>
                </div>
                {record.note && <p className="text-sm text-gray-500">{record.note}</p>}
                {record.symptoms.length > 0 && <p className="text-xs font-bold text-kuromi-purple">{record.symptoms.join('、')}</p>}
                <div className="flex gap-2">
                  <button onClick={() => void upsertRecord(record)} className="rounded-lg bg-kuromi-purple/10 px-3 py-1 text-xs font-black text-kuromi-purple">
                    编辑
                  </button>
                  <button onClick={() => void removeRecord(record)} className="rounded-lg bg-pink-50 px-3 py-1 text-xs font-black text-kuromi-pink">
                    删除
                  </button>
                </div>
              </div>
            ))}
            {period?.records.length === 0 && <p className="rounded-2xl bg-white/50 p-4 text-center text-sm font-bold text-gray-400">还没有记录。</p>}
          </div>
          <img src="/assets/characters/kuromi_clean_15.png" alt="" className="h-40 self-center object-contain animate-float" />
        </div>
      </div>
    </div>
  );
};

export default PeriodTracker;
