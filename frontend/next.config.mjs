import path from "path";
import { fileURLToPath } from "url";
import createNextIntlPlugin from "next-intl/plugin";
import pkg from "@next/env";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { loadEnvConfig } = pkg;
loadEnvConfig(process.cwd());

const fileServerBaseURL = process.env.FILE_SERVER_URL;
const hostName = process.env.HOST_NAME;
const apiUrl = process.env.API_URL;
const customerHost = process.env.CUSTOMER_HOST ?? "customer.volowifi.com";
const collectorHost = process.env.COLLECTOR_HOST ?? "collector.volowifi.com";
const captiveHost = process.env.CAPTIVE_HOST ?? "captive.volowifi.com";
const partnerHost = process.env.PARTNER_HOST ?? "partner.volowifi.com";

const withNextIntl = createNextIntlPlugin();

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  reactStrictMode: false,
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
      { source: "/health", destination: `${apiUrl.replace(/\/console\/?$/, '')}/health` },
      { source: "/images/:path*", destination: `${fileServerBaseURL}/images/:path*` },
      { source: "/cover/:path*", destination: `${fileServerBaseURL}/cover/:path*` },
      { source: "/album_covers/:path*", destination: `${fileServerBaseURL}/album_covers/:path*` },
      { source: "/mv_cover/:path*", destination: `${fileServerBaseURL}/mv_cover/:path*` },
      { source: "/mega/:path*", destination: `${fileServerBaseURL}/mega/:path*` },
      { source: "/icons/:path*", destination: `${fileServerBaseURL}/icons/:path*` },
      { source: "/profiles/:path*", destination: `${fileServerBaseURL}/profiles/:path*` },
      { source: "/default/:path*", destination: `${fileServerBaseURL}/default/:path*` },
      { source: "/storage/:path*", destination: `${fileServerBaseURL}/storage/:path*` },
      { source: "/users/:path*", destination: `${fileServerBaseURL}/users/:path*` },
      { source: "/audio/:path*", destination: `${fileServerBaseURL}/audio/:path*` },
      { source: "/mp3/:path*", destination: `${fileServerBaseURL}/mp3/:path*` },
      { source: "/mega-prod-public/:path*", destination: `${fileServerBaseURL}/:path*` },
      { source: "/tranlation/:path*", destination: `${apiUrl}/translation/:path*` },
      { source: "/uploads/:path*", destination: `${apiUrl}/upload/:path*` },
      { source: "/upload/storage", destination: `${apiUrl}/upload/storage` },
      { source: "/upload/chunk/init", destination: `${apiUrl}/upload/chunk/init` },
      { source: "/upload/chunk", destination: `${apiUrl}/upload/chunk` },
      { source: "/upload/chunk/complete", destination: `${apiUrl}/upload/chunk/complete` },
      { source: "/file-proxy/:path*", destination: `${apiUrl}/:path*` },
      ],
    };
  },

  images: {
    remotePatterns: [
      { protocol: "https", hostname: hostName, pathname: "**" },
      {
        protocol: "https",
        hostname: new URL(fileServerBaseURL).hostname,
        pathname: "**",
      },
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
