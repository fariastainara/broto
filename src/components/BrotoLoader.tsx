import { Box, Typography } from "@mui/material";
import { motion } from "framer-motion";
import { palette } from "../theme";

interface BrotoLoaderProps {
  label?: string;
  fullScreen?: boolean;
}

export default function BrotoLoader({
  label = "Preparando seu espaço",
  fullScreen = true,
}: BrotoLoaderProps) {
  return (
    <Box
      sx={{
        minHeight: fullScreen ? "100vh" : "auto",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
        bgcolor: fullScreen ? palette.creme : "transparent",
        py: fullScreen ? 0 : 8,
      }}
    >
      <svg width="76" height="76" viewBox="0 0 64 64">
        <motion.path
          d="M32 46 V30"
          stroke={palette.menta}
          strokeWidth="3"
          strokeLinecap="round"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.path
          d="M32 30 C20 30 16 20 16 14 C24 14 32 18 32 30 Z"
          fill={palette.verdeClaro}
          style={{ transformOrigin: "32px 30px" }}
          animate={{ rotate: [-4, 4, -4], scale: [1, 1.04, 1] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.path
          d="M32 34 C44 34 48 24 48 18 C40 18 32 22 32 34 Z"
          fill="#74C69D"
          style={{ transformOrigin: "32px 34px" }}
          animate={{ rotate: [4, -4, 4], scale: [1, 1.04, 1] }}
          transition={{
            duration: 1.8,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.15,
          }}
        />
        <motion.circle
          cx="32"
          cy="47"
          r="3"
          fill={palette.laranja}
          style={{ transformOrigin: "32px 47px" }}
          animate={{ scale: [1, 1.35, 1] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        />
      </svg>

      <Typography
        sx={{
          fontFamily: "'Fraunces', Georgia, serif",
          fontStyle: "italic",
          fontWeight: 500,
          fontSize: 16,
          color: palette.verde,
        }}
      >
        {label}
        <motion.span
          style={{ display: "inline-block", marginLeft: 2 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 1.4, repeat: Infinity, times: [0, 0.5, 1] }}
        >
          ...
        </motion.span>
      </Typography>
    </Box>
  );
}
