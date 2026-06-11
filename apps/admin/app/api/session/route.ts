import { NextRequest, NextResponse } from "next/server";
import { ADMIN_AUTH_COOKIE, getBackendApiUrl, sessionCookieOptions } from "@/lib/admin-auth";

type LoginPayload = { ok?: boolean; accessToken?: string; message?: string };

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const response = await fetch(`${getBackendApiUrl()}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
    cache: "no-store",
  });

  const payload = await response.json().catch(() => ({ ok: false, message: "No se pudo iniciar sesion." } satisfies LoginPayload));
  if (!response.ok || !payload?.ok || !payload?.accessToken) {
    return NextResponse.json(
      { ok: false, message: payload?.message ?? "No se pudo iniciar sesion." },
      { status: response.status === 200 ? 401 : response.status },
    );
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_AUTH_COOKIE, payload.accessToken, sessionCookieOptions());
  return res;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(ADMIN_AUTH_COOKIE);
  return response;
}
