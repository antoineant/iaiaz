import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { locales, defaultLocale, localePrefix } from "@/i18n/config";

interface CookieToSet {
  name: string;
  value: string;
  options?: Record<string, unknown>;
}

// Create the next-intl middleware
// Note: We don't pass pathnames here to allow all dynamic routes to work.
// The pathnames config in navigation.ts is only used for Link component translations.
const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix,
});

// Helper to extract locale from pathname
function getLocaleFromPathname(pathname: string): string {
  const segments = pathname.split("/");
  const potentialLocale = segments[1];
  if (locales.includes(potentialLocale as typeof locales[number])) {
    return potentialLocale;
  }
  return defaultLocale;
}

// Helper to remove locale prefix from pathname for matching
function getPathnameWithoutLocale(pathname: string): string {
  const locale = getLocaleFromPathname(pathname);
  if (locale !== defaultLocale && pathname.startsWith(`/${locale}`)) {
    return pathname.replace(`/${locale}`, "") || "/";
  }
  return pathname;
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Skip API routes - they don't need i18n
  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  // Handle i18n routing first
  const intlResponse = intlMiddleware(request);

  // If intl middleware redirected (e.g., adding locale prefix), return that
  if (intlResponse.status === 307 || intlResponse.status === 308) {
    return intlResponse;
  }

  // Get locale for building redirect URLs
  const locale = getLocaleFromPathname(pathname);
  const localePathPrefix = locale === defaultLocale ? "" : `/${locale}`;

  // Get pathname without locale for route matching
  const pathnameWithoutLocale = getPathnameWithoutLocale(pathname);

  // Handle OAuth PKCE code arriving at wrong URL (Supabase redirect fallback)
  const code = request.nextUrl.searchParams.get("code");
  if (code && !pathnameWithoutLocale.startsWith("/auth/callback")) {
    const url = request.nextUrl.clone();
    url.pathname = `${localePathPrefix}/auth/callback`;
    return NextResponse.redirect(url);
  }

  // Redirect old audience pages to /etudiants (both FR and EN paths)
  const redirectToStudy = ["/etablissements", "/formateurs", "/schools", "/trainers"];
  if (redirectToStudy.includes(pathnameWithoutLocale)) {
    const url = request.nextUrl.clone();
    url.pathname = `${localePathPrefix}/etudiants`;
    return NextResponse.redirect(url, 301);
  }

  // Legacy signup redirects
  if (pathnameWithoutLocale === "/auth/signup/business") {
    const url = request.nextUrl.clone();
    url.pathname = `${localePathPrefix}/auth/signup`;
    url.searchParams.set("intent", "business");
    return NextResponse.redirect(url, 301);
  }

  if (pathnameWithoutLocale === "/mifa/signup") {
    const url = request.nextUrl.clone();
    url.pathname = `${localePathPrefix}/auth/signup`;
    url.searchParams.set("intent", "mifa");
    return NextResponse.redirect(url, 301);
  }

  // Set up Supabase client with the response from intl middleware
  let response = intlResponse;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          // Clone the intl response to preserve headers
          response = NextResponse.next({
            request,
            headers: intlResponse.headers,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protected routes (locale-agnostic matching)
  const protectedPaths = ["/chat", "/dashboard", "/org", "/class", "/mifa/dashboard", "/mifa/settings", "/mifa/chat"];
  const isProtectedPath = protectedPaths.some((path) =>
    pathnameWithoutLocale.startsWith(path)
  );

  // Auth routes (redirect if already logged in)
  const authPaths = ["/auth/login", "/auth/signup"];
  const isAuthPath = authPaths.some((path) =>
    pathnameWithoutLocale.startsWith(path)
  );

  if (isProtectedPath && !user) {
    const url = request.nextUrl.clone();
    url.pathname = `${localePathPrefix}/auth/login`;
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  if (isAuthPath && user) {
    const url = request.nextUrl.clone();
    url.pathname = `${localePathPrefix}/auth/choose-workspace`;
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|opengraph-image|twitter-image|robots.txt|sitemap.xml|site.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
