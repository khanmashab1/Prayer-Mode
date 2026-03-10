import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/colors';
import { useApp } from '@/context/AppContext';
import type { PrayerMode } from '@/lib/ringerMode';
import { openDNDSettings } from '@/lib/ringerMode';

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { setPrayerMode, setOnboardingDone } = useApp();
  const [selected, setSelected] = useState<PrayerMode | null>(null);
  const [step, setStep] = useState<'mode' | 'dnd'>('mode');

  const vibScale = useSharedValue(1);
  const dndScale = useSharedValue(1);

  const vibStyle = useAnimatedStyle(() => ({ transform: [{ scale: vibScale.value }] }));
  const dndStyle = useAnimatedStyle(() => ({ transform: [{ scale: dndScale.value }] }));

  const handleSelect = (mode: PrayerMode) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelected(mode);
    if (mode === 'vibration') {
      vibScale.value = withSpring(0.95, {}, () => { vibScale.value = withSpring(1); });
    } else {
      dndScale.value = withSpring(0.95, {}, () => { dndScale.value = withSpring(1); });
    }
  };

  const handleContinue = async () => {
    if (!selected) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (selected === 'dnd') {
      setStep('dnd');
    } else {
      await setPrayerMode(selected);
      await setOnboardingDone();
      router.replace('/(tabs)');
    }
  };

  const handleGrantDND = async () => {
    await openDNDSettings();
  };

  const handleSkipDND = async () => {
    await setPrayerMode('dnd');
    await setOnboardingDone();
    router.replace('/(tabs)');
  };

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 34 : insets.bottom;

  if (step === 'dnd') {
    return (
      <View style={[styles.container, { paddingTop: topPad }]}>
        <LinearGradient
          colors={['#060E0A', '#0A1A10', '#060E0A']}
          style={StyleSheet.absoluteFill}
        />

        <Animated.View
          entering={FadeInDown.duration(500)}
          style={[styles.dndContent, { paddingBottom: botPad + 24 }]}
        >
          <View style={styles.dndIconWrap}>
            <MaterialCommunityIcons name="bell-off-outline" size={48} color={Colors.primary} />
          </View>

          <Text style={styles.dndTitle}>Do Not Disturb</Text>
          <Text style={styles.dndBody}>
            To automatically silence your phone during prayer times, Namaz Mode needs
            access to Do Not Disturb on Android.{'\n\n'}
            Tap the button below to open settings and grant{' '}
            <Text style={{ color: Colors.primary }}>Notification Policy Access</Text>.
          </Text>

          <Pressable style={styles.primaryBtn} onPress={handleGrantDND}>
            <MaterialCommunityIcons name="shield-check-outline" size={20} color="#000" />
            <Text style={styles.primaryBtnText}>Allow DND Permission</Text>
          </Pressable>

          <Pressable style={styles.skipBtn} onPress={handleSkipDND}>
            <Text style={styles.skipBtnText}>Skip for now</Text>
          </Pressable>
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <LinearGradient
        colors={['#060E0A', '#0A1A10', '#060E0A']}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: botPad + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.delay(100).duration(600)} style={styles.header}>
          <View style={styles.moonWrap}>
            <MaterialCommunityIcons name="moon-waning-crescent" size={56} color={Colors.gold} />
          </View>
          <Text style={styles.title}>Namaz Mode</Text>
          <Text style={styles.subtitle}>
            Your phone will automatically silence{'\n'}during each prayer time.
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300).duration(600)}>
          <Text style={styles.sectionTitle}>Choose silence method</Text>

          <Animated.View style={vibStyle}>
            <Pressable
              style={[styles.optionCard, selected === 'vibration' && styles.optionSelected]}
              onPress={() => handleSelect('vibration')}
            >
              <View style={[styles.optionIcon, selected === 'vibration' && styles.optionIconSelected]}>
                <MaterialCommunityIcons
                  name="vibrate"
                  size={28}
                  color={selected === 'vibration' ? Colors.primary : Colors.dim}
                />
              </View>
              <View style={styles.optionText}>
                <Text style={[styles.optionTitle, selected === 'vibration' && { color: Colors.primary }]}>
                  Vibration
                </Text>
                <Text style={styles.optionDesc}>
                  Phone vibrates silently during prayer time
                </Text>
              </View>
              <View style={[styles.radio, selected === 'vibration' && styles.radioSelected]}>
                {selected === 'vibration' && (
                  <View style={styles.radioDot} />
                )}
              </View>
            </Pressable>
          </Animated.View>

          <Animated.View style={dndStyle}>
            <Pressable
              style={[styles.optionCard, selected === 'dnd' && styles.optionSelected]}
              onPress={() => handleSelect('dnd')}
            >
              <View style={[styles.optionIcon, selected === 'dnd' && styles.optionIconDND]}>
                <MaterialCommunityIcons
                  name="bell-off-outline"
                  size={28}
                  color={selected === 'dnd' ? Colors.gold : Colors.dim}
                />
              </View>
              <View style={styles.optionText}>
                <Text style={[styles.optionTitle, selected === 'dnd' && { color: Colors.gold }]}>
                  Do Not Disturb
                </Text>
                <Text style={styles.optionDesc}>
                  Completely silences all notifications
                </Text>
              </View>
              <View style={[styles.radio, selected === 'dnd' && styles.radioDNDSelected]}>
                {selected === 'dnd' && (
                  <View style={[styles.radioDot, { backgroundColor: Colors.gold }]} />
                )}
              </View>
            </Pressable>
          </Animated.View>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(500).duration(600)}>
          <Pressable
            style={[styles.continueBtn, !selected && styles.continueBtnDisabled]}
            onPress={handleContinue}
            disabled={!selected}
          >
            <Text style={styles.continueBtnText}>Continue</Text>
            <Ionicons name="arrow-forward" size={20} color="#000" />
          </Pressable>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 24,
    gap: 24,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 12,
  },
  moonWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.gold + '18',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.gold + '40',
  },
  title: {
    fontSize: 32,
    fontFamily: 'Inter_700Bold',
    color: Colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: Colors.subtext,
    textAlign: 'center',
    lineHeight: 22,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.dim,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 18,
    borderRadius: 18,
    backgroundColor: Colors.card,
    borderWidth: 1.5,
    borderColor: Colors.border,
    marginBottom: 12,
  },
  optionSelected: {
    borderColor: Colors.primary + '80',
    backgroundColor: Colors.primary + '0D',
  },
  optionIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionIconSelected: {
    backgroundColor: Colors.primary + '22',
  },
  optionIconDND: {
    backgroundColor: Colors.gold + '22',
  },
  optionText: {
    flex: 1,
    gap: 4,
  },
  optionTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.text,
  },
  optionDesc: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: Colors.subtext,
    lineHeight: 18,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.dim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: Colors.primary,
  },
  radioDNDSelected: {
    borderColor: Colors.gold,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  continueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.primary,
    paddingVertical: 18,
    borderRadius: 18,
    marginTop: 8,
  },
  continueBtnDisabled: {
    opacity: 0.4,
  },
  continueBtnText: {
    fontSize: 17,
    fontFamily: 'Inter_700Bold',
    color: '#000',
  },
  dndContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 20,
  },
  dndIconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primary + '18',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.primary + '40',
    marginBottom: 12,
  },
  dndTitle: {
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
    color: Colors.text,
    textAlign: 'center',
  },
  dndBody: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: Colors.subtext,
    textAlign: 'center',
    lineHeight: 24,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.primary,
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 18,
    width: '100%',
    marginTop: 8,
  },
  primaryBtnText: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    color: '#000',
  },
  skipBtn: {
    paddingVertical: 14,
  },
  skipBtnText: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    color: Colors.dim,
  },
});
