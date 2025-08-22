import { useState, useEffect } from "react";
import {
  Paper,
  Typography,
  Button,
  Box,
  Slide,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { analytics } from "../../utils/analytics";
import { CookiePreferences } from "./CookiePreferences";

export const CookieConsent = () => {
  const [showConsent, setShowConsent] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  useEffect(() => {
    const consent = localStorage.getItem("cookie-consent");
    if (!consent) {
      // Show consent banner after a short delay
      const timer = setTimeout(() => setShowConsent(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    analytics.enable();
    setShowConsent(false);

    // Track initial page view after consent
    analytics.trackPageView(window.location.pathname);
  };

  const handleDecline = () => {
    analytics.disable();
    setShowConsent(false);
  };

  const handlePreferencesClick = () => {
    setPreferencesOpen(true);
  };

  return (
    <>
      <Slide direction="up" in={showConsent} mountOnEnter unmountOnExit>
        <Paper
          elevation={8}
          sx={{
            position: "fixed",
            bottom: 20,
            left: isMobile ? 16 : 20,
            right: isMobile ? 16 : 20,
            maxWidth: isMobile ? "auto" : 600,
            p: 3,
            zIndex: 2000,
            backgroundColor: "rgba(255, 255, 255, 0.98)",
            backdropFilter: "blur(8px)",
            border: "2px solid #4caf50",
            borderRadius: 2,
          }}
        >
          <Typography variant="h6" gutterBottom sx={{ color: "#2e7d32" }}>
            🍪 Evästeet ja yksityisyys
          </Typography>

          <Typography variant="body2" gutterBottom sx={{ mb: 2 }}>
            Käytämme evästeitä sivuston käytön analysointiin ja käyttökokemuksen
            parantamiseen. Emme kerää henkilötietoja tai jaa tietoja kolmansille
            osapuolille.
          </Typography>

          <Typography
            variant="body2"
            gutterBottom
            sx={{ mb: 2, fontStyle: "italic" }}
          >
            Seuraamme vain: sivuvierailut, kartan käyttö (2D/3D) ja
            ominaisuuksien suosio. Kaikki tiedot ovat nimettömiä ja
            GDPR-yhteensopivia.
          </Typography>

          <Box
            sx={{
              display: "flex",
              gap: 2,
              mt: 2,
              flexDirection: isMobile ? "column" : "row",
            }}
          >
            <Button
              variant="contained"
              onClick={handleAccept}
              sx={{
                bgcolor: "#4caf50",
                "&:hover": { bgcolor: "#388e3c" },
                flex: isMobile ? 1 : "auto",
              }}
            >
              Hyväksy evästeet
            </Button>

            <Button
              variant="outlined"
              onClick={handleDecline}
              sx={{
                borderColor: "#757575",
                color: "#757575",
                "&:hover": {
                  borderColor: "#424242",
                  color: "#424242",
                  bgcolor: "rgba(0,0,0,0.04)",
                },
                flex: isMobile ? 1 : "auto",
              }}
            >
              Kieltäydy
            </Button>
          </Box>

          <Typography
            variant="caption"
            sx={{ display: "block", mt: 2, color: "#757575" }}
          >
            Voit muuttaa valintaasi milloin tahansa{" "}
            <Typography
              component="span"
              variant="caption"
              sx={{
                color: "#4caf50",
                textDecoration: "underline",
                cursor: "pointer",
                "&:hover": { color: "#388e3c" },
              }}
              onClick={handlePreferencesClick}
            >
              sivuston asetuksista
            </Typography>
            .
          </Typography>
        </Paper>
      </Slide>

      {/* Cookie Preferences Dialog */}
      <CookiePreferences
        open={preferencesOpen}
        onClose={() => setPreferencesOpen(false)}
      />
    </>
  );
};
