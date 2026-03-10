import AsyncStorage from '@react-native-async-storage/async-storage';
import { scheduleNamazNotification, cancelAllScheduledNotifications, type PrayerMode } from './ringerMode';
import { PrayerEntry } from './prayerAPI';

const SCHEDULED_IDS_KEY = 'namaz_scheduled_ids';

export async function schedulePrayersForToday(
  entries: PrayerEntry[],
  mode: PrayerMode,
  durationMinutes: number,
  namazDelays: Record<string, number> = {}
): Promise<void> {
  try {
    await cancelAllScheduledNotifications();

    const now = new Date();
    const ids: string[] = [];

    for (const entry of entries) {
      try {
        const delayMs = (namazDelays[entry.name] ?? 0) * 60 * 1000;
        const activationTime = new Date(entry.timeDate.getTime() + delayMs);

        if (activationTime > now) {
          const id = await scheduleNamazNotification(
            entry.name,
            activationTime,
            mode,
            durationMinutes
          );
          if (id) ids.push(id);
        }
      } catch (e) {
        console.warn(`Failed to schedule ${entry.name}:`, e);
      }
    }

    try {
      await AsyncStorage.setItem(SCHEDULED_IDS_KEY, JSON.stringify(ids));
    } catch {
      // non-critical
    }
  } catch (e) {
    console.warn('schedulePrayersForToday failed:', e);
  }
}

export async function getScheduledIds(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(SCHEDULED_IDS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function clearScheduledIds(): Promise<void> {
  await AsyncStorage.removeItem(SCHEDULED_IDS_KEY);
}

export function isCurrentlyInNamazTime(
  entries: PrayerEntry[],
  durationMinutes: number,
  namazDelays: Record<string, number> = {}
): { active: boolean; prayerName: string | null } {
  const now = new Date();
  for (const entry of entries) {
    const delayMs = (namazDelays[entry.name] ?? 0) * 60 * 1000;
    const start = new Date(entry.timeDate.getTime() + delayMs);
    const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
    if (now >= start && now < end) {
      return { active: true, prayerName: entry.name };
    }
  }
  return { active: false, prayerName: null };
}
