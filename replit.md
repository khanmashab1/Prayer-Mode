# Namaz Mode — Islamic Prayer Time App

## Overview
A minimal Android-focused Islamic prayer time app built with React Native + Expo Router. Automatically activates Vibration or Do Not Disturb mode during each prayer time using accurate prayer calculations.

## Architecture

### Frontend (Expo Router, port 8081)
- **Framework**: Expo SDK 54 + Expo Router v6 (file-based routing)
- **State**: React Context (AppContext) + AsyncStorage for persistence
- **Fonts**: Inter (400, 500, 600, 700)
- **Theme**: Dark emerald/green (`#060E0A` background, `#34D399` primary, `#F59E0B` gold)

### Backend (Express, port 5000)
- Serves static landing page and Expo manifest
- No custom API routes (all prayer data fetched client-side from Aladhan API)

## Screens
- `app/onboarding.tsx` — First-run: choose Vibration or DND mode
- `app/(tabs)/index.tsx` — Home: prayer times, countdown, current/next prayer, active Namaz banner
- `app/(tabs)/settings.tsx` — Location, method, school, silent duration, Hijri adjustment, Ramadan mode

## Key Libraries
| Package | Purpose |
|---------|---------|
| `expo-location` | GPS location for prayer calculation |
| `expo-notifications@~0.32.16` | Schedule prayer reminders |
| `expo-haptics` | Tactile feedback on interactions |
| `expo-linear-gradient` | Background gradients |
| `react-native-reanimated` | Animations (pulse, glow, spring) |
| `@react-native-async-storage/async-storage` | Persisted settings |

## Core Features
1. **Prayer Times** — Aladhan API (`api.aladhan.com/v1/timings/{DD-MM-YYYY}`)
2. **Pakistan City Database** — 30 cities with lat/lng in `lib/cities.ts`
3. **GPS Location** — `expo-location` + BigDataCloud reverse geocoding
4. **Calculation Methods** — UISK Karachi (1), Umm Al-Qura (4), ISNA (2), MWL (3)
5. **Schools** — Standard/Shafi (0), Hanafi (1)
6. **Namaz Mode** — Vibration (React Native Vibration API) or DND (Android permission flow)
7. **Silent Duration** — 10/15/20/30/45 minutes, stored in AsyncStorage
8. **Live Countdown** — Ticking HH:MM:SS timer to next prayer
9. **Current/Next Prayer** — Auto-detects from time comparison; after Isha → tomorrow Fajr
10. **Hijri Date** — Pulled from Aladhan API response; ±2 day manual offset
11. **Ramadan Mode** — Auto-detects Hijri month 9; Fajr -2min, Maghrib +3min adjustable offsets
12. **Prayer Scheduler** — `expo-notifications` schedules a local notification per prayer

## File Structure
```
app/
  _layout.tsx          # Root layout: fonts, providers, notification handler
  onboarding.tsx       # Mode selection onboarding
  (tabs)/
    _layout.tsx        # NativeTabs (iOS 26 liquid glass) / Classic Tabs fallback
    index.tsx          # Home screen
    settings.tsx       # Settings screen
components/
  PrayerCard.tsx       # Individual prayer time row with animations
  CountdownTimer.tsx   # Animated HH:MM:SS countdown
context/
  AppContext.tsx        # Global settings + prayer data state
lib/
  cities.ts            # 30 Pakistan cities + calculation method constants
  prayerAPI.ts         # Aladhan API fetch, time parsing, current/next logic
  locationService.ts   # expo-location GPS + BigDataCloud reverse geocode
  namazScheduler.ts    # Schedule/cancel notifications via expo-notifications
  ringerMode.ts        # Vibration activation, DND permission, notification scheduling
```

## Settings Stored in AsyncStorage
- `app_location` — `{latitude, longitude, cityName, source}`
- `app_method` — calculation method ID (1 = Karachi default)
- `app_school` — juristic school (1 = Hanafi default)
- `app_silent_duration` — minutes (15 default)
- `app_prayer_mode` — `'vibration'` or `'dnd'`
- `app_hijri_offset` — integer -2 to +2
- `app_ramadan_mode` — boolean
- `app_onboarding_done` — boolean
- `app_fajr_adj` — Ramadan Fajr offset minutes (-2 default)
- `app_maghrib_adj` — Ramadan Maghrib offset minutes (+3 default)

## Android Permissions (app.json)
- `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`
- `VIBRATE`
- `ACCESS_NOTIFICATION_POLICY` (DND)
- `RECEIVE_BOOT_COMPLETED`, `SCHEDULE_EXACT_ALARM`

## DND / Ringer Mode Notes
- Full DND control requires a **native build** (not available in Expo Go)
- In development (Expo Go): notifications are scheduled; vibration uses `react-native`'s `Vibration` API
- DND permission flow: opens Android Settings → Notification Policy Access
