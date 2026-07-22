/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Enable async WebAssembly
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };

    // If ONNX runtime tries to bundle server-side, fallback to prevent SSR errors
    if (isServer) {
      config.externals = [...(config.externals || []), 'onnxruntime-web'];
    }

    return config;
  },
};

export default nextConfig;

import dynamic from 'next/dynamic';

// Example for loading your model component or runner only on the client
const ModelRunner = dynamic(() => import('@/components/ModelRunner'), {
  ssr: false,
});