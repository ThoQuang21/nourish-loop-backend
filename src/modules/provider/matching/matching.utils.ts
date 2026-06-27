import { Weekday } from '@prisma/client';

export function normalizeVietnameseText(value?: string | null) {
  return (value ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

export function inferDistrictLabel(address?: string | null) {
  const normalized = normalizeVietnameseText(address);
  if (!normalized) {
    return undefined;
  }

  const districtMatch = normalized.match(/\b(quan|q)\s*(\d+)\b/);
  if (districtMatch) {
    return `quan ${districtMatch[2]}`;
  }

  const namedDistricts = [
    'phu nhuan',
    'binh thanh',
    'tan binh',
    'tan phu',
    'go vap',
    'thu duc',
    'hoc mon',
    'binh chanh',
    'nha be',
  ];

  return namedDistricts.find((district) => normalized.includes(district));
}

export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
) {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;

  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

export function weekdayFromDate(date: Date): Weekday {
  const weekday = date.getDay();
  switch (weekday) {
    case 1:
      return 'MON';
    case 2:
      return 'TUE';
    case 3:
      return 'WED';
    case 4:
      return 'THU';
    case 5:
      return 'FRI';
    case 6:
      return 'SAT';
    default:
      return 'SUN';
  }
}
