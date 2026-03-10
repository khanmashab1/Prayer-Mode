import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  Modal,
  ActivityIndicator,
  Switch,
  FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/colors';
import { useApp } from '@/context/AppContext';
import { PAKISTAN_CITIES, CALCULATION_METHODS, SCHOOLS, City } from '@/lib/cities';

type SheetType = 'city' | 'method' | 'school' | null;

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const {
    location,
    locationMode,
    isLocating,
    method,
    school,
    hijriOffset,
    ramadanMode,
    fajrAdj,
    maghribAdj,
    enableGPS,
    setManualCity,
    setMethod,
    setSchool,
    setHijriOffset,
    setRamadanMode,
    setFajrAdj,
    setMaghribAdj,
    refreshPrayerTimes,
  } = useApp();

  const [sheet, setSheet] = useState<SheetType>(null);
  const [citySearch, setCitySearch] = useState('');

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 34 : insets.bottom;

  const handleGPS = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await enableGPS();
  };

  const handleCitySelect = async (city: City) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await setManualCity({
      latitude: city.latitude,
      longitude: city.longitude,
      cityName: city.name,
      source: 'manual',
    });
    await refreshPrayerTimes();
    setSheet(null);
    setCitySearch('');
  };

  const handleMethodSelect = async (id: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await setMethod(id);
    setSheet(null);
  };

  const handleSchoolSelect = async (id: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await setSchool(id);
    setSheet(null);
  };

  const handleHijriAdjust = async (delta: number) => {
    const newVal = Math.max(-2, Math.min(2, hijriOffset + delta));
    await setHijriOffset(newVal);
  };

  const handleFajrAdj = async (delta: number) => {
    const newVal = Math.max(-10, Math.min(10, fajrAdj + delta));
    await setFajrAdj(newVal);
    await refreshPrayerTimes();
  };

  const handleMaghribAdj = async (delta: number) => {
    const newVal = Math.max(-10, Math.min(10, maghribAdj + delta));
    await setMaghribAdj(newVal);
    await refreshPrayerTimes();
  };

  const filteredCities = PAKISTAN_CITIES.filter((c) =>
    c.name.toLowerCase().includes(citySearch.toLowerCase()) ||
    c.province.toLowerCase().includes(citySearch.toLowerCase())
  );

  const currentMethod = CALCULATION_METHODS.find((m) => m.id === method);
  const currentSchool = SCHOOLS.find((s) => s.id === school);

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#060E0A', '#091508', '#060E0A']}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: topPad + 16, paddingBottom: botPad + 80 }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(400)}>
          <Text style={styles.pageTitle}>Settings</Text>
        </Animated.View>

        {/* Location Section */}
        <Animated.View entering={FadeInDown.delay(80).duration(400)}>
          <Text style={styles.sectionTitle}>Location</Text>
          <View style={styles.card}>

            {/* GPS Row */}
            <Pressable
              style={styles.row}
              onPress={handleGPS}
              disabled={isLocating}
            >
              <View style={[
                styles.rowIcon,
                locationMode === 'gps'
                  ? { backgroundColor: Colors.primary + '33' }
                  : { backgroundColor: Colors.primary + '18' },
              ]}>
                {isLocating ? (
                  <ActivityIndicator color={Colors.primary} size="small" />
                ) : (
                  <MaterialCommunityIcons
                    name="crosshairs-gps"
                    size={20}
                    color={Colors.primary}
                  />
                )}
              </View>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>
                  Use GPS
                  {locationMode === 'gps' && (
                    <Text style={styles.activeModeTag}> · Auto</Text>
                  )}
                </Text>
                <Text style={styles.rowSub}>
                  {isLocating
                    ? 'Detecting your location…'
                    : locationMode === 'gps'
                    ? 'Fetches on every app open'
                    : 'Tap to enable auto-location'}
                </Text>
              </View>
              {locationMode === 'gps' ? (
                <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
              ) : (
                <Ionicons name="chevron-forward" size={18} color={Colors.dim} />
              )}
            </Pressable>

            <View style={styles.divider} />

            {/* Manual City Row */}
            <Pressable
              style={styles.row}
              onPress={() => setSheet('city')}
              disabled={isLocating}
            >
              <View style={[
                styles.rowIcon,
                locationMode === 'manual'
                  ? { backgroundColor: Colors.gold + '33' }
                  : { backgroundColor: Colors.gold + '18' },
              ]}>
                <MaterialCommunityIcons
                  name="city-variant-outline"
                  size={20}
                  color={Colors.gold}
                />
              </View>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>
                  Select City
                  {locationMode === 'manual' && location && (
                    <Text style={styles.activeModeTagGold}> · Active</Text>
                  )}
                </Text>
                <Text style={styles.rowSub}>
                  {locationMode === 'manual' && location?.cityName
                    ? location.cityName
                    : 'Choose from Pakistan cities'}
                </Text>
              </View>
              {locationMode === 'manual' && location ? (
                <Ionicons name="checkmark-circle" size={20} color={Colors.gold} />
              ) : (
                <Ionicons name="chevron-forward" size={18} color={Colors.dim} />
              )}
            </Pressable>

            {/* Current coordinates info */}
            {location && (
              <>
                <View style={styles.divider} />
                <View style={styles.locationInfo}>
                  <MaterialCommunityIcons name="map-marker-check" size={14} color={Colors.primary} />
                  <Text style={styles.locationInfoText}>
                    {location.cityName
                      ? location.cityName
                      : `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`}
                    {'  '}
                    <Text style={styles.coordsText}>
                      {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                    </Text>
                  </Text>
                </View>
              </>
            )}
          </View>
        </Animated.View>

        {/* Prayer Calculation */}
        <Animated.View entering={FadeInDown.delay(140).duration(400)}>
          <Text style={styles.sectionTitle}>Calculation</Text>
          <View style={styles.card}>
            <Pressable style={styles.row} onPress={() => setSheet('method')}>
              <View style={[styles.rowIcon, { backgroundColor: '#6366F122' }]}>
                <MaterialCommunityIcons name="calculator-variant-outline" size={20} color="#8B8CF8" />
              </View>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>Method</Text>
                <Text style={styles.rowSub}>{currentMethod?.name || 'Select method'}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.dim} />
            </Pressable>

            <View style={styles.divider} />

            <Pressable style={styles.row} onPress={() => setSheet('school')}>
              <View style={[styles.rowIcon, { backgroundColor: '#EC489922' }]}>
                <MaterialCommunityIcons name="school-outline" size={20} color="#EC4899" />
              </View>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>School</Text>
                <Text style={styles.rowSub}>{currentSchool?.name || 'Select school'}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.dim} />
            </Pressable>
          </View>
        </Animated.View>

        {/* Hijri Adjustment */}
        <Animated.View entering={FadeInDown.delay(260).duration(400)}>
          <Text style={styles.sectionTitle}>Hijri Date</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={[styles.rowIcon, { backgroundColor: Colors.gold + '22' }]}>
                <MaterialCommunityIcons name="calendar-month-outline" size={20} color={Colors.gold} />
              </View>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>Date Adjustment</Text>
                <Text style={styles.rowSub}>
                  {hijriOffset === 0 ? 'No offset' : `${hijriOffset > 0 ? '+' : ''}${hijriOffset} day(s)`}
                </Text>
              </View>
              <View style={styles.stepper}>
                <Pressable style={styles.stepBtn} onPress={() => handleHijriAdjust(-1)} disabled={hijriOffset <= -2}>
                  <Ionicons name="remove" size={18} color={hijriOffset <= -2 ? Colors.border : Colors.text} />
                </Pressable>
                <Text style={styles.stepValue}>{hijriOffset > 0 ? `+${hijriOffset}` : hijriOffset}</Text>
                <Pressable style={styles.stepBtn} onPress={() => handleHijriAdjust(1)} disabled={hijriOffset >= 2}>
                  <Ionicons name="add" size={18} color={hijriOffset >= 2 ? Colors.border : Colors.text} />
                </Pressable>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Ramadan Mode */}
        <Animated.View entering={FadeInDown.delay(320).duration(400)}>
          <Text style={styles.sectionTitle}>Ramadan</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={[styles.rowIcon, { backgroundColor: Colors.gold + '22' }]}>
                <MaterialCommunityIcons name="star-crescent" size={20} color={Colors.gold} />
              </View>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>Ramadan Mode</Text>
                <Text style={styles.rowSub}>Apply Sehri/Iftar safety offsets</Text>
              </View>
              <Switch
                value={ramadanMode}
                onValueChange={async (v) => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  await setRamadanMode(v);
                  await refreshPrayerTimes();
                }}
                trackColor={{ false: Colors.border, true: Colors.gold + '80' }}
                thumbColor={ramadanMode ? Colors.gold : Colors.dim}
              />
            </View>

            {ramadanMode && (
              <>
                <View style={styles.divider} />
                <View style={styles.adjRow}>
                  <Text style={styles.adjLabel}>Fajr offset</Text>
                  <View style={styles.stepper}>
                    <Pressable style={styles.stepBtn} onPress={() => handleFajrAdj(-1)}>
                      <Ionicons name="remove" size={16} color={Colors.text} />
                    </Pressable>
                    <Text style={styles.stepValue}>{fajrAdj > 0 ? `+${fajrAdj}` : fajrAdj}m</Text>
                    <Pressable style={styles.stepBtn} onPress={() => handleFajrAdj(1)}>
                      <Ionicons name="add" size={16} color={Colors.text} />
                    </Pressable>
                  </View>
                </View>
                <View style={styles.divider} />
                <View style={styles.adjRow}>
                  <Text style={styles.adjLabel}>Maghrib offset</Text>
                  <View style={styles.stepper}>
                    <Pressable style={styles.stepBtn} onPress={() => handleMaghribAdj(-1)}>
                      <Ionicons name="remove" size={16} color={Colors.text} />
                    </Pressable>
                    <Text style={styles.stepValue}>{maghribAdj > 0 ? `+${maghribAdj}` : maghribAdj}m</Text>
                    <Pressable style={styles.stepBtn} onPress={() => handleMaghribAdj(1)}>
                      <Ionicons name="add" size={16} color={Colors.text} />
                    </Pressable>
                  </View>
                </View>
              </>
            )}
          </View>
        </Animated.View>
      </ScrollView>

      {/* City Sheet */}
      <Modal
        visible={sheet === 'city'}
        animationType="slide"
        transparent
        onRequestClose={() => setSheet(null)}
      >
        <View style={styles.sheetOverlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Select City</Text>
              <Pressable onPress={() => { setSheet(null); setCitySearch(''); }}>
                <Ionicons name="close" size={24} color={Colors.subtext} />
              </Pressable>
            </View>

            <View style={styles.searchBox}>
              <Ionicons name="search" size={16} color={Colors.dim} />
              <Text style={[styles.searchInput, { flex: 1, color: citySearch ? Colors.text : Colors.dim }]}
                onPress={undefined}
              >
                {citySearch || 'Search city or province...'}
              </Text>
            </View>

            <View style={styles.searchBtns}>
              {['Ka', 'La', 'Is', 'Pe', 'Qu'].map((prefix) => (
                <Pressable
                  key={prefix}
                  style={styles.quickBtn}
                  onPress={() => setCitySearch(prefix)}
                >
                  <Text style={styles.quickBtnText}>{prefix}</Text>
                </Pressable>
              ))}
              {citySearch ? (
                <Pressable style={styles.quickBtn} onPress={() => setCitySearch('')}>
                  <Ionicons name="close-circle" size={14} color={Colors.dim} />
                </Pressable>
              ) : null}
            </View>

            <FlatList
              data={filteredCities}
              keyExtractor={(item) => item.name}
              renderItem={({ item }) => (
                <Pressable style={styles.cityRow} onPress={() => handleCitySelect(item)}>
                  <View>
                    <Text style={styles.cityName}>{item.name}</Text>
                    <Text style={styles.cityProvince}>{item.province}</Text>
                  </View>
                  <MaterialCommunityIcons name="map-marker-outline" size={16} color={Colors.dim} />
                </Pressable>
              )}
              ItemSeparatorComponent={() => <View style={styles.divider} />}
              style={styles.cityList}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>

      {/* Method Sheet */}
      <Modal
        visible={sheet === 'method'}
        animationType="slide"
        transparent
        onRequestClose={() => setSheet(null)}
      >
        <View style={styles.sheetOverlay}>
          <View style={[styles.sheet, styles.smallSheet]}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Calculation Method</Text>
              <Pressable onPress={() => setSheet(null)}>
                <Ionicons name="close" size={24} color={Colors.subtext} />
              </Pressable>
            </View>
            {CALCULATION_METHODS.map((m, idx) => (
              <React.Fragment key={m.id}>
                <Pressable style={styles.sheetRow} onPress={() => handleMethodSelect(m.id)}>
                  <View style={styles.sheetRowText}>
                    <Text style={[styles.sheetRowTitle, method === m.id && { color: Colors.primary }]}>
                      {m.name}
                    </Text>
                    <Text style={styles.sheetRowSub}>{m.description}</Text>
                  </View>
                  {method === m.id && <Ionicons name="checkmark" size={20} color={Colors.primary} />}
                </Pressable>
                {idx < CALCULATION_METHODS.length - 1 && <View style={styles.divider} />}
              </React.Fragment>
            ))}
          </View>
        </View>
      </Modal>

      {/* School Sheet */}
      <Modal
        visible={sheet === 'school'}
        animationType="slide"
        transparent
        onRequestClose={() => setSheet(null)}
      >
        <View style={styles.sheetOverlay}>
          <View style={[styles.sheet, styles.smallSheet]}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Juristic School</Text>
              <Pressable onPress={() => setSheet(null)}>
                <Ionicons name="close" size={24} color={Colors.subtext} />
              </Pressable>
            </View>
            {SCHOOLS.map((s, idx) => (
              <React.Fragment key={s.id}>
                <Pressable style={styles.sheetRow} onPress={() => handleSchoolSelect(s.id)}>
                  <View style={styles.sheetRowText}>
                    <Text style={[styles.sheetRowTitle, school === s.id && { color: Colors.primary }]}>
                      {s.name}
                    </Text>
                    <Text style={styles.sheetRowSub}>{s.description}</Text>
                  </View>
                  {school === s.id && <Ionicons name="checkmark" size={20} color={Colors.primary} />}
                </Pressable>
                {idx < SCHOOLS.length - 1 && <View style={styles.divider} />}
              </React.Fragment>
            ))}
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    paddingHorizontal: 16,
    gap: 4,
  },
  pageTitle: {
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
    color: Colors.text,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.dim,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  sectionHint: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: Colors.dim,
    paddingHorizontal: 4,
    marginBottom: 10,
    lineHeight: 17,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.text,
  },
  rowSub: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: Colors.subtext,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: 16,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  locationInfoText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: Colors.primary,
    flex: 1,
  },
  coordsText: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: Colors.dim,
  },
  activeModeTag: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.primary,
  },
  activeModeTagGold: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.gold,
  },
  modeRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.dim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeRadioActive: {
    borderColor: Colors.primary,
  },
  modeRadioDND: {
    borderColor: Colors.gold,
  },
  modeRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
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
  adjRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  adjLabel: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: Colors.subtext,
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '80%',
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: Colors.border,
  },
  smallSheet: {
    maxHeight: '50%',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sheetTitle: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: Colors.text,
  },
  cityList: {
    flex: 1,
  },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  cityName: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.text,
  },
  cityProvince: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: Colors.subtext,
    marginTop: 2,
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sheetRowText: {
    flex: 1,
    gap: 3,
  },
  sheetRowTitle: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.text,
  },
  sheetRowSub: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: Colors.subtext,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  searchBtns: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  quickBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    backgroundColor: Colors.border,
    borderRadius: 8,
  },
  quickBtnText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.subtext,
  },
});
