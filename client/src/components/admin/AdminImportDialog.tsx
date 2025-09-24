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
  Chip,
} from "@mui/material";
import {
  GeoServerAdminService,
  GeoServerImportStatus,
} from "../../services/geoServerAdminService";

interface Props {
  open: boolean;
  onClose: () => void;
}

export const AdminImportDialog: React.FC<Props> = ({ open, onClose }) => {
  const [file, setFile] = useState<File | null>(null);
  const [layerName, setLayerName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GeoServerImportStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<GeoServerImportStatus | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
  };

  const handleUpload = async () => {
    setError(null);
    setResult(null);
    setProgress(null);

    if (!file || !layerName) {
      setError("Valitse .geojson tiedosto ja anna kerroksen nimi");
      return;
    }

    // Validate layer name
    if (!/^[a-zA-Z0-9_-]+$/.test(layerName)) {
      setError(
        "Kerroksen nimi saa sisältää vain kirjaimia, numeroita, viivoja ja alaviivoja"
      );
      return;
    }

    setLoading(true);

    try {
      // Use GeoServer import workflow
      const finalResult = await GeoServerAdminService.importFile(
        file,
        layerName,
        (status: GeoServerImportStatus) => {
          setProgress(status);
        }
      );

      setResult(finalResult);

      if (finalResult.status === "completed") {
        setProgress({
          status: "completed",
          message: `✅ Tuonti valmis! ${finalResult.featuresCount} kohdetta tuotu onnistuneesti.`,
          layerName: finalResult.layerName,
          featuresCount: finalResult.featuresCount,
        });
      } else if (finalResult.status === "failed") {
        setError(
          finalResult.error || "Tuonti epäonnistui tuntemattomasta syystä"
        );
      }
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : "Tuonti epäonnistui";
      setError(errorMessage);
      setProgress({
        status: "failed",
        error: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setLayerName("");
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
            Valitse .geojson tiedosto (max 200MB)
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
            label="Karttakerroksen nimi"
            value={layerName}
            onChange={(e) => setLayerName(e.target.value)}
            fullWidth
            margin="normal"
            required
          />

          <Button
            variant="contained"
            component="label"
            fullWidth
            sx={{ my: 2 }}
          >
            Valitse GeoJSON-tiedosto
            <input
              type="file"
              hidden
              accept=".geojson,.json"
              onChange={handleFileChange}
            />
          </Button>

          {file && (
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              Valittu: {file.name}
            </Typography>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {result && (
            <Alert severity="success" sx={{ mb: 2 }}>
              Karttakerros "{result.layerName}" tuotu onnistuneesti!
            </Alert>
          )}

          {progress && (
            <Box sx={{ mb: 2 }}>
              <Alert severity="info" sx={{ mb: 1 }}>
                {progress.stage}
              </Alert>
              <LinearProgress
                variant="determinate"
                value={progress.progress}
                sx={{ mb: 1 }}
              />
              <Typography variant="body2" color="textSecondary">
                {progress.message}
              </Typography>
            </Box>
          )}

          <Button
            variant="contained"
            onClick={handleUpload}
            disabled={!file || !layerName || progress !== null}
            fullWidth
          >
            {progress ? "Tuodaan..." : "Vie tiedosto GeoServerille"}
          </Button>
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
