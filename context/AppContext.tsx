import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { PrayerTimes, PrayerEntry, fetchPrayerTimes, getPrayerEntries } from '@/lib/prayerAPI';
import {
  LocationResult,
  requestLocationPermission,
  getCurrentLocation,
  getWebGeolocation,
} from '@/lib/locationService';
import type { PrayerMode } from '@/lib/ringerMode';
import { schedulePrayersForToday } from '@/lib/namazScheduler';

const STORAGE_KEYS = {
  location: 'app_location',
  locationMode: 'app_location_mode',
  method: 'app_method',
  school: 'app_school',
  silentDuration: 'app_silent_duration',
  prayerMode: 'app_prayer_mode',
  hijriOffset: 'app_hijri_offset',
  ramadanMode: 'app_ramadan_mode',
  onboardingDone: 'app_onboarding_done',
  fajrAdj: 'app_fajr_adj',
  maghribAdj: 'app_maghrib_adj',
  namazDelays: 'app_namaz_delays',
  adhanEnabled: 'app_adhan_enabled',
};

const DEFAULT_ADHAN_ENABLED = { Fajr: true, Dhuhr: true, Asr: true, Maghrib: true, Isha: true };

interface AppSettings {
  location: LocationResult | null;
  locationMode: 'gps' | 'manual';
  method: number;
  school: number;
  silentDuration: number;
  prayerMode: PrayerMode;
  hijriOffset: number;
  ramadanMode: boolean;
  onboardingDone: boolean;
  fajrAdj: number;
  maghribAdj: number;
  namazDelays: Record<string, number>;
  adhanEnabled: Record<string, boolean>;
}

