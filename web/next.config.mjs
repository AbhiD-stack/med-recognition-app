/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['onnxruntime-web'],
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config, { isServer }) => {
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };

    config.module.rules.push({
      test: /\.mjs$/,
      include: /node_modules\/onnxruntime-web/,
      type: 'javascript/auto',
    });

    if (isServer) {
      config.externals = [...(config.externals || []), 'onnxruntime-web'];
    }

    return config;
  },
};

export default nextConfig;