import { Request } from "express";
import { prisma } from "../config/database";
import { logger } from "../utils/logger";

export async function recordAuditLog(
  req: Request,
  action: string,
  entity: string,
  entityId?: string,
  details?: Record<string, any>
) {
  try {
    const userId = req.user?.id;
    const ipAddress = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "";
    const userAgent = req.headers["user-agent"] || "";

    await prisma.auditLog.create({
      data: {
        userId: userId || null,
        action,
        entity,
        entityId: entityId || null,
        ipAddress,
        userAgent,
        details: details ? JSON.stringify(details) : null,
      },
    });
  } catch (err: any) {
    logger.warn(`Failed to record audit log: ${err.message}`);
  }
}
