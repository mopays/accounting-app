-- CreateEnum
CREATE TYPE "public"."BucketType" AS ENUM ('SAVINGS', 'MONTHLY', 'WANTS');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BudgetCycle" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "monthKey" TEXT NOT NULL,
    "salary" DECIMAL(14,2) NOT NULL,
    "pctSavings" DECIMAL(5,2) NOT NULL,
    "pctMonthly" DECIMAL(5,2) NOT NULL,
    "pctWants" DECIMAL(5,2) NOT NULL,
    "allocSavings" DECIMAL(14,2) NOT NULL,
    "allocMonthly" DECIMAL(14,2) NOT NULL,
    "allocWants" DECIMAL(14,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BudgetCycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Transaction" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "cycleId" INTEGER NOT NULL,
    "bucket" "public"."BucketType" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "note" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "public"."User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "BudgetCycle_userId_monthKey_key" ON "public"."BudgetCycle"("userId", "monthKey");

-- CreateIndex
CREATE INDEX "Transaction_userId_cycleId_bucket_date_idx" ON "public"."Transaction"("userId", "cycleId", "bucket", "date");

-- AddForeignKey
ALTER TABLE "public"."BudgetCycle" ADD CONSTRAINT "BudgetCycle_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Transaction" ADD CONSTRAINT "Transaction_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "public"."BudgetCycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
