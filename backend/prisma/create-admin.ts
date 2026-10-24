import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const email = (args[0] || "admin@apexfitness.com").toLowerCase().trim();
  const password = args[1] || "Password@123";
  const firstName = args[2] || "Apex";
  const lastName = args[3] || "Admin";

  console.log(`Setting up Admin account for: ${email}...`);

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      role: "super_admin",
      status: "active",
      firstName,
      lastName,
    },
    create: {
      email,
      passwordHash,
      role: "super_admin",
      status: "active",
      firstName,
      lastName,
      phone: "+639170000000",
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
    },
  });

  console.log("==================================================");
  console.log("ADMIN ACCOUNT READY IN SUPABASE:");
  console.log(`- User ID:    ${user.id}`);
  console.log(`- Email:      ${user.email}`);
  console.log(`- Password:   ${password}`);
  console.log(`- Role:       ${user.role}`);
  console.log(`- Status:     ${user.status}`);
  console.log("==================================================");
}

main()
  .catch((err) => {
    console.error("Failed to create/update admin account:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
