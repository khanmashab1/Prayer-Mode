import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PrayerTimes, PrayerEntry, fetchPrayerTimes, getPrayerEntries } from '@/lib/prayerAPI';
import { LocationResult } from '@/lib/locationService';
import type { PrayerMode } from '@/lib/ringerMode';

const STORAGE_KEYS = {
  location: 'app_location',
  method: 'app_method',
  school: 'app_school',
  silentDuration: 'app_silent_duration',
  prayerMode: 'app_prayer_mode',
  hijriOffset: 'app_hijri_offset',
  ramadanMode: 'app_ramadan_mode',
  onboardingDone: 'app_onboarding_done',
  fajrAdj: 'app_fajr_adj',
  maghribAdj: 'app_maghrib_adj',
};

interface AppSettings {
  location: LocationResult | null;
  method: number;
  school: number;
  silentDuration: number;
  prayerMode: PrayerMode;
  hijriOffset: number;
  ramadanMode: boolean;
  onboardingDone: boolean;
  fajrAdj: number;
  maghribAdj: number;
}

interface AppContextValue extends AppSettings {
  prayerTimes: PrayerTimes | null;
  prayerEntries: PrayerEntry[];
  isLoading: boolean;
  error: string | null;
  refreshPrayerTimes: () => Promise<void>;
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
}

const AppContext = createContext<AppContextValue | null>(null);

async function loadSettings(): Promise<AppSettings> {
  const [
    locationRaw,
    methodRaw,
    schoolRaw,
    silentDurationRaw,
    prayerModeRaw,
    hijriOffsetRaw,
    ramadanModeRaw,
    onboardingDoneRaw,
    fajrAdjRaw,
    maghribAdjRaw,
  ] = await AsyncStorage.multiGet(Object.values(STORAGE_KEYS));

  const location = locationRaw[1] ? JSON.parse(locationRaw[1]) : null;
  const method = methodRaw[1] ? parseInt(methodRaw[1], 10) : 1;
  const school = schoolRaw[1] ? parseInt(schoolRaw[1], 10) : 1;
  const silentDuration = silentDurationRaw[1] ? parseInt(silentDurationRaw[1], 10) : 15;
  const prayerMode: PrayerMode = (prayerModeRaw[1] as PrayerMode) || 'vibration';
  const hijriOffset = hijriOffsetRaw[1] ? parseInt(hijriOffsetRaw[1], 10) : 0;
  const ramadanMode = ramadanModeRaw[1] === 'true';
  const onboardingDone = onboardingDoneRaw[1] === 'true';
  const fajrAdj = fajrAdjRaw[1] ? parseInt(fajrAdjRaw[1], 10) : -2;
  const maghribAdj = maghribAdjRaw[1] ? parseInt(maghribAdjRaw[1], 10) : 3;

  return {
    location,
    method,
    school,
    silentDuration,
    prayerMode,
    hijriOffset,
    ramadanMode,
    onboardingDone,
    fajrAdj,
    maghribAdj,
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>({
    location: null,
    method: 1,
    school: 1,
    silentDuration: 15,
    prayerMode: 'vibration',
    hijriOffset: 0,
    ramadanMode: false,
    onboardingDone: false,
    fajrAdj: -2,
    maghribAdj: 3,
  });
  const [prayerTimes, setPrayerTimes] = useState<PrayerTimes | null>(null);
  const [prayerEntries, setPrayerEntries] = useState<PrayerEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSettings().then((s) => {
      setSettings(s);
      setIsLoading(false);
    });
  }, []);

  const refreshPrayerTimes = useCallback(async () => {
    if (!settings.location) return;
    setIsLoading(true);
    setError(null);
    try {
      const times = await fetchPrayerTimes(
        settings.location.latitude,
        settings.location.longitude,
        settings.method,
        settings.school,
        settings.hijriOffset
      );

      const autoRamadan = times.isRamadan;
      const useRamadan = settings.ramadanMode || autoRamadan;

      const entries = getPrayerEntries(
        times,
        times.date,
        useRamadan,
        settings.fajrAdj,
        settings.maghribAdj
      );
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

  const saveAndSet = async <K extends keyof AppSettings>(
    key: keyof typeof STORAGE_KEYS,
    value: AppSettings[K],
    raw: string
  ) => {
    await AsyncStorage.setItem(STORAGE_KEYS[key], raw);
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const setLocation = async (loc: LocationResult) => {
    await AsyncStorage.setItem(STORAGE_KEYS.location, JSON.stringify(loc));
    setSettings((prev) => ({ ...prev, location: loc }));
  };

  const setMethod = async (m: number) =>
    saveAndSet('method', m as any, String(m));

  const setSchool = async (s: number) =>
    saveAndSet('school', s as any, String(s));

  const setSilentDuration = async (d: number) =>
    saveAndSet('silentDuration', d as any, String(d));

  const setPrayerMode = async (mode: PrayerMode) =>
    saveAndSet('prayerMode', mode as any, mode);

  const setHijriOffset = async (o: number) =>
    saveAndSet('hijriOffset', o as any, String(o));

  const setRamadanMode = async (r: boolean) =>
    saveAndSet('ramadanMode', r as any, String(r));

  const setOnboardingDone = async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.onboardingDone, 'true');
    setSettings((prev) => ({ ...prev, onboardingDone: true }));
  };

  const setFajrAdj = async (v: number) =>
    saveAndSet('fajrAdj', v as any, String(v));

  const setMaghribAdj = async (v: number) =>
    saveAndSet('maghribAdj', v as any, String(v));

  const value = useMemo<AppContextValue>(
    () => ({
      ...settings,
      prayerTimes,
      prayerEntries,
      isLoading,
      error,
      refreshPrayerTimes,
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
    }),
    [settings, prayerTimes, prayerEntries, isLoading, error, refreshPrayerTimes]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
