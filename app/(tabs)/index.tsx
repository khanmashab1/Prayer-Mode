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
import { CountdownTimer } from '@/components/CountdownTimer';
import { PrayerCard } from '@/components/PrayerCard';
import { getCurrentAndNextPrayer } from '@/lib/prayerAPI';
import { schedulePrayersForToday, isCurrentlyInNamazTime } from '@/lib/namazScheduler';

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
  // Tick every 10 seconds to recompute current/next prayer and namaz status
  const [now, setNow] = useState(() => new Date());
  const lastDateRef = useRef(now.toDateString());

  useEffect(() => {
    const interval = setInterval(() => {
      const next = new Date();
      setNow(next);
      // Auto-refresh prayer times at midnight (date change)
      if (next.toDateString() !== lastDateRef.current) {
        lastDateRef.current = next.toDateString();
        refreshPrayerTimes().catch(console.warn);
      }
    }, 10_000);
    return () => clearInterval(interval);
  }, [refreshPrayerTimes]);

  // Recompute live values on every tick
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
      glowAnim.value = withRepeat(
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
        -1,
        true
      );
      ringAnim.value = withRepeat(
        withTiming(1.08, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    } else {
      glowAnim.value = withTiming(0);
      ringAnim.value = withTiming(1);
    }
  }, [namazStatus.active]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowAnim.value * 0.6,
  }));

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringAnim.value }],
  }));

  useEffect(() => {
    if (!onboardingDone) {
      router.replace('/onboarding');
    }
  }, [onboardingDone]);

  useEffect(() => {
    if (prayerEntries.length > 0 && onboardingDone) {
      schedulePrayersForToday(prayerEntries, prayerMode, silentDuration, namazDelays).catch(console.warn);
    }
  }, [prayerEntries, prayerMode, silentDuration, namazDelays]);

  const onRefresh = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    await refreshPrayerTimes();
    setRefreshing(false);
  }, [refreshPrayerTimes]);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 34 : insets.bottom;

  if (!location) {
    return (
      <View style={[styles.centerScreen, { paddingTop: topPad }]}>
        <LinearGradient
          colors={['#060E0A', '#0A1A10', '#060E0A']}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.emptyWrap}>
          <MaterialCommunityIcons name="map-marker-off-outline" size={56} color={Colors.dim} />
          <Text style={styles.emptyTitle}>No Location Set</Text>
          <Text style={styles.emptyBody}>
            Go to Settings to choose your city or enable GPS location.
          </Text>
          <Pressable
            style={styles.goSettingsBtn}
            onPress={() => router.push('/(tabs)/settings')}
          >
            <Text style={styles.goSettingsBtnText}>Open Settings</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (isLocating && !location) {
    return (
      <View style={[styles.centerScreen, { paddingTop: topPad }]}>
        <LinearGradient
          colors={['#060E0A', '#0A1A10', '#060E0A']}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.locatingWrap}>
          <View style={styles.locatingIcon}>
            <MaterialCommunityIcons name="crosshairs-gps" size={36} color={Colors.primary} />
          </View>
          <ActivityIndicator color={Colors.primary} size="large" style={{ marginTop: 8 }} />
          <Text style={styles.loadingTitle}>Detecting Location</Text>
          <Text style={styles.loadingText}>Getting your GPS coordinates…</Text>
        </View>
      </View>
    );
  }

  if (isLoading && !prayerTimes) {
    return (
      <View style={[styles.centerScreen, { paddingTop: topPad }]}>
        <LinearGradient
          colors={['#060E0A', '#0A1A10', '#060E0A']}
          style={StyleSheet.absoluteFill}
        />
        <ActivityIndicator color={Colors.primary} size="large" />
        <Text style={styles.loadingText}>Fetching prayer times…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.centerScreen, { paddingTop: topPad }]}>
        <LinearGradient
          colors={['#060E0A', '#0A1A10', '#060E0A']}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.emptyWrap}>
          <MaterialCommunityIcons name="wifi-off" size={56} color={Colors.danger} />
          <Text style={styles.emptyTitle}>Connection Error</Text>
          <Text style={styles.emptyBody}>{error}</Text>
          <Pressable style={styles.goSettingsBtn} onPress={refreshPrayerTimes}>
            <Ionicons name="refresh" size={18} color="#000" />
            <Text style={styles.goSettingsBtnText}>Retry</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#060E0A', '#091508', '#060E0A']}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: topPad + 16, paddingBottom: botPad + 80 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(500)} style={styles.headerRow}>
          <View>
            <Text style={styles.appName}>Namaz Mode</Text>
            {prayerTimes && (
              <Text style={styles.hijriDate}>{prayerTimes.hijriDate}</Text>
            )}
          </View>
          <View style={styles.headerRight}>
            {(prayerTimes?.isRamadan || ramadanMode) && (
              <View style={styles.ramadanBadge}>
                <MaterialCommunityIcons name="star-crescent" size={12} color={Colors.gold} />
                <Text style={styles.ramadanText}>Ramadan</Text>
              </View>
            )}
            <View style={styles.modeChip}>
              <MaterialCommunityIcons
                name={prayerMode === 'vibration' ? 'vibrate' : 'bell-off-outline'}
                size={14}
                color={Colors.primary}
              />
            </View>
          </View>
        </Animated.View>

        {/* Location + Live Clock Row */}
        {location && (
          <Animated.View entering={FadeInDown.delay(80).duration(500)} style={styles.locationRow}>
            {isLocating ? (
              <ActivityIndicator size={12} color={Colors.primary} />
            ) : locationMode === 'gps' ? (
              <MaterialCommunityIcons name="crosshairs-gps" size={13} color={Colors.primary} />
            ) : (
              <MaterialCommunityIcons name="map-marker" size={14} color={Colors.dim} />
            )}
            <Text style={[
              styles.locationText,
              isLocating && { color: Colors.primary },
            ]}>
              {isLocating
                ? 'Updating location…'
                : location.cityName || `${location.latitude.toFixed(2)}, ${location.longitude.toFixed(2)}`}
            </Text>
            <View style={styles.dotSep} />
            <LiveClock />
          </Animated.View>
        )}

        {/* Active Namaz Banner */}
        {namazStatus.active && (
          <Animated.View entering={FadeInDown.delay(100).duration(600)} style={styles.activeBannerWrap}>
            <Animated.View style={[styles.activeBannerGlow, glowStyle]} />
            <Animated.View style={[styles.activeBanner, ringStyle]}>
              <View style={styles.activeBannerLeft}>
                <View style={styles.activePulse}>
                  <View style={styles.activePulseCore} />
                </View>
                <View>
                  <Text style={styles.activePrayerName}>{namazStatus.prayerName} Time</Text>
                  <Text style={styles.activeModeText}>
                    {prayerMode === 'vibration' ? 'Vibration mode active' : 'DND mode active'} — {silentDuration} min
                  </Text>
                </View>
              </View>
              <MaterialCommunityIcons
                name={prayerMode === 'vibration' ? 'vibrate' : 'bell-off-outline'}
                size={28}
                color={Colors.gold}
              />
            </Animated.View>
          </Animated.View>
        )}

        {/* Countdown */}
        {next && (
          <Animated.View entering={FadeInDown.delay(160).duration(600)} style={styles.countdownCard}>
            <CountdownTimer
              targetDate={next.timeDate}
              tomorrowFajr={nextTomorrowFajr}
              nextPrayerName={next.name}
            />
          </Animated.View>
        )}

        {/* Current Prayer */}
        {current && (
          <Animated.View entering={FadeInDown.delay(220).duration(600)} style={styles.currentRow}>
            <View style={styles.currentBadge}>
              <Text style={styles.currentBadgeText}>Current</Text>
            </View>
            <Text style={styles.currentPrayerName}>{current.name}</Text>
          </Animated.View>
        )}

        {/* Prayer List */}
        <Animated.View entering={FadeInDown.delay(280).duration(600)}>
          <Text style={styles.listHeader}>Today's Prayers</Text>
          {prayerEntries.map((entry) => (
            <PrayerCard
              key={entry.name}
              entry={entry}
              isActive={current?.name === entry.name}
              isNext={!!(next?.name === entry.name && !namazStatus.active)}
            />
          ))}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

