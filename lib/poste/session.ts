import { createHmac, timingSafeEqual } from "crypto";

const MAX_AGE = 60 * 60 * 12; // 12 heures

type SessionPayload = {
  employeeId: string;
  position: string;
  exp: number;
};

function getSecret(): string {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!secret) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY manquante.");
  }

  return secret;
}

function sign(value: string): string {
  return createHmac("sha256", getSecret())
    .update(value)
    .digest("base64url");
}

export function createPosteSession(
  employeeId: string,
  position: string
): string {
  const payload: SessionPayload = {
    employeeId,
    position,
    exp: Math.floor(Date.now() / 1000) + MAX_AGE,
  };

  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = sign(encoded);

  return `${encoded}.${signature}`;
}

export function verifyPosteSession(
  token: string | undefined
): SessionPayload | null {
  if (!token) {
    return null;
  }

  const separatorIndex = token.indexOf(".");

  if (separatorIndex === -1) {
    return null;
  }

  const encoded = token.slice(0, separatorIndex);
  const receivedSignature = token.slice(separatorIndex + 1);

  if (!encoded || !receivedSignature) {
    return null;
  }

  try {
    const expectedSignature = sign(encoded);

    const received = Buffer.from(receivedSignature, "utf8");
    const expected = Buffer.from(expectedSignature, "utf8");

    if (received.length !== expected.length) {
      return null;
    }

    if (!timingSafeEqual(received, expected)) {
      return null;
    }

    const json = Buffer.from(encoded, "base64url").toString("utf8");
    const payload: unknown = JSON.parse(json);

    if (
      typeof payload !== "object" ||
      payload === null ||
      !("employeeId" in payload) ||
      !("position" in payload) ||
      !("exp" in payload)
    ) {
      return null;
    }

    const session = payload as SessionPayload;

    if (
      typeof session.employeeId !== "string" ||
      typeof session.position !== "string" ||
      typeof session.exp !== "number"
    ) {
      return null;
    }

    if (session.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return session;
  } catch {
    return null;
  }
}