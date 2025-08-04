const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const webpack = require('webpack');

const cesiumSource = 'node_modules/cesium/Build/Cesium';
const cesiumBaseUrl = 'cesiumStatic';

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';

  return {
    entry: './src/index.tsx',
    mode: isProduction ? 'production' : 'development',
    devtool: isProduction ? 'source-map' : 'eval-source-map',
    
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: isProduction ? '[name].[contenthash].js' : '[name].js',
      publicPath: '/',
      clean: true,
    },

    resolve: {
      extensions: ['.tsx', '.ts', '.js', '.jsx'],
      fallback: {
        // Webpack 5 doesn't include Node.js polyfills by default
        "https": false,
        "zlib": false,
        "http": false,
        "url": false
      }
    },

    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: 'ts-loader',
          exclude: /node_modules/,
        },
        {
          test: /\.css$/i,
          use: ['style-loader', 'css-loader'],
        },
        {
          test: /\.(png|svg|jpg|jpeg|gif|ico)$/i,
          type: 'asset/resource',
        },
        {
          test: /\.(woff|woff2|eot|ttf|otf)$/i,
          type: 'asset/resource',
        },
        // Handle Cesium's assets
        {
          test: /\.js$/,
          enforce: 'pre',
          include: path.resolve(__dirname, cesiumSource),
          use: {
            loader: 'strip-pragma-loader',
            options: {
              pragmas: {
                debug: false
              }
            }
          }
        }
      ],
    },

    plugins: [
      new HtmlWebpackPlugin({
        template: './index.html',
        filename: 'index.html',
      }),
      
      // Define global variables for Cesium
      new webpack.DefinePlugin({
        CESIUM_BASE_URL: JSON.stringify(`/${cesiumBaseUrl}/`),
        'process.env.CESIUM_ION_TOKEN': JSON.stringify(process.env.CESIUM_ION_TOKEN || ''),
        'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
      }),
      
      // Copy Cesium assets
      new CopyWebpackPlugin({
        patterns: [
          { from: path.join(cesiumSource, 'Workers'), to: path.join(cesiumBaseUrl, 'Workers') },
          { from: path.join(cesiumSource, 'ThirdParty'), to: path.join(cesiumBaseUrl, 'ThirdParty') },
          { from: path.join(cesiumSource, 'Assets'), to: path.join(cesiumBaseUrl, 'Assets') },
          { from: path.join(cesiumSource, 'Widgets'), to: path.join(cesiumBaseUrl, 'Widgets') },
          { from: './public/favicon.ico', to: 'favicon.ico' },
          { from: './public/data', to: 'data' },
          { from: './public/images', to: 'images' },
        ],
      }),
    ],

    optimization: {
      splitChunks: {
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
            priority: 10,
          },
          mui: {
            test: /[\\/]node_modules[\\/]@mui[\\/]/,
            name: 'mui',
            chunks: 'all',
            priority: 5,
          },
          react: {
            test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
            name: 'react',
            chunks: 'all',
            priority: 5,
          },
        },
      },
    },

    devServer: {
      static: {
        directory: path.join(__dirname, 'public'),
      },
      historyApiFallback: true,
      host: '0.0.0.0',
      port: 8080,
      hot: true,
      proxy: [
        {
          context: ['/api'],
          target: 'http://server:3003',
          changeOrigin: true,
          secure: false,
          logLevel: 'debug',
        },
      ],
    },

    // Performance hints
    performance: {
      maxAssetSize: 10000000, // 10MB - Cesium is large
      maxEntrypointSize: 10000000,
    },
  };
};
