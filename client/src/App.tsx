import { useState, useCallback, useEffect } from "react";
import { Box, Paper, Typography } from "@mui/material";
import { CesiumMap } from "./CesiumMap";
import { FeatureForm } from "./FeatureForm";
import FeatureList from "./FeatureList";
import { FeatureInfo } from "./FeatureInfo";
import { FeatureTypes } from "@shared/featureTypes";
import { Feature, Geometry, GeoJsonProperties } from 'geojson';

export function App() {
  const [selectedFeatureId, setSelectedFeatureId] = useState<number | null>(null);
  const [coordinates, setCoordinates] = useState<number[]>([]);
  const [selectedFeature, setSelectedFeature] = useState<FeatureTypes | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [clickLocation, setClickLocation] = useState<number[] | null>(null);

  const handleFeatureAdded = useCallback(async (newFeature: FeatureTypes) => {
    setRefreshTrigger(prev => prev + 1);
    setClickLocation(null);
    setSelectedFeature(newFeature);
    setSelectedFeatureId(newFeature.id!);
  }, []);

  const handleMapClick = useCallback((coords: number[]) => {
    setCoordinates(coords);
    setClickLocation(coords);
  }, []);

  const handleFeatureSelect = useCallback(async (id: number) => {
    setSelectedFeatureId(id);
    setClickLocation(null);

    try {
      const response = await fetch(`/api/v1/feature/${id}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedFeature(data.feature);
      }
    } catch (error) {
      console.error('Error fetching feature:', error);
    }
  }, []);

  // Fetch selected feature data when ID changes
  useEffect(() => {
    if (!selectedFeatureId) {
      setSelectedFeature(null);
      return;
    }

    const fetchFeature = async () => {
      try {
        const response = await fetch(`/api/v1/feature/${selectedFeatureId}`);
        if (!response.ok) return;

        const data = await response.json();
        setSelectedFeature(data.feature);
      } catch (error) {
        console.error("Error fetching feature:", error);
      }
    };

    fetchFeature();
  }, [selectedFeatureId]);

  // Create map features for rendering
  const createMapFeatures = (): Feature<Geometry, GeoJsonProperties>[] => {
    const features: Feature<Geometry, GeoJsonProperties>[] = [];

    // Add selected feature
    if (selectedFeature) {
      features.push({
        type: "Feature",
        geometry: selectedFeature.location,
        properties: {
          id: selectedFeature.id,
          name: selectedFeature.name,
          age: selectedFeature.age,
          gender: selectedFeature.gender,
          featureType: 'feature'
        },
      });
    }

    // Add click location
    if (clickLocation && clickLocation.length === 2) {
      features.push({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: clickLocation
        },
        properties: {
          featureType: 'clickLocation'
        },
      });
    }

    return features;
  };

  const headerStyle = {
    backgroundColor: "#ffb34c",
    color: "white",
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
            onMapClick={handleMapClick}
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
        <Paper
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
        </Paper>

        {/* Feature Info Panel */}
        {selectedFeatureId && (
          <Paper
            elevation={8}
            sx={{
              position: "absolute",
              bottom: 16,
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
