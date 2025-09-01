import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Alert,
  LinearProgress,
  Box,
  Typography,
} from "@mui/material";
import { adminService } from "../../services/adminService";

interface Props {
  open: boolean;
  onClose: () => void;
}

export const AdminImportDialog: React.FC<Props> = ({ open, onClose }) => {
  const [file, setFile] = useState<File | null>(null);
  const [layerName, setLayerName] = useState("");
  const [srid, setSrid] = useState(4326);
  const [error, setError] = useState<string | null>(null);
  type JobStatus = {
    job_id: string;
    layer_name: string;
    srid: number;
    status: "queued" | "running" | "completed" | "failed";
    total?: number;
    processed?: number;
    errors?: number;
    error?: string;
  } | null;
  const [result, setResult] = useState<JobStatus>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<{
    processed: number;
    total: number;
    status: string;
  } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
  };

  const handleUpload = async () => {
    setError(null);
    setResult(null);
    setProgress(null);
    if (!file || !layerName) {
      setError("Valitse .geojson ja anna kerroksen nimi");
      return;
    }
    setLoading(true);
    try {
      const res = await adminService.uploadGeoJSON(file, layerName, srid);
      const newJobId = res.job_id as string;
      // Start polling
      let isDone = false;
      while (!isDone) {
        const status = await adminService.getImportStatus(newJobId);
        setProgress({
          processed: status.processed ?? 0,
          total: status.total ?? 0,
          status: status.status,
        });
        if (status.status === "completed") {
          setResult(status);
          isDone = true;
        } else if (status.status === "failed") {
          setError(status.error || "Tuonti epäonnistui");
          isDone = true;
        } else {
          // wait before next poll
          await new Promise((r) => setTimeout(r, 1500));
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lataus epäonnistui");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setLayerName("");
    setSrid(4326);
    setError(null);
    setResult(null);
    setProgress(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Tuo GeoJSON tietokantaan</DialogTitle>
      <DialogContent>
        {loading && <LinearProgress sx={{ mb: 2 }} />}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {progress && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Tila: {progress.status}
            {progress.total
              ? ` — ${progress.processed}/${progress.total}`
              : null}
          </Alert>
        )}
        {result && result.status === "completed" && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Tuonti valmis. Prosessoitu {result.processed} kohdetta (virheet:{" "}
            {result.errors || 0}).
          </Alert>
        )}

        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Button variant="outlined" component="label">
            Valitse .geojson tiedosto
            <input
              type="file"
              accept=".geojson"
              hidden
              onChange={handleFileChange}
            />
          </Button>
          <Typography variant="body2" color="text.secondary">
            {file?.name || "Ei tiedostoa valittuna"}
          </Typography>

          <TextField
            label="Kerroksen nimi"
            value={layerName}
            onChange={(e) => setLayerName(e.target.value)}
            helperText="pienet kirjaimet, numerot ja alaviivat"
          />

          <TextField
            type="number"
            label="SRID"
            value={srid}
            onChange={(e) => setSrid(parseInt(e.target.value || "4326", 10))}
            helperText="Oletus 4326 (WGS84)"
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Sulje</Button>
        <Button variant="contained" onClick={handleUpload} disabled={loading}>
          Lataa
        </Button>
      </DialogActions>
    </Dialog>
  );
};
