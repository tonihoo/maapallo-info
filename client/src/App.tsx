import { useState, useCallback, useEffect } from "react";
import { Grid, Container, Box, Paper, Typography } from "@mui/material";
import { Map } from "./Map";
import { HedgehogForm } from "./HedgehogForm";
import HedgehogList from "./HedgehogList";  // Default import
import { HedgehogInfo } from "./HedgehogInfo";
import { Hedgehog } from "@shared/hedgehog";
import { Feature, Geometry, GeoJsonProperties } from 'geojson';

export function App() {
  // ID of the currently selected hedgehog
  const [selectedHedgehogId, setSelectedHedgehogId] = useState<number | null>(
    null
  );
  // Latest coordinates from the Map click event
  const [coordinates, setCoordinates] = useState<number[]>([]);
  // Selected hedgehog for map display
  const [selectedHedgehog, setSelectedHedgehog] = useState<Hedgehog | null>(null);
  // A state to track when the list should refresh
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  // To store click location on the map
  const [clickLocation, setClickLocation] = useState<number[] | null>(null);

  const handleHedgehogAdded = useCallback(async (newHedgehog: Hedgehog) => {
    // Increment to trigger list refresh
    setRefreshTrigger(prev => prev + 1);
    setClickLocation(null); // Clear click location after adding

    // Directly use the returned hedgehog data
    setSelectedHedgehog(newHedgehog);
    setSelectedHedgehogId(newHedgehog.id!);
  }, []);

  // Fetch the selected hedgehog data when ID changes
  useEffect(() => {
    if (!selectedHedgehogId) {
      setSelectedHedgehog(null);
      return;
    }

    const fetchHedgehog = async () => {
      try {
        const response = await fetch(`/api/v1/hedgehog/${selectedHedgehogId}`);
        if (!response.ok) return;

        const data = await response.json();
        setSelectedHedgehog(data.hedgehog);
      } catch (error) {
        console.error("Error fetching hedgehog:", error);
      }
    };

    fetchHedgehog();
  }, [selectedHedgehogId]);

  const handleMapClick = useCallback((coords: number[]) => {
    setCoordinates(coords);
    setClickLocation(coords);
  }, []);

  const handleHedgehogSelect = useCallback(async (id: number) => {
    setSelectedHedgehogId(id);
    setClickLocation(null); // Clear click location when selecting existing hedgehog

    try {
      const response = await fetch(`/api/v1/hedgehog/${id}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedHedgehog(data.hedgehog);
      }
    } catch (error) {
      console.error('Error fetching hedgehog:', error);
    }
  }, []);

  // Create map features for existing hedgehogs and click location
  const mapFeatures: Feature<Geometry, GeoJsonProperties>[] = [];

  // Add selected hedgehog feature
  if (selectedHedgehog) {
    mapFeatures.push({
      type: "Feature",
      geometry: selectedHedgehog.location,
      properties: {
        id: selectedHedgehog.id,
        name: selectedHedgehog.name,
        age: selectedHedgehog.age,
        gender: selectedHedgehog.gender,
        featureType: 'hedgehog'
      },
    });
  }

  // Add click location feature (different from hedgehog locations)
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
          backgroundColor: "#00B2A0",
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
            <HedgehogList
              onSelectHedgehog={handleHedgehogSelect}
              selectedHedgehogId={selectedHedgehogId}
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
                <HedgehogForm
                  coordinates={coordinates}
                  onHedgehogAdded={handleHedgehogAdded}
                />
              </Grid>
              <Grid item xs>
                <HedgehogInfo hedgehogId={selectedHedgehogId} />
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
          backgroundColor: "#00B2A0",
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
