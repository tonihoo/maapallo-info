const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { DefinePlugin } = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';

  return {
    entry: './src/index.tsx',
    mode: isProduction ? 'production' : 'development',

    // Add devtool for better debugging in development
    devtool: isProduction ? 'source-map' : 'eval-source-map',

    // Configure dev server for HMR
    devServer: {
      static: {
        directory: path.join(__dirname, 'dist'),
      },
      port: 8080,
      host: '0.0.0.0',
      hot: true, // Enable Hot Module Replacement
      liveReload: true, // Enable live reloading
      watchFiles: ['src/**/*'], // Watch for changes in src directory
      open: false,
      historyApiFallback: true,
      allowedHosts: 'all',
      proxy: [
        {
          context: ['/api'],
          target: 'http://server:3003',
          changeOrigin: true,
          secure: false,
        },
      ],
      client: {
        webSocketURL: 'ws://localhost:8080/ws', // Ensure WebSocket connection works
        overlay: {
          errors: true,
          warnings: false,
        },
      },
    },

    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: isProduction ? '[name].[contenthash].js' : '[name].js',
      clean: true,
      publicPath: '/',
    },

    resolve: {
      extensions: ['.tsx', '.ts', '.js', '.jsx'],
    },

    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: [
            {
              loader: 'ts-loader',
              options: {
                transpileOnly: true, // Faster compilation for development
                compilerOptions: {
                  module: 'esnext',
                },
              },
            },
          ],
          exclude: /node_modules/,
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader'],
        },
        {
          test: /\.(png|jpg|jpeg|gif|svg|ico)$/,
          type: 'asset/resource',
        },
        {
          test: /\.(woff|woff2|eot|ttf|otf)$/,
          type: 'asset/resource',
        },
      ],
    },

    plugins: [
      new HtmlWebpackPlugin({
        template: './index.html',
        inject: true,
      }),

      new DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify(isProduction ? 'production' : 'development'),
        'process.env.CESIUM_ION_TOKEN': JSON.stringify(process.env.CESIUM_ION_TOKEN || ''),
        'CESIUM_BASE_URL': JSON.stringify('/cesium/'),
      }),

      new CopyWebpackPlugin({
        patterns: [
          {
            from: path.join(__dirname, 'node_modules/cesium/Build/Cesium/Workers'),
            to: 'cesium/Workers',
          },
          {
            from: path.join(__dirname, 'node_modules/cesium/Build/Cesium/ThirdParty'),
            to: 'cesium/ThirdParty',
          },
          {
            from: path.join(__dirname, 'node_modules/cesium/Build/Cesium/Assets'),
            to: 'cesium/Assets',
          },
          {
            from: path.join(__dirname, 'node_modules/cesium/Build/Cesium/Widgets'),
            to: 'cesium/Widgets',
          },
        ],
      }),
    ],

    // Optimization settings
    optimization: {
      splitChunks: isProduction ? {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
          cesium: {
            test: /[\\/]node_modules[\\/]cesium[\\/]/,
            name: 'cesium',
            chunks: 'all',
          },
        },
      } : false,
    },

    // Performance hints
    performance: {
      hints: isProduction ? 'warning' : false,
      maxAssetSize: 2000000,
      maxEntrypointSize: 2000000,
    },
  };
};
