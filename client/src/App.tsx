import {
  Box,
  IconButton,
  Paper,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { useCallback, useEffect } from "react";
import { BaseMapKey } from "./components/2d/BaseMapSelector";
import { Map } from "./components/2d/Map";
import { AppHeader } from "./components/common/AppHeader";
import { BaseMapAttribution } from "./components/common/BaseMapAttribution";
import { CookieConsent } from "./components/common/CookieConsent";
import { FeatureInfo } from "./components/common/FeatureInfo";
import { useAppDispatch, useAppSelector } from "./store/hooks";
import {
  selectCesiumComponent,
  selectCesiumPreloaded,
  selectCurrentBaseMap,
  selectHeaderFooterColor,
  selectIs3DMode,
  selectMapFeatures,
  selectRefreshTrigger,
  selectSelectedFeatureId,
} from "./store/selectors";
import { verifyStoredToken } from "./store/slices/authSlice";
import { fetchAllFeatures } from "./store/slices/featuresSlice";
import {
  clearSelectedFeature,
  setCesiumComponent,
  setCesiumPreloaded,
  setCurrentBaseMap,
  setLayerVisibility,
  setSelectedFeatureId,
  toggleMapMode,
} from "./store/slices/mapSlice";
import { analytics } from "./utils/analytics";

export function App() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  // Redux state
  const dispatch = useAppDispatch();
  const selectedFeatureId = useAppSelector(selectSelectedFeatureId);
  const is3DMode = useAppSelector(selectIs3DMode);
  const cesiumPreloaded = useAppSelector(selectCesiumPreloaded);
  const CesiumMapComponent = useAppSelector(selectCesiumComponent);
  const refreshTrigger = useAppSelector(selectRefreshTrigger);
  const mapFeatures = useAppSelector(selectMapFeatures);
  const headerFooterColor = useAppSelector(selectHeaderFooterColor);
  const currentBaseMap = useAppSelector(selectCurrentBaseMap);
  const articleLocatorsVisible = useAppSelector(
    (state) => state.map.layerVisibility.articleLocators
  );

  // Handler for base map changes
  const handleBaseMapChange = useCallback(
    (baseMapKey: BaseMapKey) => {
      dispatch(setCurrentBaseMap(baseMapKey));
    },
    [dispatch]
  );

  // Background preload Cesium after initial render
  useEffect(() => {
    const preloadCesium = async () => {
      try {
        // Preload Cesium module in the background
        const cesiumModule = await import("./components/3d/CesiumMap");
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

  const handleMapClick = useCallback(() => {
    dispatch(clearSelectedFeature());
  }, [dispatch]);

  const handleFeatureSelect = useCallback(
    (id: number) => {
      dispatch(setSelectedFeatureId(id));

      // Ensure article locators layer is visible when a feature is selected from the menu
      dispatch(
        setLayerVisibility({ layerId: "articleLocators", visible: true })
      );

      // Track feature selection analytics
      analytics.trackFeatureSelection(id, is3DMode ? "3d" : "2d", "map_click");
    },
    [dispatch, is3DMode]
  );

  const handleFeatureInfoClose = useCallback(() => {
    dispatch(clearSelectedFeature());
  }, [dispatch]);

  const toggleMapModeHandler = useCallback(async () => {
    const previousMode = is3DMode ? "3d" : "2d";
    const newMode = is3DMode ? "2d" : "3d";

    // If switching to 3D mode and Cesium isn't loaded yet, load it now
    if (!cesiumPreloaded && !CesiumMapComponent) {
      try {
        const cesiumModule = await import("./components/3d/CesiumMap");
        dispatch(setCesiumComponent(cesiumModule.CesiumMap));
        dispatch(setCesiumPreloaded(true));
      } catch (error) {
        console.error("❌ Failed to load Cesium:", error);
        return; // Don't switch to 3D mode if loading failed
      }
    }

    dispatch(toggleMapMode());

    // Track map mode toggle
    analytics.trackMapModeToggle(newMode, previousMode);
  }, [cesiumPreloaded, CesiumMapComponent, dispatch, is3DMode]);

  useEffect(() => {
    dispatch(fetchAllFeatures());
  }, [dispatch, refreshTrigger]);

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
      {/* 3D/2D Toggle Button */}
      <Tooltip
        title={
          is3DMode
            ? "Vaihda 2D-karttanäkymään"
            : cesiumPreloaded
              ? "Vaihda 3D-karttanäkymään"
              : "3D-kartta latautuu..."
        }
      >
        <span>
          <IconButton
            onClick={toggleMapModeHandler}
            disabled={!cesiumPreloaded}
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
        </span>
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
                features={mapFeatures}
                selectedFeatureId={selectedFeatureId}
                onMapClick={handleMapClick}
                onFeatureClick={handleFeatureSelect}
                articleLocatorsVisible={articleLocatorsVisible}
              />
            ) : (
              <div style={{ padding: "20px", textAlign: "center" }}>
                Ladataan 3D-karttaa...
              </div>
            )
          ) : (
            <Map
              features={mapFeatures}
              onMapClick={handleMapClick}
              onFeatureClick={handleFeatureSelect}
              onFeatureHover={() => {
                /* No hover action needed */
              }}
              selectedFeatureId={selectedFeatureId}
              onBaseMapChange={handleBaseMapChange}
            />
          )}
        </Box>

        <AppHeader
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
        <BaseMapAttribution
          currentBaseMap={currentBaseMap}
          is3DMode={is3DMode}
        />
      </Box>
      <CookieConsent />
    </>
  );
}
