import { Close as CloseIcon } from "@mui/icons-material";
import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
} from "@mui/material";

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
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Typography variant="body1">
            Maapallo.info on karttaportaali, joka havainnollistaa
            maantieteellisiä ilmiöitä erityisesti globaalin kehityksen ja
            ympäristön näkökulmista. Portaalin suunnittelusta ja ylläpidosta
            vastaa <a href="https://kehmy.fi">Kehitysmaantieteen yhdistys</a>.
          </Typography>
          <Typography variant="body1">
            Pohjakartat ja karttakerrosten aineistot ovat peräisin avoimista
            lähteistä.
          </Typography>
          <Typography variant="body1">
            Portaalia kehitetään aktiivisesti ja siihen pyritään lisäämään
            useita uusia toiminnallisuuksia ja aineistoja lähitulevaisuudessa.
          </Typography>
          <Typography variant="body1">
            Palautetta ja parannusehdotuksia voi lähettää osoitteeseen{" "}
            <a href="mailto:kehmy.ry@gmail.com">kehmy.ry@gmail.com</a>.
          </Typography>
          <Typography variant="body1">
            Maapallo.info on rakennettu avoimen lähdekoodin työkaluilla ja sen
            koodi on{" "}
            <a
              href="https://github.com/tonihoo/maapallo-info"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHubissa
            </a>
            . Voit osallistua myös tekemällä oman pull requestin!
          </Typography>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
