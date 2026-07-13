import { Box, Typography, Stack } from "@mui/material";

interface LogoProps {
  size?: number;
  showWordmark?: boolean;
  color?: "default" | "white";
}

/**
 * Marca do Broto: um broto (sprout) de duas folhas assimétricas,
 * com um "caule" que remete a progresso/crescimento e um ponto
 * laranja na base — o mesmo acento usado no plano alimentar,
 * simbolizando o pequeno hábito diário que faz a planta crescer.
 */

export default function Logo({
  size = 36,
  showWordmark = true,
  color = "default",
}: LogoProps) {
  const isWhite = color === "white";
  return (
    <Stack direction="row" alignItems="center" spacing={1.2}>
      <Box
        sx={{
          width: size * 0.78,
          height: size * 0.78,
          borderRadius: "26%",
          background: isWhite ? "rgba(255,255,255,0.15)" : "#2D6A4F",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <svg width={size * 0.48} height={size * 0.48} viewBox="0 0 64 64">
          <path
            d="M32 46 V30"
            stroke="#D8F3DC"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M32 30 C20 30 16 20 16 14 C24 14 32 18 32 30 Z"
            fill="#52B788"
          />
          <path
            d="M32 34 C44 34 48 24 48 18 C40 18 32 22 32 34 Z"
            fill="#74C69D"
          />
          <circle cx="32" cy="47" r="3" fill="#E07A3A" />
        </svg>
      </Box>
      {showWordmark && (
        <Typography
          sx={{
            fontFamily: "'Fraunces', Georgia, serif",
            fontStyle: "italic",
            fontWeight: 500,
            fontSize: size * 0.58,
            letterSpacing: "-0.01em",
            color: isWhite ? "white" : "#1C2B20",
            lineHeight: 1,
            fontVariationSettings: `'opsz' 28`,
          }}
        >
          broto
        </Typography>
      )}
    </Stack>
  );
}
