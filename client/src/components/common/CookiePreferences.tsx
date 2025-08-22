import { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Button,
  Switch,
  FormControlLabel,
  Box,
  Divider,
  IconButton,
  Alert,
} from "@mui/material";
import { Close as CloseIcon } from "@mui/icons-material";
import { analytics } from "../../utils/analytics";

interface CookiePreferencesProps {
  open: boolean;
  onClose: () => void;
}

export const CookiePreferences = ({
  open,
  onClose,
}: CookiePreferencesProps) => {
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookie-consent");
    setAnalyticsEnabled(consent === "accepted");
  }, [open]);

  const handleAnalyticsToggle = (enabled: boolean) => {
    setAnalyticsEnabled(enabled);
    setHasChanges(true);
  };

  const handleSave = () => {
    if (analyticsEnabled) {
      analytics.enable();
      // Track initial page view if analytics was just enabled
      analytics.trackPageView(window.location.pathname);
    } else {
      analytics.disable();
    }
    setHasChanges(false);
    onClose();
  };

  const handleCancel = () => {
    // Reset to current state
    const consent = localStorage.getItem("cookie-consent");
    setAnalyticsEnabled(consent === "accepted");
    setHasChanges(false);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleCancel}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          border: "2px solid #4caf50",
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          color: "#2e7d32",
          pb: 1,
        }}
      >
        🍪 Evästeasetukset
        <IconButton onClick={handleCancel} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        <Typography variant="body1" gutterBottom>
          Hallitse evästeiden käyttöä sivustolla. Voit muuttaa asetuksia milloin
          tahansa.
        </Typography>

        <Divider sx={{ my: 2 }} />

        {/* Essential Cookies - Always enabled */}
        <Box sx={{ mb: 3 }}>
          <FormControlLabel
            control={
              <Switch
                checked={true}
                disabled={true}
                sx={{
                  "& .MuiSwitch-switchBase.Mui-checked": {
                    color: "#4caf50",
                  },
                  "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                    backgroundColor: "#4caf50",
                  },
                }}
              />
            }
            label={
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Välttämättömät evästeet
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Näitä evästeitä tarvitaan sivuston perustoimintojen käyttöön.
                  Ne eivät sisällä henkilötietoja ja niitä ei voi poistaa
                  käytöstä.
                </Typography>
              </Box>
            }
            sx={{ alignItems: "flex-start", mb: 2 }}
          />
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Analytics Cookies */}
        <Box sx={{ mb: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={analyticsEnabled}
                onChange={(e) => handleAnalyticsToggle(e.target.checked)}
                sx={{
                  "& .MuiSwitch-switchBase.Mui-checked": {
                    color: "#4caf50",
                  },
                  "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                    backgroundColor: "#4caf50",
                  },
                }}
              />
            }
            label={
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Analytiikkaevästeet
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Auttavat meitä ymmärtämään, miten sivustoa käytetään. Keräämme
                  vain nimettömiä tietoja: sivuvierailut, kartan käyttö ja
                  ominaisuuksien suosio.
                </Typography>
              </Box>
            }
            sx={{ alignItems: "flex-start" }}
          />
        </Box>

        {analyticsEnabled && (
          <Alert severity="info" sx={{ mt: 2, mb: 2 }}>
            <Typography variant="body2">
              📊 <strong>Mitä seuraamme:</strong>
              <br />
              • Sivuvierailut ja suositut sivut
              <br />
              • Kartan käyttö (2D/3D vaihdot)
              <br />
              • Kartassa klikkaus ominaisuuksien suosio
              <br />• Käyttäjän maa (vain maa-koodi, ei tarkkaa sijaintia)
            </Typography>
          </Alert>
        )}

        <Alert severity="success" sx={{ mt: 2 }}>
          <Typography variant="body2">
            🔒 <strong>Yksityisyys:</strong> Kaikki tiedot ovat
            GDPR-yhteensopivia. IP-osoitteet ja käyttäjätunnisteet suojataan
            hash-algoritmilla. Emme myy tai jaa tietoja kolmansille osapuolille.
          </Typography>
        </Alert>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 1 }}>
        <Button
          onClick={handleCancel}
          variant="outlined"
          sx={{
            borderColor: "#757575",
            color: "#757575",
          }}
        >
          Peruuta
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={!hasChanges}
          sx={{
            bgcolor: "#4caf50",
            "&:hover": { bgcolor: "#388e3c" },
            "&:disabled": {
              bgcolor: "#e0e0e0",
              color: "#9e9e9e",
            },
          }}
        >
          Tallenna asetukset
        </Button>
      </DialogActions>
    </Dialog>
  );
};
