import { Paper, Typography, Link, IconButton } from "@mui/material";
import { Close } from "@mui/icons-material";
import { useState, useEffect } from "react";

interface Props {
  featureId: number | null;
  onClose?: () => void;
}

interface Feature {
  id: number;
  title: string;
  author: string;
  thumbnail?: string | null;
  excerpt: string;
  publication: string;
  link: string;
  location: {
    type: "Point" | "Polygon";
    coordinates: number[] | number[][];
  };
}

export function FeatureInfo({ featureId, onClose }: Props) {
  const [feature, setFeature] = useState<Feature | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!featureId) {
      setFeature(null);
      return;
    }

    const fetchFeature = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/v1/feature/${featureId}`);
        if (!res.ok) {
          console.error(`API returned status: ${res.status}`);
          const errorText = await res.text();
          throw new Error(`Failed to fetch feature: ${errorText}`);
        }
        const data = await res.json();
        setFeature(data.feature);
      } catch (err) {
        console.error("Error fetching feature:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchFeature();
  }, [featureId]);

  // Helper for location display
  const renderLocation = (location: Feature["location"]) => {
    if (!location) return null;
    if (location.type === "Point") {
      const [lon, lat] = location.coordinates;
      return (
        <Typography>
          Sijainti: E {lon?.toFixed(0)}, N {lat?.toFixed(0)}
        </Typography>
      );
    }
    if (location.type === "Polygon") {
      return (
        <Typography>
          Sijainti: Alue (Polygon, {location.coordinates[0]?.length || 0}{" "}
          pistettä)
        </Typography>
      );
    }
    return null;
  };

  return (
    <Paper
      elevation={3}
      sx={{
        position: "absolute",
        top: { xs: 16, sm: 32 },
        right: { xs: 0, sm: 32 },
        left: { xs: 0, sm: "auto" },
        margin: { xs: "0 auto", sm: 0 },
        maxWidth: { xs: "95vw", sm: 400, md: 500 },
        width: { xs: "95vw", sm: "auto" },
        zIndex: 1200,
        padding: "1em",
        boxSizing: "border-box",
        maxHeight: "90vh",
        overflow: "auto",
        borderRadius: 3,
      }}
      data-cy="feature-detail"
    >
      {featureId && onClose && (
        <IconButton
          onClick={onClose}
          sx={{
            position: "absolute",
            top: 8,
            right: 8,
            width: 32,
            height: 32,
            backgroundColor: "rgba(0, 0, 0, 0.04)",
            "&:hover": {
              backgroundColor: "rgba(0, 0, 0, 0.08)",
            },
          }}
          size="small"
          aria-label="close"
        >
          <Close fontSize="small" />
        </IconButton>
      )}
      {loading ? (
        <Typography>Ladataan...</Typography>
      ) : feature ? (
        <>
          {feature.thumbnail && (
            <img
              src={feature.thumbnail}
              alt={feature.title}
              style={{
                width: "100%",
                maxWidth: 200,
                height: "auto",
                display: "block",
                marginBottom: 16,
                borderRadius: 8,
                objectFit: "cover",
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              }}
            />
          )}
          <Typography variant="h6">{feature.title}</Typography>
          <Typography variant="subtitle2" color="text.secondary">
            {feature.author} &middot; {feature.publication}
          </Typography>
          <Typography sx={{ mt: 1 }}>{feature.excerpt}</Typography>
          <Typography sx={{ mt: 1 }}>
            <Link href={feature.link} target="_blank" rel="noopener">
              Lue koko artikkeli
            </Link>
          </Typography>
          {renderLocation(feature.location)}
        </>
      ) : (
        <Typography>Valitse artikkeli vasemmalla olevasta listasta</Typography>
      )}
    </Paper>
  );
}
