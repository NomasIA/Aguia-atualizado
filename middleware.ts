import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const publicPaths = ['/login'];
  const isPublicPath = publicPaths.some(path => req.nextUrl.pathname.startsWith(path));

  const authToken = req.cookies.get('sb-kwzzaqcysxvlrlgyqucp-auth-token')?.value;
  const hasSession = authToken && authToken.length > 0;

  if (!hasSession && !isPublicPath) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = '/login';
    return NextResponse.redirect(redirectUrl);
  }

  if (hasSession && req.nextUrl.pathname === '/login') {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = '/';
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*|api).*)'],
};
