/**
 * Recorta a imagem pelo centro na proporção pedida e reduz para o tamanho máximo, em JPEG.
 * Roda no navegador antes do envio: a foto de 5 MB do celular vira um arquivo leve.
 */
export async function cropToJpeg(file: File, width: number, height: number): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const ratio = width / height;
  const cropWidth = Math.min(bitmap.width, bitmap.height * ratio);
  const cropHeight = cropWidth / ratio;
  const scale = Math.min(1, width / cropWidth);

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(cropWidth * scale);
  canvas.height = Math.round(cropHeight * scale);
  canvas
    .getContext("2d")!
    .drawImage(
      bitmap,
      (bitmap.width - cropWidth) / 2,
      (bitmap.height - cropHeight) / 2,
      cropWidth,
      cropHeight,
      0,
      0,
      canvas.width,
      canvas.height,
    );
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("canvas"))), "image/jpeg", 0.82),
  );
}

/** Reduz a imagem sem recortar, até o lado maior caber em `maxSide`. Para fotos de documento. */
export async function shrinkToJpeg(file: File, maxSide: number): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("canvas"))), "image/jpeg", 0.8),
  );
}
