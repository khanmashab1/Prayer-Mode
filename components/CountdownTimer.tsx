import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  Easing,
} from 'react-native-reanimated';
import { Colors } from '@/constants/colors';
import { getCountdown } from '@/lib/prayerAPI';

interface CountdownTimerProps {
  targetDate: Date;
  tomorrowFajr: boolean;
  nextPrayerName: string;
}

export function CountdownTimer({ targetDate, tomorrowFajr, nextPrayerName }: CountdownTimerProps) {
  const [countdown, setCountdown] = useState('00:00:00');
  const [parts, setParts] = useState({ h: '00', m: '00', s: '00' });

  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1.03, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  useEffect(() => {
    const update = () => {
      const raw = getCountdown(targetDate, tomorrowFajr);
      setCountdown(raw);
      const [h, m, s] = raw.split(':');
      setParts({ h, m, s });
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [targetDate, tomorrowFajr]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Next Prayer</Text>
      <Animated.Text style={[styles.prayerName, pulseStyle]}>
        {nextPrayerName}
      </Animated.Text>

      <View style={styles.clockRow}>
        <TimeBlock value={parts.h} unit="HRS" />
        <Text style={styles.colon}>:</Text>
        <TimeBlock value={parts.m} unit="MIN" />
        <Text style={styles.colon}>:</Text>
        <TimeBlock value={parts.s} unit="SEC" />
      </View>

      {tomorrowFajr && (
        <Text style={styles.tomorrowNote}>Tomorrow</Text>
      )}
    </View>
  );
}

function TimeBlock({ value, unit }: { value: string; unit: string }) {
  return (
    <View style={styles.block}>
      <View style={styles.blockInner}>
        <Text style={styles.blockValue}>{value}</Text>
      </View>
      <Text style={styles.blockUnit}>{unit}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  label: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: Colors.subtext,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  prayerName: {
    fontSize: 36,
    fontFamily: 'Inter_700Bold',
    color: Colors.primary,
    marginBottom: 20,
  },
  clockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  colon: {
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
    color: Colors.dim,
    marginBottom: 16,
  },
  block: {
    alignItems: 'center',
    gap: 6,
  },
  blockInner: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minWidth: 64,
    alignItems: 'center',
  },
  blockValue: {
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
    color: Colors.text,
    letterSpacing: 2,
  },
  blockUnit: {
    fontSize: 9,
    fontFamily: 'Inter_500Medium',
    color: Colors.dim,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  tomorrowNote: {
    marginTop: 10,
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: Colors.gold,
    letterSpacing: 1,
  },
});
