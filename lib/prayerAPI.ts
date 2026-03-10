export interface PrayerTimes {
  Fajr: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
  date: string;
  hijriDate: string;
  hijriMonth: number;
  hijriYear: number;
  isRamadan: boolean;
}

export interface PrayerEntry {
  name: string;
  time: string;
  timeDate: Date;
}

function parseTime(raw: string): string {
  return raw.replace(/\s*\(.*\)/, '').trim();
}

function buildDateTime(dateStr: string, timeStr: string): Date {
  const [day, month, year] = dateStr.split('-').map(Number);
  const [hours, minutes] = timeStr.split(':').map(Number);
  const d = new Date(year, month - 1, day, hours, minutes, 0, 0);
  return d;
}

export async function fetchPrayerTimes(
  latitude: number,
  longitude: number,
  method: number = 1,
  school: number = 1,
  hijriOffset: number = 0
): Promise<PrayerTimes> {
  const today = new Date();
  const dd = String(today.getDate()).padStart(2, '0');
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const yyyy = today.getFullYear();
  const dateStr = `${dd}-${mm}-${yyyy}`;

  const url = `https://api.aladhan.com/v1/timings/${dateStr}?latitude=${latitude}&longitude=${longitude}&method=${method}&school=${school}`;

  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch prayer times');

  const json = await response.json();
  const timings = json.data.timings;
  const hijri = json.data.date.hijri;

  const hijriMonthNum = parseInt(hijri.month.number, 10);
  const isRamadan = hijriMonthNum === 9;

  return {
    Fajr: parseTime(timings.Fajr),
    Dhuhr: parseTime(timings.Dhuhr),
    Asr: parseTime(timings.Asr),
    Maghrib: parseTime(timings.Maghrib),
    Isha: parseTime(timings.Isha),
    date: dateStr,
    hijriDate: `${hijri.day} ${hijri.month.en} ${hijri.year}`,
    hijriMonth: hijriMonthNum,
    hijriYear: parseInt(hijri.year, 10),
    isRamadan,
  };
}

export function getPrayerEntries(
  times: PrayerTimes,
  dateStr: string,
  ramadanMode: boolean,
  fajrAdj: number = 0,
  maghribAdj: number = 0
): PrayerEntry[] {
  const prayers = [
    { name: 'Fajr', raw: times.Fajr },
    { name: 'Dhuhr', raw: times.Dhuhr },
    { name: 'Asr', raw: times.Asr },
    { name: 'Maghrib', raw: times.Maghrib },
    { name: 'Isha', raw: times.Isha },
  ];

  return prayers.map(({ name, raw }) => {
    const [h, m] = raw.split(':').map(Number);
    let adjustedMinutes = h * 60 + m;

    if (ramadanMode) {
      if (name === 'Fajr') adjustedMinutes += fajrAdj;
      if (name === 'Maghrib') adjustedMinutes += maghribAdj;
    }

    const finalH = Math.floor(adjustedMinutes / 60) % 24;
    const finalM = adjustedMinutes % 60;
    const timeStr = `${String(finalH).padStart(2, '0')}:${String(finalM).padStart(2, '0')}`;
    const timeDate = buildDateTime(dateStr, timeStr);

    return { name, time: timeStr, timeDate };
  });
}

export function getCurrentAndNextPrayer(entries: PrayerEntry[]): {
  current: PrayerEntry | null;
  next: PrayerEntry;
  nextTomorrowFajr: boolean;
} {
  const now = new Date();

  for (let i = entries.length - 1; i >= 0; i--) {
    if (entries[i].timeDate <= now) {
      const current = entries[i];
      const next = entries[i + 1] ?? null;
      if (next) {
        return { current, next, nextTomorrowFajr: false };
      } else {
        return { current, next: entries[0], nextTomorrowFajr: true };
      }
    }
  }

  return { current: null, next: entries[0], nextTomorrowFajr: false };
}

export function formatTime12(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

export function getCountdown(target: Date, tomorrowFajr: boolean): string {
  const now = new Date();
  let targetDate = target;

  if (tomorrowFajr) {
    targetDate = new Date(target);
    targetDate.setDate(targetDate.getDate() + 1);
  }

  let diff = targetDate.getTime() - now.getTime();
  if (diff < 0) diff = 0;

  const hours = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  const secs = Math.floor((diff % 60000) / 1000);

  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}
