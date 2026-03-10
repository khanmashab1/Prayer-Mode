import React, { useEffect, useCallback, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
  Platform,
  ActivityIndicator,
} from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Colors } from '@/constants/colors';
import { useApp } from '@/context/AppContext';
import { getCurrentAndNextPrayer, formatTime12 } from '@/lib/prayerAPI';
import type { PrayerEntry } from '@/lib/prayerAPI';

const PRAYER_ICONS: Record<string, string> = {
  Fajr: 'weather-sunset-up',
  Dhuhr: 'weather-sunny',
  Asr: 'weather-partly-cloudy',
  Maghrib: 'weather-sunset-down',
  Isha: 'moon-waning-crescent',
};

const PRAYER_COLORS: Record<string, string> = {
  Fajr: '#60A5FA',
  Dhuhr: '#F59E0B',
  Asr: '#F97316',
  Maghrib: '#EF4444',
  Isha: '#A78BFA',
};

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const {
    prayerTimes,
    prayerEntries,
    isLoading,
    isLocating,
    error,
    refreshPrayerTimes,
    location,
    locationMode,
    prayerMode,
    silentDuration,
    namazDelays,
    ramadanMode,
    onboardingDone,
  } = useApp();

  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const lastDateRef = useRef(now.toDateString());

  useEffect(() => {
    const interval = setInterval(() => {
      const next = new Date();
      setNow(next);
      if (next.toDateString() !== lastDateRef.current) {
        lastDateRef.current = next.toDateString();
        refreshPrayerTimes().catch(console.warn);
      }
    }, 10_000);
    return () => clearInterval(interval);
  }, [refreshPrayerTimes]);

  const { current, next, nextTomorrowFajr } =
    prayerEntries.length > 0
      ? getCurrentAndNextPrayerAt(prayerEntries, now)
      : { current: null, next: null, nextTomorrowFajr: false };

  const namazStatus =
    prayerEntries.length > 0
      ? isCurrentlyInNamazTimeAt(prayerEntries, silentDuration, namazDelays, now)
      : { active: false, prayerName: null };

  const glowAnim = useSharedValue(0);
  const ringAnim = useSharedValue(1);

  useEffect(() => {
    if (namazStatus.active) {
      glowAnim.value = withRepeat(withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.sin) }), -1, true);
      ringAnim.value = withRepeat(withTiming(1.04, { duration: 2000, easing: Easing.inOut(Easing.ease) }), -1, true);
    } else {
      glowAnim.value = withTiming(0);
      ringAnim.value = withTiming(1);
    }
  }, [namazStatus.active]);

  const glowStyle = useAnimatedStyle(() => ({ opacity: glowAnim.value * 0.5 }));
  const ringStyle = useAnimatedStyle(() => ({ transform: [{ scale: ringAnim.value }] }));

  useEffect(() => {
    if (!onboardingDone) {
      router.replace('/onboarding');
    }
  }, [onboardingDone]);

  const onRefresh = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    await refreshPrayerTimes();
    setRefreshing(false);
  }, [refreshPrayerTimes]);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 34 : insets.bottom;
  const tabClearance = botPad + 64;

  if (isLocating && !location) {
    return (
      <View style={[styles.centerScreen, { paddingTop: topPad, paddingBottom: tabClearance }]}>
        <LinearGradient colors={['#060E0A', '#0A1A10', '#060E0A']} style={StyleSheet.absoluteFill} />
        <View style={styles.locatingWrap}>
          <View style={styles.locatingIcon}>
            <MaterialCommunityIcons name="crosshairs-gps" size={36} color={Colors.primary} />
          </View>
          <ActivityIndicator color={Colors.primary} size="large" style={{ marginTop: 12 }} />
          <Text style={styles.loadingTitle}>Detecting Location</Text>
          <Text style={styles.loadingText}>Getting your GPS coordinates…</Text>
        </View>
      </View>
    );
  }

  if (!location) {
    return (
      <View style={[styles.centerScreen, { paddingTop: topPad, paddingBottom: tabClearance }]}>
        <LinearGradient colors={['#060E0A', '#0A1A10', '#060E0A']} style={StyleSheet.absoluteFill} />
        <View style={styles.emptyWrap}>
          <MaterialCommunityIcons name="map-marker-off-outline" size={56} color={Colors.dim} />
          <Text style={styles.emptyTitle}>No Location Set</Text>
          <Text style={styles.emptyBody}>Go to Settings to choose your city or enable GPS.</Text>
          <Pressable style={styles.goBtn} onPress={() => router.push('/(tabs)/settings')}>
            <Text style={styles.goBtnText}>Open Settings</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (isLoading && !prayerTimes) {
    return (
      <View style={[styles.centerScreen, { paddingTop: topPad, paddingBottom: tabClearance }]}>
        <LinearGradient colors={['#060E0A', '#0A1A10', '#060E0A']} style={StyleSheet.absoluteFill} />
        <ActivityIndicator color={Colors.primary} size="large" />
        <Text style={styles.loadingText}>Fetching prayer times…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.centerScreen, { paddingTop: topPad, paddingBottom: tabClearance }]}>
        <LinearGradient colors={['#060E0A', '#0A1A10', '#060E0A']} style={StyleSheet.absoluteFill} />
        <View style={styles.emptyWrap}>
          <MaterialCommunityIcons name="wifi-off" size={56} color={Colors.danger} />
          <Text style={styles.emptyTitle}>Connection Error</Text>
          <Text style={styles.emptyBody}>{error}</Text>
          <Pressable style={styles.goBtn} onPress={refreshPrayerTimes}>
            <Text style={styles.goBtnText}>Retry</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#060E0A', '#091508', '#060E0A']} style={StyleSheet.absoluteFill} />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: topPad + 16, paddingBottom: botPad + 88 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} colors={[Colors.primary]} />
        }
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
          <View>
            <Text style={styles.appName}>Namaz Mode</Text>
            <View style={styles.locationRow}>
              {isLocating ? (
                <ActivityIndicator size={11} color={Colors.primary} />
              ) : locationMode === 'gps' ? (
                <MaterialCommunityIcons name="crosshairs-gps" size={12} color={Colors.primary} />
              ) : (
                <MaterialCommunityIcons name="map-marker" size={12} color={Colors.dim} />
              )}
              <Text style={[styles.locationText, isLocating && { color: Colors.primary }]}>
                {isLocating ? 'Updating…' : location.cityName || `${location.latitude.toFixed(2)}, ${location.longitude.toFixed(2)}`}
              </Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            {(prayerTimes?.isRamadan || ramadanMode) && (
              <View style={styles.ramadanBadge}>
                <MaterialCommunityIcons name="star-crescent" size={11} color={Colors.gold} />
                <Text style={styles.ramadanText}>Ramadan</Text>
              </View>
            )}
            {prayerTimes && (
              <View style={styles.dateBadge}>
                <Text style={styles.dateText}>{formatHijriShort(prayerTimes.hijriDate)}</Text>
              </View>
            )}
          </View>
        </Animated.View>

        {/* Active Namaz Banner */}
        {namazStatus.active && (
          <Animated.View entering={FadeInDown.delay(60).duration(500)} style={styles.activeBannerWrap}>
            <Animated.View style={[styles.activeBannerGlow, glowStyle]} />
            <Animated.View style={[styles.activeBanner, ringStyle]}>
              <View style={styles.activeBannerLeft}>
                <View style={styles.activePulseRing}>
                  <View style={styles.activePulseCore} />
                </View>
                <View>
                  <Text style={styles.activePrayerName}>{namazStatus.prayerName} — Namaz Time</Text>
                  <Text style={styles.activeModeText}>
                    {prayerMode === 'vibration' ? 'Vibration' : 'Do Not Disturb'} · {silentDuration} min
                  </Text>
                </View>
              </View>
              <MaterialCommunityIcons
                name={prayerMode === 'vibration' ? 'vibrate' : 'bell-off-outline'}
                size={26}
                color={Colors.gold}
              />
            </Animated.View>
          </Animated.View>
        )}

        {/* Prayer Ring Widget */}
        {next && (
          <Animated.View entering={FadeInDown.delay(100).duration(500)}>
            <PrayerRingWidget
              next={next}
              prevDate={
                nextTomorrowFajr
                  ? prayerEntries[prayerEntries.length - 1]?.timeDate ?? new Date(Date.now() - 6 * 3600 * 1000)
                  : current?.timeDate ?? new Date(next.timeDate.getTime() - 6 * 3600 * 1000)
              }
              tomorrowFajr={nextTomorrowFajr}
              namazDelay={namazDelays[next.name] ?? 0}
            />
          </Animated.View>
        )}

        {/* Current Prayer */}
        {current && (
          <Animated.View entering={FadeInDown.delay(160).duration(400)} style={styles.currentRow}>
            <View style={styles.currentBadge}>
              <Text style={styles.currentBadgeText}>Current</Text>
            </View>
            <MaterialCommunityIcons
              name={(PRAYER_ICONS[current.name] || 'clock') as any}
              size={14}
              color={PRAYER_COLORS[current.name] || Colors.primary}
            />
            <Text style={styles.currentName}>{current.name}</Text>
            <Text style={styles.currentTime}>{formatTime12(current.time)}</Text>
          </Animated.View>
        )}

        {/* Prayer List */}
        <Animated.View entering={FadeInDown.delay(200).duration(400)}>
          <Text style={styles.sectionLabel}>Today's Prayers</Text>
          {prayerEntries.map((entry) => {
            const isActive = current?.name === entry.name;
            const isNext = next?.name === entry.name && !namazStatus.active;
            const delay = namazDelays[entry.name] ?? 0;
            const activationDate = delay > 0
              ? new Date(entry.timeDate.getTime() + delay * 60000)
              : null;
            const color = PRAYER_COLORS[entry.name] || Colors.primary;

            return (
              <View
                key={entry.name}
                style={[
                  styles.prayerRow,
                  isActive && styles.prayerRowActive,
                  isNext && styles.prayerRowNext,
                ]}
              >
                {isActive && <View style={[styles.prayerGlow, { backgroundColor: color }]} />}
                <View style={[styles.prayerIcon, { backgroundColor: color + (isActive ? '33' : '18') }]}>
                  <MaterialCommunityIcons
                    name={(PRAYER_ICONS[entry.name] || 'clock-outline') as any}
                    size={18}
                    color={isActive ? color : isNext ? color : color + 'AA'}
                  />
                </View>
                <View style={styles.prayerInfo}>
                  <Text style={[
                    styles.prayerName,
                    isActive && { color: Colors.gold },
                    isNext && { color: Colors.text },
                  ]}>
                    {entry.name}
                    {isActive && <Text style={styles.inProgressTag}> · In Progress</Text>}
                    {isNext && !isActive && <Text style={[styles.upNextTag]}> · Up Next</Text>}
                  </Text>
                  {activationDate ? (
                    <Text style={styles.prayerDelay}>
                      Namaz Mode: {formatTime12H(activationDate)}
                    </Text>
                  ) : null}
                </View>
                <View style={styles.prayerTimeWrap}>
                  <Text style={[
                    styles.prayerTime,
                    isActive && { color: Colors.gold },
                    isNext && { color: Colors.text },
                  ]}>
                    {formatTime12(entry.time)}
                  </Text>
                  {isActive && <View style={[styles.activeDot, { backgroundColor: Colors.gold }]} />}
                  {isNext && !isActive && <View style={[styles.activeDot, { backgroundColor: Colors.primary }]} />}
                </View>
              </View>
            );
          })}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

// ─── Prayer Ring Widget ────────────────────────────────────────────────────────
const RING_SIZE = 260;
const RING_CX = RING_SIZE / 2;
const RING_CY = RING_SIZE / 2;
const RING_R = 106;
const RING_STROKE = 13;
const RING_CIRC = 2 * Math.PI * RING_R;

function computeRingState(targetDate: Date, prevDate: Date, tomorrowFajr: boolean) {
  const now = Date.now();
  const target = tomorrowFajr
    ? targetDate.getTime() + 24 * 3600 * 1000
    : targetDate.getTime();
  const prev = prevDate.getTime();
  const diff = Math.max(0, target - now);
  const total = target - prev;
  const progress = total > 0 ? diff / total : 0;
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  const display = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return { display, progress: Math.max(0, Math.min(1, progress)) };
}

function PrayerRingWidget({
  next,
  prevDate,
  tomorrowFajr,
  namazDelay,
}: {
  next: PrayerEntry;
  prevDate: Date;
  tomorrowFajr: boolean;
  namazDelay: number;
}) {
  const color = PRAYER_COLORS[next.name] || Colors.primary;
  const [state, setState] = useState(() => computeRingState(next.timeDate, prevDate, tomorrowFajr));

  useEffect(() => {
    const id = setInterval(() => setState(computeRingState(next.timeDate, prevDate, tomorrowFajr)), 1000);
    return () => clearInterval(id);
  }, [next.timeDate, prevDate, tomorrowFajr]);

  const dashOffset = RING_CIRC * (1 - state.progress);

  return (
    <View style={styles.ringWrap}>
      <View style={{ width: RING_SIZE, height: RING_SIZE }}>
        <Svg width={RING_SIZE} height={RING_SIZE}>
          <Defs>
            <RadialGradient id="glow" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={color} stopOpacity={0.15} />
              <Stop offset="100%" stopColor={color} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={RING_CX} cy={RING_CY} r={RING_R + 20} fill="url(#glow)" />
          <Circle
            cx={RING_CX} cy={RING_CY} r={RING_R}
            fill="none" stroke="#162B1E"
            strokeWidth={RING_STROKE}
          />
          <Circle
            cx={RING_CX} cy={RING_CY} r={RING_R}
            fill="none"
            stroke={color}
            strokeWidth={RING_STROKE}
            strokeDasharray={RING_CIRC}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            rotation={-90}
            origin={`${RING_CX},${RING_CY}`}
          />
        </Svg>
        <View style={styles.ringCenter}>
          <View style={[styles.ringPrayerBadge, { backgroundColor: color + '20' }]}>
            <MaterialCommunityIcons
              name={(PRAYER_ICONS[next.name] || 'clock-outline') as any}
              size={12} color={color}
            />
            <Text style={[styles.ringPrayerLabel, { color }]}>{next.name}</Text>
          </View>
          <Text style={styles.ringCountdown}>{state.display}</Text>
          <Text style={styles.ringAdhanTime}>{formatTime12(next.time)}</Text>
          {namazDelay > 0 && (
            <View style={styles.ringDelayBadge}>
              <Text style={styles.ringDelayText}>+{namazDelay}m iqamah</Text>
            </View>
          )}
          {tomorrowFajr && (
            <Text style={styles.ringTomorrowLabel}>Tomorrow</Text>
          )}
        </View>
      </View>
    </View>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function formatHijriShort(hijriDate: string): string {
  const parts = hijriDate.split(' ');
  if (parts.length >= 3) return `${parts[0]} ${parts[1]}`;
  return hijriDate;
}

function formatTime12H(d: Date): string {
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${m} ${period}`;
}

function getCurrentAndNextPrayerAt(
  entries: PrayerEntry[],
  now: Date
): { current: PrayerEntry | null; next: PrayerEntry; nextTomorrowFajr: boolean } {
  for (let i = entries.length - 1; i >= 0; i--) {
    if (entries[i].timeDate <= now) {
      const current = entries[i];
      const next = entries[i + 1] ?? null;
      if (next) return { current, next, nextTomorrowFajr: false };
      return { current, next: entries[0], nextTomorrowFajr: true };
    }
  }
  return { current: null, next: entries[0], nextTomorrowFajr: false };
}

function isCurrentlyInNamazTimeAt(
  entries: PrayerEntry[],
  durationMinutes: number,
  namazDelays: Record<string, number>,
  now: Date
): { active: boolean; prayerName: string | null } {
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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  centerScreen: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { gap: 10, paddingHorizontal: 0 },
  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  appName: {
    fontSize: 26,
    fontFamily: 'Inter_700Bold',
    color: Colors.text,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  locationText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: Colors.dim,
  },
  headerRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  ramadanBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.gold + '22',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.gold + '44',
  },
  ramadanText: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.gold,
  },
  dateBadge: {
    backgroundColor: Colors.primary + '18',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  dateText: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    color: Colors.primary,
  },
  // ── Active Banner ───────────────────────────────────────────────────────────
  activeBannerWrap: {
    marginHorizontal: 16,
    borderRadius: 18,
    overflow: 'hidden',
  },
  activeBannerGlow: {
    position: 'absolute',
    inset: 0,
    backgroundColor: Colors.gold,
    borderRadius: 18,
  },
  activeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 15,
    backgroundColor: '#1A150088',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.gold + '60',
  },
  activeBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  activePulseRing: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.gold + '33',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activePulseCore: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: Colors.gold,
  },
  activePrayerName: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    color: Colors.gold,
  },
  activeModeText: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: Colors.gold + 'AA',
    marginTop: 2,
  },
  // ── Prayer Ring Widget ───────────────────────────────────────────────────────
  ringWrap: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  ringCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  ringPrayerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 2,
  },
  ringPrayerLabel: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.4,
  },
  ringCountdown: {
    fontSize: 44,
    fontFamily: 'Inter_700Bold',
    color: Colors.text,
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  ringAdhanTime: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: Colors.subtext,
    marginTop: 1,
  },
  ringDelayBadge: {
    backgroundColor: Colors.primary + '1A',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 4,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  ringDelayText: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    color: Colors.primary,
  },
  ringTomorrowLabel: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    color: Colors.gold,
    backgroundColor: Colors.gold + '18',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 2,
  },
  // ── Current prayer row ──────────────────────────────────────────────────────
  currentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    marginTop: -2,
  },
  currentBadge: {
    backgroundColor: Colors.primary + '22',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: Colors.primary + '44',
  },
  currentBadgeText: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.primary,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  currentName: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.subtext,
  },
  currentTime: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: Colors.dim,
    marginLeft: 'auto',
  },
  // ── Prayer List ─────────────────────────────────────────────────────────────
  sectionLabel: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.dim,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    paddingHorizontal: 20,
    marginBottom: 6,
  },
  prayerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 4,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 18,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    gap: 12,
  },
  prayerRowActive: {
    borderColor: Colors.gold + '80',
    backgroundColor: '#1A180000',
  },
  prayerRowNext: {
    borderColor: Colors.primary + '50',
  },
  prayerGlow: {
    position: 'absolute',
    inset: 0,
    opacity: 0.08,
  },
  prayerIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prayerInfo: {
    flex: 1,
    gap: 2,
  },
  prayerName: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.subtext,
  },
  inProgressTag: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: Colors.gold + 'CC',
  },
  upNextTag: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: Colors.primary + 'CC',
  },
  prayerDelay: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: Colors.primary + 'BB',
  },
  prayerTimeWrap: {
    alignItems: 'flex-end',
    gap: 4,
  },
  prayerTime: {
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
    color: Colors.subtext,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    alignSelf: 'flex-end',
  },
  // ── Loading/Empty ───────────────────────────────────────────────────────────
  locatingWrap: { alignItems: 'center', gap: 6 },
  locatingIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary + '18',
    borderWidth: 1,
    borderColor: Colors.primary + '40',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingTitle: {
    marginTop: 12,
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: Colors.text,
  },
  loadingText: {
    marginTop: 6,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: Colors.subtext,
    textAlign: 'center',
  },
  emptyWrap: {
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    color: Colors.text,
  },
  emptyBody: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: Colors.subtext,
    textAlign: 'center',
    lineHeight: 22,
  },
  goBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 16,
    marginTop: 8,
  },
  goBtnText: {
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
    color: '#000',
  },
});
