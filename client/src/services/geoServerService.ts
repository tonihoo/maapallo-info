// Type for GeoJSON FeatureCollection
export interface GeoJsonData {
  type: "FeatureCollection";
  features: unknown[];
}

// GeoServer configuration
// GeoServer configuration with environment detection
const getGeoServerBaseUrl = (): string => {
  // In Docker environment, use internal service name
  if (typeof window === "undefined") {
    // Server-side rendering - use env variable or default
    const env =
      typeof process !== "undefined" && process.env ? process.env : {};
    return env.REACT_APP_GEOSERVER_URL || "http://geoserver:8080/geoserver";
  }

  // Client-side: check if we're running in Docker or local development
  const hostname = window.location.hostname;
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    // Local development - use localhost
    const env =
      typeof process !== "undefined" && process.env ? process.env : {};
    return env.REACT_APP_GEOSERVER_URL || "http://localhost:8081/geoserver";
  }

  // Production or Docker - use environment variable or relative path
  const env = typeof process !== "undefined" && process.env ? process.env : {};
  return env.REACT_APP_GEOSERVER_URL || "/geoserver";
};

// Lazy-loaded configuration to avoid initialization issues
const getGeoServerConfig = () => ({
  baseUrl: getGeoServerBaseUrl(),
  workspace: "maapallo",
  version: "1.0.0",
});

// Feature flag: allow disabling GeoServer usage in dev to avoid noisy errors
const isGeoServerDisabled = (): boolean => {
  const env = typeof process !== "undefined" && process.env ? process.env : {};
  // If REACT_APP_DISABLE_GEOSERVER is set to '1' or 'true', skip GeoServer
  const val = (env.REACT_APP_DISABLE_GEOSERVER || "").toString().toLowerCase();
  return val === "1" || val === "true";
};

// Optional mapping from legacy static file paths to GeoServer layer names.
// Note: Static fallbacks are no longer used. These aliases exist only to ease
// the transition from legacy code that referenced /data/*.geojson URLs.
const LAYER_MAPPING: Record<string, string> = {
  "/data/adult_literacy.geojson": "adult_literacy",
  "/data/pop_density_by_country_2022_num.geojson":
    "pop_density_by_country_2022_num",
  "/data/intact-forest-landscapes-simplified-2020.geojson": "intact_forests",
  "/data/finnish_cities.geojson": "finnish_cities",
  "/data/world.geojson": "world",
};

// Cache for GeoServer responses
const geoServerCache = new Map<string, GeoJsonData>();
const loadingPromises = new Map<string, Promise<GeoJsonData>>();

/**
 * Constructs a GeoServer WFS URL for fetching features
 */
function buildWfsUrl(
  layerName: string,
  additionalParams: Record<string, string> = {}
): string {
  const config = getGeoServerConfig();
  const baseParams = {
    service: "WFS",
    version: config.version,
    request: "GetFeature",
    typeName: `${config.workspace}:${layerName}`,
    // Use a widely compatible outputFormat for GeoJSON
    // GeoServer accepts 'application/json' or 'application/json; subtype=geojson'
    outputFormat: "application/json",
  };

  const allParams = { ...baseParams, ...additionalParams };
  const queryString = Object.entries(allParams)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join("&");

  // Important: WFS endpoint should NOT include the workspace path segment.
  // Use /geoserver/wfs (or /geoserver/ows) and pass workspace in typeName (workspace:layer)
  // e.g. http://localhost:8081/geoserver/wfs?service=WFS&...&typeName=maapallo:world
  return `${config.baseUrl}/wfs?${queryString}`;
}

/**
 * Fetches GeoJSON data from GeoServer WFS service
 */
