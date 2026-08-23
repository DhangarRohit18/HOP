import jsQR from 'jsqr';

/**
 * NEXUS LOCAL QR DECODER ADAPTER (100% LOCAL BROWSER IN-MEMORY PROCESSING)
 * Privacy Guarantee:
 * - 0 frames uploaded to server
 * - 0 network calls executed
 * - 0 image data saved/stored
 * - Returns raw decoded string payload or null
 */
export const decodeQrFromImageData = (imageData: ImageData): string | null => {
  if (!imageData || !imageData.data || imageData.width <= 0 || imageData.height <= 0) {
    return null;
  }
  try {
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert',
    });
    return code ? code.data : null;
  } catch (e) {
    return null;
  }
};
