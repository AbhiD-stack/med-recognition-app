/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };

    if (isServer) {
      config.externals = [...(config.externals || []), 'onnxruntime-web'];
    }

    return config;
  },
};

export default nextConfig;