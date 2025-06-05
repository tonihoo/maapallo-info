import { Box, MenuItem, Paper, Typography } from "@mui/material";
import { Hedgehog } from "@shared/hedgehog";
import { useEffect, useState } from "react";

export default function HedgeHogList({
  onSelectHedgehog,
  selectedHedgehogId = null,
  refreshTrigger = 0,
}: {
  onSelectHedgehog: (id: number) => void;
  selectedHedgehogId?: number | null;
  refreshTrigger?: number;
}) {
  const [hedgehogs, setHedgehogs] = useState<Hedgehog[]>([]);

  // Fetch all hedgehog's during startup or when refreshTrigger changes
  useEffect(() => {
    const getAllHedgehogs = async () => {
      try {
        const res = await fetch("/api/v1/hedgehog");

        if (!res.ok) {
          console.error(`API responded with status: ${res.status}`);
          const errorText = await res.text();
          console.error("Error response:", errorText);
          return;
        }

        const json = await res.json();
        setHedgehogs(json?.hedgehogs || []);
      } catch (err) {
        console.error(`Error while fetching hedgehogs: ${err}`);
      }
    };

    getAllHedgehogs();
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
      {hedgehogs.length ? (
        <Box sx={{ overflowY: "scroll", height: "100%" }}>
          {hedgehogs.map((hedgehog) => (
            <MenuItem
              key={hedgehog.id}
              onClick={() => {
                if (hedgehog.id !== undefined) {
                  onSelectHedgehog(hedgehog.id);
                }
              }}
              selected={selectedHedgehogId === hedgehog.id}            >
              {hedgehog.name}
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
