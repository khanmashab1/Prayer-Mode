import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  Switch,
  Linking,
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
import { Colors } from '@/constants/colors';
import { useApp } from '@/context/AppContext';
import { formatTime12 } from '@/lib/prayerAPI';
import type { PrayerEntry } from '@/lib/prayerAPI';
import { openDNDSettings, testVibration } from '@/lib/ringerMode';
import type { PrayerMode } from '@/lib/ringerMode';

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

const DURATION_PRESETS = [5, 10, 15, 20, 30];

export default function NamazModeScreen() {
  const insets = useSafeAreaInsets();
  const {
    prayerEntries,
    prayerMode,
    silentDuration,
    namazDelays,
    ramadanMode,
    setPrayerMode,
    setSilentDuration,
    setNamazDelay,
    setRamadanMode,
    refreshPrayerTimes,
  } = useApp();

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 34 : insets.bottom;

  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 10_000);
    return () => clearInterval(id);
  }, []);

  const namazStatus = isCurrentlyInNamazTime(prayerEntries, silentDuration, namazDelays, now);

  const pulseAnim = useSharedValue(0);
  useEffect(() => {
    if (namazStatus.active) {
      pulseAnim.value = withRepeat(
        withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
        -1,
        true
      );
    } else {
      pulseAnim.value = withTiming(0);
    }
  }, [namazStatus.active]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: 0.3 + pulseAnim.value * 0.4,
    transform: [{ scale: 1 + pulseAnim.value * 0.06 }],
  }));

  const nextActivation = getNextActivation(prayerEntries, namazDelays, now);

  const handleModeChange = async (mode: PrayerMode) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (mode === 'dnd' && Platform.OS === 'android') {
      await openDNDSettings();
    }
    await setPrayerMode(mode);
  };

  const handleDuration = async (delta: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newVal = Math.max(5, Math.min(60, silentDuration + delta));
    await setSilentDuration(newVal);
  };

  const handleDurationPreset = async (val: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await setSilentDuration(val);
  };

  const handleDelay = async (prayer: string, delta: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const current = namazDelays[prayer] ?? 0;
    const newVal = Math.max(0, Math.min(120, current + delta));
    await setNamazDelay(prayer, newVal);
  };

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#060E0A', '#091508', '#060E0A']} style={StyleSheet.absoluteFill} />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: topPad + 16, paddingBottom: botPad + 88 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <Animated.View entering={FadeInDown.duration(400)} style={styles.titleRow}>
          <Text style={styles.pageTitle}>NamazGuard</Text>
          <Text style={styles.pageSub}>Automatically silences your phone during prayer</Text>
        </Animated.View>

        {/* Status Hero */}
        <Animated.View entering={FadeInDown.delay(60).duration(400)}>
          {namazStatus.active ? (
            <View style={styles.statusCardActive}>
              <Animated.View style={[styles.statusGlow, pulseStyle]} />
              <View style={styles.statusContent}>
                <View style={styles.statusIconWrap}>
                  <MaterialCommunityIcons
                    name={prayerMode === 'vibration' ? 'vibrate' : 'bell-off-outline'}
                    size={32}
                    color={Colors.gold}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.statusActiveTitle}>Active Now</Text>
                  <Text style={styles.statusActiveSub}>
                    {namazStatus.prayerName} · {prayerMode === 'vibration' ? 'Vibration' : 'Do Not Disturb'} · {silentDuration} min
                  </Text>
                </View>
                <View style={styles.activeLiveDot} />
              </View>
            </View>
          ) : (
            <View style={styles.statusCardIdle}>
              <View style={styles.statusContent}>
                <View style={styles.statusIconWrapIdle}>
                  <MaterialCommunityIcons
                    name={prayerMode === 'vibration' ? 'vibrate' : 'bell-off-outline'}
                    size={28}
                    color={Colors.primary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.statusIdleTitle}>Ready</Text>
                  {nextActivation ? (
                    <Text style={styles.statusIdleSub}>
                      {nextActivation.prayerName} at {nextActivation.timeStr}
                      {nextActivation.delayMin > 0 && ` (+${nextActivation.delayMin}m)`}
                    </Text>
                  ) : (
                    <Text style={styles.statusIdleSub}>No prayer times loaded</Text>
                  )}
                </View>
              </View>
            </View>
          )}
        </Animated.View>

        {/* Mode Selection */}
        <Animated.View entering={FadeInDown.delay(120).duration(400)}>
          <Text style={styles.sectionTitle}>Mode</Text>
          <View style={styles.modeRow}>
            <Pressable
              style={[styles.modeCard, prayerMode === 'vibration' && styles.modeCardActiveGreen]}
              onPress={() => handleModeChange('vibration')}
            >
              {prayerMode === 'vibration' && <View style={[styles.modeCardGlow, { backgroundColor: Colors.primary }]} />}
              <MaterialCommunityIcons
                name="vibrate"
                size={28}
                color={prayerMode === 'vibration' ? Colors.primary : Colors.dim}
              />
              <Text style={[styles.modeCardTitle, prayerMode === 'vibration' && { color: Colors.primary }]}>
                Vibration
              </Text>
              <Text style={styles.modeCardSub}>Silent with vibrate</Text>
              {prayerMode === 'vibration' && (
                <View style={styles.modeCheckWrap}>
                  <Ionicons name="checkmark-circle" size={18} color={Colors.primary} />
                </View>
              )}
            </Pressable>

            <Pressable
              style={[styles.modeCard, prayerMode === 'dnd' && styles.modeCardActiveGold]}
              onPress={() => handleModeChange('dnd')}
            >
              {prayerMode === 'dnd' && <View style={[styles.modeCardGlow, { backgroundColor: Colors.gold }]} />}
              <MaterialCommunityIcons
                name="bell-off-outline"
                size={28}
                color={prayerMode === 'dnd' ? Colors.gold : Colors.dim}
              />
              <Text style={[styles.modeCardTitle, prayerMode === 'dnd' && { color: Colors.gold }]}>
                Do Not Disturb
              </Text>
              <Text style={styles.modeCardSub}>Full silence</Text>
              {prayerMode === 'dnd' && (
                <View style={styles.modeCheckWrap}>
                  <Ionicons name="checkmark-circle" size={18} color={Colors.gold} />
                </View>
              )}
            </Pressable>
          </View>

          {prayerMode === 'vibration' && Platform.OS !== 'web' && (
            <Pressable
              style={styles.testVibBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                testVibration();
              }}
            >
              <MaterialCommunityIcons name="vibrate" size={15} color={Colors.primary} />
              <Text style={styles.testVibText}>Test Vibration</Text>
            </Pressable>
          )}

          {prayerMode === 'dnd' && Platform.OS === 'android' && (
            <Pressable style={styles.dndWarning} onPress={openDNDSettings}>
              <MaterialCommunityIcons name="shield-alert-outline" size={16} color={Colors.gold} />
              <Text style={styles.dndWarningText}>Tap to grant NamazGuard access under Do Not Disturb</Text>
              <Ionicons name="open-outline" size={14} color={Colors.gold} />
            </Pressable>
          )}
        </Animated.View>

        {/* Silent Duration */}
        <Animated.View entering={FadeInDown.delay(180).duration(400)}>
          <Text style={styles.sectionTitle}>Silent Duration</Text>
          <View style={styles.card}>
            <View style={styles.durationRow}>
              <View style={[styles.durationIcon, { backgroundColor: '#14B8A622' }]}>
                <MaterialCommunityIcons name="timer-outline" size={20} color="#14B8A6" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.durationTitle}>How long to activate</Text>
                <Text style={styles.durationSub}>Mode stays on for this many minutes</Text>
              </View>
              <View style={styles.stepper}>
                <Pressable style={styles.stepBtn} onPress={() => handleDuration(-5)} disabled={silentDuration <= 5}>
                  <Ionicons name="remove" size={20} color={silentDuration <= 5 ? Colors.border : Colors.text} />
                </Pressable>
                <Text style={styles.stepValue}>{silentDuration}m</Text>
                <Pressable style={styles.stepBtn} onPress={() => handleDuration(5)} disabled={silentDuration >= 60}>
                  <Ionicons name="add" size={20} color={silentDuration >= 60 ? Colors.border : Colors.text} />
                </Pressable>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.presetsRow}>
              {DURATION_PRESETS.map((val) => (
                <Pressable
                  key={val}
                  style={[styles.presetChip, silentDuration === val && styles.presetChipActive]}
                  onPress={() => handleDurationPreset(val)}
                >
                  <Text style={[styles.presetChipText, silentDuration === val && styles.presetChipTextActive]}>
                    {val}m
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </Animated.View>

        {/* Per-Prayer Start Delay */}
        <Animated.View entering={FadeInDown.delay(240).duration(400)}>
          <Text style={styles.sectionTitle}>Start Delay (After Adhan)</Text>
          <Text style={styles.sectionHint}>
            Namaz Mode activates this many minutes after the Adhan — useful when your local Iqamah time differs.
          </Text>
          <View style={styles.card}>
            {prayerEntries.length > 0 ? (
              prayerEntries.map((entry, idx) => {
                const delay = namazDelays[entry.name] ?? 0;
                const activationDate = new Date(entry.timeDate.getTime() + delay * 60000);
                const endDate = new Date(activationDate.getTime() + silentDuration * 60000);
                const color = PRAYER_COLORS[entry.name] || Colors.primary;
                return (
                  <React.Fragment key={entry.name}>
                    {idx > 0 && <View style={styles.divider} />}
                    <View style={styles.delayRow}>
                      <View style={[styles.delayIcon, { backgroundColor: color + '22' }]}>
                        <MaterialCommunityIcons
                          name={(PRAYER_ICONS[entry.name] || 'clock-outline') as any}
                          size={18}
                          color={color}
                        />
                      </View>
                      <View style={styles.delayInfo}>
                        <Text style={styles.delayPrayerName}>{entry.name}</Text>
                        <Text style={styles.delayTime}>
                          Adhan: {formatTime12(entry.time)}
                          {delay > 0 && (
                            <Text style={[styles.delayActivation, { color }]}>
                              {'  '}Mode: {formatTime12H(activationDate)} – {formatTime12H(endDate)}
                            </Text>
                          )}
                        </Text>
                      </View>
                      <View style={styles.stepper}>
                        <Pressable
                          style={styles.stepBtn}
                          onPress={() => handleDelay(entry.name, -5)}
                          disabled={delay <= 0}
                        >
                          <Ionicons name="remove" size={18} color={delay <= 0 ? Colors.border : Colors.text} />
                        </Pressable>
                        <Text style={[styles.stepValue, { minWidth: 40, textAlign: 'center', fontSize: 13 }]}>
                          {delay === 0 ? '0m' : `+${delay}m`}
                        </Text>
                        <Pressable
                          style={styles.stepBtn}
                          onPress={() => handleDelay(entry.name, 5)}
                          disabled={delay >= 120}
                        >
                          <Ionicons name="add" size={18} color={delay >= 120 ? Colors.border : Colors.text} />
                        </Pressable>
                      </View>
                    </View>
                  </React.Fragment>
                );
              })
            ) : (
              <View style={styles.noDataRow}>
                <MaterialCommunityIcons name="clock-alert-outline" size={20} color={Colors.dim} />
                <Text style={styles.noDataText}>Set your location to load prayer times</Text>
              </View>
            )}
          </View>
        </Animated.View>

        {/* How It Works */}
        <Animated.View entering={FadeInDown.delay(300).duration(400)}>
          <Text style={styles.sectionTitle}>How It Works</Text>
          <View style={styles.card}>
            {[
              { icon: 'bell-ring-outline', color: Colors.primary, text: 'Adhan time is reached' },
              { icon: 'timer-sand', color: Colors.gold, text: 'Wait for your set start delay' },
              { icon: prayerMode === 'vibration' ? 'vibrate' : 'bell-off-outline', color: '#14B8A6', text: `${prayerMode === 'vibration' ? 'Vibration' : 'Do Not Disturb'} activates for ${silentDuration} minutes` },
              { icon: 'check-circle-outline', color: Colors.primary, text: 'Phone returns to normal automatically' },
            ].map((step, i) => (
              <React.Fragment key={i}>
                {i > 0 && <View style={styles.divider} />}
                <View style={styles.stepRow}>
                  <View style={[styles.stepNum, { backgroundColor: step.color + '22' }]}>
                    <Text style={[styles.stepNumText, { color: step.color }]}>{i + 1}</Text>
                  </View>
                  <MaterialCommunityIcons name={step.icon as any} size={18} color={step.color} />
                  <Text style={styles.stepText}>{step.text}</Text>
                </View>
              </React.Fragment>
            ))}
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function formatTime12H(d: Date): string {
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const period = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${m} ${period}`;
}

function isCurrentlyInNamazTime(
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

function getNextActivation(
  entries: PrayerEntry[],
  namazDelays: Record<string, number>,
  now: Date
): { prayerName: string; timeStr: string; delayMin: number } | null {
  for (const entry of entries) {
    const delayMin = namazDelays[entry.name] ?? 0;
    const activationDate = new Date(entry.timeDate.getTime() + delayMin * 60000);
    if (activationDate > now) {
      return {
        prayerName: entry.name,
        timeStr: formatTime12H(activationDate),
        delayMin,
      };
    }
  }
  return null;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  scroll: { gap: 12, paddingHorizontal: 0 },
  // ── Title ───────────────────────────────────────────────────────────────────
  titleRow: {
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  pageTitle: {
    fontSize: 26,
    fontFamily: 'Inter_700Bold',
    color: Colors.text,
  },
  pageSub: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: Colors.dim,
    marginTop: 3,
  },
  // ── Status Card ─────────────────────────────────────────────────────────────
  statusCardActive: {
    marginHorizontal: 16,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.gold + '60',
    backgroundColor: '#1A150088',
  },
  statusGlow: {
    position: 'absolute',
    inset: 0,
    backgroundColor: Colors.gold + '30',
    borderRadius: 20,
  },
  statusCardIdle: {
    marginHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.primary + '40',
    backgroundColor: Colors.card,
  },
  statusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 18,
  },
  statusIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: Colors.gold + '22',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusIconWrapIdle: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: Colors.primary + '18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusActiveTitle: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: Colors.gold,
  },
  statusActiveSub: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: Colors.gold + 'BB',
    marginTop: 3,
  },
  statusIdleTitle: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: Colors.text,
  },
  statusIdleSub: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: Colors.subtext,
    marginTop: 3,
  },
  activeLiveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.gold,
  },
  // ── Mode Cards ──────────────────────────────────────────────────────────────
  sectionTitle: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.dim,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 4,
    paddingHorizontal: 20,
  },
  sectionHint: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: Colors.dim,
    paddingHorizontal: 20,
    marginBottom: 8,
    lineHeight: 17,
    marginTop: -4,
  },
  modeRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    gap: 10,
  },
  modeCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    gap: 6,
    overflow: 'hidden',
    position: 'relative',
  },
  modeCardActiveGreen: {
    borderColor: Colors.primary + '60',
    backgroundColor: Colors.primary + '0A',
  },
  modeCardActiveGold: {
    borderColor: Colors.gold + '60',
    backgroundColor: Colors.gold + '0A',
  },
  modeCardGlow: {
    position: 'absolute',
    inset: 0,
    opacity: 0.06,
  },
  modeCardTitle: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    color: Colors.subtext,
  },
  modeCardSub: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: Colors.dim,
  },
  modeCheckWrap: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  testVibBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginHorizontal: 16,
    marginTop: 8,
    paddingVertical: 11,
    paddingHorizontal: 16,
    backgroundColor: Colors.primary + '15',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.primary + '40',
  },
  testVibText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.primary,
  },
  dndWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 8,
    padding: 12,
    backgroundColor: Colors.gold + '18',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.gold + '44',
  },
  dndWarningText: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: Colors.gold,
  },
  // ── Card / Shared ───────────────────────────────────────────────────────────
  card: {
    marginHorizontal: 16,
    backgroundColor: Colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: 16,
  },
  // ── Duration ────────────────────────────────────────────────────────────────
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  durationIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationTitle: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.text,
  },
  durationSub: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: Colors.dim,
    marginTop: 2,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepValue: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    color: Colors.text,
    minWidth: 36,
    textAlign: 'center',
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  presetChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: Colors.border,
    alignItems: 'center',
  },
  presetChipActive: {
    backgroundColor: Colors.primary + '30',
    borderWidth: 1,
    borderColor: Colors.primary + '60',
  },
  presetChipText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.dim,
  },
  presetChipTextActive: {
    color: Colors.primary,
  },
  // ── Delay rows ──────────────────────────────────────────────────────────────
  delayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  delayIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  delayInfo: {
    flex: 1,
    gap: 2,
  },
  delayPrayerName: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.text,
  },
  delayTime: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: Colors.dim,
  },
  delayActivation: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
  },
  noDataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  noDataText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: Colors.dim,
  },
  // ── How It Works ────────────────────────────────────────────────────────────
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  stepNum: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
  },
  stepText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: Colors.subtext,
  },
});
