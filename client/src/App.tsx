import { useState, useCallback, useEffect } from "react";
import { Grid, Container, Box, Paper, Typography } from "@mui/material";
import { Map } from "./Map";
import { FeatureForm } from "./FeatureForm";
import FeatureList from "./FeatureList";  // Default import
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
          paddingY: "0.25rem", // Only vertical padding
          paddingX: "1rem",    // Keep horizontal padding for text spacing
          textAlign: "center",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
        }}
      >
        <Typography variant="overline" component="h1">
          Maapallo.info
        </Typography>
      </Box>

      <Container maxWidth={false} sx={{ height: "calc(100vh - 120px)", p: 1 }}>
        <Grid container spacing={1} sx={{ height: "100%" }}>
          <Grid item xs={12} md={3}>
            <FeatureList
              onSelectFeature={handleFeatureSelect}
              selectedFeatureId={selectedFeatureId}
              refreshTrigger={refreshTrigger}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper elevation={3} sx={{ height: "100%" }}>
              <Map features={mapFeatures} onMapClick={handleMapClick} />
            </Paper>
          </Grid>
          <Grid item xs={12} md={3}>
            <Grid container direction="column" spacing={1} sx={{ height: "100%" }}>
              <Grid item>
                <FeatureForm
                  coordinates={coordinates}
                  onFeatureAdded={handleFeatureAdded}
                />
              </Grid>
              <Grid item xs>
                <FeatureInfo featureId={selectedFeatureId} />
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Container>

      {/* Footer */}
      <Box
        sx={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: "#ffb34c",
        //   backgroundColor: "#ffb34c",
          height: "40px",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 1000,
          boxShadow: "0 -2px 4px rgba(0,0,0,0.1)"
        }}
      >
        <Typography sx={{ color: "white" }} variant="overline">
          Kehitysmaantieteen yhdistys 2025
        </Typography>
      </Box>
    </>
  );
}
