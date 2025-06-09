import { useState, useCallback, useEffect } from "react";
import { Box, Paper, Typography } from "@mui/material";
import { CesiumMap } from "./CesiumMap";
import FeatureList from "./FeatureList";
import { FeatureInfo } from "./FeatureInfo";
import { FeatureTypes } from "@shared/featureTypes";
import { Feature, Geometry, GeoJsonProperties } from 'geojson';

export function App() {
  const [selectedFeatureId, setSelectedFeatureId] = useState<number | null>(null);
  const [selectedFeature, setSelectedFeature] = useState<FeatureTypes | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [allFeatures, setAllFeatures] = useState<FeatureTypes[]>([]); // Add this line

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
  }, [refreshTrigger]); // Refetch when refreshTrigger changes

  const handleFeatureSelect = useCallback(async (id: number) => {
    setSelectedFeatureId(id);

    // Find the feature in allFeatures (which now includes location)
    const feature = allFeatures.find(f => f.id === id);
    if (feature) {
      setSelectedFeature(feature);
    }
  }, [allFeatures]);

  // Simplified effect
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

    // Use allFeatures which now includes coordinates
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
    backgroundColor: "#ffb34c",
    color: "black",
    textAlign: "center" as const,
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    position: "relative" as const,
    zIndex: 1000,
    height: "40px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
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
        height: "calc(100vh - 70px)",
        overflow: "hidden"
      }}>
        {/* Fullscreen map */}
        <Box sx={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0
        }}>
          <CesiumMap
            features={createMapFeatures()}
            selectedFeatureId={selectedFeatureId}
          />
        </Box>

        {/* Feature List Panel */}
        <Paper
          elevation={8}
          sx={{
            position: "absolute",
            top: 16,
            left: 16,
            width: 280,
            maxHeight: "calc(100vh - 160px)",
            ...panelStyle
          }}
        >
          <FeatureList
            onSelectFeature={handleFeatureSelect}
            selectedFeatureId={selectedFeatureId}
            refreshTrigger={refreshTrigger}
          />
        </Paper>

        {/* Feature Form Panel */}
        {/* <Paper
          elevation={8}
          sx={{
            position: "absolute",
            top: 16,
            right: 16,
            width: 300,
            ...panelStyle
          }}
        >
          <FeatureForm
            coordinates={coordinates}
            onFeatureAdded={handleFeatureAdded}
          />
        </Paper> */}

        {/* Feature Info Panel */}
        {selectedFeatureId && (
          <Paper
            elevation={8}
            sx={{
              position: "absolute",
              top: 16,
              right: 16,
              width: 300,
              maxHeight: 300,
              ...panelStyle
            }}
          >
            <FeatureInfo featureId={selectedFeatureId} />
          </Paper>
        )}
      </Box>

      {/* Footer */}
      <Box sx={{
        ...headerStyle,
        height: "30px"
      }}>
        <Typography variant="caption">
          Kehitysmaantieteen yhdistys 2025
        </Typography>
      </Box>
    </>
  );
}
