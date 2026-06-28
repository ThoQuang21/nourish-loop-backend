/**
 * Seed dữ liệu mẫu cho Nourish-Loop.
 * Chạy:  npx prisma db seed   (hoặc: npm run prisma:seed)
 *
 * Idempotent: xoá sạch dữ liệu cũ (đúng thứ tự khoá ngoại) rồi tạo lại.
 * Bao phủ đầy đủ các model: User, Profile, FoodPost, Request,
 * Transaction, Review, Story, Notification.
 */
import {
  FoodCategory,
  NotificationType,
  PostStatus,
  PrismaClient,
  RequestStatus,
  UserRole,
  VerificationLevel,
  VerificationRequestStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const CARBON_FACTOR = 2.5; // kgCO2 tiết kiệm trên mỗi kg thực phẩm
const hoursFromNow = (h: number) => new Date(Date.now() + h * 3600_000);
const daysAgo = (d: number) => new Date(Date.now() - d * 86_400_000);

async function clearAll(): Promise<void> {
  // Xoá theo thứ tự phụ thuộc khoá ngoại.
  await prisma.verificationRequest.deleteMany();
  await prisma.review.deleteMany();
  await prisma.story.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.request.deleteMany();
  await prisma.foodPost.deleteMany();
  await prisma.consumerOperatingHour.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.user.deleteMany();
}

async function main(): Promise<void> {
  await clearAll();

  // Mật khẩu chung cho mọi tài khoản demo: "123456"
  const passwordHash = await bcrypt.hash('123456', 10);

  // ----------------------------- USERS + PROFILES -----------------------------

  const lotus = await prisma.user.create({
    data: {
      email: 'minhanh@lotussaigon.vn',
      passwordHash,
      fullName: 'Minh Anh',
      phone: '0901000001',
      role: UserRole.PROVIDER,
      avatarUrl: 'https://i.pravatar.cc/150?img=11',
      profile: {
        create: {
          org: 'Lotus Saigon Hotel',
          address: '120 Nguyễn Huệ, Quận 1',
          district: 'Quận 1',
          lat: 10.7743,
          lng: 106.7038,
          level: VerificationLevel.VERIFIED,
          trustScore: 4.9,
          totalKg: 1200,
          totalDeals: 86,
        },
      },
    },
  });

  const bakery = await prisma.user.create({
    data: {
      email: 'huong@tiembanhmai.vn',
      passwordHash,
      fullName: 'Thu Hương',
      phone: '0901000002',
      role: UserRole.PROVIDER,
      avatarUrl: 'https://i.pravatar.cc/150?img=5',
      profile: {
        create: {
          org: 'Tiệm bánh Mai',
          address: '45 Võ Văn Tần, Quận 3',
          district: 'Quận 3',
          lat: 10.7769,
          lng: 106.6908,
          level: VerificationLevel.COMMUNITY,
          trustScore: 4.5,
          totalKg: 230,
          totalDeals: 19,
        },
      },
    },
  });

  const market = await prisma.user.create({
    data: {
      email: 'tuan@sieuthixanh.vn',
      passwordHash,
      fullName: 'Anh Tuấn',
      phone: '0901000003',
      role: UserRole.PROVIDER,
      avatarUrl: 'https://i.pravatar.cc/150?img=12',
      profile: {
        create: {
          org: 'Siêu thị Xanh',
          address: '88 Trần Hưng Đạo, Quận 5',
          district: 'Quận 5',
          lat: 10.7546,
          lng: 106.6634,
          level: VerificationLevel.VERIFIED,
          trustScore: 4.7,
          totalKg: 860,
          totalDeals: 54,
        },
      },
    },
  });

  const charity = await prisma.user.create({
    data: {
      email: 'lan@bepanhoasen.vn',
      passwordHash,
      fullName: 'Ngọc Lan',
      phone: '0902000001',
      role: UserRole.RECEIVER,
      avatarUrl: 'https://i.pravatar.cc/150?img=20',
      profile: {
        create: {
          org: 'Bếp ăn từ thiện Hoa Sen',
          address: '15 Lê Lợi, Quận 1',
          district: 'Quận 1',
          lat: 10.7725,
          lng: 106.7009,
          level: VerificationLevel.VERIFIED,
          trustScore: 4.8,
          totalKg: 540,
          totalDeals: 41,
          maxCapacityKg: 120,
          currentLoadKg: 36,
          acceptsPreparedMeals: true,
          acceptsBreadCereal: true,
          acceptsVegetables: true,
          acceptsFruits: true,
          acceptsDairy: false,
          acceptsDryGoods: true,
          acceptsOther: false,
          serviceRadiusKm: 6,
          autoAcceptMatch: true,
          matchingEnabled: true,
          operatingHours: {
            create: [
              { weekday: 'MON', openTime: '07:00', closeTime: '19:00' },
              { weekday: 'TUE', openTime: '07:00', closeTime: '19:00' },
              { weekday: 'WED', openTime: '07:00', closeTime: '19:00' },
              { weekday: 'THU', openTime: '07:00', closeTime: '19:00' },
              { weekday: 'FRI', openTime: '07:00', closeTime: '19:00' },
              { weekday: 'SAT', openTime: '08:00', closeTime: '17:00' },
            ],
          },
        },
      },
    },
  });

  const shelter = await prisma.user.create({
    data: {
      email: 'phuc@maiamtinhthuong.vn',
      passwordHash,
      fullName: 'Hữu Phúc',
      phone: '0902000002',
      role: UserRole.RECEIVER,
      avatarUrl: 'https://i.pravatar.cc/150?img=33',
      profile: {
        create: {
          org: 'Mái ấm Tình Thương',
          address: '210 Sư Vạn Hạnh, Quận 10',
          district: 'Quận 10',
          lat: 10.7702,
          lng: 106.6699,
          level: VerificationLevel.COMMUNITY,
          trustScore: 4.4,
          totalKg: 180,
          totalDeals: 14,
          maxCapacityKg: 80,
          currentLoadKg: 52,
          acceptsPreparedMeals: true,
          acceptsBreadCereal: true,
          acceptsVegetables: true,
          acceptsFruits: false,
          acceptsDairy: false,
          acceptsDryGoods: true,
          acceptsOther: false,
          serviceRadiusKm: 8,
          autoAcceptMatch: false,
          matchingEnabled: true,
          operatingHours: {
            create: [
              { weekday: 'MON', openTime: '09:00', closeTime: '17:00' },
              { weekday: 'TUE', openTime: '09:00', closeTime: '17:00' },
              { weekday: 'WED', openTime: '09:00', closeTime: '17:00' },
              { weekday: 'THU', openTime: '09:00', closeTime: '17:00' },
              { weekday: 'FRI', openTime: '09:00', closeTime: '17:00' },
            ],
          },
        },
      },
    },
  });

  await prisma.user.create({
    data: {
      email: 'mai@nhachungphuocloc.vn',
      passwordHash,
      fullName: 'Thanh Mai',
      phone: '0902000003',
      role: UserRole.RECEIVER,
      avatarUrl: 'https://i.pravatar.cc/150?img=41',
      profile: {
        create: {
          org: 'Nha chung Phuoc Loc',
          address: '32 Cach Mang Thang 8, Quan 3',
          district: 'Quan 3',
          lat: 10.7784,
          lng: 106.6877,
          level: VerificationLevel.VERIFIED,
          trustScore: 4.9,
          totalKg: 620,
          totalDeals: 55,
          maxCapacityKg: 95,
          currentLoadKg: 25,
          acceptsPreparedMeals: true,
          acceptsBreadCereal: true,
          acceptsVegetables: true,
          acceptsFruits: true,
          acceptsDairy: true,
          acceptsDryGoods: true,
          acceptsOther: true,
          serviceRadiusKm: 9,
          autoAcceptMatch: false,
          matchingEnabled: true,
          operatingHours: {
            create: [
              { weekday: 'MON', openTime: '08:00', closeTime: '18:00' },
              { weekday: 'TUE', openTime: '08:00', closeTime: '18:00' },
              { weekday: 'WED', openTime: '08:00', closeTime: '18:00' },
              { weekday: 'THU', openTime: '08:00', closeTime: '18:00' },
              { weekday: 'FRI', openTime: '08:00', closeTime: '18:00' },
              { weekday: 'SAT', openTime: '08:00', closeTime: '12:00' },
            ],
          },
        },
      },
    },
  });

  await prisma.user.create({
    data: {
      email: 'hanh@mamxanh.org',
      passwordHash,
      fullName: 'Bao Hanh',
      phone: '0902000004',
      role: UserRole.RECEIVER,
      avatarUrl: 'https://i.pravatar.cc/150?img=47',
      profile: {
        create: {
          org: 'Mam Xanh Community',
          address: '91 Dien Bien Phu, Binh Thanh',
          district: 'Binh Thanh',
          lat: 10.8019,
          lng: 106.7118,
          level: VerificationLevel.COMMUNITY,
          trustScore: 4.6,
          totalKg: 260,
          totalDeals: 21,
          maxCapacityKg: 70,
          currentLoadKg: 18,
          acceptsPreparedMeals: true,
          acceptsBreadCereal: false,
          acceptsVegetables: true,
          acceptsFruits: true,
          acceptsDairy: true,
          acceptsDryGoods: false,
          acceptsOther: false,
          serviceRadiusKm: 12,
          autoAcceptMatch: false,
          matchingEnabled: true,
          operatingHours: {
            create: [
              { weekday: 'MON', openTime: '10:00', closeTime: '18:00' },
              { weekday: 'TUE', openTime: '10:00', closeTime: '18:00' },
              { weekday: 'WED', openTime: '10:00', closeTime: '18:00' },
              { weekday: 'THU', openTime: '10:00', closeTime: '18:00' },
              { weekday: 'FRI', openTime: '10:00', closeTime: '18:00' },
            ],
          },
        },
      },
    },
  });

  await prisma.user.create({
    data: {
      email: 'khoi@thucphamcongdong.vn',
      passwordHash,
      fullName: 'Minh Khoi',
      phone: '0902000005',
      role: UserRole.RECEIVER,
      avatarUrl: 'https://i.pravatar.cc/150?img=52',
      profile: {
        create: {
          org: 'Kho thuc pham cong dong',
          address: '12 Nguyen Trai, Quan 5',
          district: 'Quan 5',
          lat: 10.7555,
          lng: 106.6689,
          level: VerificationLevel.VERIFIED,
          trustScore: 4.7,
          totalKg: 410,
          totalDeals: 32,
          maxCapacityKg: 160,
          currentLoadKg: 40,
          acceptsPreparedMeals: false,
          acceptsBreadCereal: true,
          acceptsVegetables: true,
          acceptsFruits: true,
          acceptsDairy: true,
          acceptsDryGoods: true,
          acceptsOther: true,
          serviceRadiusKm: 10,
          autoAcceptMatch: true,
          matchingEnabled: true,
          operatingHours: {
            create: [
              { weekday: 'MON', openTime: '08:30', closeTime: '17:30' },
              { weekday: 'TUE', openTime: '08:30', closeTime: '17:30' },
              { weekday: 'WED', openTime: '08:30', closeTime: '17:30' },
              { weekday: 'THU', openTime: '08:30', closeTime: '17:30' },
              { weekday: 'FRI', openTime: '08:30', closeTime: '17:30' },
              { weekday: 'SAT', openTime: '08:30', closeTime: '15:00' },
            ],
          },
        },
      },
    },
  });

  const admin = await prisma.user.create({
    data: {
      email: 'admin@foodlife.vn',
      passwordHash,
      fullName: 'Quản trị viên',
      role: UserRole.ADMIN,
    },
  });

  // ----------------------------- FOOD POSTS -----------------------------

  const postBuffet = await prisma.foodPost.create({
    data: {
      providerId: lotus.id,
      title: 'Buffet trưa khách sạn (suất ăn)',
      category: FoodCategory.PREPARED_MEAL,
      weightKg: 12,
      description: 'Suất ăn còn nóng, đóng hộp sẵn, bảo quản mát.',
      imageUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836',
      address: 'Cổng A, ĐHQG-HCM, Thủ Đức',
      district: 'Thủ Đức',
      lat: 10.8772,
      lng: 106.8035,
      pickupWindow: '14:30 – 16:00 hôm nay',
      expiresAt: hoursFromNow(3),
      status: PostStatus.OPEN,
    },
  });

  const postBread = await prisma.foodPost.create({
    data: {
      providerId: lotus.id,
      title: 'Bánh mì & bánh ngọt buổi sáng',
      category: FoodCategory.BREAD_CEREAL,
      weightKg: 8,
      description: 'Bánh mì baguette và bánh ngọt còn mới trong ngày.',
      imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff',
      address: 'Đường Tạ Quang Bửu, Thủ Đức',
      district: 'Thủ Đức',
      lat: 10.8701,
      lng: 106.7958,
      pickupWindow: '08:00 – 09:30 ngày mai',
      expiresAt: hoursFromNow(20),
      status: PostStatus.MATCHED,
    },
  });

  const postCake = await prisma.foodPost.create({
    data: {
      providerId: bakery.id,
      title: 'Bánh ngọt cuối ngày',
      category: FoodCategory.BREAD_CEREAL,
      weightKg: 5,
      description: 'Bánh kem, su kem cuối ngày còn dùng tốt.',
      imageUrl: 'https://images.unsplash.com/photo-1486427944299-d1955d23e34d',
      address: '12 Hoàng Diệu 2, Linh Chiểu, Thủ Đức',
      district: 'Thủ Đức',
      lat: 10.8856,
      lng: 106.7912,
      pickupWindow: '20:00 – 21:00 hôm nay',
      expiresAt: hoursFromNow(5),
      status: PostStatus.OPEN,
    },
  });

  const postVeg = await prisma.foodPost.create({
    data: {
      providerId: market.id,
      title: 'Rau củ tươi cận hạn trưng bày',
      category: FoodCategory.VEGETABLES,
      weightKg: 20,
      description: 'Rau củ loại đẹp, cận ngày trưng bày, vẫn tươi.',
      imageUrl: 'https://images.unsplash.com/photo-1540420773420-3366772f4999',
      address: 'Khu Công nghệ cao, Thủ Đức',
      district: 'Thủ Đức',
      lat: 10.8645,
      lng: 106.8101,
      pickupWindow: 'Đã hoàn tất',
      expiresAt: daysAgo(1),
      status: PostStatus.COMPLETED,
    },
  });

  await prisma.foodPost.create({
    data: {
      providerId: market.id,
      title: 'Trái cây nhập khẩu cận hạn',
      category: FoodCategory.FRUITS,
      weightKg: 15,
      description: 'Táo, cam, nho cận hạn bán, chất lượng tốt.',
      imageUrl: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b',
      address: '50 Võ Văn Ngân, Thủ Đức',
      district: 'Thủ Đức',
      lat: 10.8503,
      lng: 106.7833,
      pickupWindow: '17:00 – 18:30 hôm nay',
      expiresAt: hoursFromNow(6),
      status: PostStatus.OPEN,
    },
  });

  // ----------------------------- REQUESTS -----------------------------

  // PENDING: Hoa Sen xin nhận buffet của Lotus
  await prisma.request.create({
    data: {
      postId: postBuffet.id,
      receiverId: charity.id,
      status: RequestStatus.PENDING,
      distanceKm: 1.2,
      message: 'Bếp cần khoảng 50 suất cho bữa tối, xin nhận ạ.',
    },
  });

  // ACCEPTED: Mái ấm Tình Thương nhận bánh mì của Lotus -> dẫn tới 1 giao dịch đang diễn ra
  const reqBread = await prisma.request.create({
    data: {
      postId: postBread.id,
      receiverId: shelter.id,
      status: RequestStatus.ACCEPTED,
      distanceKm: 3.4,
      message: 'Mái ấm xin nhận bánh cho các bé buổi sáng.',
    },
  });

  // COMPLETED: Hoa Sen đã nhận rau củ của Siêu thị Xanh -> giao dịch hoàn tất + đánh giá
  const reqVeg = await prisma.request.create({
    data: {
      postId: postVeg.id,
      receiverId: charity.id,
      status: RequestStatus.COMPLETED,
      distanceKm: 5.1,
      message: 'Xin nhận rau củ cho bữa ăn cuối tuần.',
    },
  });

  // ----------------------------- TRANSACTIONS -----------------------------

  // Đang diễn ra: provider đã xác nhận, chờ receiver quét QR
  await prisma.transaction.create({
    data: {
      postId: postBread.id,
      requestId: reqBread.id,
      providerId: lotus.id,
      receiverId: shelter.id,
      qrCode: 'NL-QR-BREAD-0001',
      confirmedByProvider: true,
      confirmedByReceiver: false,
      weightKg: 8,
    },
  });

  // Hoàn tất: cả hai bên đã xác nhận
  const txnVeg = await prisma.transaction.create({
    data: {
      postId: postVeg.id,
      requestId: reqVeg.id,
      providerId: market.id,
      receiverId: charity.id,
      qrCode: 'NL-QR-VEG-0001',
      confirmedByProvider: true,
      confirmedByReceiver: true,
      weightKg: 20,
      co2SavedKg: 20 * CARBON_FACTOR,
      completedAt: daysAgo(1),
    },
  });

  // ----------------------------- REVIEWS (cho giao dịch hoàn tất) -----------------------------

  await prisma.review.create({
    data: {
      transactionId: txnVeg.id,
      raterId: charity.id, // người nhận đánh giá nhà cung cấp
      rateeId: market.id,
      score: 5,
      comment: 'Rau củ rất tươi, nhân viên nhiệt tình. Cảm ơn Siêu thị Xanh!',
    },
  });

  await prisma.review.create({
    data: {
      transactionId: txnVeg.id,
      raterId: market.id, // nhà cung cấp đánh giá người nhận
      rateeId: charity.id,
      score: 5,
      comment: 'Bếp Hoa Sen đến đúng giờ, nhận hàng gọn gàng.',
    },
  });

  // ----------------------------- STORIES -----------------------------

  await prisma.story.create({
    data: {
      authorId: charity.id,
      transactionId: txnVeg.id,
      text: '20kg rau củ từ Siêu thị Xanh đã thành 120 suất ăn ấm cho bà con khu lao động. Cảm ơn rất nhiều!',
      imageUrl: 'https://images.unsplash.com/photo-1488459716781-31db52582fe9',
      thanksToProviderId: market.id,
      likes: 24,
      status: 'PUBLISHED',
    },
  });

  await prisma.story.create({
    data: {
      authorId: shelter.id,
      text: 'Các bé ở mái ấm rất vui khi có bánh mì nóng mỗi sáng. Biết ơn Lotus Saigon!',
      imageUrl: 'https://images.unsplash.com/photo-1517433367423-c7e5b0f35086',
      thanksToProviderId: lotus.id,
      likes: 13,
      status: 'PENDING', // chờ admin duyệt
    },
  });

  // ----------------------------- VERIFICATION REQUESTS -----------------------------

  await prisma.verificationRequest.createMany({
    data: [
      {
        orgName: 'Tiệm bánh Ngọt Ngào',
        contactName: 'Trần Thị B',
        email: 'ngotngao@bakery.vn',
        role: UserRole.PROVIDER,
        type: 'Tiệm bánh',
        address: '99 Hai Bà Trưng, Quận 1',
        documents: 'Giấy phép kinh doanh, ảnh cơ sở',
        status: VerificationRequestStatus.PENDING,
      },
      {
        orgName: 'Mái ấm Hoa Hồng Nhỏ',
        contactName: 'Lê Văn C',
        email: 'hoahongnho@shelter.vn',
        role: UserRole.RECEIVER,
        type: 'Mái ấm / Trung tâm nuôi dưỡng',
        address: '120 Cách Mạng Tháng 8, Quận 3',
        documents: 'Giấy phép hoạt động, danh sách thành viên',
        status: VerificationRequestStatus.PENDING,
      },
      {
        orgName: 'Nhà hàng Cơm Niêu',
        contactName: 'Phạm Thị D',
        email: 'comnieu@restaurant.vn',
        role: UserRole.PROVIDER,
        type: 'Nhà hàng',
        address: '45 Nguyễn Trãi, Quận 5',
        documents: 'Giấy phép kinh doanh',
        status: VerificationRequestStatus.APPROVED,
      },
    ],
  });

  // ----------------------------- NOTIFICATIONS -----------------------------

  await prisma.notification.createMany({
    data: [
      {
        userId: lotus.id,
        type: NotificationType.REQUEST,
        title: 'Yêu cầu nhận mới',
        body: 'Bếp ăn từ thiện Hoa Sen muốn nhận "Buffet trưa khách sạn".',
      },
      {
        userId: shelter.id,
        type: NotificationType.ACCEPTED,
        title: 'Yêu cầu được chấp nhận',
        body: 'Lotus Saigon đã chấp nhận yêu cầu nhận bánh mì của bạn.',
      },
      {
        userId: lotus.id,
        type: NotificationType.EXPIRING,
        title: 'Tin sắp hết hạn',
        body: '"Buffet trưa khách sạn" sẽ hết hạn trong 3 giờ.',
        read: true,
      },
      {
        userId: charity.id,
        type: NotificationType.REMINDER,
        title: 'Nhắc nhở đánh giá',
        body: 'Hãy đánh giá giao dịch nhận rau củ vừa hoàn tất.',
        read: true,
      },
    ],
  });

  // ----------------------------- TỔNG KẾT -----------------------------
  const counts = {
    users: await prisma.user.count(),
    profiles: await prisma.profile.count(),
    consumerOperatingHours: await prisma.consumerOperatingHour.count(),
    foodPosts: await prisma.foodPost.count(),
    requests: await prisma.request.count(),
    transactions: await prisma.transaction.count(),
    reviews: await prisma.review.count(),
    stories: await prisma.story.count(),
    notifications: await prisma.notification.count(),
  };
  console.log('✅ Seed hoàn tất:', counts);
  console.log('🔑 Tài khoản demo (mật khẩu: 123456):');
  console.log('   Provider: minhanh@lotussaigon.vn | huong@tiembanhmai.vn | tuan@sieuthixanh.vn');
  console.log('   Receiver: lan@bepanhoasen.vn | phuc@maiamtinhthuong.vn | mai@nhachungphuocloc.vn | hanh@mamxanh.org | khoi@thucphamcongdong.vn');
  console.log('   Admin:    admin@foodlife.vn');
}

main()
  .catch((e) => {
    console.error('❌ Seed lỗi:', e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
