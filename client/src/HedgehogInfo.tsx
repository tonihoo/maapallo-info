import { Paper, Typography } from "@mui/material";
import { useState, useEffect } from "react";

interface Props {
  hedgehogId: number | null;
}

interface Hedgehog {
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

export function HedgehogInfo({ hedgehogId }: Props) {
  const [hedgehog, setHedgehog] = useState<Hedgehog | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!hedgehogId) {
      setHedgehog(null);
      return;
    }

    const fetchHedgehog = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/v1/hedgehog/${hedgehogId}`);

        if (!res.ok) {
          console.error(`API returned status: ${res.status}`);
          const errorText = await res.text();
          throw new Error(`Failed to fetch hedgehog: ${errorText}`);
        }

        const data = await res.json();
        setHedgehog(data.hedgehog);
      } catch (err) {
        console.error("Error fetching hedgehog:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchHedgehog();
  }, [hedgehogId]);

  return (
    <Paper
      elevation={3}
      sx={{
        margin: "1em 0em 1em 0em",
        padding: "1em",
      }}
      data-cy="hedgehog-detail"
    >
      {loading ? (
        <Typography>Ladataan...</Typography>
      ) : hedgehog ? (
        <>
          <Typography variant="h6">{hedgehog.name}</Typography>
          <Typography data-cy="hedgehog-age-display">Ikä: {hedgehog.age}</Typography>
          <Typography data-cy="hedgehog-gender-display">
            Sukupuoli: {genderTranslations[hedgehog.gender]}
          </Typography>
          <Typography>
            Sijainti: E {hedgehog.location.coordinates[0].toFixed(0)}, N {hedgehog.location.coordinates[1].toFixed(0)}
          </Typography>
        </>
      ) : (
        <Typography>Valitse sijainti vasemmalla olevasta listasta</Typography>
      )}
    </Paper>
  );
}
