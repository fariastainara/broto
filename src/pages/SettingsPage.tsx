import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Stack,
  Button,
  Switch,
} from "@mui/material";
import { Settings, Bell } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../contexts/AuthContext";
import { palette } from "../theme";
import {
  requestPermission,
  getPermissionStatus,
} from "../lib/useNotifications";
import type { UserSettings } from "../types";

export default function SettingsPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [notifications, setNotifications] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("user_settings")
      .select("*")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          const s = data as UserSettings;
          setSettings(s);
          setNotifications(s.notifications_enabled);
        }
      });
  }, [user]);

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    setSuccess(false);

    await supabase.from("user_settings").upsert({
      id: user.id,
      notifications_enabled: notifications,
      theme: "light",
    });

    setSaving(false);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  }

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
        <Settings size={28} color={palette.verde} />
        <Typography variant="h4">Configurações</Typography>
      </Stack>

      <Stack spacing={3}>
        {/* Notificações */}
        <Card>
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
                  window.dispatchEvent(new Event("notifications-changed"));
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
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Conta
            </Typography>
            <Stack spacing={1}>
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
          </CardContent>
        </Card>

        <Button
          variant="contained"
          size="large"
          onClick={handleSave}
          disabled={saving}
          fullWidth
        >
          {saving ? "Salvando..." : "Salvar configurações"}
        </Button>
        {success && (
          <Typography color="success.main" fontSize={14} align="center">
            Configurações salvas com sucesso!
          </Typography>
        )}
      </Stack>
    </Box>
  );
}
