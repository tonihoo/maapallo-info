import * as Cesium from "cesium";

// Set Cesium configuration properly for Webpack build
// The CESIUM_BASE_URL is defined in webpack.config.js
declare const CESIUM_BASE_URL: string;

export const initializeCesiumConfig = () => {
  // Set up Cesium base URL
  if (typeof window !== "undefined") {
    try {
      // Set the base URL for Cesium
      (window as any).CESIUM_BASE_URL =
        typeof CESIUM_BASE_URL !== "undefined"
          ? CESIUM_BASE_URL
          : "/node_modules/cesium/Build/Cesium/";
    } catch (error) {
      console.warn("Could not set CESIUM_BASE_URL:", error);
      (window as any).CESIUM_BASE_URL = "/node_modules/cesium/Build/Cesium/";
    }
  }

  // Get Cesium Ion token from environment variable
  const CESIUM_ION_TOKEN = process.env.CESIUM_ION_TOKEN;

  if (
    !CESIUM_ION_TOKEN ||
    CESIUM_ION_TOKEN === "YOUR_NEW_CESIUM_ION_TOKEN_HERE"
  ) {
    console.warn(
      "Warning: Cesium Ion token not set in .env file. Satellite imagery may not load properly."
    );
    console.warn(
      "Please add CESIUM_ION_TOKEN to your .env file with your token from https://cesium.com/ion/tokens"
    );
  }

  // Set the Cesium Ion access token
  if (
    CESIUM_ION_TOKEN &&
    CESIUM_ION_TOKEN !== "YOUR_NEW_CESIUM_ION_TOKEN_HERE"
  ) {
    Cesium.Ion.defaultAccessToken = CESIUM_ION_TOKEN;
  }
};

// Performance-optimized Cesium viewer options
export const OPTIMIZED_CESIUM_OPTIONS = {
  animation: false,
  baseLayerPicker: false,
  fullscreenButton: false,
  vrButton: false,
  geocoder: false,
  homeButton: false,
  infoBox: false,
  sceneModePicker: false,
  selectionIndicator: false,
  timeline: false,
  navigationHelpButton: false,
  navigationInstructionsInitiallyVisible: false,
  scene3DOnly: false, // Allow 2D/3D switching to manage memory usage
  requestRenderMode: true, // Only render when needed
  maximumRenderTimeChange: Infinity, // Disable automatic LOD adjustment
  // High quality settings for crisp rendering
  resolutionScale: 1.0, // Full resolution for best quality
  // WebGL context optimization
  contextOptions: {
    webgl: {
      alpha: false, // Disable alpha channel to improve performance
      antialias: true, // Enable antialiasing for smoother edges
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
      failIfMajorPerformanceCaveat: false,
    },
  },
};

export const INITIAL_CAMERA = {
  position: { longitude: 44.0, latitude: 10.0, height: 16000000 },
  orientation: { heading: 0.0, pitch: -Cesium.Math.PI_OVER_TWO, roll: 0.0 },
};

export const LIMITS_AND_DURATIONS = {
  zoom: {
    min: 1000,
    max: 50000000,
  },
  animation: {
    zoom: 1.0,
    tilt: 0.5,
    rotate: 0.5,
    home: 2.0,
  },
  visibility: {
    threshold: 0.2, // More strict threshold for hemisphere visibility
  },
};
