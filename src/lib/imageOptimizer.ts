/**
 * Image Optimizer Utility for Dr. Roger POP
 * Automatically compresses, resizes, and optimizes images using HTML5 Canvas.
 * Keeps image sizes ultra-light (20KB - 80KB) to respect Firestore document size limits (1MB),
 * save user bandwidth, and prevent quota exhaustion while preserving high print quality for PDFs.
 */

export interface ImageOptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.1 to 1.0
  format?: 'image/jpeg' | 'image/webp' | 'image/png';
  maxSizeKb?: number; // Target max size in KB
}

export interface OptimizedImageResult {
  base64: string;
  originalSizeKb: number;
  optimizedSizeKb: number;
  width: number;
  height: number;
  format: string;
  reductionPercentage: number;
}

export async function optimizeImage(
  input: File | Blob | string,
  options: ImageOptimizationOptions = {}
): Promise<OptimizedImageResult> {
  const {
    maxWidth = 800,
    maxHeight = 600,
    quality = 0.8,
    format = 'image/jpeg',
    maxSizeKb = 120
  } = options;

  return new Promise((resolve, reject) => {
    const processImageSource = (src: string, originalSizeBytes: number) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        try {
          let { width, height } = img;

          // Calculate new dimensions respecting aspect ratio
          if (width > maxWidth || height > maxHeight) {
            const widthRatio = maxWidth / width;
            const heightRatio = maxHeight / height;
            const bestRatio = Math.min(widthRatio, heightRatio);
            width = Math.max(1, Math.round(width * bestRatio));
            height = Math.max(1, Math.round(height * bestRatio));
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d', { alpha: format === 'image/png' });
          if (!ctx) {
            throw new Error('Não foi possível obter o contexto de renderização Canvas');
          }

          // If JPEG, fill background with clean white for transparency preservation in prints
          if (format === 'image/jpeg') {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, width, height);
          }

          // Draw the resized image
          ctx.drawImage(img, 0, 0, width, height);

          // Initial compression
          let currentQuality = quality;
          let compressedBase64 = canvas.toDataURL(format, currentQuality);
          let base64Length = compressedBase64.length;
          let sizeInKb = Math.round((base64Length * 0.75) / 1024);

          // Iterative reduction if still exceeds target size
          let attempts = 0;
          while (sizeInKb > maxSizeKb && currentQuality > 0.4 && attempts < 4) {
            attempts++;
            currentQuality -= 0.12;
            compressedBase64 = canvas.toDataURL(format, Math.max(0.3, currentQuality));
            base64Length = compressedBase64.length;
            sizeInKb = Math.round((base64Length * 0.75) / 1024);
          }

          const origKb = Math.round(originalSizeBytes / 1024) || sizeInKb;
          const reduction = origKb > 0 ? Math.max(0, Math.round(((origKb - sizeInKb) / origKb) * 100)) : 0;

          resolve({
            base64: compressedBase64,
            originalSizeKb: origKb,
            optimizedSizeKb: sizeInKb,
            width,
            height,
            format,
            reductionPercentage: reduction
          });
        } catch (err) {
          reject(err);
        }
      };

      img.onerror = () => {
        reject(new Error('Falha ao processar arquivo de imagem. Verifique se o formato é válido.'));
      };

      img.src = src;
    };

    if (typeof input === 'string') {
      const approxBytes = Math.round(input.length * 0.75);
      processImageSource(input, approxBytes);
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        const src = e.target?.result as string;
        processImageSource(src, input.size);
      };
      reader.onerror = () => reject(new Error('Falha ao ler o arquivo selecionado.'));
      reader.readAsDataURL(input);
    }
  });
}
