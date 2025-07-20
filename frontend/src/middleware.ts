import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

async function verifyToken(token: string, secret: string): Promise<any> {
  const secretKey = new TextEncoder().encode(secret);
  try {
    const { payload } = await jwtVerify(token, secretKey);
    return payload;
  } catch (e) {
    console.error("Token verification failed:", e);
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const token = request.cookies.get("authToken")?.value;
  const jwtSecret = process.env.JWT_SECRET;

  const isAuthPage = request.nextUrl.pathname.startsWith("/signup");
  const isSetupPage = request.nextUrl.pathname.startsWith("/signup/setup");

  // 1. Verify the token first
  let payload = null;
  if (token && jwtSecret) {
    payload = await verifyToken(token, jwtSecret);
  }

  const isAuthenticated = !!payload;
  const isProfileComplete = payload?.profileComplete === true;

  // --- LOGIC FOR UNAUTHENTICATED USERS ---
  if (!isAuthenticated) {
    // If the user is trying to access a protected page, redirect to signup
    if (!isAuthPage) {
      const response = NextResponse.redirect(new URL("/signup", request.url));
      // Clear any invalid cookie that might exist
      response.cookies.delete("authToken");
      return response;
    }
    // If they are already on the signup page, let them stay
    return NextResponse.next();
  }

  // --- LOGIC FOR AUTHENTICATED USERS ---
  if (isAuthenticated) {
    // If their profile is not complete, they must be on the setup page
    if (!isProfileComplete) {
      if (isSetupPage) {
        return NextResponse.next(); // Allow access
      }
      // If they are anywhere else, force them to the setup page
      return NextResponse.redirect(new URL("/profile/setup", request.url));
    }

    // If their profile IS complete, they should not be on auth or setup pages
    if (isAuthPage || isSetupPage) {
      return NextResponse.redirect(new URL("/chat", request.url));
    }
  }

  // If none of the above, allow the request to proceed
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
