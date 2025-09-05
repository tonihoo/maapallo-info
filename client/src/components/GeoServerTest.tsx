import React, { useState } from "react";
import {
  Box,
  Button,
  Typography,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Chip,
} from "@mui/material";

interface TestResult {
  layer: string;
  status: "loading" | "success" | "error";
  features?: number;
  loadTime?: number;
  error?: string;
  sampleData?: unknown[];
}

interface CacheStats {
  legacy: number;
  loading: number;
  geoServer: { cached: number; loading: number };
}

const GeoServerTest: React.FC = () => {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
  const [isTestRunning, setIsTestRunning] = useState(false);

  const testLayers = [
    "/data/adult_literacy.geojson",
    "/data/pop_density_by_country_2022_num.geojson",
    "/data/intact-forest-landscapes-simplified-2020.geojson",
    "/data/finnish_cities.geojson",
  ];

  const runTests = async () => {
    setIsTestRunning(true);
    setTestResults([]);

    try {
      // Import the service functions directly instead of the hook
      const geoServerModule = await import("../services/geoServerService");
      const { GeoServerService, getLayerDataFunction, getLayerData } =
        geoServerModule;

      const results: TestResult[] = [];

      for (const layer of testLayers) {
        const startTime = performance.now();

        try {
          results.push({
            layer,
            status: "loading",
          });
          setTestResults([...results]);

          // Try to use the service directly
          let data;
          if (
            getLayerDataFunction &&
            typeof getLayerDataFunction === "function"
          ) {
            data = await getLayerDataFunction(layer);
          } else if (
            GeoServerService &&
            typeof GeoServerService.getLayerData === "function"
          ) {
            data = await GeoServerService.getLayerData(layer);
          } else if (getLayerData && typeof getLayerData === "function") {
            data = await getLayerData(layer);
          } else {
            // Fallback to direct fetch
            const response = await fetch(layer);
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            data = await response.json();
          }

          const endTime = performance.now();
          const loadTime = Math.round(endTime - startTime);

          results[results.length - 1] = {
            layer,
            status: "success",
            features: data.features.length,
            loadTime,
            sampleData: data.features.slice(0, 1), // First feature as sample
          };
        } catch (error) {
          const endTime = performance.now();
          const loadTime = Math.round(endTime - startTime);

          results[results.length - 1] = {
            layer,
            status: "error",
            loadTime,
            error: error instanceof Error ? error.message : String(error),
          };
        }

        setTestResults([...results]);
      }

      // Get cache stats
      try {
        const { getCacheStatsFunction } = geoServerModule;
        if (
          getCacheStatsFunction &&
          typeof getCacheStatsFunction === "function"
        ) {
          const stats = getCacheStatsFunction();
          setCacheStats({
            legacy: 0,
            loading: 0,
            geoServer: stats,
          });
        } else if (
          GeoServerService &&
          typeof GeoServerService.getCacheStats === "function"
        ) {
          const stats = GeoServerService.getCacheStats();
          setCacheStats({
            legacy: 0,
            loading: 0,
            geoServer: stats,
          });
        }
      } catch (error) {
        console.warn("Could not get cache stats:", error);
      }
    } catch (error) {
      console.error("Failed to run tests:", error);
    } finally {
      setIsTestRunning(false);
    }
  };

  const clearCache = async () => {
    try {
      const geoServerModule = await import("../services/geoServerService");
      const {
        GeoServerService,
        clearCacheFunction,
        clearCache: clearGeoServerCache,
      } = geoServerModule;

      if (clearCacheFunction && typeof clearCacheFunction === "function") {
        clearCacheFunction();
      } else if (
        GeoServerService &&
        typeof GeoServerService.clearCache === "function"
      ) {
        GeoServerService.clearCache();
      } else if (
        clearGeoServerCache &&
        typeof clearGeoServerCache === "function"
      ) {
        clearGeoServerCache();
      }

      setCacheStats(null);
      setTestResults([]);
      console.info("Cache cleared successfully");
    } catch (error) {
      console.error("Failed to clear cache:", error);
    }
  };

  return (
    <Box sx={{ maxWidth: 800, margin: "auto", p: 2 }}>
      <Typography variant="h5" gutterBottom>
        GeoServer Integration Test
      </Typography>

      <Box sx={{ mb: 2, display: "flex", gap: 2 }}>
        <Button
          variant="contained"
          onClick={runTests}
          disabled={isTestRunning}
          startIcon={isTestRunning ? <CircularProgress size={20} /> : undefined}
        >
          {isTestRunning ? "Running Tests..." : "Run Tests"}
        </Button>
        <Button variant="outlined" onClick={clearCache}>
          Clear Cache
        </Button>
      </Box>

      {cacheStats && (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Cache Statistics
            </Typography>
            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
              <Chip label={`Legacy Cache: ${cacheStats.legacy} items`} />
              <Chip
                label={`Loading: ${cacheStats.loading} requests`}
                color="primary"
              />
              <Chip
                label={`GeoServer Cache: ${cacheStats.geoServer.cached} items`}
                color="secondary"
              />
              <Chip
                label={`GeoServer Loading: ${cacheStats.geoServer.loading} requests`}
                color="info"
              />
            </Box>
          </CardContent>
        </Card>
      )}

      {testResults.map((result, index) => (
        <Card key={index} sx={{ mb: 2 }}>
          <CardContent>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                mb: 1,
              }}
            >
              <Typography variant="h6">{result.layer}</Typography>
              {result.status === "loading" && <CircularProgress size={20} />}
              {result.status === "success" && (
                <Chip label="Success" color="success" />
              )}
              {result.status === "error" && (
                <Chip label="Error" color="error" />
              )}
            </Box>

            {result.loadTime && (
              <Typography variant="body2" color="text.secondary">
                Load time: {result.loadTime}ms
              </Typography>
            )}

            {result.features !== undefined && (
              <Typography variant="body2" color="text.secondary">
                Features loaded: {result.features}
              </Typography>
            )}

            {result.error && (
              <Alert severity="error" sx={{ mt: 1 }}>
                {result.error}
              </Alert>
            )}

            {result.sampleData && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Sample Feature:
                </Typography>
                <Box
                  sx={{
                    backgroundColor: "grey.100",
                    p: 1,
                    borderRadius: 1,
                    fontSize: "0.8rem",
                    fontFamily: "monospace",
                    overflow: "auto",
                    maxHeight: 200,
                  }}
                >
                  <pre>{JSON.stringify(result.sampleData[0], null, 2)}</pre>
                </Box>
              </Box>
            )}
          </CardContent>
        </Card>
      ))}
    </Box>
  );
};

export default GeoServerTest;
