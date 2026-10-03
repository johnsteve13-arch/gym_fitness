import crypto from "crypto";

export function generateMemberQrToken(memberCode: string): string {
  const timestamp = Date.now().toString(36);
  const randomBytes = crypto.randomBytes(8).toString("hex");
  return `APEX-${memberCode}-${timestamp}-${randomBytes}`.toUpperCase();
}

export function parseMemberQrToken(qrString: string): { memberCode?: string; isValid: boolean } {
  if (!qrString || typeof qrString !== "string") {
    return { isValid: false };
  }
  const parts = qrString.split("-");
  if (parts.length >= 3 && parts[0] === "APEX") {
    return { memberCode: parts[1], isValid: true };
  }
  // Allow direct member code lookup or raw token match
  return { memberCode: qrString, isValid: true };
}
