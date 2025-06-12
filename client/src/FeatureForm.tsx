import { Paper, Typography, TextField, Button, Box, FormControl, FormLabel, RadioGroup, FormControlLabel, Radio, FormHelperText, Alert } from "@mui/material";
import { useState, useEffect } from "react";
import { FeatureTypes } from "./types/featureTypes";

interface Props {
  coordinates: number[];
  onFeatureAdded?: (feature: FeatureTypes) => void;
}

interface FormData {
  name: string;
  age: string;
  gender: string;
}

interface FormErrors {
  name?: string;
  age?: string;
  gender?: string;
  location?: string;
}

export function FeatureForm({ coordinates, onFeatureAdded }: Props) {
  const [formData, setFormData] = useState<FormData>({
    name: "",
    age: "",
    gender: "",
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [locationSelected, setLocationSelected] = useState(false);

  // Update locationSelected state when coordinates change
  useEffect(() => {
    if (coordinates && coordinates.length === 2) {
      setLocationSelected(true);
      // Clear any location error if it exists
      if (errors.location) {
        setErrors(prevErrors => ({
          ...prevErrors,
          location: undefined
        }));
      }
    }
  }, [coordinates]);

  // Handler for text/number inputs
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });

    // Clear error when field is edited
    if (errors[name as keyof FormErrors]) {
      setErrors({
        ...errors,
        [name]: undefined
      });
    }
  };

  // Handler for radio button changes
  const handleRadioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });

    // Clear error when field is edited
    if (errors[name as keyof FormErrors]) {
      setErrors({
        ...errors,
        [name]: undefined
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Lisää nimi";
    }

    if (!formData.age) {
      newErrors.age = "Lisää ikä";
    } else if (isNaN(Number(formData.age)) || Number(formData.age) < 0) {
      newErrors.age = "Ikä täytyy olla positiivinen numero tai nolla";
    } else if (Number(formData.age) > 15) {
      newErrors.age = "Ikä ei voi olla yli 15 vuotta";
    }

    if (!formData.gender) {
      newErrors.gender = "Valitse sukupuoli";
    }

    if (!coordinates || coordinates.length !== 2) {
      newErrors.location = "Valitse sijainti kartalta klikkaamalla";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    setSubmitSuccess(false);

    try {
      const featureData = {
        name: formData.name,
        age: parseInt(formData.age),
        gender: formData.gender,
        location: {
          type: "Point" as const,
          coordinates: coordinates
        }
      };

      const response = await fetch("/api/v1/feature/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(featureData),
      });

      if (response.ok) {
        const result = await response.json();

        setSubmitSuccess(true);

        // Reset form
        setFormData({ name: "", age: "", gender: "" });
        setErrors({});

        // Pass the created feature data to parent
        if (onFeatureAdded && result.feature) {
          onFeatureAdded(result.feature);
        }
      } else {
        const errorData = await response.json();
        setErrors({
          location: errorData.message || "Virhe tallentaessa tietoja"
        });
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      setErrors({
        location: "Verkkovirhe. Yritä uudelleen."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Paper
      elevation={3}
      sx={{
        margin: "1em 0em 1em 0em",
        padding: "1em",
      }}
    >
      <Typography variant="h6" gutterBottom>
        Lisää uusi sijainti
      </Typography>

      {submitSuccess && (
        <Typography color="success.main" sx={{ mb: 2 }}>
          Sijainti lisätty onnistuneesti!
        </Typography>
      )}

      <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
        <TextField
          margin="normal"
          required
          fullWidth
          id="name"
          label="Nimi"
          name="name"
          value={formData.name}
          onChange={handleInputChange}
          error={!!errors.name}
          helperText={errors.name}
          disabled={isSubmitting}
        />

        <TextField
          margin="normal"
          required
          fullWidth
          id="age"
          label="Ikä"
          name="age"
          type="number"
          inputProps={{ min: 0, max: 15 }}
          value={formData.age}
          onChange={handleInputChange}
          error={!!errors.age}
          helperText={errors.age}
          disabled={isSubmitting}
        />

        <FormControl
          component="fieldset"
          margin="normal"
          required
          error={!!errors.gender}
          disabled={isSubmitting}
          sx={{ mt: 2, mb: 1 }}
        >
          <FormLabel component="legend">Sukupuoli</FormLabel>
          <RadioGroup
            name="gender"
            value={formData.gender}
            onChange={handleRadioChange}
            row
          >
            <FormControlLabel
              value="female"
              control={<Radio />}
              label="Naaras"
            />
            <FormControlLabel
              value="male"
              control={<Radio />}
              label="Uros"
            />
            <FormControlLabel
              value="unknown"
              control={<Radio />}
              label="Tuntematon"
            />
          </RadioGroup>
          {errors.gender && <FormHelperText>{errors.gender}</FormHelperText>}
        </FormControl>

        {/* Location Section */}
        <Box sx={{ mt: 2, mb: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            Sijainti
          </Typography>

          {locationSelected ? (
            <Box sx={{
              p: 2,
              borderRadius: 1,
              bgcolor: 'rgba(0, 178, 160, 0.1)',
              border: '1px solid #ffb34c'
            }}>
              <Typography variant="body2" gutterBottom>
                Sijainnin koordinaatit (WGS84):
              </Typography>
              <Typography variant="body1" fontFamily="monospace" fontWeight="medium">
                Pituus: {coordinates[0].toFixed(6)}°
                <br />
                Leveys: {coordinates[1].toFixed(6)}°
              </Typography>
            </Box>
          ) : (
            <Alert severity="info" sx={{ mb: 1 }}>
              Valitse sijainti kartalta klikkaamalla
            </Alert>
          )}

          {errors.location && (
            <FormHelperText error sx={{ ml: 1.5 }}>
              {errors.location}
            </FormHelperText>
          )}
        </Box>

        <Button
          type="submit"
          fullWidth
          variant="contained"
          sx={{ mt: 3, mb: 2, bgcolor: "#ffb34c", "&:hover": { bgcolor: "#008C80" } }}
          disabled={isSubmitting}
        >
          {isSubmitting ? "Tallennetaan..." : "Tallenna sijainti"}
        </Button>
      </Box>
    </Paper>
  );
}
