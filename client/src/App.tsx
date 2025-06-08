import { useState, useCallback, useEffect } from "react";
import { Grid, Container, Box, Paper, Typography } from "@mui/material";
import { CesiumMap } from "./CesiumMap"; // Switch to CesiumMap
// import { Map } from "./Map"; // Comment out Map
import { FeatureForm } from "./FeatureForm";
import FeatureList from "./FeatureList";
import { FeatureInfo } from "./FeatureInfo";
import { FeatureTypes } from "@shared/featureTypes";
import { Feature, Geometry, GeoJsonProperties } from 'geojson';

export function App() {
  // ID of the currently selected feature
  const [selectedFeatureId, setSelectedFeatureId] = useState<number | null>(
    null
  );
  // Latest coordinates from the Map click event
  const [coordinates, setCoordinates] = useState<number[]>([]);
  // Selected feature for map display
  const [selectedFeature, setSelectedFeature] = useState<FeatureTypes | null>(null);
  // A state to track when the list should refresh
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  // To store click location on the map
  const [clickLocation, setClickLocation] = useState<number[] | null>(null);

  const handleFeatureAdded = useCallback(async (newFeature: FeatureTypes) => {
    // Increment to trigger list refresh
    setRefreshTrigger(prev => prev + 1);
    setClickLocation(null); // Clear click location after adding

    // Directly use the returned feature data
    setSelectedFeature(newFeature);
    setSelectedFeatureId(newFeature.id!);
  }, []);

  // Fetch the selected feature data when ID changes
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

  const handleMapClick = useCallback((coords: number[]) => {
    setCoordinates(coords);
    setClickLocation(coords);
  }, []);

  const handleFeatureSelect = useCallback(async (id: number) => {
    setSelectedFeatureId(id);
    setClickLocation(null); // Clear click location when selecting existing feature

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

  // Create map features for existing features and click location
  const mapFeatures: Feature<Geometry, GeoJsonProperties>[] = [];

  // Add selected feature feature
  if (selectedFeature) {
    mapFeatures.push({
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

  // Add click location feature (different from feature locations)
  if (clickLocation && clickLocation.length === 2) {
    mapFeatures.push({
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

  return (
    <>
      {/* Header */}
      <Box
        sx={{
          backgroundColor: "#ffb34c",
          color: "white",
          paddingY: "0.125rem",
          paddingX: "1rem",
          textAlign: "center",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          position: "relative",
          zIndex: 1000,
          height: "40px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        <Typography variant="overline" component="h1">
          Maapallo.info
        </Typography>
      </Box>

      {/* Fullscreen map with floating panels */}
      <Box sx={{
        position: "relative",
        height: "calc(100vh - 80px)",
        minHeight: "calc(100vh - 80px)",
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
            features={mapFeatures}
            onMapClick={handleMapClick}
            selectedFeatureId={selectedFeatureId} // Add this prop
          />
        </Box>

        {/* Floating Feature List - Left Panel */}
        <Paper
          elevation={8}
          sx={{
            position: "absolute",
            top: 16,
            left: 16,
            width: 280,
            maxHeight: "calc(100vh - 160px)",
            backgroundColor: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(8px)",
            zIndex: 100
          }}
        >
          <FeatureList
            onSelectFeature={handleFeatureSelect}
            selectedFeatureId={selectedFeatureId}
            refreshTrigger={refreshTrigger}
          />
        </Paper>

        {/* Floating Feature Form - Top Right Panel */}
        <Paper
          elevation={8}
          sx={{
            position: "absolute",
            top: 16,
            right: 16,
            width: 300,
            backgroundColor: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(8px)",
            zIndex: 100
          }}
        >
          <FeatureForm
            coordinates={coordinates}
            onFeatureAdded={handleFeatureAdded}
          />
        </Paper>

        {/* Floating Feature Info - Bottom Right Panel */}
        {selectedFeatureId && (
          <Paper
            elevation={8}
            sx={{
              position: "absolute",
              bottom: 16,
              right: 16,
              width: 300,
              maxHeight: 300,
              backgroundColor: "rgba(255, 255, 255, 0.95)",
              backdropFilter: "blur(8px)",
              zIndex: 100
            }}
          >
            <FeatureInfo featureId={selectedFeatureId} />
          </Paper>
        )}
      </Box>

      {/* Footer */}
      <Box
        sx={{
          backgroundColor: "#ffb34c",
          color: "white",
          padding: "0.25rem",
          textAlign: "center",
          position: "relative",
          zIndex: 1000,
          height: "30px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        <Typography variant="caption">
          Kehitysmaantieteen yhdistys 2025
        </Typography>
      </Box>
    </>
  );
}
