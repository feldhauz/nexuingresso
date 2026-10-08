import QRCode from "qrcode";

/** QR em SVG, sempre preto no branco para o leitor da portaria, inclusive no tema escuro. */
export function QrCode({ value, className }: { value: string; className?: string }) {
  const { size, data } = QRCode.create(value, { errorCorrectionLevel: "M" }).modules;
  const margin = 2;
  let path = "";
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (data[y * size + x]) path += `M${x + margin} ${y + margin}h1v1h-1z`;
    }
  }
  const box = size + margin * 2;
  return (
    <svg viewBox={`0 0 ${box} ${box}`} className={className} role="img" aria-label="QR Code do ingresso" shapeRendering="crispEdges">
      <rect width={box} height={box} fill="#ffffff" />
      <path d={path} fill="#000000" />
    </svg>
  );
}
