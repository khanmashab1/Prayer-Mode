import { Vibration, Platform, Linking, Alert } from 'react-native';
import * as Notifications from 'expo-notifications';

export type PrayerMode = 'vibration' | 'dnd';

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') return true;
    const { status } = await Notifications.requestPermissionsAsync({
      android: {
        allowAlert: true,
        allowBadge: false,
        allowSound: false,
      },
    });
    return status === 'granted';
  } catch {
    return false;
  }
}

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

export function activateVibrationMode(_durationMinutes?: number): void {
  if (Platform.OS === 'web') return;
  try {
    Vibration.vibrate([0, 700, 200, 700, 200, 700, 200, 700, 200, 700, 200, 700, 300, 400, 300, 400]);
  } catch (e) {
    console.warn('Vibration failed:', e);
  }
}

export function testVibration(): void {
  if (Platform.OS === 'web') return;
  try {
    Vibration.vibrate([0, 300, 150, 300, 150, 600]);
  } catch (e) {
    console.warn('Vibration test failed:', e);
  }
}

export function cancelVibration(): void {
  if (Platform.OS === 'web') return;
  try {
    Vibration.cancel();
  } catch {
    // ignore
  }
}

export async function scheduleNamazNotification(
  prayerName: string,
  prayerTime: Date,
  mode: PrayerMode,
  durationMinutes: number
): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      const { status: newStatus } = await Notifications.requestPermissionsAsync();
      if (newStatus !== 'granted') return null;
    }

    const triggerDate = new Date(prayerTime);
    if (triggerDate <= new Date()) return null;

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
        ...(Platform.OS === 'android' ? { channelId: 'namaz-mode' } : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      },
    });

    return id;
  } catch (e) {
    console.warn('Failed to schedule notification:', e);
    return null;
  }
}

export async function scheduleAdhanNotification(
  prayerName: string,
  prayerTime: Date,
): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return null;

    const triggerDate = new Date(prayerTime);
    if (triggerDate <= new Date()) return null;

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: `${prayerName} Adhan`,
        body: `It's time for ${prayerName} prayer`,
        data: { prayerName, type: 'adhan' },
        sound: false,
        vibrate: [0, 300, 100, 300, 100, 300],
        priority: Notifications.AndroidNotificationPriority.HIGH,
        ...(Platform.OS === 'android' ? { channelId: 'adhan' } : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      },
    });

    return id;
  } catch (e) {
    console.warn('Failed to schedule adhan notification:', e);
    return null;
  }
}

export async function cancelAllScheduledNotifications(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // ignore
  }
}

export async function getScheduledNotifications() {
  if (Platform.OS === 'web') return [];
  try {
    return await Notifications.getAllScheduledNotificationsAsync();
  } catch {
    return [];
  }
}
