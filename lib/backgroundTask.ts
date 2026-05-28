import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import {
  getRingerMode,
  setRingerMode,
  checkDndAccess,
  RINGER_MODE,
} from 'react-native-ringer-mode';

export const BG_NOTIFICATION_TASK = 'NAMAZGUARD_BG_NOTIFICATION';

// Key to persist the ringer mode we saved before activating namaz mode
const PREV_RINGER_KEY = 'namazguard_prev_ringer';

// Schedules a low-importance "restore" notification at the end of the prayer window.
// When it fires, the background task restores the ringer mode.
export async function scheduleRestoreNotification(restoreAt: Date): Promise<void> {
  if (Platform.OS !== 'android') return;
  if (restoreAt <= new Date()) return;
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'NamazGuard',
        body: 'Prayer time ended. Phone restored to normal.',
        data: { type: 'namazguard_restore' },
        sound: false,
        priority: Notifications.AndroidNotificationPriority.LOW,
        ...(Platform.OS === 'android' ? { channelId: 'namazguard-restore' } : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: restoreAt,
      },
    });
  } catch (e) {
    console.warn('Failed to schedule restore notification:', e);
  }
}

// This MUST stay at module top-level — React Native registers it before the UI renders.
// Fires when a notification arrives while the app is in the background or fully closed.
TaskManager.defineTask(BG_NOTIFICATION_TASK, async ({ data, error }: any) => {
  if (error) {
    console.warn('[NamazGuard BG] task error:', error);
    return;
  }

  try {
    const notifData = data?.notification?.request?.content?.data;
    if (!notifData) return;

    // ── Restore notification fired ───────────────────────────────────────────
    if (notifData.type === 'namazguard_restore') {
      const prevRaw = await AsyncStorage.getItem(PREV_RINGER_KEY);
      const prevMode = prevRaw !== null
        ? (parseInt(prevRaw, 10) as 0 | 1 | 2)
        : (RINGER_MODE.normal as 0 | 1 | 2);
      await setRingerMode(prevMode);
      await AsyncStorage.removeItem(PREV_RINGER_KEY);
      return;
    }

    // Skip adhan notifications — they only alert the user, no mode change
    if (notifData.type === 'adhan') return;

    // ── Namaz mode activation notification fired ─────────────────────────────
    const { mode, durationMinutes } = notifData;
    if (!mode || !durationMinutes) return;

    if (mode === 'vibration') {
      const prev = await getRingerMode();
      await AsyncStorage.setItem(PREV_RINGER_KEY, String(prev ?? RINGER_MODE.normal));
      await setRingerMode(RINGER_MODE.vibrate);
      await scheduleRestoreNotification(new Date(Date.now() + durationMinutes * 60 * 1000));

    } else if (mode === 'dnd') {
      const hasPermission = await checkDndAccess();
      if (!hasPermission) return; // user never granted DND access
      const prev = await getRingerMode();
      await AsyncStorage.setItem(PREV_RINGER_KEY, String(prev ?? RINGER_MODE.normal));
      await setRingerMode(RINGER_MODE.silent);
      await scheduleRestoreNotification(new Date(Date.now() + durationMinutes * 60 * 1000));
    }
  } catch (e) {
    console.warn('[NamazGuard BG] failed to change ringer mode:', e);
  }
});
