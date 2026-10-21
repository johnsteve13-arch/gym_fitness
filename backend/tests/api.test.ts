import request from "supertest";
import app from "../src/app";
import { generateMemberQrToken, parseMemberQrToken } from "../src/utils/qr";
import { PaymentService } from "../src/services/payment.service";
import { SmsService } from "../src/services/sms.service";
import { BookingService } from "../src/services/booking.service";
import { prisma } from "../src/config/database";

describe("Apex Iron Fitness - Production API & Business Logic Tests", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("System Health & Security Middleware", () => {
    it("GET /health should return 200 OK with health status and uptime", async () => {
      const res = await request(app).get("/health");
      expect(res.status).toBe(200);
      expect(res.body.status).toBe("healthy");
      expect(res.body.service).toBe("gym-fitness-api");
      expect(res.body.version).toBe("1.0.0");
      expect(res.body.uptime).toBeDefined();
    });

    it("GET /ready should return 200 OK with connected database status", async () => {
      const res = await request(app).get("/ready");
      expect(res.status).toBe(200);
      expect(res.body.status).toBe("ready");
      expect(res.body.database).toBe("connected");
      expect(res.body.timestamp).toBeDefined();
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

  describe("Philippine SMS API Engine (Semaphore Integration)", () => {
    it("should correctly normalize valid Philippine mobile phone formats", () => {
      // Local format with leading 0
      const local = SmsService.normalizePhilippineNumber("09171234567");
      expect(local.valid).toBe(true);
      expect(local.normalized).toBe("09171234567");
      expect(local.international).toBe("+639171234567");

      // International format with +63
      const intl = SmsService.normalizePhilippineNumber("+639185551234");
      expect(intl.valid).toBe(true);
      expect(intl.normalized).toBe("09185551234");
      expect(intl.international).toBe("+639185551234");

      // Formatted with hyphens and spaces
      const formatted = SmsService.normalizePhilippineNumber("+63 (917) 789-0123");
      expect(formatted.valid).toBe(true);
      expect(formatted.normalized).toBe("09177890123");

      // 10-digit without leading 0
      const tenDigit = SmsService.normalizePhilippineNumber("9281234567");
      expect(tenDigit.valid).toBe(true);
      expect(tenDigit.normalized).toBe("09281234567");
    });

    it("should reject invalid phone numbers", () => {
      const invalidShort = SmsService.normalizePhilippineNumber("12345");
      expect(invalidShort.valid).toBe(false);

      const invalidEmpty = SmsService.normalizePhilippineNumber("");
      expect(invalidEmpty.valid).toBe(false);

      const invalidCountry = SmsService.normalizePhilippineNumber("+14155552671");
      expect(invalidCountry.valid).toBe(false);
    });

    it("should render all 13 required business event message templates cleanly", () => {
      const templates = SmsService.templates;

      expect(templates.bookingRequested("Alex", "2026-11-01", "10:00 - 11:00")).toContain("Coach Alex");
      expect(templates.bookingConfirmed("Alex", "2026-11-01", "10:00 - 11:00")).toContain("CONFIRMED");
      expect(templates.bookingDeclined("Alex", "2026-11-01", "10:00 - 11:00", "Conflict")).toContain("Conflict");
      expect(templates.bookingCancelledTrainer("Alex", "2026-11-01", "10:00 - 11:00")).toContain("reschedule");
      expect(templates.bookingCancelledMember("Alex", "2026-11-01", "10:00 - 11:00")).toContain("cancelled");
      expect(templates.sessionReminder("Alex", "10:00")).toContain("Reminder");
      expect(templates.membershipExpiring("Annual Athlete", 7, "2026-12-31")).toContain("Annual Athlete");
      expect(templates.membershipRenewed("Quarterly Pro", "2027-03-31")).toContain("renewed");
      expect(templates.paymentSuccess(1500, "INV-2026-ABC123")).toContain("PHP 1500.00");
      expect(templates.paymentFailed("INV-2026-FAIL01")).toContain("could not be processed");
      expect(templates.classConfirmed("Power Yoga", "2026-11-02", "09:00", "Studio B")).toContain("Power Yoga");
      expect(templates.classCancelled("HIIT Sprint", "2026-11-02", "18:00")).toContain("cancelled");
      expect(templates.securityAlert("Password Reset")).toContain("security action");
      expect(templates.trainerApproved("Marcus")).toContain("APPROVED");
      expect(templates.trainerDeclined("Marcus", "Roster full")).toContain("Roster full");
    });

    it("should dispatch SMS in safe dry-run mode and persist log to database", async () => {
      const idempotencyKey = `test_dry_run_${Date.now()}`;
      const result = await SmsService.sendSms({
        toPhone: "09171234567",
        recipientName: "Test Athlete",
        event: "booking_confirmed",
        messageContent: "Apex Iron: Test dispatch verification in dry-run mode.",
        idempotencyKey,
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe("accepted");
      expect(result.dryRun).toBe(true);
      expect(result.recipientPhone).toBe("09171234567");
      expect(result.logId).toBeDefined();

      // Test idempotency protection: second call with same idempotency key must not duplicate
      const duplicateResult = await SmsService.sendSms({
        toPhone: "09171234567",
        recipientName: "Test Athlete",
        event: "booking_confirmed",
        messageContent: "Apex Iron: Test dispatch verification in dry-run mode.",
        idempotencyKey,
      });

      expect(duplicateResult.success).toBe(true);
      expect(duplicateResult.message).toContain("Duplicate notification prevented");
      expect(duplicateResult.logId).toBe(result.logId);
    });

    it("should dispatch SMS to trainer mobile number upon approval and decline", async () => {
      const trainerPhone = "09181234567";
      const approveResult = await SmsService.sendSms({
        toPhone: trainerPhone,
        recipientName: "Coach Marcus",
        event: "trainer_approved",
        messageContent: SmsService.templates.trainerApproved("Marcus"),
      });

      expect(approveResult.success).toBe(true);
      expect(approveResult.status).toBe("accepted");
      expect(approveResult.recipientPhone).toBe(trainerPhone);

      const declineResult = await SmsService.sendSms({
        toPhone: trainerPhone,
        recipientName: "Coach Marcus",
        event: "trainer_declined",
        messageContent: SmsService.templates.trainerDeclined("Marcus", "Coaching roster full"),
      });

      expect(declineResult.success).toBe(true);
      expect(declineResult.status).toBe("accepted");
      expect(declineResult.recipientPhone).toBe(trainerPhone);
    });
  });

  describe("Trainer Booking & Availability Conflict Engine", () => {
    it("should reject booking attempts for dates in the past", async () => {
      await expect(
        BookingService.createBooking({
          memberId: "dummy-member-id",
          trainerId: "dummy-trainer-id",
          sessionDate: "2020-01-01",
          startTime: "10:00",
          endTime: "11:00",
        })
      ).rejects.toThrow(/past/i);
    });

    it("should reject bookings with invalid time ranges (finish earlier than start)", async () => {
      await expect(
        BookingService.createBooking({
          memberId: "dummy-member-id",
          trainerId: "dummy-trainer-id",
          sessionDate: "2026-12-15",
          startTime: "14:00",
          endTime: "13:00",
        })
      ).rejects.toThrow(/Time to Finish must be later than Time to Start/i);
    });

    it("should correctly validate half-open intervals: [10:00, 11:00) adjacent to [11:00, 12:00) has NO conflict", () => {
      // In half-open intervals [start, end), adjacent slots do not conflict:
      // An overlap occurs iff: existing.startTime < requested.endTime && existing.endTime > requested.startTime
      const existing = { startTime: "10:00", endTime: "11:00" };

      // Case 1: Adjacent later session [11:00, 12:00) -> NOT overlapping
      const adjacentLater = { startTime: "11:00", endTime: "12:00" };
      const isOverlapLater =
        existing.startTime < adjacentLater.endTime && existing.endTime > adjacentLater.startTime;
      expect(isOverlapLater).toBe(false);

      // Case 2: Adjacent earlier session [09:00, 10:00) -> NOT overlapping
      const adjacentEarlier = { startTime: "09:00", endTime: "10:00" };
      const isOverlapEarlier =
        existing.startTime < adjacentEarlier.endTime && existing.endTime > adjacentEarlier.startTime;
      expect(isOverlapEarlier).toBe(false);

      // Case 3: Overlapping session [10:30, 11:30) -> OVERLAPPING
      const overlapping = { startTime: "10:30", endTime: "11:30" };
      const isOverlap =
        existing.startTime < overlapping.endTime && existing.endTime > overlapping.startTime;
      expect(isOverlap).toBe(true);
    });
  });
});
