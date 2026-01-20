import { NextResponse } from 'next/server';

export function middleware(request) {
  const { pathname, origin } = request.nextUrl;
  const host = request.headers.get('host') || '';

  // Rewrite manifest.json based on hostname
  if (pathname === '/manifest.json') {
    if (host.includes('preview.bricktally.app')) {
      return NextResponse.rewrite(new URL('/manifest-preview.json', origin));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/manifest.json',
};
