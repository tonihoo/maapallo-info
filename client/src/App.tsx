import { useState, useCallback, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Tooltip,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { Map } from "./components/2d/Map";
import FeatureList from "./components/common/FeatureList";
import { FeatureInfo } from "./components/common/FeatureInfo";
import { HeaderMenu } from "./components/common/HeaderMenu";
import { FeatureTypes } from "./types/featureTypes";
import { Feature, Geometry, GeoJsonProperties } from "geojson";

// Define the CesiumMap props interface to match what we're passing
interface CesiumMapProps {
  features: Feature<Geometry, GeoJsonProperties>[];
  selectedFeatureId?: number | null;
  onMapClick?: (coordinates: number[]) => void;
  onFeatureClick?: (featureId: number) => void;
}

export function App() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [selectedFeatureId, setSelectedFeatureId] = useState<number | null>(
    null
  );
  const [refreshTrigger] = useState(0);
  const [allFeatures, setAllFeatures] = useState<FeatureTypes[]>([]);
  const [is3DMode, setIs3DMode] = useState(false);
  const [cesiumPreloaded, setCesiumPreloaded] = useState(false);
  const [CesiumMapComponent, setCesiumMapComponent] =
    useState<React.ComponentType<CesiumMapProps> | null>(null);

  // Background preload Cesium after initial render
  useEffect(() => {
    const preloadCesium = async () => {
      try {
        console.log("🔄 Background preloading Cesium...");
        // Preload Cesium module in the background
        const cesiumModule = await import("./components/3d/CesiumMap");
        console.log("✅ Cesium preloaded successfully");
        setCesiumMapComponent(() => cesiumModule.CesiumMap);
        setCesiumPreloaded(true);
      } catch (error) {
        console.warn("⚠️ Cesium preload failed (will load on demand):", error);
      }
    };

    // Start preloading after a short delay to not interfere with initial page load
    const timer = setTimeout(preloadCesium, 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleMapClick = useCallback(() => {
    setSelectedFeatureId(null);
  }, []);

  const handleFeatureSelect = useCallback((id: number) => {
    setSelectedFeatureId(id);
  }, []);

  const handleFeatureInfoClose = useCallback(() => {
    setSelectedFeatureId(null);
  }, []);

  const toggleMapMode = useCallback(async () => {
    console.log("🔄 Toggling to 3D mode, preloaded:", cesiumPreloaded);

    // If switching to 3D mode and Cesium isn't loaded yet, load it now
    if (!cesiumPreloaded && !CesiumMapComponent) {
      try {
        console.log("🔄 Loading Cesium on demand...");
        const cesiumModule = await import("./components/3d/CesiumMap");
        setCesiumMapComponent(() => cesiumModule.CesiumMap);
        setCesiumPreloaded(true);
        console.log("✅ Cesium loaded on demand");
      } catch (error) {
        console.error("❌ Failed to load Cesium:", error);
        return; // Don't switch to 3D mode if loading failed
      }
    }

    setIs3DMode((prev) => !prev);
  }, [cesiumPreloaded, CesiumMapComponent]);

  useEffect(() => {
    const fetchAllFeatures = async () => {
      try {
        const response = await fetch("/api/v1/feature/");
        if (!response.ok) return;

        const data = await response.json();
        setAllFeatures(data.features || []);
      } catch (error) {
        console.error("Error fetching all features:", error);
      }
    };

    fetchAllFeatures();
  }, [refreshTrigger]);

  const createMapFeatures = (): Feature<Geometry, GeoJsonProperties>[] => {
    return allFeatures
      .filter((feature) => feature.location)
      .map((feature) => ({
        type: "Feature",
        geometry: feature.location,
        properties: {
          id: feature.id,
          title: feature.title,
          featureType: "feature",
          isSelected: feature.id === selectedFeatureId,
        },
      }));
  };

  const headerFooterColor = is3DMode
    ? "rgba(126, 199, 129, 0.75)"
    : "rgba(255, 179, 76, 0.75)";

  const headerStyle = {
    backgroundColor: headerFooterColor,
    color: "black",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    position: "fixed" as const,
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    height: "45px",
    display: "flex",
    alignItems: "center",
    justifyContent: isMobile ? "center" : "space-between",
    paddingX: "16px",
  };

  const footerStyle = {
    backgroundColor: headerFooterColor,
    color: "black",
    textAlign: "center" as const,
    boxShadow: "0 -2px 4px rgba(0,0,0,0.1)",
    position: "fixed" as const,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    height: "18px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  const panelStyle = {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    backdropFilter: "blur(8px)",
    zIndex: 100,
  };

  return (
    <>
      <Box sx={headerStyle}>
        {!isMobile && <Box sx={{ width: "40px" }} />}
        <Typography variant="overline" component="h1">
          Maapallo.info
        </Typography>
        {!isMobile && <Box sx={{ width: "40px" }} />}
      </Box>

      <Tooltip title={is3DMode ? "2D kartta" : "3D maapallo"}>
        <IconButton
          onClick={toggleMapMode}
          size="small"
          sx={{
            position: "absolute",
            top: isMobile ? "2px" : "70px",
            right: isMobile ? "20px" : "10px",
            zIndex: 1001,
            backgroundColor: "rgba(255, 255, 255, 0.9)",
            color: is3DMode ? "#ffb34c" : "#4caf50",
            fontSize: isMobile ? "18px" : "24px",
            fontWeight: "bold",
            width: isMobile ? "38px" : "64px",
            height: isMobile ? "38px" : "64px",
            "&:hover": {
              backgroundColor: "rgba(255, 255, 255, 1)",
              color: is3DMode ? "#e89d2b" : "#388e3c",
            },
            boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
          }}
        >
          {is3DMode ? "2D" : "3D"}
        </IconButton>
      </Tooltip>

      <Box sx={{ position: "relative", height: "100vh", overflow: "hidden" }}>
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 0,
          }}
        >
          {is3DMode ? (
            CesiumMapComponent ? (
              <CesiumMapComponent
                features={createMapFeatures()}
                selectedFeatureId={selectedFeatureId}
                onMapClick={handleMapClick}
                onFeatureClick={handleFeatureSelect}
              />
            ) : (
              <div style={{ padding: "20px", textAlign: "center" }}>
                Loading 3D map...
              </div>
            )
          ) : (
            <Map
              features={createMapFeatures()}
              onMapClick={handleMapClick}
              onFeatureClick={handleFeatureSelect}
              onFeatureHover={() => {
                /* No hover action needed */
              }}
              selectedFeatureId={selectedFeatureId}
            />
          )}
        </Box>

        <HeaderMenu
          onSelectFeature={handleFeatureSelect}
          selectedFeatureId={selectedFeatureId}
          refreshTrigger={refreshTrigger}
          is3DMode={is3DMode}
        />

        {selectedFeatureId && (
          <Paper
            elevation={8}
            sx={{
              position: "absolute",
              top: isMobile ? 80 : 140,
              right: isMobile ? 16 : 100,
              left: isMobile ? 16 : "auto",
              width: isMobile ? "auto" : 600,
              maxHeight: isMobile ? "60vh" : 500,
              ...panelStyle,
            }}
          >
            <FeatureInfo
              featureId={selectedFeatureId}
              onClose={handleFeatureInfoClose}
            />
          </Paper>
        )}
      </Box>

      <Box sx={footerStyle}>
        <Typography variant="caption">
          Kehitysmaantieteen yhdistys 2025
        </Typography>
      </Box>
    </>
  );
}
