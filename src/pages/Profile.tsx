import { useEffect, useState, useRef, useCallback } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Avatar,
  Stack,
  LinearProgress,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Slider,
  Card,
  CardContent,
  Switch,
} from "@mui/material";
import Cropper, { Area } from "react-easy-crop";
import { Camera, Sprout, Trash2, Bell, UserCircle } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../contexts/AuthContext";
import { palette } from "../theme";
import {
  requestPermission,
  getPermissionStatus,
} from "../lib/useNotifications";
import type { Profile, UserSettings } from "../types";

async function getCroppedImg(imageSrc: string, crop: Area): Promise<Blob> {
  const image = new Image();
  image.crossOrigin = "anonymous";
  image.src = imageSrc;
  await new Promise((res) => (image.onload = res));

  const canvas = document.createElement("canvas");
  canvas.width = crop.width;
  canvas.height = crop.height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    crop.width,
    crop.height,
  );
  return new Promise((resolve) =>
    canvas.toBlob((blob) => resolve(blob!), "image/jpeg", 0.9),
  );
}

export default function ProfilePage() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [dateFocused, setDateFocused] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [cropImage, setCropImage] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const [notifications, setNotifications] = useState(true);
  const [settingsSaving, setSettingsSaving] = useState(false);

  const onCropComplete = useCallback((_: Area, croppedArea: Area) => {
    setCroppedAreaPixels(croppedArea);
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          const p = data as Profile;
          setProfile(p);
          setName(p.name ?? "");
          setBirthDate(p.birth_date ?? "");
          setWeight(p.weight_kg != null ? String(p.weight_kg) : "");
          setHeight(p.height_cm != null ? String(p.height_cm) : "");
          setAvatarUrl(p.avatar_url);
        }
      });
    supabase
      .from("user_settings")
      .select("*")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          const s = data as UserSettings;
          setNotifications(s.notifications_enabled);
        }
      });
  }, [user]);

  const filledFields = [name, birthDate, weight, height, avatarUrl].filter(
    Boolean,
  ).length;
  const totalFields = 5;
  const completionPct = Math.round((filledFields / totalFields) * 100);

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCropImage(reader.result as string);
      setCropDialogOpen(true);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleCropConfirm() {
    if (!cropImage || !croppedAreaPixels || !user) return;
    setUploading(true);
    setUploadError(null);
    setCropDialogOpen(false);

    const croppedBlob = await getCroppedImg(cropImage, croppedAreaPixels);
    const path = `${user.id}/avatar`;

    const { error } = await supabase.storage
      .from("avatars")
      .upload(path, croppedBlob, { upsert: true, contentType: "image/jpeg" });

    if (error) {
      setUploadError(error.message);
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    const url = data.publicUrl;
    const urlWithCache = url + "?t=" + Date.now();
    setAvatarUrl(urlWithCache);
    await supabase.from("profiles").upsert({ id: user.id, avatar_url: url });
    setUploading(false);
    setCropImage(null);
    window.dispatchEvent(new Event("profile-updated"));
  }

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    setSuccess(false);

    const payload = {
      id: user.id,
      name: name || null,
      birth_date: birthDate || null,
      weight_kg: weight ? parseFloat(weight) : null,
      height_cm: height ? parseFloat(height) : null,
      avatar_url: avatarUrl,
    };

    await supabase.from("profiles").upsert(payload);
    setSaving(false);
    setSuccess(true);
    window.dispatchEvent(new Event("profile-updated"));
    setTimeout(() => setSuccess(false), 3000);
  }

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography
          sx={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: palette.verdeClaro,
            mb: 0.6,
          }}
        >
          Configurações da conta
        </Typography>
        <Typography
          sx={{
            fontFamily: "'Fraunces', Georgia, serif",
            fontWeight: 500,
            fontSize: 34,
            color: palette.texto,
            lineHeight: 1.1,
            mb: 0.6,
          }}
        >
          Meu perfil
        </Typography>
        <Typography fontSize={14} color="text.secondary">
          Atualize suas informações pessoais e preferências.
        </Typography>
      </Box>

      {profile && completionPct < 100 && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.8,
            bgcolor: "rgba(216,243,220,0.5)",
            border: "1px solid rgba(45,106,79,0.12)",
            borderRadius: 1,
            px: 2.2,
            py: 1.6,
            mb: 2,
          }}
        >
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: "50%",
              bgcolor: palette.menta,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Sprout size={18} color={palette.verde} />
          </Box>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography fontSize={13.5} fontWeight={600} color={palette.verde}>
              Falta pouco pra completar seu perfil
            </Typography>
            <Typography fontSize={12} color="text.secondary" sx={{ mb: 0.8 }}>
              Preencha os dados abaixo pra deixar o Broto mais seu.
            </Typography>
            <LinearProgress
              variant="determinate"
              value={completionPct}
              sx={{
                height: 6,
                borderRadius: 3,
                bgcolor: "rgba(45,106,79,0.12)",
                "& .MuiLinearProgress-bar": {
                  bgcolor: palette.verde,
                  borderRadius: 3,
                },
              }}
            />
          </Box>

          <Typography
            fontSize={15}
            fontWeight={700}
            color={palette.verde}
            sx={{ flexShrink: 0 }}
          >
            {completionPct}%
          </Typography>
        </Box>
      )}
      <Paper sx={{ p: 3, mb: 3 }} elevation={0}>
        <Stack spacing={3}>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 1,
            }}
          >
            <Box sx={{ position: "relative" }}>
              <Avatar
                src={avatarUrl ?? undefined}
                sx={{
                  width: 96,
                  height: 96,
                  bgcolor: palette.menta,
                  fontSize: 36,
                  color: palette.verde,
                }}
              >
                {name?.[0]?.toUpperCase() ||
                  user?.email?.[0]?.toUpperCase() ||
                  "?"}
              </Avatar>
              <IconButton
                size="small"
                onClick={() => fileInputRef.current?.click()}
                sx={{
                  position: "absolute",
                  bottom: 0,
                  right: 0,
                  bgcolor: palette.verde,
                  color: "#fff",
                  "&:hover": { bgcolor: palette.verdeClaro },
                  width: 30,
                  height: 30,
                }}
              >
                <Camera size={14} />
              </IconButton>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={handleAvatarUpload}
              />
            </Box>
            {uploading && (
              <Typography fontSize={12} color="text.secondary">
                Enviando...
              </Typography>
            )}
            {uploadError && (
              <Typography fontSize={12} color="error">
                Erro: {uploadError}
              </Typography>
            )}
            {avatarUrl && (
              <Button
                size="small"
                color="error"
                startIcon={<Trash2 size={14} />}
                onClick={async () => {
                  if (!user) return;
                  await supabase.storage
                    .from("avatars")
                    .remove([`${user.id}/avatar`]);
                  await supabase
                    .from("profiles")
                    .update({ avatar_url: null })
                    .eq("id", user.id);
                  setAvatarUrl(null);
                  window.dispatchEvent(new Event("profile-updated"));
                }}
                sx={{ fontSize: 12 }}
              >
                Remover foto
              </Button>
            )}
          </Box>

          {/* Campos */}
          <TextField
            label="Nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            placeholder="Como quer ser chamado(a)?"
          />
          <TextField
            label="Data de nascimento"
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            onFocus={() => setDateFocused(true)}
            onBlur={() => setDateFocused(false)}
            fullWidth
            InputLabelProps={{ shrink: dateFocused || !!birthDate }}
            sx={{
              '& input[type="date"]::-webkit-datetime-edit': {
                color: dateFocused || birthDate ? "inherit" : "transparent",
              },
            }}
          />
          <Stack direction="row" spacing={2}>
            <TextField
              label="Peso (kg)"
              type="number"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              fullWidth
              inputProps={{ step: 0.01, min: 0, inputMode: "decimal" }}
            />
            <TextField
              label="Altura (cm)"
              type="number"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              fullWidth
              inputProps={{ step: 0.01, min: 0, inputMode: "decimal" }}
            />
          </Stack>

          <Button
            variant="contained"
            size="large"
            onClick={handleSave}
            disabled={saving}
            fullWidth
          >
            {saving ? "Salvando..." : "Salvar"}
          </Button>
          {success && (
            <Typography color="success.main" fontSize={14} align="center">
              Perfil atualizado com sucesso!
            </Typography>
          )}
        </Stack>
      </Paper>

      {/* Notificações */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
          >
            <Stack direction="row" alignItems="center" spacing={2}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: "12px",
                  bgcolor: palette.laranja + "18",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Bell size={20} color={palette.laranja} />
              </Box>
              <Box>
                <Typography fontWeight={600}>Notificações</Typography>
                <Typography fontSize={13} color="text.secondary">
                  {getPermissionStatus() === "denied"
                    ? "Bloqueadas pelo navegador — ative nas configurações do dispositivo"
                    : "Lembretes de água, refeições e tarefas"}
                </Typography>
              </Box>
            </Stack>
            <Switch
              checked={notifications}
              disabled={getPermissionStatus() === "denied"}
              onChange={async (e) => {
                let value = e.target.checked;
                if (value && getPermissionStatus() !== "granted") {
                  const perm = await requestPermission();
                  if (perm !== "granted") {
                    value = false;
                  }
                }
                setNotifications(value);
                if (user) {
                  await supabase.from("user_settings").upsert({
                    id: user.id,
                    notifications_enabled: value,
                  });
                  window.dispatchEvent(new Event("notifications-changed"));
                }
              }}
              sx={{
                "& .MuiSwitch-switchBase.Mui-checked": {
                  color: palette.verde,
                },
                "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                  bgcolor: palette.verdeClaro,
                },
              }}
            />
          </Stack>
        </CardContent>
      </Card>

      {/* Conta */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack spacing={2}>
            <Stack direction="row" alignItems="center" spacing={2}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: "12px",
                  bgcolor: palette.verde + "18",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <UserCircle size={20} color={palette.verde} />
              </Box>
              <Box>
                <Typography fontWeight={600}>Conta</Typography>
                <Typography fontSize={13} color="text.secondary">
                  Informações da sua conta
                </Typography>
              </Box>
            </Stack>
            <Stack spacing={1} sx={{ pl: 7 }}>
              <Typography fontSize={14} color="text.secondary">
                E-mail: <strong>{user?.email}</strong>
              </Typography>
              <Typography fontSize={14} color="text.secondary">
                Membro desde:{" "}
                <strong>
                  {user?.created_at
                    ? new Date(user.created_at).toLocaleDateString("pt-BR")
                    : "—"}
                </strong>
              </Typography>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Dialog
        open={cropDialogOpen}
        onClose={() => setCropDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Ajustar foto</DialogTitle>
        <DialogContent sx={{ position: "relative", height: 350, p: 0 }}>
          {cropImage && (
            <Cropper
              image={cropImage}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, flexDirection: "column", gap: 1.5 }}>
          <Box sx={{ width: "100%", px: 1 }}>
            <Typography fontSize={12} color="text.secondary" sx={{ mb: 0.5 }}>
              Zoom
            </Typography>
            <Slider
              value={zoom}
              min={1}
              max={3}
              step={0.1}
              onChange={(_, value) => setZoom(value as number)}
              sx={{ color: palette.verde }}
            />
          </Box>
          <Stack direction="row" spacing={1.5} sx={{ width: "100%" }}>
            <Button
              onClick={() => setCropDialogOpen(false)}
              fullWidth
              variant="outlined"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCropConfirm}
              fullWidth
              variant="contained"
              disabled={uploading}
            >
              {uploading ? "Salvando..." : "Confirmar"}
            </Button>
          </Stack>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
