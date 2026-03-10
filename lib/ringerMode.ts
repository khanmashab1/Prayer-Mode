import { Vibration, Platform, Linking, Alert } from 'react-native';
import * as Notifications from 'expo-notifications';

export type PrayerMode = 'vibration' | 'dnd';

export async function requestDNDPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;

  try {
    const { status } = await Notifications.requestPermissionsAsync({
      android: {
        allowAlert: true,
        allowBadge: true,
        allowSound: false,
      },
    });
    return status === 'granted';
  } catch {
    return false;
  }
}

export async function openDNDSettings(): Promise<void> {
  try {
    if (Platform.OS === 'android') {
      await Linking.openSettings();
    }
  } catch {
    Alert.alert('Error', 'Could not open settings. Please open manually.');
  }
}

export function activateVibrationMode(durationMinutes: number): void {
  const pattern: number[] = [];
  const totalMs = durationMinutes * 60 * 1000;
  let elapsed = 0;
  while (elapsed < totalMs) {
    pattern.push(0, 500, 500);
    elapsed += 1000;
  }
  Vibration.vibrate(pattern);
}

export function cancelVibration(): void {
  Vibration.cancel();
}

export async function scheduleNamazNotification(
  prayerName: string,
  prayerTime: Date,
  mode: PrayerMode,
  durationMinutes: number
): Promise<string | null> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      const { status: newStatus } = await Notifications.requestPermissionsAsync();
      if (newStatus !== 'granted') return null;
    }

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: `${prayerName} Time`,
        body:
          mode === 'vibration'
            ? `${prayerName} prayer has begun. Vibration mode active for ${durationMinutes} minutes.`
            : `${prayerName} prayer has begun. DND mode active for ${durationMinutes} minutes.`,
        data: { prayerName, mode, durationMinutes },
        sound: false,
        vibrate: [0, 500, 200, 500],
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: prayerTime,
      },
    });

    return id;
  } catch (e) {
    console.warn('Failed to schedule notification:', e);
    return null;
  }
}

export async function cancelAllScheduledNotifications(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // ignore
  }
}

export async function getScheduledNotifications() {
  try {
    return await Notifications.getAllScheduledNotificationsAsync();
  } catch {
    return [];
  }
}
