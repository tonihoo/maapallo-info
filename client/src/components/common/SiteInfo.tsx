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
  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby="info-dialog-title"
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle
        id="info-dialog-title"
        sx={{ bgcolor: "#e8f5e9", color: "#2e7d32", fontWeight: 600 }}
      >
        Tietoja
      </DialogTitle>
      <DialogContent
        sx={{ bgcolor: "#fafafa", fontSize: "16px", color: "#333" }}
      >
        <p>
          Sivuston kehityksestä ja ylläpidosta vastaa{" "}
          <a href="https://kehmy.fi">Kehitysmaantieteen yhdistys</a>.
        </p>
        <p>
          Pohjakartat ja karttakerrosten aineistot ovat peräisin avoimista
          lähteistä.
        </p>
        <p>Sivusto on rakennettu kokonaan avoimen lähdekoodin työkaluilla.</p>
        <p>
          Sivustoa kehitetään aktiivisesti ja siihen pyritään lisäämään useita
          uusia toiminnallisuuksia lähitulevaisuudessa.
        </p>
        <p>
          Palautetta ja parannusehdotuksia voi lähettää osoitteeseen
          kehmy.ry@gmail.com.
        </p>
      </DialogContent>
      <DialogActions sx={{ bgcolor: "#e8f5e9" }}>
        <Button onClick={onClose} variant="contained" color="success">
          Sulje
        </Button>
      </DialogActions>
    </Dialog>
  );
}
