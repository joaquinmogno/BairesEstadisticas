import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { ADMIN_AUTH_COOKIE, getBackendApiUrl } from "@/lib/admin-auth";

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  return proxy(request, context);
}

export async function POST(request: NextRequest, context: RouteContext) {
  return proxy(request, context);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return proxy(request, context);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return proxy(request, context);
}

async function proxy(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_AUTH_COOKIE)?.value;
  const target = new URL(`${getBackendApiUrl()}/${path.join("/")}`);
  target.search = new URL(request.url).search;

  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("connection");
  headers.delete("content-length");
  headers.delete("cookie");

  if (token) {
    headers.set("authorization", `Bearer ${token}`);
  }

  let body: BodyInit | undefined;
  if (request.method !== "GET" && request.method !== "HEAD") {
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("multipart/form-data")) {
      body = await request.formData();
      headers.delete("content-type");
    } else {
      const raw = await request.arrayBuffer();
      body = raw.byteLength ? Buffer.from(raw) : undefined;
    }
  }

  const response = await fetch(target, {
    method: request.method,
    headers,
    body,
    cache: "no-store",
  });

  const nextResponse = new NextResponse(response.body, { status: response.status });
  const responseContentType = response.headers.get("content-type");
  if (responseContentType) {
    nextResponse.headers.set("content-type", responseContentType);
  }

  if (response.status === 401) {
    nextResponse.cookies.delete(ADMIN_AUTH_COOKIE);
  }

  return nextResponse;
}
