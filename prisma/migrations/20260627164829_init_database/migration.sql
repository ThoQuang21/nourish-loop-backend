-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('PROVIDER', 'RECEIVER', 'ADMIN');

-- CreateEnum
CREATE TYPE "VerificationLevel" AS ENUM ('VERIFIED', 'COMMUNITY');

-- CreateEnum
CREATE TYPE "FoodCategory" AS ENUM ('PREPARED_MEAL', 'BREAD_CEREAL', 'VEGETABLES', 'FRUITS', 'DAIRY', 'DRY_GOODS', 'OTHER');

-- CreateEnum
CREATE TYPE "PostStatus" AS ENUM ('OPEN', 'MATCHED', 'COMPLETED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'COMPLETED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('REQUEST', 'ACCEPTED', 'REMINDER', 'EXPIRING');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'RECEIVER',
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "org" TEXT,
    "address" TEXT,
    "district" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "level" "VerificationLevel" NOT NULL DEFAULT 'COMMUNITY',
    "trustScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalDeals" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FoodPost" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" "FoodCategory" NOT NULL,
    "weightKg" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "address" TEXT NOT NULL,
    "district" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "pickupWindow" TEXT,
    "expiresAt" TIMESTAMP(3),
    "status" "PostStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FoodPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Request" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "distanceKm" DOUBLE PRECISION,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "qrCode" TEXT NOT NULL,
    "confirmedByProvider" BOOLEAN NOT NULL DEFAULT false,
    "confirmedByReceiver" BOOLEAN NOT NULL DEFAULT false,
    "weightKg" DOUBLE PRECISION,
    "co2SavedKg" DOUBLE PRECISION,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "raterId" TEXT NOT NULL,
    "rateeId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Story" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "transactionId" TEXT,
    "text" TEXT NOT NULL,
    "imageUrl" TEXT,
    "thanksToProviderId" TEXT,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Story_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId");

-- CreateIndex
CREATE INDEX "FoodPost_status_idx" ON "FoodPost"("status");

-- CreateIndex
CREATE INDEX "FoodPost_category_idx" ON "FoodPost"("category");

-- CreateIndex
CREATE INDEX "FoodPost_providerId_idx" ON "FoodPost"("providerId");

-- CreateIndex
CREATE INDEX "Request_status_idx" ON "Request"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Request_postId_receiverId_key" ON "Request"("postId", "receiverId");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_requestId_key" ON "Transaction"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_qrCode_key" ON "Transaction"("qrCode");

-- CreateIndex
CREATE INDEX "Transaction_providerId_idx" ON "Transaction"("providerId");

-- CreateIndex
CREATE INDEX "Transaction_receiverId_idx" ON "Transaction"("receiverId");

-- CreateIndex
CREATE INDEX "Review_rateeId_idx" ON "Review"("rateeId");

-- CreateIndex
CREATE INDEX "Story_authorId_idx" ON "Story"("authorId");

-- CreateIndex
CREATE INDEX "Notification_userId_read_idx" ON "Notification"("userId", "read");

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoodPost" ADD CONSTRAINT "FoodPost_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Request" ADD CONSTRAINT "Request_postId_fkey" FOREIGN KEY ("postId") REFERENCES "FoodPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Request" ADD CONSTRAINT "Request_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_postId_fkey" FOREIGN KEY ("postId") REFERENCES "FoodPost"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_raterId_fkey" FOREIGN KEY ("raterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_rateeId_fkey" FOREIGN KEY ("rateeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Story" ADD CONSTRAINT "Story_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Story" ADD CONSTRAINT "Story_thanksToProviderId_fkey" FOREIGN KEY ("thanksToProviderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
