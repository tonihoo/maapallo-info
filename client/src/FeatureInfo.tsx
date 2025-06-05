import { Paper, Typography } from "@mui/material";
import { useState, useEffect } from "react";

interface Props {
  featureId: number | null;
}

interface Feature {
  id: number;
  name: string;
  age: number;
  gender: 'female' | 'male' | 'unknown';
  location: {
    type: 'Point';
    coordinates: [number, number];
  };
}

const genderTranslations: Record<string, string> = {
  female: 'Naaras',
  male: 'Uros',
  unknown: 'Tuntematon'
};

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
          <Typography variant="h6">{feature.name}</Typography>
          <Typography data-cy="feature-age-display">Ikä: {feature.age}</Typography>
          <Typography data-cy="feature-gender-display">
            Sukupuoli: {genderTranslations[feature.gender]}
          </Typography>
          <Typography>
            Sijainti: E {feature.location.coordinates[0].toFixed(0)}, N {feature.location.coordinates[1].toFixed(0)}
          </Typography>
        </>
      ) : (
        <Typography>Valitse sijainti vasemmalla olevasta listasta</Typography>
      )}
    </Paper>
  );
}
