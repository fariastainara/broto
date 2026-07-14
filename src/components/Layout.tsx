import { ReactNode, useRef } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  AppBar,
  Toolbar,
  Box,
  IconButton,
  useMediaQuery,
  Tabs,
  Tab,
  Container,
  Menu,
  MenuItem,
  Avatar,
  Typography,
  Divider,
} from "@mui/material";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  UtensilsCrossed,
  Flag,
  ListChecks,
  GraduationCap,
  LogOut,
  User,
} from "lucide-react";
import { motion } from "framer-motion";
import Logo from "./Logo";
import { useAuth } from "../contexts/AuthContext";
import { palette } from "../theme";
import { supabase } from "../lib/supabaseClient";
import { useNotifications } from "../lib/useNotifications";
import type { Profile } from "../types";

const NAV_ITEMS = [
  { label: "Dashboard", path: "/", icon: LayoutDashboard },
  { label: "Diário", path: "/diario", icon: UtensilsCrossed },
  { label: "Estudos", path: "/estudos", icon: GraduationCap },
  { label: "Tarefas", path: "/tarefas", icon: ListChecks },
  { label: "Metas", path: "/metas", icon: Flag },
];

export default function Layout({ children }: { children?: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const isMobile = useMediaQuery("(max-width:720px)");
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileVersion, setProfileVersion] = useState(0);
  const [pullRefreshing, setPullRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const touchStartY = useRef(0);
  const isPulling = useRef(false);

  // Carregar preferência de notificações
  useEffect(() => {
    if (!user) return;
    const loadNotifPref = () => {
      supabase
        .from("user_settings")
        .select("notifications_enabled")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          if (data) setNotificationsEnabled(data.notifications_enabled);
        });
    };
    loadNotifPref();
    window.addEventListener("notifications-changed", loadNotifPref);
    return () =>
      window.removeEventListener("notifications-changed", loadNotifPref);
  }, [user]);

  // Ativar notificações
  useNotifications(user?.id, notificationsEnabled);

  // Pull to refresh
  useEffect(() => {
    const THRESHOLD = 80;
    const MAX_PULL = 120;

    const onTouchStart = (e: TouchEvent) => {
      if (window.scrollY === 0 && !pullRefreshing) {
        touchStartY.current = e.touches[0].clientY;
        isPulling.current = true;
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!isPulling.current) return;
      const diff = e.touches[0].clientY - touchStartY.current;
      if (diff > 0) {
        setPullDistance(Math.min(diff, MAX_PULL));
      }
    };
    const onTouchEnd = () => {
      if (isPulling.current && pullDistance >= THRESHOLD && !pullRefreshing) {
        setPullRefreshing(true);
        setPullDistance(THRESHOLD);
        window.dispatchEvent(new CustomEvent("pull-refresh"));
        setTimeout(() => {
          setPullRefreshing(false);
          setPullDistance(0);
        }, 1200);
      } else {
        setPullDistance(0);
      }
      isPulling.current = false;
    };

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: true });
    document.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, [pullDistance, pullRefreshing]);

  useEffect(() => {
    const handler = () => setProfileVersion((v) => v + 1);
    window.addEventListener("profile-updated", handler);
    return () => window.removeEventListener("profile-updated", handler);
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data) setProfile(data as Profile);
      });
  }, [user, location.pathname, profileVersion]);

  const profileFields = profile
    ? [
        profile.name,
        profile.birth_date,
        profile.weight_kg,
        profile.height_cm,
        profile.avatar_url,
      ]
    : [];
  const profilePct = profile
    ? Math.round((profileFields.filter(Boolean).length / 5) * 100)
    : 0;

  const currentIndex = Math.max(
    0,
    NAV_ITEMS.findIndex((i) => i.path === location.pathname),
  );

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: palette.creme,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Pull-to-refresh indicator */}
      {(pullDistance > 0 || pullRefreshing) && (
        <Box
          sx={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
            zIndex: 9999,
            pt: "env(safe-area-inset-top)",
          }}
        >
          <Box
            sx={{
              width: 36,
              height: 36,
              mt: `${Math.min(pullDistance * 0.4, 32)}px`,
              borderRadius: "50%",
              bgcolor: "#fff",
              boxShadow: "0 2px 12px rgba(45,106,79,0.18)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: pullRefreshing ? "none" : "margin-top 0.1s",
            }}
          >
            <Box
              component="span"
              sx={{
                display: "inline-block",
                fontSize: 18,
                animation: pullRefreshing
                  ? "spin 0.8s linear infinite"
                  : "none",
                transform: `rotate(${pullDistance * 3}deg)`,
                "@keyframes spin": {
                  "0%": { transform: "rotate(0deg)" },
                  "100%": { transform: "rotate(360deg)" },
                },
              }}
            >
              🌱
            </Box>
          </Box>
        </Box>
      )}

      <AppBar
        position="sticky"
        color="transparent"
        elevation={0}
        sx={{ bgcolor: palette.verde, pt: "env(safe-area-inset-top)" }}
      >
        <Toolbar sx={{ justifyContent: "space-between" }}>
          <Box onClick={() => navigate("/")} sx={{ cursor: "pointer" }}>
            <Logo color="white" size={34} />
          </Box>

          {!isMobile && (
            <Box
              sx={{
                display: "flex",
                gap: 0.3,
                bgcolor: "rgba(255,255,255,0.1)",
                borderRadius: "14px",
                p: 0.5,
              }}
            >
              {NAV_ITEMS.map((item, index) => {
                const Icon = item.icon;
                const active = index === currentIndex;
                return (
                  <Box
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    sx={{
                      position: "relative",
                      display: "flex",
                      alignItems: "center",
                      gap: 0.8,
                      px: 1.8,
                      py: 0.9,
                      borderRadius: "10px",
                      cursor: "pointer",
                      zIndex: 1,
                    }}
                  >
                    {active && (
                      <motion.div
                        layoutId="desktop-nav-highlight"
                        transition={{
                          type: "spring",
                          stiffness: 500,
                          damping: 35,
                        }}
                        style={{
                          position: "absolute",
                          inset: 0,
                          borderRadius: 10,
                          background: "rgba(255,255,255,0.18)",
                          zIndex: -1,
                        }}
                      />
                    )}
                    <Icon
                      size={15}
                      color={active ? "#fff" : "rgba(255,255,255,0.65)"}
                      strokeWidth={active ? 2.2 : 1.8}
                    />
                    <Box
                      component="span"
                      sx={{
                        fontSize: 13.5,
                        fontWeight: active ? 600 : 500,
                        color: active ? "#fff" : "rgba(255,255,255,0.75)",
                      }}
                    >
                      {item.label}
                    </Box>
                  </Box>
                );
              })}
            </Box>
          )}

          <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
            <Box sx={{ position: "relative", width: 38, height: 38 }}>
              {/* Progress ring */}
              <svg
                width={38}
                height={38}
                style={{ position: "absolute", top: 0, left: 0 }}
              >
                <circle
                  cx={19}
                  cy={19}
                  r={17}
                  fill="none"
                  stroke="rgba(255,255,255,0.2)"
                  strokeWidth={2.5}
                />
                <circle
                  cx={19}
                  cy={19}
                  r={17}
                  fill="none"
                  stroke={palette.laranja}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeDasharray={`${(profilePct / 100) * 2 * Math.PI * 17} ${2 * Math.PI * 17}`}
                  transform="rotate(-90 19 19)"
                />
              </svg>
              <Box
                sx={{
                  position: "absolute",
                  top: 4,
                  left: 4,
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  bgcolor: "rgba(255,255,255,0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#fff",
                  overflow: "hidden",
                }}
              >
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt=""
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  (user?.email?.[0]?.toUpperCase() ?? "?")
                )}
              </Box>
            </Box>
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={!!anchorEl}
            onClose={() => setAnchorEl(null)}
            slotProps={{
              paper: {
                sx: {
                  mt: 1,
                  minWidth: 230,
                  borderRadius: 1,
                  boxShadow: "0 12px 32px rgba(45,106,79,0.16)",
                  border: "1px solid rgba(45,106,79,0.08)",
                  overflow: "hidden",
                },
              },
            }}
          >
            <Box sx={{ px: 2.2, py: 1.6 }}>
              <Typography
                fontSize={10.5}
                color="text.secondary"
                sx={{
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  mb: 0.3,
                }}
              >
                Conectado como
              </Typography>
              <Typography
                fontSize={13.5}
                fontWeight={600}
                color={palette.texto}
                noWrap
              >
                {user?.email}
              </Typography>
            </Box>

            <Divider sx={{ mx: 1.2, borderColor: "rgba(0,0,0,0.06)" }} />

            <Box sx={{ p: 1 }}>
              <MenuItem
                onClick={() => {
                  setAnchorEl(null);
                  navigate("/perfil");
                }}
                sx={{ gap: 1.4, px: 1.5, py: 1.1, borderRadius: 2.5 }}
              >
                <User size={16} color={palette.verde} />
                <Typography fontSize={13.5}>Meu perfil</Typography>
              </MenuItem>

              <MenuItem
                onClick={async () => {
                  setAnchorEl(null);
                  await signOut();
                  navigate("/login");
                }}
                sx={{ gap: 1.4, px: 1.5, py: 1.1, borderRadius: 2.5 }}
              >
                <LogOut size={16} color={palette.laranja} />
                <Typography
                  fontSize={13.5}
                  color={palette.laranja}
                  fontWeight={500}
                >
                  Sair
                </Typography>
              </MenuItem>
            </Box>
          </Menu>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ flex: 1, py: 3, pb: isMobile ? 14 : 3 }}>
        {children ?? <Outlet />}
      </Container>

      {isMobile && (
        <>
          {/* Gradiente de fade antes do menu */}
          <Box
            sx={{
              position: "fixed",
              bottom: 0,
              left: 0,
              right: 0,
              height: 100,
              background:
                "linear-gradient(to top, rgba(255,255,255,1) 0%, rgba(255,255,255,0.95) 40%, rgba(255,255,255,0) 100%)",
              pointerEvents: "none",
              zIndex: 9,
            }}
          />
          <Box
            sx={{
              position: "fixed",
              bottom: 20,
              left: 20,
              right: 20,
              zIndex: 10,
            }}
          >
            <Box
              sx={{
                display: "flex",
                bgcolor: "rgba(255,255,255,0.92)",
                backdropFilter: "blur(20px)",
                borderRadius: "20px",
                boxShadow: "0 4px 20px rgba(45,106,79,0.10)",
                border: "1px solid rgba(45,106,79,0.06)",
                px: 1,
                py: 1,
              }}
            >
              {NAV_ITEMS.map((item, index) => {
                const Icon = item.icon;
                const active = index === currentIndex;
                return (
                  <Box
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    sx={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 0.5,
                      cursor: "pointer",
                    }}
                  >
                    <motion.div
                      animate={{
                        backgroundColor: active
                          ? palette.menta
                          : "rgba(0,0,0,0)",
                        scale: active ? 1 : 0.94,
                      }}
                      transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 30,
                      }}
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Icon
                        size={17}
                        color={active ? palette.verde : palette.cinza}
                        strokeWidth={active ? 2.3 : 1.8}
                      />
                    </motion.div>
                    <Box
                      component="span"
                      sx={{
                        fontSize: 10.5,
                        fontWeight: active ? 600 : 500,
                        color: active ? palette.verde : palette.cinza,
                        transition: "color 0.2s, font-weight 0.2s",
                      }}
                    >
                      {item.label}
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </Box>
        </>
      )}
    </Box>
  );
}
