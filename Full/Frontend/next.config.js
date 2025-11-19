/** @type {import('next').NextConfig} */
const nextConfig = {
  // React Strict Mode 활성화
  reactStrictMode: true,

  devIndicators: {
    allowedDevOrigins: [
      'subnotational-unmodified-myrl.ngrok-free.dev', 
      'preactive-beryline-despina.ngrok-free.dev']
  },

  // 이미지 최적화 설정
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },

  // 환경 변수 (클라이언트에서 접근 가능)
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },

  // Webpack 설정 (필요시)
  webpack: (config, { isServer }) => {
    // SVG를 React 컴포넌트로 import 가능하게
    config.module.rules.push({
      test: /\.svg$/,
      use: ['@svgr/webpack'],
    });

    return config;
  },

  // 실험적 기능 (선택사항)
  experimental: {
    // 서버 액션 활성화
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },

  // 리다이렉트 설정 (선택사항)
  async redirects() {
    return [
      // 예시: /admin → /admin/dashboard
      // {
      //   source: '/admin',
      //   destination: '/dashboard',
      //   permanent: false,
      // },
    ];
  },

  // 헤더 설정 (CORS 등)
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'X-Requested-With, Content-Type, Authorization' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;