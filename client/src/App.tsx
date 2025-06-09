import { useState, useCallback, useEffect } from "react";
import { Box, Paper, Typography, IconButton, Tooltip } from "@mui/material";
import { CesiumMap } from "./CesiumMap";
import { Map } from "./Map";
import FeatureList from "./FeatureList";
import { FeatureInfo } from "./FeatureInfo";
import { FeatureTypes } from "@shared/featureTypes";
import { Feature, Geometry, GeoJsonProperties } from 'geojson';

export function App() {
  const [selectedFeatureId, setSelectedFeatureId] = useState<number | null>(null);
  const [selectedFeature, setSelectedFeature] = useState<FeatureTypes | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [allFeatures, setAllFeatures] = useState<FeatureTypes[]>([]);
  const [is3DMode, setIs3DMode] = useState(true); // Add 3D/2D mode state

  // Add handlers for map interactions
  const handleMapClick = useCallback((coordinates: number[]) => {
    console.log('Map clicked at coordinates:', coordinates);
    // You can implement logic to add new features here if needed
  }, []);

  const handleMapFeatureClick = useCallback((featureId: number) => {
    handleFeatureSelect(featureId);
  }, []);

  // Toggle between 3D and 2D modes
  const toggleMapMode = useCallback(() => {
    setIs3DMode(prev => !prev);
  }, []);

  const handleFeatureAdded = useCallback(async (newFeature: FeatureTypes) => {
    setRefreshTrigger(prev => prev + 1);
    setSelectedFeature(newFeature);
    setSelectedFeatureId(newFeature.id!);
  }, []);

  // Fetch all features
  useEffect(() => {
    const fetchAllFeatures = async () => {
      try {
        const response = await fetch('/api/v1/feature');
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

    const feature = allFeatures.find(f => f.id === id);
    if (feature) {
      setSelectedFeature(feature);
    }
  }, [allFeatures]);

  useEffect(() => {
    if (!selectedFeatureId) {
      setSelectedFeature(null);
      return;
    }

    const feature = allFeatures.find(f => f.id === selectedFeatureId);
    if (feature) {
      setSelectedFeature(feature);
    }
  }, [selectedFeatureId, allFeatures]);

  // Create map features for rendering
  const createMapFeatures = (): Feature<Geometry, GeoJsonProperties>[] => {
    const features: Feature<Geometry, GeoJsonProperties>[] = [];

    allFeatures.forEach(feature => {
      if (feature.location) {
        features.push({
          type: "Feature",
          geometry: feature.location,
          properties: {
            id: feature.id,
            name: feature.name,
            age: feature.age,
            gender: feature.gender,
            featureType: 'feature',
            isSelected: feature.id === selectedFeatureId
          },
        });
      }
    });

    return features;
  };

  const headerStyle = {
    backgroundColor: "rgba(255, 179, 76, 0.75)",
    color: "black",
    textAlign: "center" as const,
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    position: "fixed" as const,
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    height: "40px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  const footerStyle = {
    backgroundColor: "rgba(255, 179, 76, 0.75)",
    color: "black",
    textAlign: "center" as const,
    boxShadow: "0 -2px 4px rgba(0,0,0,0.1)", // Negative shadow for bottom
    position: "fixed" as const,
    bottom: 0, // Position at bottom
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
    zIndex: 100
  };

  return (
    <>
      {/* Header */}
      <Box sx={headerStyle}>
        <Typography variant="overline" component="h1">
          Maapallo.info
        </Typography>
      </Box>

      {/* Main content area */}
      <Box sx={{
        position: "relative",
        height: "100vh",
        overflow: "hidden"
      }}>
        {/* Fullscreen map */}
        <Box sx={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 0
        }}>
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
              selectedFeatureId={selectedFeatureId}
            />
          )}
        </Box>

        {/* 3D/2D Toggle Button */}
        <Box sx={{
          position: "absolute",
          top: 56, // Move down to account for header (40px + 16px margin)
          right: selectedFeatureId ? 340 : 16,
          zIndex: 200
        }}>
          <Tooltip title={is3DMode ? "Switch to 2D Map" : "Switch to 3D Globe"}>
            <IconButton
              onClick={toggleMapMode}
              sx={{
                backgroundColor: "rgba(255, 255, 255, 0.9)",
                color: "#ffb34c",
                fontSize: "24px",
                "&:hover": {
                  backgroundColor: "rgba(255, 255, 255, 1)",
                  color: "#e89d2b"
                },
                boxShadow: "0 2px 8px rgba(0,0,0,0.2)"
              }}
            >
              {is3DMode ? "🗺️" : "🌍"}
            </IconButton>
          </Tooltip>
        </Box>

        {/* Feature List Panel */}
        <Paper
          elevation={8}
          sx={{
            position: "absolute",
            top: 56, // Move down to account for header
            left: 16,
            width: 280,
            maxHeight: "calc(100vh - 120px)", // Adjust for header and footer
            ...panelStyle,
            zIndex: 100
          }}
        >
          <FeatureList
            onSelectFeature={handleFeatureSelect}
            selectedFeatureId={selectedFeatureId}
            refreshTrigger={refreshTrigger}
          />
        </Paper>

        {/* Feature Info Panel */}
        {selectedFeatureId && (
          <Paper
            elevation={8}
            sx={{
              position: "absolute",
              top: 56, // Move down to account for header
              right: 16,
              width: 300,
              maxHeight: 300,
              ...panelStyle,
              zIndex: 100
            }}
          >
            <FeatureInfo featureId={selectedFeatureId} />
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
