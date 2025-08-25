import { useState } from "react";
import {
  IconButton,
  Drawer,
  Box,
  List,
  ListItemButton,
  ListItemText,
  Collapse,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import FeatureList from "./FeatureList";
import { CookiePreferences } from "./CookiePreferences";
import InfoIcon from "@mui/icons-material/Info";
import ArticleIcon from "@mui/icons-material/Article";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import { Settings as SettingsIcon } from "@mui/icons-material";
import { Box, MenuItem, Paper, Typography, Divider } from "@mui/material";

interface Props {
  onSelectFeature: (id: number) => void;
  selectedFeatureId?: number | null;
  refreshTrigger?: number;
  is3DMode?: boolean;
  onPreferencesClick?: () => void;
}

export function HeaderMenu({
  onSelectFeature,
  selectedFeatureId,
  refreshTrigger,
  is3DMode,
  onPreferencesClick,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [articlesOpen, setArticlesOpen] = useState(false);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleFeatureSelect = (id: number) => {
    onSelectFeature(id);
    setIsOpen(false); // Close menu after selection
  };

  const handlePreferencesClick = () => {
    setPreferencesOpen(true);
    setIsOpen(false); // Close menu when opening preferences
  };

  return (
    <>
      {/* Hamburger Menu Button */}
      <IconButton
        onClick={handleToggle}
        sx={{
          position: "fixed",
          top: "2px", // On top of header to match 2D/3D toggle
          left: "16px",
          zIndex: 1200,
          backgroundColor: is3DMode
            ? "rgba(126, 199, 129, 0.9)" // Same green as header in 3D mode
            : "rgba(255, 179, 76, 0.9)", // Same orange as header in 2D mode
          color: "black",
          width: "38px", // Same size as 2D/3D toggle on mobile
          height: "38px", // Same size as 2D/3D toggle on mobile
          "&:hover": {
            backgroundColor: is3DMode
              ? "rgba(126, 199, 129, 1)" // Solid green on hover in 3D mode
              : "rgba(255, 179, 76, 1)", // Solid orange on hover in 2D mode
          },
          boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
        }}
      >
        <MenuIcon />
      </IconButton>

      {/* Drawer with Feature List and new menu items */}
      <Drawer
        anchor="left"
        open={isOpen}
        onClose={() => setIsOpen(false)}
        sx={{
          "& .MuiDrawer-paper": {
            width: "300px",
            maxWidth: "80vw",
            backgroundColor: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(8px)",
          },
        }}
        // Add inert attribute when Drawer is closed
        {...(!isOpen ? { inert: "true" } : {})}
      >
        <Box sx={{ height: "100%", paddingTop: "16px" }}>
          <List>
            {/* Tietoja */}
            <ListItemButton
              onClick={() => {
                const infoWindow = window.open(
                  "",
                  "_blank",
                  "width=480,height=220"
                );
                if (infoWindow) {
                  infoWindow.document.write(`
                    <html>
                      <head>
                        <title>Tietoja</title>
                        <style>
                          body { font-family: Arial, sans-serif; padding: 24px; background: #f9f9f9; }
                          h2 { margin-top: 0; color: #2e7d32; }
                          p { font-size: 16px; color: #333; }
                        </style>
                      </head>
                      <body>
                        <h2>Tietoja</h2>
                        <p>Sivuston suunnittelusta, kehityksestä ja ylläpidosta vastaa Kehitysmaantieteen yhdistys.</p>
                      </body>
                    </html>
                  `);
                  infoWindow.document.close();
                }
              }}
            >
              <InfoIcon sx={{ mr: 1 }} />
              <ListItemText primary="Tietoja" />
            </ListItemButton>
            {/* Maapallo-lehden artikkeleita */}
            <ListItemButton onClick={() => setArticlesOpen(!articlesOpen)}>
              <ArticleIcon sx={{ mr: 1 }} />
              <ListItemText primary="Maapallo-lehden artikkeleita" />
              {articlesOpen ? <ExpandLess /> : <ExpandMore />}
            </ListItemButton>
            <Collapse in={articlesOpen} timeout="auto" unmountOnExit>
              <Box sx={{ bgcolor: "#d2eac7", py: 1, px: 2 }}>
                <FeatureList
                  onSelectFeature={handleFeatureSelect}
                  selectedFeatureId={selectedFeatureId}
                  refreshTrigger={refreshTrigger}
                  is3DMode={is3DMode}
                  // Removed onPreferencesClick from FeatureList
                />
              </Box>
            </Collapse>
          </List>
          {/* Preferences Menu Item - shown even when no features */}
          {/* <Divider sx={{ mx: 2, mb: 1 }} /> */}
          <MenuItem
            onClick={() => {
              setPreferencesOpen(true);
              setIsOpen(false);
            }}
            sx={{
              //   display: "flex",
              //   alignItems: "center",
              gap: 1,
              //   py: 1.5,
              //   mx: 1,
            }}
          >
            <SettingsIcon sx={{ fontSize: "1.2rem" }} />
            <ListItemText primary="Evästeasetukset" />
            {/* <Typography variant="body2">Evästeasetukset</Typography> */}
          </MenuItem>
        </Box>
      </Drawer>
      {/* Add CookiePreferences dialog */}
      <CookiePreferences
        open={preferencesOpen}
        onClose={() => setPreferencesOpen(false)}
      />
    </>
  );
}
