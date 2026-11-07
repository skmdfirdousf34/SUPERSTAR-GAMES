import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Clean old data if needed
  await prisma.aviatorBet.deleteMany();
  await prisma.aviatorRound.deleteMany();
  await prisma.winGoBet.deleteMany();
  await prisma.winGoRound.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.bankAccount.deleteMany();
  await prisma.wallet.deleteMany();
  await prisma.user.deleteMany();

  const hashedAdminPassword = await bcrypt.hash("adminpassword123", 10);
  const hashedUserPassword = await bcrypt.hash("password123", 10);

  // 1. Create Admin
  const admin = await prisma.user.create({
    data: {
      phone: "9999999999",
      passwordHash: hashedAdminPassword,
      role: "ADMIN",
      referralCode: "ADMIN01",
      wallet: {
        create: {
          balance: 100000.0,
          totalDeposit: 100000.0,
        },
      },
    },
  });

  // 2. Create Test Player
  const user = await prisma.user.create({
    data: {
      phone: "9876543210",
      passwordHash: hashedUserPassword,
      role: "USER",
      referralCode: "PLAYER01",
      referredBy: "ADMIN01",
      wallet: {
        create: {
          balance: 5000.0,
          totalDeposit: 5000.0,
        },
      },
      bankAccounts: {
        create: {
          accountHolderName: "Demo Player",
          bankName: "State Bank of India",
          accountNumber: "123456789012",
          ifscCode: "SBIN0001234",
          upiId: "demoplayer@upi",
        },
      },
    },
  });

  console.log("Seeded Admin:", admin.phone);
  console.log("Seeded User:", user.phone);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
