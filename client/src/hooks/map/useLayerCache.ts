import { useRef, useCallback } from "react";

// Type for GeoJSON FeatureCollection
interface GeoJsonData {
  type: "FeatureCollection";
  features: unknown[];
}

// Simple in-memory cache for GeoJSON data
const geoJsonCache = new Map<string, GeoJsonData>();

export function useLayerCache() {
  const loadingRef = useRef<Map<string, Promise<GeoJsonData>>>(new Map());

  const getCachedGeoJson = useCallback(
    async (url: string): Promise<GeoJsonData> => {
      // Return cached data if available
      if (geoJsonCache.has(url)) {
        console.info(`✅ Using cached data for ${url}`);
        return geoJsonCache.get(url);
      }

      // Return existing promise if already loading
      if (loadingRef.current.has(url)) {
        console.info(`⏳ Waiting for existing request for ${url}`);
        return loadingRef.current.get(url);
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

  const clearCache = useCallback(() => {
    geoJsonCache.clear();
    loadingRef.current.clear();
  }, []);

  return {
    getCachedGeoJson,
    preloadGeoJson,
    clearCache,
  };
}
