import { NextResponse, type NextRequest } from "next/server";
import { TOKEN_COOKIE, isExpired } from "@/lib/session";

// REQ-AUTH-7: redirect signed-out visitors away from protected pages (FE-05). The backend still enforces JWT on every call.
export function middleware(request: NextRequest) {
  const token = request.cookies.get(TOKEN_COOKIE)?.value;
  if (token && !isExpired(token)) return NextResponse.next();

  const login = new URL("/login", request.url);
  const { pathname, search } = request.nextUrl;
  if (pathname !== "/") login.searchParams.set("next", pathname + search);
  const response = NextResponse.redirect(login);
  if (token) response.cookies.delete(TOKEN_COOKIE);
  return response;
}

export const config = { matcher: ["/", "/boards/:path*", "/my-tasks", "/profile"] };
