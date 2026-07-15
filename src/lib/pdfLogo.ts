/** Renderiza a logo completa (ícone + texto) via canvas com a fonte Fraunces */
export async function renderLogoImage(): Promise<string> {
  await document.fonts.ready;

  const scale = 4;
  const w = 160;
  const h = 36;
  const canvas = document.createElement("canvas");
  canvas.width = w * scale;
  canvas.height = h * scale;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(scale, scale);

  // Fundo do ícone (rounded rect)
  const iconSize = 28;
  const radius = iconSize * 0.26;
  const ix = 0;
  const iy = (h - iconSize) / 2;
  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.beginPath();
  ctx.moveTo(ix + radius, iy);
  ctx.lineTo(ix + iconSize - radius, iy);
  ctx.quadraticCurveTo(ix + iconSize, iy, ix + iconSize, iy + radius);
  ctx.lineTo(ix + iconSize, iy + iconSize - radius);
  ctx.quadraticCurveTo(
    ix + iconSize,
    iy + iconSize,
    ix + iconSize - radius,
    iy + iconSize,
  );
  ctx.lineTo(ix + radius, iy + iconSize);
  ctx.quadraticCurveTo(ix, iy + iconSize, ix, iy + iconSize - radius);
  ctx.lineTo(ix, iy + radius);
  ctx.quadraticCurveTo(ix, iy, ix + radius, iy);
  ctx.closePath();
  ctx.fill();

  // Broto SVG centrado
  const cx = ix + iconSize / 2;
  const cy = iy + iconSize / 2;
  const s = (iconSize * 0.48) / 64;

  // Caule
  ctx.strokeStyle = "#D8F3DC";
  ctx.lineWidth = 3 * s;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(cx, cy + (46 - 32) * s);
  ctx.lineTo(cx, cy + (30 - 32) * s);
  ctx.stroke();

  // Folha esquerda
  ctx.fillStyle = "#52B788";
  ctx.beginPath();
  ctx.moveTo(cx, cy + (30 - 32) * s);
  ctx.bezierCurveTo(
    cx + (20 - 32) * s,
    cy + (30 - 32) * s,
    cx + (16 - 32) * s,
    cy + (20 - 32) * s,
    cx + (16 - 32) * s,
    cy + (14 - 32) * s,
  );
  ctx.bezierCurveTo(
    cx + (24 - 32) * s,
    cy + (14 - 32) * s,
    cx,
    cy + (18 - 32) * s,
    cx,
    cy + (30 - 32) * s,
  );
  ctx.closePath();
  ctx.fill();

  // Folha direita
  ctx.fillStyle = "#74C69D";
  ctx.beginPath();
  ctx.moveTo(cx, cy + (34 - 32) * s);
  ctx.bezierCurveTo(
    cx + (44 - 32) * s,
    cy + (34 - 32) * s,
    cx + (48 - 32) * s,
    cy + (24 - 32) * s,
    cx + (48 - 32) * s,
    cy + (18 - 32) * s,
  );
  ctx.bezierCurveTo(
    cx + (40 - 32) * s,
    cy + (18 - 32) * s,
    cx,
    cy + (22 - 32) * s,
    cx,
    cy + (34 - 32) * s,
  );
  ctx.closePath();
  ctx.fill();

  // Ponto laranja
  ctx.fillStyle = "#E07A3A";
  ctx.beginPath();
  ctx.arc(cx, cy + (47 - 32) * s, 3 * s, 0, Math.PI * 2);
  ctx.fill();

  // Texto "broto"
  ctx.font = "italic 500 20px Fraunces, Georgia, serif";
  ctx.fillStyle = "#ffffff";
  ctx.textBaseline = "middle";
  ctx.fillText("broto", iconSize + 6, h / 2 + 1);

  return canvas.toDataURL("image/png");
}