async function fetchFromGeoServer(
  layerName: string,
  params: Record<string, string> = {}
): Promise<GeoJsonData> {
  if (isGeoServerDisabled()) {
    throw new Error("GeoServer disabled by REACT_APP_DISABLE_GEOSERVER");
  }
  const cacheKey = `${layerName}-${JSON.stringify(params)}`;

  // Return cached data if available
  if (geoServerCache.has(cacheKey)) {
    console.info(`✅ Using cached GeoServer data for ${layerName}`);
    return geoServerCache.get(cacheKey) as GeoJsonData;
  }

  // Return existing promise if already loading
  if (loadingPromises.has(cacheKey)) {
    console.info(`⏳ Waiting for existing GeoServer request for ${layerName}`);
    return loadingPromises.get(cacheKey) as Promise<GeoJsonData>;
  }

  // Start new fetch
  const url = buildWfsUrl(layerName, params);

  const fetchPromise = fetch(url)
    .then(async (response) => {
      if (!response.ok) {
        // Try to read server message for diagnostics
        const text = await response.text().catch(() => "");
        throw new Error(
          `GeoServer HTTP error ${response.status} for layer ${layerName}. ${text?.slice(0, 200)}`
        );
      }

      // Ensure Content-Type is JSON; if XML (ExceptionReport), surface a clear error
      const ct = (response.headers.get("content-type") || "").toLowerCase();
      if (!ct.includes("application/json") && !ct.includes("json")) {
        const text = await response.text();
        throw new Error(
          `GeoServer returned non-JSON (${ct}) for layer ${layerName}. First bytes: ${text.slice(0, 120)}`
        );
      }

      const data = await response.json();

      // Validate GeoJSON structure
      if (
        !data ||
        data.type !== "FeatureCollection" ||
        !Array.isArray(data.features)
      ) {
        throw new Error(`Invalid GeoJSON response for layer: ${layerName}`);
      }

      geoServerCache.set(cacheKey, data);
      loadingPromises.delete(cacheKey);
      console.info(
        `✅ Loaded and cached GeoServer layer: ${layerName} (${data.features.length} features)`
      );
      return data;
    })
    .catch((error) => {
      loadingPromises.delete(cacheKey);
      // Use warn to avoid noisy red errors when fallback is available
      console.warn(`❌ Failed to load GeoServer layer ${layerName}:`, error);
      throw error;
    });

  loadingPromises.set(cacheKey, fetchPromise);
  return fetchPromise;
}

/**
 * Main service class for GeoServer integration
 */
export class GeoServerService {
  /**
   * Fetches layer data from GeoServer, with fallback to static files for development
   */
  static async getLayerData(
    urlOrLayerName: string,
    params: Record<string, string> = {}
  ): Promise<GeoJsonData> {
    // Check if this is a mapped static file path
    const geoServerLayerName = LAYER_MAPPING[urlOrLayerName];

    if (geoServerLayerName) {
      // Always use GeoServer for layers; no static fallback
      if (isGeoServerDisabled()) {
        throw new Error(
          `GeoServer disabled by REACT_APP_DISABLE_GEOSERVER (cannot fetch '${geoServerLayerName}')`
        );
      }
      return await fetchFromGeoServer(geoServerLayerName, params);
    }

    // If not a mapped layer, treat as direct layer name
    if (!urlOrLayerName.startsWith("/") && !urlOrLayerName.startsWith("http")) {
      if (isGeoServerDisabled()) {
        throw new Error(
          `GeoServer disabled and no static fallback available for layer name '${urlOrLayerName}'.`
        );
      }
      return await fetchFromGeoServer(urlOrLayerName, params);
    }

    // For absolute/relative URLs that are not known GeoServer layers, static
    // fetches are no longer supported for map layers.
    throw new Error(
      `Static file fetches are disabled for map layers ('${urlOrLayerName}'). Use GeoServer layer names instead.`
    );
  }

