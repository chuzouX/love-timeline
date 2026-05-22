const umamiScriptURL = import.meta.env.VITE_UMAMI_SCRIPT_URL;
const umamiWebsiteID = import.meta.env.VITE_UMAMI_WEBSITE_ID;
const umamiBaseURL = import.meta.env.VITE_UMAMI_BASE_URL || getOriginFromURL(umamiScriptURL);
const umamiShareID = import.meta.env.VITE_UMAMI_SHARE_ID;
const umamiTimezone = import.meta.env.VITE_UMAMI_TIMEZONE || 'Asia/Shanghai';
const statsCacheKey = 'kuromi_umami_stats';
const shareCacheKey = 'kuromi_umami_share';
const cacheTTL = 60 * 60 * 1000;

export type UmamiStats = {
  pageviews: number;
  visitors: number;
  visits: number;
};

type CachedValue<T> = {
  createdAt: number;
  value: T;
};

type UmamiShareInfo = {
  websiteId: string;
  token: string;
};

export function loadAnalytics() {
  if (!umamiScriptURL || !umamiWebsiteID || document.querySelector('script[data-website-id]')) return;

  const script = document.createElement('script');
  script.defer = true;
  script.src = umamiScriptURL;
  script.dataset.websiteId = umamiWebsiteID;
  document.head.appendChild(script);
}

export async function getUmamiStats(): Promise<UmamiStats | null> {
  if (!umamiBaseURL || !umamiShareID) return null;

  const cached = readCache<UmamiStats>(statsCacheKey);
  if (cached) return cached;

  try {
    const stats = await fetchStats();
    writeCache(statsCacheKey, stats);
    return stats;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('401')) {
      clearCache(shareCacheKey);
      const stats = await fetchStats();
      writeCache(statsCacheKey, stats);
      return stats;
    }
    throw error;
  }
}

function getOriginFromURL(url: string | undefined) {
  if (!url) return '';
  try {
    return new URL(url).origin;
  } catch {
    return '';
  }
}

function getApiBase() {
  return `${umamiBaseURL.replace(/\/$/, '')}/api`;
}

async function fetchShareInfo(): Promise<UmamiShareInfo> {
  const cached = readCache<UmamiShareInfo>(shareCacheKey);
  if (cached) return cached;

  const response = await fetch(`${getApiBase()}/share/${encodeURIComponent(umamiShareID)}`);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);

  const shareInfo = (await response.json()) as UmamiShareInfo;
  if (!shareInfo.websiteId || !shareInfo.token) {
    throw new Error('Umami share response is missing websiteId or token');
  }

  writeCache(shareCacheKey, shareInfo);
  return shareInfo;
}

async function fetchStats(): Promise<UmamiStats> {
  const shareInfo = await fetchShareInfo();
  const params = new URLSearchParams({
    startAt: '0',
    endAt: String(Date.now()),
    unit: 'hour',
    timezone: umamiTimezone,
  });

  const response = await fetch(`${getApiBase()}/websites/${encodeURIComponent(shareInfo.websiteId)}/stats?${params.toString()}`, {
    headers: {
      'x-umami-share-token': shareInfo.token,
    },
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);

  const data = (await response.json()) as Partial<UmamiStats>;
  return {
    pageviews: data.pageviews ?? 0,
    visitors: data.visitors ?? 0,
    visits: data.visits ?? 0,
  };
}

function readCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const cached = JSON.parse(raw) as CachedValue<T>;
    if (Date.now() - cached.createdAt > cacheTTL) {
      localStorage.removeItem(key);
      return null;
    }
    return cached.value;
  } catch {
    return null;
  }
}

function writeCache<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify({ createdAt: Date.now(), value }));
  } catch {
    // Ignore cache failures.
  }
}

function clearCache(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore cache failures.
  }
}
