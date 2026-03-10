import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { PrayerEntry } from '@/lib/prayerAPI';
import { formatTime12 } from '@/lib/prayerAPI';

interface PrayerCardProps {
  entry: PrayerEntry;
  isActive: boolean;
  isNext: boolean;
}

const PRAYER_ICONS: Record<string, string> = {
  Fajr: 'weather-sunset-up',
  Dhuhr: 'weather-sunny',
  Asr: 'weather-partly-cloudy',
  Maghrib: 'weather-sunset-down',
  Isha: 'weather-night',
};

function PrayerCardComponent({ entry, isActive, isNext }: PrayerCardProps) {
  const scale = useSharedValue(1);
  const glowOpacity = useSharedValue(0);

  useEffect(() => {
    if (isActive) {
      glowOpacity.value = withRepeat(
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
        -1,
        true
      );
    } else {
      glowOpacity.value = withTiming(0, { duration: 300 });
    }
  }, [isActive]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value * 0.5,
  }));

  const handlePress = () => {
    scale.value = withSpring(0.97, {}, () => {
      scale.value = withSpring(1);
    });
  };

  const iconName = PRAYER_ICONS[entry.name] || 'clock-outline';
  const time12 = formatTime12(entry.time);

  return (
    <Pressable onPress={handlePress} style={styles.pressable}>
      <Animated.View style={[styles.container, isActive && styles.activeContainer, animStyle]}>
        {isActive && (
          <Animated.View style={[styles.glow, glowStyle]} />
        )}

        <View style={styles.left}>
          <View style={[
            styles.iconWrap,
            isActive && styles.iconWrapActive,
            isNext && styles.iconWrapNext,
          ]}>
            <MaterialCommunityIcons
              name={iconName as any}
              size={20}
              color={isActive ? Colors.gold : isNext ? Colors.primary : Colors.dim}
            />
          </View>
          <View>
            <Text style={[
              styles.name,
              isActive && styles.nameActive,
              isNext && styles.nameNext,
            ]}>
              {entry.name}
            </Text>
            {isActive && (
              <Text style={styles.activeLabel}>In Progress</Text>
            )}
            {isNext && !isActive && (
              <Text style={styles.nextLabel}>Up Next</Text>
            )}
          </View>
        </View>

        <View style={styles.right}>
          <Text style={[
            styles.time,
            isActive && styles.timeActive,
            isNext && styles.timeNext,
          ]}>
            {time12}
          </Text>
          {isActive && (
            <View style={styles.activeDot} />
          )}
        </View>
      </Animated.View>
    </Pressable>
  );
}

export const PrayerCard = React.memo(PrayerCardComponent);

const styles = StyleSheet.create({
  pressable: {
    marginHorizontal: 16,
    marginVertical: 4,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  activeContainer: {
    borderColor: Colors.gold + '80',
    backgroundColor: '#1A1A00',
  },
  glow: {
    position: 'absolute',
    inset: 0,
    backgroundColor: Colors.gold,
    borderRadius: 16,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: Colors.gold + '22',
  },
  iconWrapNext: {
    backgroundColor: Colors.primary + '22',
  },
  name: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.subtext,
  },
  nameActive: {
    color: Colors.gold,
  },
  nameNext: {
    color: Colors.text,
  },
  activeLabel: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    color: Colors.gold + 'CC',
    marginTop: 2,
  },
  nextLabel: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    color: Colors.primary + 'CC',
    marginTop: 2,
  },
  right: {
    alignItems: 'flex-end',
    gap: 4,
  },
  time: {
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
    color: Colors.subtext,
  },
  timeActive: {
    color: Colors.gold,
  },
  timeNext: {
    color: Colors.text,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.gold,
    alignSelf: 'flex-end',
  },
});