interface AppContextValue extends AppSettings {
  prayerTimes: PrayerTimes | null;
  prayerEntries: PrayerEntry[];
  isLoading: boolean;
  isLocating: boolean;
  error: string | null;
  refreshPrayerTimes: () => Promise<void>;
  enableGPS: () => Promise<void>;
  setManualCity: (loc: LocationResult) => Promise<void>;
  setLocation: (loc: LocationResult) => Promise<void>;
  setMethod: (m: number) => Promise<void>;
  setSchool: (s: number) => Promise<void>;
  setSilentDuration: (d: number) => Promise<void>;
  setPrayerMode: (mode: PrayerMode) => Promise<void>;
  setHijriOffset: (o: number) => Promise<void>;
  setRamadanMode: (r: boolean) => Promise<void>;
  setOnboardingDone: () => Promise<void>;
  setFajrAdj: (v: number) => Promise<void>;
  setMaghribAdj: (v: number) => Promise<void>;
  setNamazDelay: (prayer: string, minutes: number) => Promise<void>;
  setAdhanEnabled: (prayer: string, enabled: boolean) => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

function safeParseJSON<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeParseInt(raw: string | null, fallback: number): number {
  if (!raw) return fallback;
  const n = parseInt(raw, 10);
  return isNaN(n) ? fallback : n;
}

async function loadSettings(): Promise<AppSettings> {
  try {
    const keys = Object.values(STORAGE_KEYS);
    const pairs = await AsyncStorage.multiGet(keys);
    const map: Record<string, string | null> = {};
    pairs.forEach(([k, v]) => { map[k] = v; });

    const location = safeParseJSON<LocationResult | null>(map['app_location'], null);
    const locationMode = (map['app_location_mode'] as 'gps' | 'manual') || 'manual';
    const method = safeParseInt(map['app_method'], 1);
    const school = safeParseInt(map['app_school'], 1);
    const silentDuration = safeParseInt(map['app_silent_duration'], 15);
    const prayerMode: PrayerMode = (map['app_prayer_mode'] as PrayerMode) || 'vibration';
    const hijriOffset = safeParseInt(map['app_hijri_offset'], 0);
    const ramadanMode = map['app_ramadan_mode'] === 'true';
    const onboardingDone = map['app_onboarding_done'] === 'true';
    const fajrAdj = safeParseInt(map['app_fajr_adj'], -2);
    const maghribAdj = safeParseInt(map['app_maghrib_adj'], 3);
    const namazDelays: Record<string, number> = safeParseJSON(
      map['app_namaz_delays'],
      { Fajr: 0, Dhuhr: 0, Asr: 0, Maghrib: 0, Isha: 0 }
    );
    const adhanEnabled: Record<string, boolean> = safeParseJSON(
      map['app_adhan_enabled'],
      { ...DEFAULT_ADHAN_ENABLED }
    );

    return { location, locationMode, method, school, silentDuration, prayerMode, hijriOffset, ramadanMode, onboardingDone, fajrAdj, maghribAdj, namazDelays, adhanEnabled };
  } catch (e) {
    console.warn('loadSettings failed, using defaults:', e);
    return {
      location: null,
      locationMode: 'manual',
      method: 1,
      school: 1,
      silentDuration: 15,
      prayerMode: 'vibration',
      hijriOffset: 0,
      ramadanMode: false,
      onboardingDone: false,
      fajrAdj: -2,
      maghribAdj: 3,
      namazDelays: { Fajr: 0, Dhuhr: 0, Asr: 0, Maghrib: 0, Isha: 0 },
      adhanEnabled: { ...DEFAULT_ADHAN_ENABLED },
    };
  }
}

async function fetchGPSLocation(): Promise<LocationResult | null> {
  try {
    if (Platform.OS === 'web') {
      return await getWebGeolocation();
    }
    const granted = await requestLocationPermission();
    if (!granted) return null;
    return await getCurrentLocation();
  } catch {
    return null;
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>({
    location: null,
    locationMode: 'manual',
    method: 1,
    school: 1,
    silentDuration: 15,
    prayerMode: 'vibration',
    hijriOffset: 0,
    ramadanMode: false,
    onboardingDone: false,
    fajrAdj: -2,
    maghribAdj: 3,
    namazDelays: { Fajr: 0, Dhuhr: 0, Asr: 0, Maghrib: 0, Isha: 0 },
    adhanEnabled: { ...DEFAULT_ADHAN_ENABLED },
  });
  const [prayerTimes, setPrayerTimes] = useState<PrayerTimes | null>(null);
  const [prayerEntries, setPrayerEntries] = useState<PrayerEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // On mount: load settings, then auto-fetch GPS if that mode is saved
  useEffect(() => {
    (async () => {
      const s = await loadSettings();
      if (s.locationMode === 'gps') {
        // Show spinner while locating
        setIsLocating(true);
        const gps = await fetchGPSLocation();
        if (gps) {
          await AsyncStorage.setItem(STORAGE_KEYS.location, JSON.stringify(gps));
          s.location = gps;
        }
        setIsLocating(false);
      }
      setSettings(s);
      setIsLoading(false);
    })();
  }, []);

  const refreshPrayerTimes = useCallback(async (overrideLoc?: LocationResult) => {
    const loc = overrideLoc ?? settings.location;
    if (!loc) return;
    setIsLoading(true);
    setError(null);
    try {
      const times = await fetchPrayerTimes(
        loc.latitude,
        loc.longitude,
        settings.method,
        settings.school,
        settings.hijriOffset
      );
      const useRamadan = settings.ramadanMode || times.isRamadan;
      const entries = getPrayerEntries(times, times.date, useRamadan, settings.fajrAdj, settings.maghribAdj);
      setPrayerTimes(times);
      setPrayerEntries(entries);
    } catch (e: any) {
      setError(e.message || 'Failed to fetch prayer times');
    } finally {
      setIsLoading(false);
    }
  }, [settings]);

  useEffect(() => {
    if (settings.location && !isLoading) {
      refreshPrayerTimes();
    }
  }, [settings.location, settings.method, settings.school, settings.ramadanMode, settings.fajrAdj, settings.maghribAdj]);

  // Auto-reschedule whenever prayer entries or Namaz Mode settings change
  useEffect(() => {
    if (prayerEntries.length > 0 && settings.onboardingDone) {
      schedulePrayersForToday(
        prayerEntries,
        settings.prayerMode,
        settings.silentDuration,
        settings.namazDelays,
        settings.adhanEnabled
      ).catch(console.warn);
    }
  }, [prayerEntries, settings.prayerMode, settings.silentDuration, settings.namazDelays, settings.adhanEnabled, settings.onboardingDone]);

  // Enable GPS mode: save preference + fetch immediately
  const enableGPS = useCallback(async () => {
    setIsLocating(true);
    await AsyncStorage.setItem(STORAGE_KEYS.locationMode, 'gps');
    setSettings(prev => ({ ...prev, locationMode: 'gps' }));
    const gps = await fetchGPSLocation();
    if (gps) {
      await AsyncStorage.setItem(STORAGE_KEYS.location, JSON.stringify(gps));
      setSettings(prev => ({ ...prev, location: gps }));
      await refreshPrayerTimes(gps);
    }
    setIsLocating(false);
  }, [refreshPrayerTimes]);

  // Manual city: save mode + location
  const setManualCity = useCallback(async (loc: LocationResult) => {
    await AsyncStorage.multiSet([
      [STORAGE_KEYS.locationMode, 'manual'],
      [STORAGE_KEYS.location, JSON.stringify(loc)],
    ]);
    setSettings(prev => ({ ...prev, locationMode: 'manual', location: loc }));
  }, []);

  const setLocation = useCallback(async (loc: LocationResult) => {
    await AsyncStorage.setItem(STORAGE_KEYS.location, JSON.stringify(loc));
    setSettings(prev => ({ ...prev, location: loc }));
  }, []);

  const saveAndSet = async <K extends keyof AppSettings>(
    key: keyof typeof STORAGE_KEYS,
    value: AppSettings[K],
    raw: string
  ) => {
    await AsyncStorage.setItem(STORAGE_KEYS[key], raw);
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const setMethod = (m: number) => saveAndSet('method', m as any, String(m));
  const setSchool = (s: number) => saveAndSet('school', s as any, String(s));
  const setSilentDuration = (d: number) => saveAndSet('silentDuration', d as any, String(d));
  const setPrayerMode = (mode: PrayerMode) => saveAndSet('prayerMode', mode as any, mode);
  const setHijriOffset = (o: number) => saveAndSet('hijriOffset', o as any, String(o));
  const setRamadanMode = (r: boolean) => saveAndSet('ramadanMode', r as any, String(r));
  const setFajrAdj = (v: number) => saveAndSet('fajrAdj', v as any, String(v));
  const setMaghribAdj = (v: number) => saveAndSet('maghribAdj', v as any, String(v));

  const setNamazDelay = useCallback(async (prayer: string, minutes: number) => {
    const updated = { ...settings.namazDelays, [prayer]: minutes };
    await AsyncStorage.setItem(STORAGE_KEYS.namazDelays, JSON.stringify(updated));
    setSettings(prev => ({ ...prev, namazDelays: updated }));
  }, [settings.namazDelays]);

  const setAdhanEnabled = useCallback(async (prayer: string, enabled: boolean) => {
    const updated = { ...settings.adhanEnabled, [prayer]: enabled };
    await AsyncStorage.setItem(STORAGE_KEYS.adhanEnabled, JSON.stringify(updated));
    setSettings(prev => ({ ...prev, adhanEnabled: updated }));
  }, [settings.adhanEnabled]);

  const setOnboardingDone = async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.onboardingDone, 'true');
    setSettings(prev => ({ ...prev, onboardingDone: true }));
  };

  const value = useMemo<AppContextValue>(
    () => ({
      ...settings,
      prayerTimes,
      prayerEntries,
      isLoading,
      isLocating,
      error,
      refreshPrayerTimes,
      enableGPS,
      setManualCity,
      setLocation,
      setMethod,
      setSchool,
      setSilentDuration,
      setPrayerMode,
      setHijriOffset,
      setRamadanMode,
      setOnboardingDone,
      setFajrAdj,
      setMaghribAdj,
      setNamazDelay,
      setAdhanEnabled,
    }),
    [settings, prayerTimes, prayerEntries, isLoading, isLocating, error, refreshPrayerTimes, enableGPS, setManualCity, setLocation, setNamazDelay, setAdhanEnabled]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
