import { useRef, useCallback } from "react";

// Type for GeoJSON FeatureCollection
interface GeoJsonData {
  type: "FeatureCollection";
  features: unknown[];
}

// Simple in-memory cache for GeoJSON data (legacy support)
const geoJsonCache = new Map<string, GeoJsonData>();

export function useLayerCache() {
  const loadingRef = useRef<Map<string, Promise<GeoJsonData>>>(new Map());

  const getCachedGeoJson = useCallback(
    async (url: string): Promise<GeoJsonData> => {
      console.log("getCachedGeoJson called with:", url);

      // Try to dynamically import GeoServerService to avoid circular dependency issues
      try {
        const geoServerModule = await import("../../services/geoServerService");
        console.log("GeoServerService module imported:", geoServerModule);

        // Try the individual function exports first (these don't have initialization issues)
        const { getLayerDataFunction } = geoServerModule;
        if (
          getLayerDataFunction &&
          typeof getLayerDataFunction === "function"
        ) {
          console.log("GeoServerService individual function available");
          return await getLayerDataFunction(url);
        }

        // Try the class method as fallback
        const { GeoServerService } = geoServerModule;
        if (
          GeoServerService &&
          typeof GeoServerService.getLayerData === "function"
        ) {
          console.log("GeoServerService class method available");
          return await GeoServerService.getLayerData(url);
        }

        // Try the compatibility function exports
        const { getLayerData } = geoServerModule;
        if (getLayerData && typeof getLayerData === "function") {
          console.log("GeoServerService compatibility function available");
          return await getLayerData(url);
        }

        throw new Error("No GeoServerService method found");
      } catch (error) {
        console.warn(
          "GeoServerService import failed, falling back to direct fetch:",
          error
        );

        // Fallback to direct fetch
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data;
      }
    },
    []
  );

  // Legacy function for backwards compatibility
  const getCachedGeoJsonLegacy = useCallback(
    async (url: string): Promise<GeoJsonData> => {
      // Return cached data if available
      if (geoJsonCache.has(url)) {
        console.info(`✅ Using cached data for ${url}`);
        return geoJsonCache.get(url) as GeoJsonData;
      }

      // Return existing promise if already loading
      if (loadingRef.current.has(url)) {
        console.info(`⏳ Waiting for existing request for ${url}`);
        return loadingRef.current.get(url) as Promise<GeoJsonData>;
      }

      // Start new fetch and cache the promise
      const fetchPromise = fetch(url)
        .then(async (response) => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const data = await response.json();
          geoJsonCache.set(url, data);
          loadingRef.current.delete(url);
          console.info(`✅ Loaded and cached ${url}`);
          return data;
        })
        .catch((error) => {
          loadingRef.current.delete(url);
          console.error(`❌ Failed to load ${url}:`, error);
          throw error;
        });

      loadingRef.current.set(url, fetchPromise);
      return fetchPromise;
    },
    []
  );

  const preloadGeoJson = useCallback(
    (urls: string | string[]) => {
      // Handle both single URL and array of URLs
      const urlArray = Array.isArray(urls) ? urls : [urls];
      // Start loading all URLs in parallel
      return Promise.allSettled(urlArray.map((url) => getCachedGeoJson(url)));
    },
    [getCachedGeoJson]
  );

  const clearCache = useCallback(async () => {
    geoJsonCache.clear();
    loadingRef.current.clear();

    try {
      const geoServerModule = await import("../../services/geoServerService");

      // Try the individual function exports first
      const { clearCacheFunction } = geoServerModule;
      if (clearCacheFunction && typeof clearCacheFunction === "function") {
        clearCacheFunction();
      } else {
        // Try the class method as fallback
        const { GeoServerService } = geoServerModule;
        if (
          GeoServerService &&
          typeof GeoServerService.clearCache === "function"
        ) {
          GeoServerService.clearCache();
        } else {
          // Try the compatibility function export
          const { clearCache: clearGeoServerCache } = geoServerModule;
          if (
            clearGeoServerCache &&
            typeof clearGeoServerCache === "function"
          ) {
            clearGeoServerCache();
          }
        }
      }
    } catch (error) {
      console.warn("Could not clear GeoServer cache:", error);
    }

    console.info("✅ Cleared all layer caches");
  }, []);

  return {
    getCachedGeoJson,
    getCachedGeoJsonLegacy,
    preloadGeoJson,
    clearCache,
    getCacheStats: async () => {
      try {
        const geoServerModule = await import("../../services/geoServerService");

        // Try the individual function exports first
        const { getCacheStatsFunction } = geoServerModule;
        if (
          getCacheStatsFunction &&
          typeof getCacheStatsFunction === "function"
        ) {
          return {
            legacy: geoJsonCache.size,
            loading: loadingRef.current.size,
            geoServer: getCacheStatsFunction(),
          };
        }

        // Try the class method as fallback
        const { GeoServerService } = geoServerModule;
        if (
          GeoServerService &&
          typeof GeoServerService.getCacheStats === "function"
        ) {
          return {
            legacy: geoJsonCache.size,
            loading: loadingRef.current.size,
            geoServer: GeoServerService.getCacheStats(),
          };
        }

        // Try the compatibility function export
        const { getCacheStats: getGeoServerCacheStats } = geoServerModule;
        if (
          getGeoServerCacheStats &&
          typeof getGeoServerCacheStats === "function"
        ) {
          return {
            legacy: geoJsonCache.size,
            loading: loadingRef.current.size,
            geoServer: getGeoServerCacheStats(),
          };
        }

        throw new Error("GeoServerService not available");
      } catch (error) {
        console.warn("Could not get GeoServer cache stats:", error);
        return {
          legacy: geoJsonCache.size,
          loading: loadingRef.current.size,
          geoServer: { cached: 0, loading: 0 },
        };
      }
    },
  };
}
