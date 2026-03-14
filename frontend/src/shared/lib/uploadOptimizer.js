const COMPRESSIBLE_IMAGE_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/webp']);
const MAX_UPLOAD_IMAGE_BYTES = 1_500_000;
const MAX_UPLOAD_IMAGE_DIMENSION = 1800;
const UPLOAD_IMAGE_QUALITY = 0.82;

function canOptimizeUploadImage(file) {
  return (
    file instanceof File &&
    COMPRESSIBLE_IMAGE_TYPES.has(String(file.type || '').toLowerCase()) &&
    Number(file.size || 0) > MAX_UPLOAD_IMAGE_BYTES &&
    typeof window !== 'undefined' &&
    typeof document !== 'undefined' &&
    typeof window.URL?.createObjectURL === 'function'
  );
}

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = window.URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      window.URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      window.URL.revokeObjectURL(objectUrl);
      reject(new Error('Unable to decode upload image.'));
    };

    image.src = objectUrl;
  });
}

export async function optimizeBillUploadFile(file) {
  if (!canOptimizeUploadImage(file)) {
    return file;
  }

  try {
    const image = await loadImageFromFile(file);
    const sourceWidth = Number(image.naturalWidth || image.width || 0);
    const sourceHeight = Number(image.naturalHeight || image.height || 0);
    if (sourceWidth <= 0 || sourceHeight <= 0) {
      return file;
    }

    const longestEdge = Math.max(sourceWidth, sourceHeight);
    const scale = longestEdge > MAX_UPLOAD_IMAGE_DIMENSION ? MAX_UPLOAD_IMAGE_DIMENSION / longestEdge : 1;
    if (scale >= 1 && file.size <= MAX_UPLOAD_IMAGE_BYTES) {
      return file;
    }

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(sourceWidth * scale));
    canvas.height = Math.max(1, Math.round(sourceHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) {
      return file;
    }

    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const outputType = String(file.type || '').toLowerCase() === 'image/webp' ? 'image/webp' : 'image/jpeg';
    const blob = await new Promise((resolve) => {
      canvas.toBlob(resolve, outputType, UPLOAD_IMAGE_QUALITY);
    });

    if (!(blob instanceof Blob) || blob.size <= 0 || blob.size >= file.size) {
      return file;
    }

    return new File([blob], file.name, {
      type: outputType,
      lastModified: Number(file.lastModified || Date.now())
    });
  } catch {
    return file;
  }
}

