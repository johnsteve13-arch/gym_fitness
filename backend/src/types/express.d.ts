import { UserRole, AccountStatus } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: "super_admin" | "admin" | "trainer" | "member";
        firstName: string;
        lastName: string;
        memberId?: string;
        trainerId?: string;
        status: "active" | "suspended" | "inactive";
      };
    }
  }
}

export {};
