import { Vibration, Platform, Linking, Alert } from 'react-native';
import * as Notifications from 'expo-notifications';
import {
  getRingerMode,
  setRingerMode,
  checkDndAccess,
  RINGER_MODE,
} from 'react-native-ringer-mode';
import { scheduleRestoreNotification } from './backgroundTask';

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

// Returns true if the app already has Notification Policy Access (required for DND + ringer changes)
export async function requestDNDPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  try {
    return (await checkDndAccess()) === true;
  } catch {
    return false;
  }
}

// Opens Settings → Apps → Special app access → Do Not Disturb access
// NamazGuard appears in that list because ACCESS_NOTIFICATION_POLICY is declared in app.json
export async function openDNDSettings(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await Linking.sendIntent('android.settings.NOTIFICATION_POLICY_ACCESS_SETTINGS');
  } catch {
    try {
      await Linking.openSettings();
    } catch {
      Alert.alert(
        'Open Settings Manually',
        'Go to Settings → Apps → Special app access → Do Not Disturb access → NamazGuard and enable it.'
      );
    }
  }
}

let _previousRingerMode: number | null = null;
let _restoreTimer: ReturnType<typeof setTimeout> | null = null;

function _clearRestoreTimer() {
  if (_restoreTimer !== null) {
    clearTimeout(_restoreTimer);
    _restoreTimer = null;
  }
}

// Sets device ringer to vibrate mode and auto-restores after durationMinutes
export async function activateVibrationMode(durationMinutes?: number): Promise<void> {
  if (Platform.OS === 'web') return;

  if (Platform.OS === 'android') {
    try {
      _clearRestoreTimer();
      _previousRingerMode = (await getRingerMode()) ?? RINGER_MODE.normal;
      await setRingerMode(RINGER_MODE.vibrate);

      if (durationMinutes && durationMinutes > 0) {
        // setTimeout restores when app is foreground; restore notification handles background/closed
        _restoreTimer = setTimeout(() => { deactivateMode(); }, durationMinutes * 60 * 1000);
        await scheduleRestoreNotification(new Date(Date.now() + durationMinutes * 60 * 1000));
      }
      return;
    } catch (e) {
      console.warn('setRingerMode(vibrate) failed, falling back to vibration pulse:', e);
    }
  }

  // iOS fallback — can't change ringer mode, just pulse
  Vibration.vibrate([0, 700, 200, 700, 200, 700, 200, 700]);
}

// Sets device ringer to silent (full DND) and auto-restores after durationMinutes
export async function activateDNDMode(durationMinutes?: number): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    const hasPermission = (await checkDndAccess()) === true;
    if (!hasPermission) {
      await openDNDSettings();
      return;
    }
    _clearRestoreTimer();
    _previousRingerMode = (await getRingerMode()) ?? RINGER_MODE.normal;
    await setRingerMode(RINGER_MODE.silent);

    if (durationMinutes && durationMinutes > 0) {
      _restoreTimer = setTimeout(() => { deactivateMode(); }, durationMinutes * 60 * 1000);
      await scheduleRestoreNotification(new Date(Date.now() + durationMinutes * 60 * 1000));
    }
  } catch (e) {
    console.warn('setRingerMode(silent) failed:', e);
  }
}

// Restores the ringer mode saved before namaz mode was activated
export async function deactivateMode(): Promise<void> {
  if (Platform.OS !== 'android') return;
  _clearRestoreTimer();
  try {
    const restoreTo = (_previousRingerMode ?? RINGER_MODE.normal) as 0 | 1 | 2;
    _previousRingerMode = null;
    await setRingerMode(restoreTo);
  } catch (e) {
    console.warn('Failed to restore ringer mode:', e);
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
