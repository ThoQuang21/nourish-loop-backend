import {
  FoodCategory,
  NotificationType,
  PostStatus,
  RequestStatus,
  VerificationLevel,
} from '@prisma/client';

function normalizeText(value?: string | null) {
  return (value ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

const categoryLabelToEnum: Record<string, FoodCategory> = {
  prepared_meal: 'PREPARED_MEAL',
  bread_cereal: 'BREAD_CEREAL',
  vegetables: 'VEGETABLES',
  fruits: 'FRUITS',
  dairy: 'DAIRY',
  dry_goods: 'DRY_GOODS',
  other: 'OTHER',
  'bua an nau san': 'PREPARED_MEAL',
  'banh mi & ngu coc': 'BREAD_CEREAL',
  'banh mi va ngu coc': 'BREAD_CEREAL',
  'rau cu qua': 'VEGETABLES',
  'trai cay': 'FRUITS',
  'sua & san pham': 'DAIRY',
  'sua va san pham': 'DAIRY',
  'luong thuc kho': 'DRY_GOODS',
  khac: 'OTHER',
};

const categoryEnumToLabel: Record<FoodCategory, string> = {
  PREPARED_MEAL: 'Bữa ăn nấu sẵn',
  BREAD_CEREAL: 'Bánh mì & ngũ cốc',
  VEGETABLES: 'Rau củ quả',
  FRUITS: 'Trái cây',
  DAIRY: 'Sữa & sản phẩm',
  DRY_GOODS: 'Lương thực khô',
  OTHER: 'Khác',
};

const postStatusToFrontend: Record<PostStatus, 'open' | 'matched' | 'completed' | 'expired'> = {
  OPEN: 'open',
  MATCHED: 'matched',
  COMPLETED: 'completed',
  EXPIRED: 'expired',
};

const requestStatusToFrontend: Record<
  RequestStatus,
  'pending' | 'accepted' | 'completed' | 'rejected' | 'cancelled'
> = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  COMPLETED: 'completed',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
};

const notificationTypeToFrontend: Record<
  NotificationType,
  'request' | 'accepted' | 'reminder' | 'expiring'
> = {
  REQUEST: 'request',
  ACCEPTED: 'accepted',
  REMINDER: 'reminder',
  EXPIRING: 'expiring',
};

export function normalizeFoodCategory(value?: string | FoodCategory | null) {
  if (!value) return undefined;

  if (typeof value === 'string') {
    const uppercase = value.toUpperCase() as FoodCategory;
    if (uppercase in categoryEnumToLabel) {
      return uppercase;
    }
  }

  return categoryLabelToEnum[normalizeText(String(value)).replace(/\s+/g, ' ')] ?? undefined;
}

export function normalizePostStatus(value?: string | PostStatus | null) {
  if (!value) return undefined;
  switch (value.toUpperCase()) {
    case 'OPEN':
      return PostStatus.OPEN;
    case 'MATCHED':
      return PostStatus.MATCHED;
    case 'COMPLETED':
      return PostStatus.COMPLETED;
    case 'EXPIRED':
      return PostStatus.EXPIRED;
    default:
      return undefined;
  }
}

export function mapPostToFrontend(post: {
  id: string;
  title: string;
  category: FoodCategory;
  weightKg: number;
  description: string | null;
  imageUrl: string | null;
  address: string;
  district: string | null;
  pickupWindow: string | null;
  expiresAt: Date | null;
  providerId: string;
  status: PostStatus;
}) {
  return {
    id: post.id,
    title: post.title,
    category: categoryEnumToLabel[post.category],
    weightKg: post.weightKg,
    description: post.description ?? '',
    image: post.imageUrl ?? '',
    imageUrl: post.imageUrl ?? '',
    address: post.address,
    district: post.district ?? '',
    pickupWindow: post.pickupWindow ?? '',
    expiresInHours: post.expiresAt
      ? Math.max(0, Math.ceil((post.expiresAt.getTime() - Date.now()) / 3600_000))
      : 0,
    providerId: post.providerId,
    status: postStatusToFrontend[post.status],
  };
}

export function mapRequestToFrontend(request: {
  id: string;
  postId: string;
  status: RequestStatus;
  distanceKm: number | null;
  createdAt: Date;
  receiver: {
    id: string;
    fullName: string;
    profile?: {
      org: string | null;
      trustScore: number;
      level: VerificationLevel;
    } | null;
  };
  transaction?: {
    id: string;
    qrCode: string;
  } | null;
}) {
  return {
    id: request.id,
    postId: request.postId,
    receiverId: request.receiver.id,
    receiverName: request.receiver.fullName,
    receiverOrg: request.receiver.profile?.org ?? '',
    distanceKm: request.distanceKm ?? 0,
    trustScore: request.receiver.profile?.trustScore ?? 0,
    verified: request.receiver.profile?.level === 'VERIFIED',
    status: requestStatusToFrontend[request.status],
    createdAt: formatRelativeTime(request.createdAt),
    transactionId: request.transaction?.id ?? null,
    qrCode: request.transaction?.qrCode ?? null,
  };
}

export function mapNotificationToFrontend(notification: {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  read: boolean;
  createdAt: Date;
}) {
  return {
    id: notification.id,
    type: notificationTypeToFrontend[notification.type],
    title: notification.title,
    body: notification.body ?? '',
    time: formatRelativeTime(notification.createdAt),
    unread: !notification.read,
  };
}

export function formatRelativeTime(date: Date) {
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.max(0, Math.floor(diffMs / 60_000));
  if (minutes < 1) return 'vua xong';
  if (minutes < 60) return `${minutes} phut truoc`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} gio truoc`;
  const days = Math.floor(hours / 24);
  return `${days} ngay truoc`;
}

export function mapWeekdayLabel(dateKey: string) {
  const day = new Date(`${dateKey}T00:00:00`).getDay();
  switch (day) {
    case 1:
      return 'T2';
    case 2:
      return 'T3';
    case 3:
      return 'T4';
    case 4:
      return 'T5';
    case 5:
      return 'T6';
    case 6:
      return 'T7';
    default:
      return 'CN';
  }
}
