import path from "path";
import { fileURLToPath } from "url";
import createNextIntlPlugin from "next-intl/plugin";
import pkg from "@next/env";
import { applyPublicEnvDefaults } from "./env/apply-defaults.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { loadEnvConfig } = pkg;
loadEnvConfig(process.cwd());

const {
  apiUrl,
  fileServerUrl: fileServerBaseURL,
  hostName,
} = applyPublicEnvDefaults();

const customerHost = process.env.CUSTOMER_HOST ?? "customer.volowifi.com";
const collectorHost = process.env.COLLECTOR_HOST ?? "collector.volowifi.com";
const captiveHost = process.env.CAPTIVE_HOST ?? "captive.volowifi.com";
const partnerHost = process.env.PARTNER_HOST ?? "partner.volowifi.com";

if (!apiUrl) {
  console.warn("[next.config] API_URL is empty — set API_URL in .env (mirrors to NEXT_PUBLIC_API_URL).");
}

const withNextIntl = createNextIntlPlugin();

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  reactStrictMode: false,
  // Bake mirrored public env into the client bundle (single-source .env keys).
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_UPLOAD_URL: process.env.NEXT_PUBLIC_UPLOAD_URL,
    NEXT_PUBLIC_SOCKET_URL: process.env.NEXT_PUBLIC_SOCKET_URL,
    NEXT_PUBLIC_SOCKET_PATH: process.env.NEXT_PUBLIC_SOCKET_PATH,
    NEXT_PUBLIC_CAPTIVE_API_URL: process.env.NEXT_PUBLIC_CAPTIVE_API_URL,
    NEXT_PUBLIC_CAPTIVE_HOST: process.env.NEXT_PUBLIC_CAPTIVE_HOST,
    NEXT_PUBLIC_PARTNER_HOST: process.env.NEXT_PUBLIC_PARTNER_HOST,
    NEXT_PUBLIC_COLLECTOR_HOST: process.env.NEXT_PUBLIC_COLLECTOR_HOST,
    NEXT_PUBLIC_CUSTOMER_HOST: process.env.NEXT_PUBLIC_CUSTOMER_HOST,
    NEXT_PUBLIC_CACHE_PREFIX: process.env.NEXT_PUBLIC_CACHE_PREFIX,
    NEXT_PUBLIC_BY_PASS: process.env.NEXT_PUBLIC_BY_PASS,
  },
  turbopack: {
    root: __dirname,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "200mb",
    },
    proxyClientMaxBodySize: "200mb",
  },

  cacheLife: {
    translation: { stale: 300, revalidate: 300, expire: 3600 },
    apps: { stale: 300, revalidate: 300, expire: 3600 },
  },
  cacheComponents: true,

  webpack: (config, { isServer, dev }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "react-dom/client": "react-dom",
    };

    if (isServer && dev) {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    }

    return config;
  },

  async rewrites() {
    const consoleBase = (apiUrl || "").replace(/\/console\/?$/, "");
    const filesBase = (fileServerBaseURL || "").replace(/\/$/, "");
    const apiBase = (apiUrl || "").replace(/\/$/, "");

    return {
      beforeFiles: [
        {
          source: "/auth",
          has: [{ type: "host", value: captiveHost }],
          destination: "/portal/auth",
        },
        {
          source: "/dashboard",
          has: [{ type: "host", value: captiveHost }],
          destination: "/portal/dashboard",
        },
        {
          source: "/router-login",
          has: [{ type: "host", value: captiveHost }],
          destination: "/portal/router-login",
        },
      ],
      afterFiles: [
        ...(consoleBase
          ? [{ source: "/health", destination: `${consoleBase}/health` }]
          : []),
        ...(filesBase
          ? [
              { source: "/images/:path*", destination: `${filesBase}/images/:path*` },
              { source: "/cover/:path*", destination: `${filesBase}/cover/:path*` },
              { source: "/album_covers/:path*", destination: `${filesBase}/album_covers/:path*` },
              { source: "/mv_cover/:path*", destination: `${filesBase}/mv_cover/:path*` },
              { source: "/mega/:path*", destination: `${filesBase}/mega/:path*` },
              { source: "/icons/:path*", destination: `${filesBase}/icons/:path*` },
              { source: "/profiles/:path*", destination: `${filesBase}/profiles/:path*` },
              { source: "/default/:path*", destination: `${filesBase}/default/:path*` },
              { source: "/storage/:path*", destination: `${filesBase}/storage/:path*` },
              { source: "/users/:path*", destination: `${filesBase}/users/:path*` },
              { source: "/audio/:path*", destination: `${filesBase}/audio/:path*` },
              { source: "/mp3/:path*", destination: `${filesBase}/mp3/:path*` },
              { source: "/mega-prod-public/:path*", destination: `${filesBase}/:path*` },
            ]
          : []),
        ...(apiBase
          ? [
              { source: "/tranlation/:path*", destination: `${apiBase}/translation/:path*` },
              { source: "/uploads/:path*", destination: `${apiBase}/upload/:path*` },
              { source: "/upload/storage", destination: `${apiBase}/upload/storage` },
              { source: "/upload/chunk/init", destination: `${apiBase}/upload/chunk/init` },
              { source: "/upload/chunk", destination: `${apiBase}/upload/chunk` },
              { source: "/upload/chunk/complete", destination: `${apiBase}/upload/chunk/complete` },
              { source: "/file-proxy/:path*", destination: `${apiBase}/:path*` },
            ]
          : []),
      ],
    };
  },

  images: {
    remotePatterns: [
      { protocol: "https", hostname: hostName, pathname: "**" },
      ...(fileServerBaseURL
        ? [
            {
              protocol: "https",
              hostname: new URL(fileServerBaseURL).hostname,
              pathname: "**",
            },
          ]
        : []),
    ],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 512],
    path: "/_next/image",
    disableStaticImages: false,
    maximumRedirects: 2,
    minimumCacheTTL: 3600,
    formats: ["image/avif", "image/webp"],
  },

  productionBrowserSourceMaps: false,

  async redirects() {
    return [
      {
        source: "/",
        has: [{ type: "host", value: collectorHost }],
        destination: "/collector",
        permanent: false,
      },
      {
        source: "/",
        has: [{ type: "host", value: customerHost }],
        destination: "/customer",
        permanent: false,
      },
      {
        source: "/",
        has: [{ type: "host", value: captiveHost }],
        destination: "/portal/auth",
        permanent: false,
      },
      {
        source: "/",
        has: [{ type: "host", value: partnerHost }],
        destination: "/partner",
        permanent: false,
      },
      {
        source: "/portal",
        destination: "/portal/auth",
        permanent: false,
      },
    ];
  },

  async headers() {
    const pwaHeaders = [
      { key: "Permissions-Policy", value: "camera=(self)" },
      { key: "X-Content-Type-Options", value: "nosniff" },
    ];

    return [
      {
        source: "/collector/:path*",
        headers: pwaHeaders,
      },
      {
        source: "/customer/:path*",
        headers: pwaHeaders,
      },
      {
        source: "/portal/:path*",
        headers: pwaHeaders,
      },
      {
        source: "/partner/:path*",
        headers: pwaHeaders,
      },
      {
        source: "/partner/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/partner/" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
        ],
      },
      {
        source: "/partner/manifest.webmanifest",
        headers: [
          { key: "Content-Type", value: "application/manifest+json; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache" },
        ],
      },
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
