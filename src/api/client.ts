import axios from 'axios';

export type Profile = {
  relationshipStartDate: string;
  herName: string | null;
  himName: string | null;
};

export type EventItem = {
  id: number;
  name: string;
  date: string;
  calendarType: 'solar' | 'lunar';
  lunarMonth: number | null;
  lunarDay: number | null;
  lunarIsLeapMonth: boolean | number;
  time: string | null;
  startTime: string | null;
  endTime: string | null;
  recurrence: 'none' | 'yearly';
  icon: string;
  description: string;
  color: string;
  tag: string;
  sortOrder: number;
};

export type SchedulePerson = 'her' | 'him' | 'both';

export type ScheduleItem = {
  id?: number;
  dayIndex: number;
  timeIndex: number;
  subject: string;
  person: SchedulePerson;
  duration?: number; // Number of periods, e.g., 2 or 4
};

export type ScheduleData = {
  days: string[];
  times: string[];
  items: ScheduleItem[];
};

export type PeriodConfig = {
  id: number;
  cycleDays: number;
  periodDays: number;
};

export type PeriodRecord = {
  id: number;
  startDate: string;
  endDate: string | null;
  note: string | null;
  symptoms: string[];
  createdAt: string;
};

export type PeriodData = {
  config: PeriodConfig;
  records: PeriodRecord[];
  prediction: {
    nextStartDate: string | null;
    daysUntilNext: number | null;
    ovulationDate: string | null;
    ovulationWindowStart: string | null;
    ovulationWindowEnd: string | null;
    daysUntilOvulation: number | null;
    daysUntilOvulationWindow: number | null;
    currentPhase: 'menstrual' | 'follicular' | 'ovulation' | 'luteal' | null;
    currentPhaseLabel: string | null;
  };
};

export type GalleryImage = {
  id: number;
  filename: string;
  originalName: string;
  mimeType: string;
  width: number;
  height: number;
  size: number;
  createdAt: string;
  aspectRatio: number;
  url: string;
};

const tokenKey = 'kuromi_api_token';
const apiBaseURL = import.meta.env.VITE_API_BASE_URL || '/api';
const galleryFilePath = '/gallery/files/';
const galleryImageMaxSide = 1600;
const galleryImageQuality = 0.78;

export const api = axios.create({
  baseURL: apiBaseURL,
});

function resolveApiAssetURL(path: string) {
  if (/^https?:\/\//i.test(path)) return path;

  const normalizedPath = path.startsWith('/api/') ? path.slice('/api'.length) : path;

  if (/^https?:\/\//i.test(apiBaseURL)) {
    return new URL(`${apiBaseURL.replace(/\/$/, '')}${normalizedPath}`, window.location.href).toString();
  }

  const basePath = apiBaseURL.startsWith('/') ? apiBaseURL : `/${apiBaseURL}`;
  return `${basePath.replace(/\/$/, '')}${normalizedPath}`;
}

function normalizeGalleryImage(image: GalleryImage): GalleryImage {
  const filePathIndex = image.url.indexOf(galleryFilePath);
  const filePath = filePathIndex >= 0 ? image.url.slice(filePathIndex) : `/gallery/files/${image.filename}`;
  return {
    ...image,
    url: resolveApiAssetURL(filePath),
  };
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Unable to load image'));
    };
    image.src = url;
  });
}

async function compressGalleryImage(file: File) {
  if (!file.type.startsWith('image/') || file.type === 'image/gif' || file.type === 'image/svg+xml') return file;

  const image = await loadImage(file);
  const scale = Math.min(1, galleryImageMaxSide / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return file;

  context.drawImage(image, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', galleryImageQuality);
  });
  if (!blob || blob.size >= file.size) return file;

  const filename = file.name.replace(/\.[^.]+$/, '') || 'gallery-image';
  return new File([blob], `${filename}.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
}

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem(tokenKey);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export async function unlockWithPin(pin: string) {
  const { data } = await api.post<{ token: string }>('/auth/unlock', { pin });
  sessionStorage.setItem(tokenKey, data.token);
  return data.token;
}

export async function ensureUnlocked() {
  if (sessionStorage.getItem(tokenKey)) return true;

  const pin = window.prompt('请输入 PIN 码');
  if (!pin) return false;

  try {
    await unlockWithPin(pin);
    return true;
  } catch {
    window.alert('PIN 错误，请重试。');
    return false;
  }
}

export async function getProfile() {
  const { data } = await api.get<Profile>('/profile');
  return data;
}

export async function updateProfile(profile: Profile) {
  const { data } = await api.put<Profile>('/profile', profile);
  return data;
}

export async function getEvents() {
  const { data } = await api.get<EventItem[]>('/events');
  return data;
}

export async function createEvent(event: Omit<EventItem, 'id'>) {
  const { data } = await api.post<EventItem>('/events', event);
  return data;
}

export async function updateEvent(event: EventItem) {
  const { data } = await api.put<EventItem>(`/events/${event.id}`, event);
  return data;
}

export async function deleteEvent(id: number) {
  await api.delete(`/events/${id}`);
}

export async function getGalleryImages() {
  const { data } = await api.get<GalleryImage[]>('/gallery');
  return data.map(normalizeGalleryImage);
}

export async function uploadGalleryImage(file: File) {
  const form = new FormData();
  form.append('image', await compressGalleryImage(file));
  const { data } = await api.post<GalleryImage>('/gallery', form);
  return normalizeGalleryImage(data);
}

export async function deleteGalleryImage(id: number) {
  await api.delete(`/gallery/${id}`);
}

export async function getSchedule() {
  const { data } = await api.get<ScheduleData>('/schedule');
  return data;
}

export async function saveSchedule(schedule: ScheduleData) {
  const { data } = await api.put<ScheduleData>('/schedule', schedule);
  return data;
}

export async function getPeriod() {
  const { data } = await api.get<PeriodData>('/period');
  return data;
}

export async function updatePeriodConfig(config: Pick<PeriodConfig, 'cycleDays' | 'periodDays'>) {
  const { data } = await api.put<PeriodData>('/period/config', config);
  return data;
}

export async function createPeriodRecord(record: Omit<PeriodRecord, 'id' | 'createdAt'>) {
  const { data } = await api.post<PeriodRecord>('/period/records', record);
  return data;
}

export async function updatePeriodRecord(record: PeriodRecord) {
  const { data } = await api.put<PeriodRecord>(`/period/records/${record.id}`, record);
  return data;
}

export async function deletePeriodRecord(id: number) {
  await api.delete(`/period/records/${id}`);
}
