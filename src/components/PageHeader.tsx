import { Box, Typography } from "@mui/material";
import { palette } from "../theme";

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}

export default function PageHeader({
  eyebrow,
  title,
  subtitle,
}: PageHeaderProps) {
  return (
    <Box sx={{ mb: 3 }}>
      {eyebrow && (
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
          {eyebrow}
        </Typography>
      )}
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
        {title}
      </Typography>
      {subtitle && (
        <Typography fontSize={14} color="text.secondary">
          {subtitle}
        </Typography>
      )}
    </Box>
  );
}
