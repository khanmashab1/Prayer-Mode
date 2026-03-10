export interface City {
  name: string;
  latitude: number;
  longitude: number;
  province: string;
}

export const PAKISTAN_CITIES: City[] = [
  { name: 'Karachi', latitude: 24.8607, longitude: 67.0011, province: 'Sindh' },
  { name: 'Lahore', latitude: 31.5204, longitude: 74.3587, province: 'Punjab' },
  { name: 'Islamabad', latitude: 33.6844, longitude: 73.0479, province: 'ICT' },
  { name: 'Rawalpindi', latitude: 33.5651, longitude: 73.0169, province: 'Punjab' },
  { name: 'Faisalabad', latitude: 31.4504, longitude: 73.135, province: 'Punjab' },
  { name: 'Multan', latitude: 30.1575, longitude: 71.5249, province: 'Punjab' },
  { name: 'Peshawar', latitude: 34.0151, longitude: 71.5249, province: 'KPK' },
  { name: 'Quetta', latitude: 30.1798, longitude: 66.975, province: 'Balochistan' },
  { name: 'Hyderabad', latitude: 25.396, longitude: 68.3578, province: 'Sindh' },
  { name: 'Sialkot', latitude: 32.4945, longitude: 74.5229, province: 'Punjab' },
  { name: 'Gujranwala', latitude: 32.1877, longitude: 74.1945, province: 'Punjab' },
  { name: 'Bahawalpur', latitude: 29.3956, longitude: 71.6836, province: 'Punjab' },
  { name: 'Sukkur', latitude: 27.7052, longitude: 68.8574, province: 'Sindh' },
  { name: 'Abbottabad', latitude: 34.1463, longitude: 73.2117, province: 'KPK' },
  { name: 'Sargodha', latitude: 32.0836, longitude: 72.6711, province: 'Punjab' },
  { name: 'Mardan', latitude: 34.198, longitude: 72.0435, province: 'KPK' },
  { name: 'Bannu', latitude: 32.9888, longitude: 70.6054, province: 'KPK' },
  { name: 'Dera Ismail Khan', latitude: 31.8317, longitude: 70.9017, province: 'KPK' },
  { name: 'Swat', latitude: 35.2227, longitude: 72.4258, province: 'KPK' },
  { name: 'Chaman', latitude: 30.9196, longitude: 66.4508, province: 'Balochistan' },
  { name: 'Gwadar', latitude: 25.1216, longitude: 62.3254, province: 'Balochistan' },
  { name: 'Turbat', latitude: 26.0013, longitude: 63.0414, province: 'Balochistan' },
  { name: 'Khuzdar', latitude: 27.8, longitude: 66.6167, province: 'Balochistan' },
  { name: 'Larkana', latitude: 27.5572, longitude: 68.2143, province: 'Sindh' },
  { name: 'Mirpur', latitude: 33.15, longitude: 73.75, province: 'AJK' },
  { name: 'Gilgit', latitude: 35.9208, longitude: 74.3087, province: 'GB' },
  { name: 'Skardu', latitude: 35.2971, longitude: 75.6333, province: 'GB' },
  { name: 'Chitral', latitude: 35.8517, longitude: 71.8368, province: 'KPK' },
  { name: 'Kohat', latitude: 33.5869, longitude: 71.4414, province: 'KPK' },
  { name: 'Rahim Yar Khan', latitude: 28.4202, longitude: 70.2952, province: 'Punjab' },
];

export const CALCULATION_METHODS = [
  { id: 1, name: 'Karachi (UISK)', description: 'University of Islamic Sciences Karachi' },
  { id: 4, name: 'Makkah (UQU)', description: 'Umm Al-Qura University, Makkah' },
  { id: 2, name: 'ISNA', description: 'Islamic Society of North America' },
  { id: 3, name: 'MWL', description: 'Muslim World League' },
];

export const SCHOOLS = [
  { id: 0, name: 'Shafi / Maliki / Hanbali', description: 'Standard Asr time' },
  { id: 1, name: 'Hanafi', description: 'Later Asr time' },
];

export const SILENT_DURATIONS = [
  { value: 10, label: '10 min' },
  { value: 15, label: '15 min' },
  { value: 20, label: '20 min' },
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
];

export const PRAYER_NAMES = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
