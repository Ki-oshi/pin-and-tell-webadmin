import type {
  NextConfig,
} from "next";

const nextConfig:
  NextConfig = {
    poweredByHeader:
      false,

    async headers() {
      return [
        {
          source:
            "/admin/:path*",

          headers: [
            {
              key:
                "Cache-Control",

              value:
                "private, no-store, no-cache, must-revalidate",
            },

            {
              key:
                "X-Content-Type-Options",

              value:
                "nosniff",
            },

            {
              key:
                "X-Frame-Options",

              value:
                "DENY",
            },

            {
              key:
                "Referrer-Policy",

              value:
                "no-referrer",
            },

            {
              key:
                "Permissions-Policy",

              value:
                "camera=(), microphone=(), geolocation=()",
            },

            {
              key:
                "X-Robots-Tag",

              value:
                "noindex, nofollow, noarchive",
            },
          ],
        },
      ];
    },
  };

export default nextConfig;