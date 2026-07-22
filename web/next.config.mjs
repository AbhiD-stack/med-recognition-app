/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['onnxruntime-web'],
  webpack: (config, { isServer }) => {
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };

    // Exclude onnxruntime-web from being parsed/minified if it triggers parser errors
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