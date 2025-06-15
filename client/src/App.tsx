import { useState, useCallback, useEffect } from "react";
import { Box, Paper, Typography, IconButton, Tooltip } from "@mui/material";
import { CesiumMap } from "./CesiumMap";
import { Map } from "./Map";
import FeatureList from "./FeatureList";
import { FeatureInfo } from "./FeatureInfo";
import { FeatureTypes } from "./types/featureTypes";
import { Feature, Geometry, GeoJsonProperties } from "geojson";

export function App() {
  const [selectedFeatureId, setSelectedFeatureId] = useState<number | null>(
    null
  );
  const [hoveredFeatureId, setHoveredFeatureId] = useState<number | null>(null); // Keep for cursor changes
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

  const handleFeatureAdded = useCallback(async (newFeature: FeatureTypes) => {
    setRefreshTrigger((prev) => prev + 1);
    setSelectedFeatureId(newFeature.id!);
  }, []); // Removed setSelectedFeature references

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
    height: "40px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
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

  const handleFeatureHover = (featureId: number | null) => {
    setHoveredFeatureId(featureId); // Only for cursor changes, not for showing info panel
  };

  return (
    <>
      {/* Header */}
      <Box sx={headerStyle}>
        {/* Empty left space for balanced layout */}
        <Box sx={{ width: "40px" }} />

        <Typography variant="overline" component="h1">
          Maapallo.info
        </Typography>

        {/* Empty right space for balanced layout */}
        <Box sx={{ width: "40px" }} />
      </Box>

      {/* 3D/2D Toggle Button - positioned below header in top right corner */}
      <Tooltip title={is3DMode ? "2D kartta" : "3D maapallo"}>
        <IconButton
          onClick={toggleMapMode}
          size="small"
          sx={{
            position: "absolute",
            top: "64px", // Below the header (header height is approximately 56px + some margin)
            right: "20px",
            zIndex: 1001,
            backgroundColor: "rgba(255, 255, 255, 0.9)",
            color: is3DMode ? "#ffb34c" : "#4caf50",
            fontSize: "24px", // Doubled from 12px
            fontWeight: "bold",
            width: "64px", // Doubled from 32px
            height: "64px", // Doubled from 32px
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

        {/* Feature List Panel */}
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

        {/* Feature Info Panel - Show ONLY on selection (click), not hover */}
        {selectedFeatureId && (
          <Paper
            elevation={8}
            sx={{
              position: "absolute",
              top: 140, // Moved back up since search bar is now at bottom
              right: 100,
              width: 600,
              maxHeight: 500,
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
