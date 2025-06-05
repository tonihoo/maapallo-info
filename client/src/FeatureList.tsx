import { Box, MenuItem, Paper, Typography } from "@mui/material";
import { FeatureTypes } from "@shared/featureTypes";
import { useEffect, useState } from "react";

export default function HedgeHogList({
  onSelectFeature,
  selectedFeatureId = null,
  refreshTrigger = 0,
}: {
  onSelectFeature: (id: number) => void;
  selectedFeatureId?: number | null;
  refreshTrigger?: number;
}) {
  const [features, setFeatures] = useState<FeatureTypes[]>([]);

  // Fetch all feature's during startup or when refreshTrigger changes
  useEffect(() => {
    const getAllFeatures = async () => {
      try {
        const res = await fetch("/api/v1/feature");

        if (!res.ok) {
          console.error(`API responded with status: ${res.status}`);
          const errorText = await res.text();
          console.error("Error response:", errorText);
          return;
        }

        const json = await res.json();
        setFeatures(json?.features || []);
      } catch (err) {
        console.error(`Error while fetching features: ${err}`);
      }
    };

    getAllFeatures();
  }, [refreshTrigger]);

  return (
    <Paper elevation={3} sx={{ margin: "1em", overflow: "hidden" }}>
      <Box
        sx={{
          backgroundColor: "#ffe7c5",
          height: "3em",
          display: "flex",
          zIndex: 2,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Typography sx={{ color: "darkslategrey" }}>
          Rekisteröidyt sijaintit
        </Typography>
      </Box>
      {features.length ? (
        <Box sx={{ overflowY: "scroll", height: "100%" }}>
          {features.map((feature) => (
            <MenuItem
              key={feature.id}
              onClick={() => {
                if (feature.id !== undefined) {
                  onSelectFeature(feature.id);
                }
              }}
              selected={selectedFeatureId === feature.id}            >
              {feature.name}
            </MenuItem>
          ))}
        </Box>
      ) : (
        <Typography sx={{ padding: "1em" }}>
          Ei siilejä tietokannassa.
        </Typography>
      )}
    </Paper>
  );
}
