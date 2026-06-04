import withPWAInit from '@ducanh2912/next-pwa';

/**
 * PWA configuration.
 *
 * Why each option:
 *  - dest: 'public'            → service worker + workbox runtime live in /public so they're served from the root.
 *  - register: true            → next-pwa auto-injects the SW registration script; we don't have to.
 *  - cacheOnFrontEndNav        → caches navigations triggered by next/link so a 2nd visit is instant.
 *  - aggressiveFrontEndNavCaching → preemptively caches linked pages on hover/focus.
 *  - reloadOnOnline: true      → when the user comes back online, transparently re-fetches in case data went stale.
 *  - disable on dev            → critical. The SW intercepts HMR and breaks hot-reload otherwise.
 *  - fallbacks.document        → which page to render when the user is offline AND the requested HTML isn't cached yet.
 *  - workboxOptions.runtimeCaching → per-route caching strategies. We use NetworkOnly for /api/* and Supabase so we
 *    never serve stale user data (security + freshness). HTML uses SWR for instant-load. Static assets use CacheFirst
 *    since they're hashed by Next and immutable.
 */
const withPWA = withPWAInit({
  dest: 'public',
  register: true,
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === 'development',
  fallbacks: {
    document: '/offline',
  },
  workboxOptions: {
    // Don't precache the offline page automatically — we route to it via fallback.
    // skipWaiting + clientsClaim let new SW versions take over without a long delay,
    // but we still surface a "new version available" banner so the user can opt in.
    skipWaiting: true,
    clientsClaim: true,
    cleanupOutdatedCaches: true,
    runtimeCaching: [
      // 1. /api/* — NEVER cache. Always network. Auth-bound, mutates user data.
      {
        urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith('/api/'),
        handler: 'NetworkOnly',
        options: { cacheName: 'api-no-cache' },
      },
      // 2. Supabase REST / realtime / storage — NEVER cache. User data, RLS-bound.
      {
        urlPattern: ({ url }) => url.hostname.endsWith('.supabase.co') || url.hostname.endsWith('.supabase.in'),
        handler: 'NetworkOnly',
        options: { cacheName: 'supabase-no-cache' },
      },
      // 3. Next.js static assets — hashed, immutable. CacheFirst forever.
      {
        urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith('/_next/static/'),
        handler: 'CacheFirst',
        options: {
          cacheName: 'assets-v1',
          expiration: { maxEntries: 200, maxAgeSeconds: 30 * 24 * 60 * 60 },
        },
      },
      // 4. Local fonts.
      {
        urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith('/fonts/'),
        handler: 'CacheFirst',
        options: {
          cacheName: 'fonts-v1',
          expiration: { maxEntries: 30, maxAgeSeconds: 30 * 24 * 60 * 60 },
        },
      },
      // 5. Local /icons/ + /legacy/ + svgs.
      {
        urlPattern: ({ url, sameOrigin, request }) =>
          sameOrigin &&
          (url.pathname.startsWith('/icons/') ||
            url.pathname.startsWith('/legacy/') ||
            request.destination === 'image'),
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'img-local-v1',
          expiration: { maxEntries: 100, maxAgeSeconds: 30 * 24 * 60 * 60 },
        },
      },
      // 6. Remote images from known image hosts.
      {
        urlPattern: ({ url }) =>
          [
            'image.tmdb.org',
            'images.openfoodfacts.org',
            'prod-mercadona.imgix.net',
            'lh3.googleusercontent.com',
          ].includes(url.hostname),
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'img-v1',
          expiration: { maxEntries: 300, maxAgeSeconds: 30 * 24 * 60 * 60 },
        },
      },
      // 7. HTML pages — StaleWhileRevalidate so reopening is instant, but fresh content trickles in.
      {
        urlPattern: ({ request, sameOrigin }) => sameOrigin && request.destination === 'document',
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'pages-v1',
          expiration: { maxEntries: 50, maxAgeSeconds: 7 * 24 * 60 * 60 },
        },
      },
    ],
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Heavy native/server-only deps. Marking them external stops Next
    // from bundling their full tree into every lambda — keeps the
    // serverless package under the Vercel 245 MB limit.
    serverComponentsExternalPackages: ['exceljs', '@anthropic-ai/sdk', 'resend'],
  },
};

export default withPWA(nextConfig);
