import * as Location from 'expo-location';
import { Platform } from 'react-native';

export interface LocationResult {
  latitude: number;
  longitude: number;
  cityName?: string;
  source: 'gps' | 'manual';
}

export async function requestLocationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

export async function getCurrentLocation(): Promise<LocationResult> {
  const { status } = await Location.getForegroundPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Location permission not granted');
  }

  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  const { latitude, longitude } = position.coords;
  let cityName: string | undefined;

  try {
    const response = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
    );
    if (response.ok) {
      const data = await response.json();
      cityName = data.city || data.locality || data.principalSubdivision || undefined;
    }
  } catch {
    // silently fail
  }

  return { latitude, longitude, cityName, source: 'gps' };
}

export function getWebGeolocation(): Promise<LocationResult> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        let cityName: string | undefined;
        try {
          const response = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
          );
          if (response.ok) {
            const data = await response.json();
            cityName = data.city || data.locality || undefined;
          }
        } catch {
          // ignore
        }
        resolve({ latitude, longitude, cityName, source: 'gps' });
      },
      (err) => reject(new Error(err.message)),
      { timeout: 10000 }
    );
  });
}
