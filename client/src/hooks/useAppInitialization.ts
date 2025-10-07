import { useEffect } from "react";
import { useAppDispatch } from "../store/hooks";
import { verifyStoredToken } from "../store/slices/authSlice";
import { fetchAllFeatures } from "../store/slices/featuresSlice";
import {
  setCesiumComponent,
  setCesiumPreloaded,
} from "../store/slices/mapSlice";
import { analytics } from "../utils/analytics";

export function useAppInitialization(refreshTrigger: number) {
  const dispatch = useAppDispatch();

  // Background preload Cesium after initial render
  useEffect(() => {
    const preloadCesium = async () => {
      try {
        // Preload Cesium module in the background
        const cesiumModule = await import("../components/3d/CesiumMap");
        dispatch(setCesiumComponent(cesiumModule.CesiumMap));
        dispatch(setCesiumPreloaded(true));
      } catch (error) {
        console.warn("⚠️ Cesium preload failed (will load on demand):", error);
      }
    };

    // Start preloading after a short delay to not interfere with initial page load
    const timer = setTimeout(preloadCesium, 2000);
    return () => clearTimeout(timer);
  }, [dispatch]);

  // Initialize authentication on app start
  useEffect(() => {
    dispatch(verifyStoredToken());
  }, [dispatch]);

  // Track initial page view if analytics is enabled
  useEffect(() => {
    if (analytics.isEnabled()) {
      analytics.trackPageView("/");
    }
  }, []);

  // Fetch features when refresh trigger changes
  useEffect(() => {
    dispatch(fetchAllFeatures());
  }, [dispatch, refreshTrigger]);
}
