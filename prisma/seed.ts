import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash("admin123", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@ikea-guide.local" },
    update: {},
    create: {
      email: "admin@ikea-guide.local",
      name: "Admin",
      hashedPassword,
      role: "admin",
    },
  });

  console.log(`Seeded admin user: ${admin.email}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
