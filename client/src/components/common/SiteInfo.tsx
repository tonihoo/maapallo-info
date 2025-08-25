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
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";

interface SiteInfoProps {
  open: boolean;
  onClose: () => void;
}

export default function SiteInfo({ open, onClose }: SiteInfoProps) {
  const handleCancel = () => {
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
        Tietoja
        <IconButton onClick={handleCancel} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        <Typography variant="body1" gutterBottom>
          <p>
            Maapallo.infon kehityksestä ja ylläpidosta vastaa{" "}
            <a href="https://kehmy.fi">Kehitysmaantieteen yhdistys</a>.
          </p>
          <p>
            Pohjakartat ja karttakerrosten aineistot ovat peräisin avoimista
            lähteistä.
          </p>
          <p>Sivusto on rakennettu avoimen lähdekoodin työkaluilla.</p>
          <p>
            Sivustoa kehitetään aktiivisesti ja siihen pyritään lisäämään useita
            uusia toiminnallisuuksia ja aineistoja lähitulevaisuudessa.
          </p>
          <p>
            Palautetta ja parannusehdotuksia voi lähettää osoitteeseen{" "}
            <a href="mailto:kehmy.ry@gmail.com">kehmy.ry@gmail.com</a>.
          </p>
        </Typography>
      </DialogContent>
    </Dialog>
  );
}
