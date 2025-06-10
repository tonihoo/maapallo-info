import { Paper, Typography, Link, Avatar } from "@mui/material";
import { useState, useEffect } from "react";

interface Props {
  featureId: number | null;
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
    coordinates: any;
  };
}

export function FeatureInfo({ featureId }: Props) {
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
          Sijainti: Alue (Polygon, {location.coordinates[0]?.length || 0} pistettä)
        </Typography>
      );
    }
    return null;
  };

  return (
    <Paper
      elevation={3}
      sx={{
        margin: "1em 0em 1em 0em",
        padding: "1em",
      }}
      data-cy="feature-detail"
    >
      {loading ? (
        <Typography>Ladataan...</Typography>
      ) : feature ? (
        <>
          {feature.thumbnail && (
            <Avatar
              src={feature.thumbnail}
              alt={feature.title}
              sx={{ width: 64, height: 64, mb: 1 }}
              variant="square"
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
