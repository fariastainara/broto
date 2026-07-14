import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  Stack,
  Link as MLink,
  CircularProgress,
} from "@mui/material";
import Logo from "../components/Logo";
import { useAuth } from "../contexts/AuthContext";
import { palette } from "../theme";

export default function Login() {
  const { signInWithPassword, signUp } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"entrar" | "criar">("entrar");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);

    if (mode === "entrar") {
      const { error } = await signInWithPassword(email, password);
      setBusy(false);
      if (error) setError(error);
      else navigate("/");
    } else {
      const { error } = await signUp(email, password);
      setBusy(false);
      if (error) setError(error);
      else navigate("/");
    }
  }

  return (
    <Box
      sx={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: palette.verde,
        p: 2,
      }}
    >
      <Paper sx={{ p: 4, width: "100%", maxWidth: 380, borderRadius: 2 }}>
        <Box sx={{ display: "flex", justifyContent: "center", mb: 1 }}>
          <Logo size={56} />
        </Box>
        <Typography align="center" color="text.secondary" sx={{ mb: 3 }}>
          Seu diário, suas metas, seu ritmo.
        </Typography>

        <form onSubmit={handleSubmit}>
          <Stack spacing={2}>
            {error && <Alert severity="error">{error}</Alert>}
            {info && <Alert severity="success">{info}</Alert>}
            <TextField
              label="E-mail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              fullWidth
            />
            <TextField
              label="Senha"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              fullWidth
              inputProps={{ minLength: 6 }}
            />
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={busy}
              fullWidth
            >
              {busy ? (
                <CircularProgress size={24} sx={{ color: "white" }} />
              ) : mode === "entrar" ? (
                "Entrar"
              ) : (
                "Criar conta"
              )}
            </Button>
          </Stack>
        </form>

        <Typography align="center" sx={{ mt: 3, fontSize: 14 }}>
          {mode === "entrar" ? (
            <>
              Ainda não tem conta?{" "}
              <MLink component="button" onClick={() => setMode("criar")}>
                Criar conta
              </MLink>
            </>
          ) : (
            <>
              Já tem conta?{" "}
              <MLink component="button" onClick={() => setMode("entrar")}>
                Entrar
              </MLink>
            </>
          )}
        </Typography>
      </Paper>
    </Box>
  );
}
