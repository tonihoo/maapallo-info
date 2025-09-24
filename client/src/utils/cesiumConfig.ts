import * as Cesium from "cesium";
import { env } from "./env";

// Set Cesium configuration properly for Webpack build
// The CESIUM_BASE_URL is defined in webpack.config.js
declare const CESIUM_BASE_URL: string;

export const initializeCesiumConfig = () => {
  // Set up Cesium base URL
  if (typeof window !== "undefined") {
    const w = window as unknown as { CESIUM_BASE_URL?: string } & Window;
    try {
      // Set the base URL for Cesium
      w.CESIUM_BASE_URL =
        typeof CESIUM_BASE_URL !== "undefined"
          ? CESIUM_BASE_URL
          : "/node_modules/cesium/Build/Cesium/";
    } catch (error) {
      console.warn("Could not set CESIUM_BASE_URL:", error);
      w.CESIUM_BASE_URL = "/node_modules/cesium/Build/Cesium/";
    }

    // Fix Canvas2D performance warnings by monkey-patching getContext
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      contextType: string,
      options?: CanvasRenderingContext2DSettings | WebGLContextAttributes
    ) {
      if (contextType === "2d" && options === undefined) {
        // Add willReadFrequently option for 2D contexts to suppress performance warnings
        return originalGetContext.call(this, contextType, {
          willReadFrequently: true,
        });
      }
      return originalGetContext.call(this, contextType, options);
    };
  }

  // Get Cesium Ion token from environment variable (webpack DefinePlugin injects this)
  const CESIUM_ION_TOKEN =
    process.env.CESIUM_ION_TOKEN || env("CESIUM_ION_TOKEN", "");

  // Set the Cesium Ion access token (build-time) or fetch from server at runtime
  const setToken = (token: string) => {
    if (
      token &&
      token !== "YOUR_NEW_CESIUM_ION_TOKEN_HERE" &&
      token.length > 10
    ) {
      Cesium.Ion.defaultAccessToken = token;
      return true;
    }
    return false;
  };

  // Try to set token immediately if available
  const tokenSet = setToken(CESIUM_ION_TOKEN);

  if (!tokenSet) {
    // Fetch token from server if not provided at build time
    fetch("/api/v1/config/public")
      .then((r) => (r.ok ? r.json() : { cesiumIonToken: "" }))
      .then((cfg) => {
        const serverToken = cfg?.cesiumIonToken;
        const serverTokenSet = serverToken ? setToken(serverToken) : false;

        // Only show warnings if no token was found anywhere
        if (!serverTokenSet && process.env.NODE_ENV === "development") {
          console.info(
            "Cesium Ion token not configured. Using default imagery."
          );
        }
      })
      .catch(() => {
        // Only show warning in development if no token at all
        if (!CESIUM_ION_TOKEN && process.env.NODE_ENV === "development") {
          console.info(
            "Cesium Ion token not configured. Using default imagery."
          );
        }
      });
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
