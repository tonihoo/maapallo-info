import { Box, MenuItem, Paper, Typography } from "@mui/material";
import { FeatureTypes } from "./types/featureTypes";
import { useEffect, useState } from "react";

export default function FeatureList({
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
        const res = await fetch("/api/v1/feature/");

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
    <Paper elevation={3} sx={{ overflow: "hidden", height: "100%" }}> {/* Changed to use 100% height instead of viewport calculations */}
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
          Maapallo-lehden artikkeleita
        </Typography>
      </Box>
      {features.length ? (
        <Box
          sx={{
            overflowY: "auto",
            height: "calc(100% - 3em)", // Subtract header height
            // Removed maxHeight viewport calculation
            '&::-webkit-scrollbar': {
              width: '8px',
            },
            '&::-webkit-scrollbar-track': {
              background: '#f1f1f1',
            },
            '&::-webkit-scrollbar-thumb': {
              background: '#c1c1c1',
              borderRadius: '4px',
            },
            '&::-webkit-scrollbar-thumb:hover': {
              background: '#a8a8a8',
            },
          }}
        >
          {features.map((feature) => (
            <MenuItem
              key={feature.id}
              onClick={() => {
                if (feature.id !== undefined) {
                  onSelectFeature(feature.id);
                }
              }}
              selected={selectedFeatureId === feature.id}
              sx={{
                display: "flex",
                alignItems: "flex-start",
                gap: 1,
                py: 1.5,
                minHeight: 'auto',
              }}
            >
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  variant="subtitle1"
                  sx={{
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    lineHeight: 1.3,
                    wordBreak: 'break-word',
                    hyphens: 'auto',
                    whiteSpace: 'normal',
                    fontSize: '0.95rem',
                  }}
                >
                  {feature.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {feature.author} &middot; {feature.publication}
                </Typography>
              </Box>
            </MenuItem>
          ))}
        </Box>
      ) : (
        <Typography sx={{ padding: "1em" }}>
          Ei artikkeleita tietokannassa.
        </Typography>
      )}
    </Paper>
  );
}
