import request from "supertest";
import app from "../src/app";
import { generateMemberQrToken, parseMemberQrToken } from "../src/utils/qr";
import { PaymentService } from "../src/services/payment.service";

describe("Apex Iron Fitness - Production API & Business Logic Tests", () => {
  describe("System Health & Security Middleware", () => {
    it("GET /health should return 200 OK with health status and uptime", async () => {
      const res = await request(app).get("/health");
      expect(res.status).toBe(200);
      expect(res.body.status).toBe("healthy");
      expect(res.body.service).toBe("gym-fitness-api");
      expect(res.body.version).toBe("1.0.0");
      expect(res.body.uptime).toBeDefined();
    });

    it("GET /non-existent-route should return structured 404 JSON", async () => {
      const res = await request(app).get("/api/unknown-endpoint-xyz");
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain("Endpoint not found");
    });
  });

  describe("QR Access Control & Token Utilities", () => {
    it("should generate structured verifiable QR tokens", () => {
      const memberCode = "MEM-10025";
      const token = generateMemberQrToken(memberCode);
      expect(token).toMatch(/^APEX-MEM-10025-[A-Z0-9]+-[A-Z0-9]+$/);
    });

    it("should parse and extract member code correctly from QR token", () => {
      const token = "APEX-MEM-10042-TIMESTAMP-RANDOMHEX";
      const parsed = parseMemberQrToken(token);
      expect(parsed.isValid).toBe(true);
      expect(parsed.memberCode).toBe("MEM");
    });
  });

  describe("Financial & Payment Services", () => {
    it("should generate standardized invoice and transaction identifiers", () => {
      const invoice = PaymentService.generateInvoiceNumber();
      const currentYear = new Date().getFullYear();
      expect(invoice).toMatch(new RegExp(`^INV-${currentYear}-[A-F0-9]{6}$`));

      const txn = PaymentService.generateTransactionId();
      expect(txn).toMatch(/^TXN-[A-Z0-9]+-[A-F0-9]{8}$/);
    });
  });

  describe("Authentication API Validation", () => {
    it("POST /api/auth/login with missing credentials should return 400 Bad Request", async () => {
      const res = await request(app).post("/api/auth/login").send({});
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain("Email and password are required");
    });

    it("Protected route GET /api/members without token should return 401 Unauthorized", async () => {
      const res = await request(app).get("/api/members");
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain("Access denied. No authentication token provided");
    });
  });
});