  /**
   * Gets features for a specific bounding box (useful for performance)
   */
  static async getLayerDataByBbox(
    layerName: string,
    bbox: [number, number, number, number],
    crs = "EPSG:4326"
  ): Promise<GeoJsonData> {
    const bboxParam = bbox.join(",");
    return this.getLayerData(layerName, {
      bbox: bboxParam,
      srsName: crs,
    });
  }

  /**
   * Gets features with a CQL filter for advanced filtering
   */
  static async getLayerDataWithFilter(
    layerName: string,
    cqlFilter: string
  ): Promise<GeoJsonData> {
    return this.getLayerData(layerName, {
      cql_filter: cqlFilter,
    });
  }

  /**
   * Gets limited number of features (useful for performance testing)
   */
  static async getLayerDataLimited(
    layerName: string,
    maxFeatures: number
  ): Promise<GeoJsonData> {
    return this.getLayerData(layerName, {
      maxFeatures: maxFeatures.toString(),
    });
  }

  /**
   * Clears the cache for a specific layer or all layers
   */
  static clearCache(layerName?: string): void {
    if (layerName) {
      // Clear cache for specific layer (all variants)
      const keysToDelete = Array.from(geoServerCache.keys()).filter((key) =>
        key.startsWith(`${layerName}-`)
      );
      keysToDelete.forEach((key) => geoServerCache.delete(key));
      console.info(`✅ Cleared cache for layer: ${layerName}`);
    } else {
      // Clear all cache
      geoServerCache.clear();
      loadingPromises.clear();
      console.info("✅ Cleared all GeoServer cache");
    }
  }

  /**
   * Gets cache statistics
   */
  static getCacheStats(): { cached: number; loading: number } {
    return {
      cached: geoServerCache.size,
      loading: loadingPromises.size,
    };
  }
}

// Individual functions for easier dynamic import (not dependent on class during initialization)
export const getLayerDataFunction = async (
  urlOrLayerName: string,
  params: Record<string, string> = {}
): Promise<GeoJsonData> => {
  // Check if this is a mapped static file path
  const geoServerLayerName = LAYER_MAPPING[urlOrLayerName];

  if (geoServerLayerName) {
    if (isGeoServerDisabled()) {
      throw new Error(
        `GeoServer disabled by REACT_APP_DISABLE_GEOSERVER (cannot fetch '${geoServerLayerName}')`
      );
    }
    return await fetchFromGeoServer(geoServerLayerName, params);
  }

  // If not a mapped layer, treat as direct layer name
  if (!urlOrLayerName.startsWith("/") && !urlOrLayerName.startsWith("http")) {
    if (isGeoServerDisabled()) {
      throw new Error(
        `GeoServer disabled and no static fallback available for layer name '${urlOrLayerName}'.`
      );
    }
    return await fetchFromGeoServer(urlOrLayerName, params);
  }

  // Static file fetches are disabled for map layers
  throw new Error(
    `Static file fetches are disabled for map layers ('${urlOrLayerName}'). Use GeoServer layer names instead.`
  );
};

export const clearCacheFunction = (layerName?: string): void => {
  if (layerName) {
    // Clear cache for specific layer (all variants)
    const keysToDelete = Array.from(geoServerCache.keys()).filter((key) =>
      key.startsWith(`${layerName}-`)
    );
    keysToDelete.forEach((key) => geoServerCache.delete(key));
    console.info(`✅ Cleared cache for layer: ${layerName}`);
  } else {
    // Clear all cache
    geoServerCache.clear();
    loadingPromises.clear();
    console.info("✅ Cleared all GeoServer cache");
  }
};

export const getCacheStatsFunction = (): {
  cached: number;
  loading: number;
} => {
  return {
    cached: geoServerCache.size,
    loading: loadingPromises.size,
  };
};

// Also export individual functions for easier dynamic import (keeping old names for compatibility)
export const getLayerData = getLayerDataFunction;
export const clearCache = clearCacheFunction;
export const getCacheStats = getCacheStatsFunction;

// Default export for the service
export default GeoServerService;