// ─── Live clock shown next to location ────────────────────────────────────────
function LiveClock() {
  const [time, setTime] = useState(() => formatClock(new Date()));

  useEffect(() => {
    const id = setInterval(() => setTime(formatClock(new Date())), 1000);
    return () => clearInterval(id);
  }, []);

  return <Text style={styles.liveClock}>{time}</Text>;
}

function formatClock(d: Date): string {
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${m}:${s} ${period}`;
}

// ─── Time-aware helpers (accept explicit `now`) ────────────────────────────────
import { PrayerEntry } from '@/lib/prayerAPI';

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
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centerScreen: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingTitle: {
    marginTop: 16,
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
  locatingWrap: {
    alignItems: 'center',
    gap: 4,
  },
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
  scroll: {
    paddingHorizontal: 0,
    gap: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  appName: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    color: Colors.text,
  },
  hijriDate: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: Colors.subtext,
    marginTop: 2,
  },
  ramadanBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.gold + '22',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.gold + '44',
  },
  ramadanText: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.gold,
  },
  modeChip: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: Colors.primary + '18',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  locationText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: Colors.dim,
  },
  dotSep: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: Colors.border,
  },
  liveClock: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: Colors.primary,
    letterSpacing: 0.3,
  },
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#1A1500CC',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.gold + '60',
  },
  activeBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  activePulse: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.gold + '33',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activePulseCore: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.gold,
  },
  activePrayerName: {
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
    color: Colors.gold,
  },
  activeModeText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: Colors.gold + 'AA',
    marginTop: 2,
  },
  countdownCard: {
    marginHorizontal: 16,
    marginVertical: 8,
    backgroundColor: Colors.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 24,
  },
  currentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    marginTop: 4,
  },
  currentBadge: {
    backgroundColor: Colors.primary + '22',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: Colors.primary + '44',
  },
  currentBadgeText: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  currentPrayerName: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.subtext,
  },
  listHeader: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.dim,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    paddingHorizontal: 20,
    marginBottom: 4,
    marginTop: 8,
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
  goSettingsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 16,
    marginTop: 8,
  },
  goSettingsBtnText: {
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
    color: '#000',
  },
});
