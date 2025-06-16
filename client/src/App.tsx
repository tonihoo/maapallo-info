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
import { CesiumMap } from "./CesiumMap";
import { Map } from "./Map";
import FeatureList from "./FeatureList";
import { FeatureInfo } from "./FeatureInfo";
import { MobileMenu } from "./MobileMenu";
import { FeatureTypes } from "./types/featureTypes";
import { Feature, Geometry, GeoJsonProperties } from "geojson";

export function App() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [selectedFeatureId, setSelectedFeatureId] = useState<number | null>(
    null
  );
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [allFeatures, setAllFeatures] = useState<FeatureTypes[]>([]);
  const [is3DMode, setIs3DMode] = useState(true);

  // Add handlers for map interactions
  const handleMapClick = useCallback((coordinates: number[]) => {
    console.log("Map clicked at coordinates:", coordinates);
    // Clear selection when clicking empty space
    setSelectedFeatureId(null);
  }, []);

  const handleMapFeatureClick = useCallback((featureId: number) => {
    handleFeatureSelect(featureId);
  }, []);

  // Toggle between 3D and 2D modes
  const toggleMapMode = useCallback(() => {
    setIs3DMode((prev) => !prev);
  }, []);

  // Fetch all features
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

  const handleFeatureSelect = useCallback(async (id: number) => {
    setSelectedFeatureId(id);
  }, []); // Simplified - no need to find and set feature object

  const handleFeatureInfoClose = useCallback(() => {
    setSelectedFeatureId(null);
  }, []);

  // Create map features for rendering
  const createMapFeatures = (): Feature<Geometry, GeoJsonProperties>[] => {
    const features: Feature<Geometry, GeoJsonProperties>[] = [];

    allFeatures.forEach((feature) => {
      if (feature.location) {
        features.push({
          type: "Feature",
          geometry: feature.location,
          properties: {
            id: feature.id,
            // Remove title, author, and publication - these should not be on the map
            featureType: "feature",
            isSelected: feature.id === selectedFeatureId,
          },
        });
      }
    });

    return features;
  };

  const headerStyle = {
    backgroundColor: is3DMode
      ? "rgba(126, 199, 129, 0.75)"
      : "rgba(255, 179, 76, 0.75)",
    color: "black",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    position: "fixed" as const,
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    height: isMobile ? "64px" : "40px", // Increased height on mobile to accommodate buttons
    display: "flex",
    alignItems: "center",
    justifyContent: isMobile ? "center" : "space-between", // Center text on mobile
    paddingX: "16px",
  };

  const footerStyle = {
    backgroundColor: is3DMode
      ? "rgba(126, 199, 129, 0.75)"
      : "rgba(255, 179, 76, 0.75)",
    color: "black",
    textAlign: "center" as const,
    boxShadow: "0 -2px 4px rgba(0,0,0,0.1)",
    position: "fixed" as const,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    height: "30px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  const panelStyle = {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    backdropFilter: "blur(8px)",
    zIndex: 100,
  };

  const handleFeatureHover = (_featureId: number | null) => {
    // Keep for potential future cursor changes
  };

  return (
    <>
      {/* Header */}
      <Box sx={headerStyle}>
        {!isMobile && (
          <>
            {/* Empty left space for balanced layout on desktop */}
            <Box sx={{ width: "40px" }} />

            <Typography variant="overline" component="h1">
              Maapallo.info
            </Typography>

            {/* Empty right space for balanced layout on desktop */}
            <Box sx={{ width: "40px" }} />
          </>
        )}

        {isMobile && (
          <Typography variant="overline" component="h1">
            Maapallo.info
          </Typography>
        )}
      </Box>

      {/* 3D/2D Toggle Button - positioned below header in top right corner */}
      <Tooltip title={is3DMode ? "2D kartta" : "3D maapallo"}>
        <IconButton
          onClick={toggleMapMode}
          size="small"
          sx={{
            position: "absolute",
            top: isMobile ? "8px" : "64px", // On top of header on mobile, below header on desktop
            right: "20px",
            zIndex: 1001,
            backgroundColor: "rgba(255, 255, 255, 0.9)",
            color: is3DMode ? "#ffb34c" : "#4caf50",
            fontSize: isMobile ? "18px" : "24px", // Smaller on mobile
            fontWeight: "bold",
            width: isMobile ? "48px" : "64px", // Smaller on mobile
            height: isMobile ? "48px" : "64px", // Smaller on mobile
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

      {/* Main content area */}
      <Box
        sx={{
          position: "relative",
          height: "100vh",
          overflow: "hidden",
        }}
      >
        {/* Fullscreen map */}
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
            <CesiumMap
              features={createMapFeatures()}
              selectedFeatureId={selectedFeatureId}
              onMapClick={handleMapClick}
              onFeatureClick={handleMapFeatureClick}
            />
          ) : (
            <Map
              features={createMapFeatures()}
              onMapClick={handleMapClick}
              onFeatureClick={handleMapFeatureClick}
              onFeatureHover={handleFeatureHover} // Keep for cursor changes
              selectedFeatureId={selectedFeatureId}
            />
          )}
        </Box>

        {/* Feature List Panel - Hidden on mobile */}
        {!isMobile && (
          <Paper
            elevation={8}
            sx={{
              position: "absolute",
              top: 56,
              left: 16,
              width: 320, // Fixed width comment
              height: 880, // Fixed height comment
              ...panelStyle,
              zIndex: 100,
            }}
          >
            <FeatureList
              onSelectFeature={handleFeatureSelect}
              selectedFeatureId={selectedFeatureId}
              refreshTrigger={refreshTrigger}
              is3DMode={is3DMode}
            />
          </Paper>
        )}

        {/* Mobile Menu - Only visible on mobile */}
        <MobileMenu
          onSelectFeature={handleFeatureSelect}
          selectedFeatureId={selectedFeatureId}
          refreshTrigger={refreshTrigger}
          is3DMode={is3DMode}
        />

        {/* Feature Info Panel - Show ONLY on selection (click), not hover */}
        {selectedFeatureId && (
          <Paper
            elevation={8}
            sx={{
              position: "absolute",
              top: isMobile ? 80 : 140, // Account for new mobile header height (64px + margin)
              right: isMobile ? 16 : 100, // Closer to edge on mobile
              left: isMobile ? 16 : "auto", // Full width on mobile
              width: isMobile ? "auto" : 600, // Auto width on mobile
              maxHeight: isMobile ? "60vh" : 500, // Limit height on mobile
              ...panelStyle,
              zIndex: 100,
            }}
          >
            <FeatureInfo
              featureId={selectedFeatureId}
              onClose={handleFeatureInfoClose}
            />
          </Paper>
        )}
      </Box>

      {/* Footer */}
      <Box sx={footerStyle}>
        <Typography variant="caption">
          Kehitysmaantieteen yhdistys 2025
        </Typography>
      </Box>
    </>
  );
}
