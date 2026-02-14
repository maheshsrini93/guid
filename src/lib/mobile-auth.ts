import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";

export interface MobileTokenPayload {
  userId: string;
  email: string;
  role: string;
  subscriptionTier: string;
  subscriptionEndsAt: string | null;
}

/** Lazy accessor — throws at call-time (not import-time) in prod when env var is missing. */
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET environment variable is required in production");
  }
  return secret ?? "dev-jwt-secret";
}

function getJwtRefreshSecret(): string {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("JWT_REFRESH_SECRET environment variable is required in production");
  }
  return secret ?? "dev-jwt-refresh-secret";
}

/** Sign a short-lived access token (15 minutes). */
export function signAccessToken(payload: MobileTokenPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: "15m" });
}

/** Sign a long-lived refresh token (30 days). */
export function signRefreshToken(payload: MobileTokenPayload): string {
  return jwt.sign(payload, getJwtRefreshSecret(), { expiresIn: "30d" });
}

/** Verify a refresh token. Returns payload or null. */
export function verifyRefreshToken(token: string): MobileTokenPayload | null {
  try {
    const decoded = jwt.verify(token, getJwtRefreshSecret()) as MobileTokenPayload;
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Extract and verify the Bearer access token from a request.
 * Returns the user payload or null if invalid/missing.
 */
export async function verifyMobileToken(
  request: Request
): Promise<MobileTokenPayload | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as MobileTokenPayload;
    // Verify user still exists
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true },
    });
    if (!user) return null;
    return decoded;
  } catch {
    return null;
  }
}

/** Build the JWT payload from a database user. */
export function buildTokenPayload(user: {
  id: string;
  email: string;
  role: string;
  subscriptionTier: string;
  subscriptionEndsAt: Date | null;
}): MobileTokenPayload {
  return {
    userId: user.id,
    email: user.email,
    role: user.role,
    subscriptionTier: user.subscriptionTier,
    subscriptionEndsAt: user.subscriptionEndsAt?.toISOString() ?? null,
  };
}
