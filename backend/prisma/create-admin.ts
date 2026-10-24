import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const SUPABASE_URL = process.env.SUPABASE_URL || "https://mpqpdpqafehxlknthzxh.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!SERVICE_KEY) {
  console.warn("WARNING: SUPABASE_SERVICE_ROLE_KEY is not defined in backend/.env. Supabase Auth sync may fail.");
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY || "", {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function main() {
  const args = process.argv.slice(2);
  const email = (args[0] || "admin@apexfitness.com").toLowerCase().trim();
  const password = args[1] || "Password@123";
  const firstName = args[2] || "Apex";
  const lastName = args[3] || "Admin";

  console.log(`Setting up Admin account in Supabase (Auth + Database) for: ${email}...`);

  // 1. Sync / Upsert in Supabase Auth (auth.users)
  let authUserId: string | null = null;
  if (SERVICE_KEY) {
    try {
      const { data: userList } = await supabaseAdmin.auth.admin.listUsers();
      const existingAuthUser = userList?.users.find((u) => u.email?.toLowerCase() === email);

      if (existingAuthUser) {
        const { data: updated, error: uErr } = await supabaseAdmin.auth.admin.updateUserById(
          existingAuthUser.id,
          {
            password,
            email_confirm: true,
            user_metadata: { first_name: firstName, last_name: lastName, role: "super_admin" },
            app_metadata: { role: "super_admin" },
          }
        );
        if (uErr) throw uErr;
        authUserId = updated.user.id;
      } else {
        const { data: created, error: cErr } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { first_name: firstName, last_name: lastName, role: "super_admin" },
          app_metadata: { role: "super_admin" },
        });
        if (cErr) throw cErr;
        authUserId = created.user.id;
      }
    } catch (e: any) {
      console.warn("Note on Supabase Auth sync:", e.message);
    }
  }

  // 2. Sync / Upsert in Supabase PostgreSQL (public.users)
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      id: authUserId || undefined,
      passwordHash,
      role: "super_admin",
      status: "active",
      firstName,
      lastName,
    },
    create: {
      id: authUserId || undefined,
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
  console.log("SUPABASE ADMIN ACCOUNT READY (AUTH & DATABASE):");
  if (authUserId) {
    console.log(`- Supabase Auth ID:   ${authUserId}`);
  }
  console.log(`- Email Address:      ${user.email}`);
  console.log(`- Password:           ${password}`);
  console.log(`- Role:               ${user.role}`);
  console.log(`- Email Verified:     YES`);
  console.log(`- Visible in:         Supabase Dashboard -> Auth & Table Editor`);
  console.log("==================================================");
}

main()
  .catch((err) => {
    console.error("Failed to create/update admin account:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
