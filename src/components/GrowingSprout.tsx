import { Box } from "@mui/material";

interface GrowingSproutProps {
  /** Progresso de 0 a 1 (0% a 100%) */
  progress: number;
  size?: number;
}

/**
 * Broto animado que cresce de acordo com o progresso do dia.
 * Estágios: semente → broto pequeno → broto com 1 folha → broto com 2 folhas → planta florida
 */
export default function GrowingSprout({
  progress,
  size = 64,
}: GrowingSproutProps) {
  // Definir estágio: 0-0.2 semente, 0.2-0.4 broto, 0.4-0.6 uma folha, 0.6-0.8 duas folhas, 0.8-1 flor
  const stage =
    progress >= 0.8
      ? 4
      : progress >= 0.6
        ? 3
        : progress >= 0.4
          ? 2
          : progress >= 0.2
            ? 1
            : 0;

  return (
    <Box
      sx={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        style={{ overflow: "visible" }}
      >
        {/* Solo */}
        <ellipse cx="32" cy="58" rx="14" ry="4" fill="#D4A574" opacity={0.3} />

        {/* Semente */}
        {stage === 0 && (
          <>
            <ellipse cx="32" cy="52" rx="5" ry="4" fill="#8B6F47" />
            <ellipse cx="32" cy="51" rx="3.5" ry="2.5" fill="#A0845C" />
          </>
        )}

        {/* Broto saindo da terra */}
        {stage === 1 && (
          <>
            <path
              d="M32 56 V44"
              stroke="#52B788"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <ellipse cx="32" cy="44" rx="3" ry="2" fill="#74C69D" />
          </>
        )}

        {/* Uma folha */}
        {stage === 2 && (
          <>
            <path
              d="M32 56 V36"
              stroke="#52B788"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <path
              d="M32 40 C24 40 20 34 20 30 C26 30 32 34 32 40 Z"
              fill="#52B788"
            />
          </>
        )}

        {/* Duas folhas */}
        {stage === 3 && (
          <>
            <path
              d="M32 56 V28"
              stroke="#52B788"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <path
              d="M32 36 C22 36 18 28 18 24 C26 24 32 28 32 36 Z"
              fill="#52B788"
            />
            <path
              d="M32 30 C42 30 46 22 46 18 C38 18 32 22 32 30 Z"
              fill="#74C69D"
            />
          </>
        )}

        {/* Planta florida */}
        {stage === 4 && (
          <>
            <path
              d="M32 56 V22"
              stroke="#52B788"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <path
              d="M32 36 C22 36 18 28 18 24 C26 24 32 28 32 36 Z"
              fill="#52B788"
            />
            <path
              d="M32 28 C42 28 46 20 46 16 C38 16 32 20 32 28 Z"
              fill="#74C69D"
            />
            {/* Florzinha */}
            <circle cx="32" cy="18" r="4" fill="#E07A3A" opacity={0.9} />
            <circle cx="32" cy="18" r="2" fill="#F4A261" />
            {/* Folhinha extra */}
            <path
              d="M32 42 C24 42 22 36 22 33 C28 33 32 37 32 42 Z"
              fill="#40916C"
              opacity={0.7}
            />
          </>
        )}
      </svg>
    </Box>
  );
}
