export async function compressImageToDataUrl(
  file: Blob,
  maxDimension = 1400,
  quality = 0.82
): Promise<string> {
  // Preserve SVG logos directly if under 500KB
  if (file.type === 'image/svg+xml' && file.size < 500_000) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('Failed to read SVG file'));
      reader.readAsDataURL(file);
    });
  }

  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;
      if (width > maxDimension || height > maxDimension) {
        if (width >= height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context unavailable'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      // Keep PNG transparency for logos; use WebP/JPEG for photos
      const isPng = file.type === 'image/png';
      const outputType = isPng ? 'image/png' : 'image/webp';
      let dataUrl = canvas.toDataURL(outputType, quality);

      // Fallback if PNG is too large for Firestore document
      if (dataUrl.length > 750_000) {
        dataUrl = canvas.toDataURL('image/webp', 0.72);
      }
      if (dataUrl.length > 750_000) {
        dataUrl = canvas.toDataURL('image/jpeg', 0.65);
      }

      resolve(dataUrl);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to decode image'));
    };
    img.src = objectUrl;
  });
}
