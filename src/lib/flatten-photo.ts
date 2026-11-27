// iPhones on iOS 26+ save HDR photos as JPEGs with a second, embedded gain-map image (a
// Multi-Picture "MPF" file). Older macOS Preview and some Windows viewers refuse to open them
// ("damaged or unknown format"), so before upload the form redraws such a photo as a plain JPEG.
// Anything else, and any photo the browser fails to redraw, is uploaded unchanged.

// Long edge cap for the redrawn photo: stays under iOS Safari's canvas size limit while keeping
// the full 4032 px of a normal iPhone photo.
const MAX_EDGE = 4032;

/** True if the JPEG's header carries an MPF segment (APP2 starting "MPF\0"), i.e. more than one image. */
export function hasMultiPicture(bytes: Uint8Array): boolean {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return false;
  let i = 2;
  while (i + 4 <= bytes.length) {
    if (bytes[i] !== 0xff) return false;
    const marker = bytes[i + 1];
    if (marker === 0xff) {
      i += 1; // fill byte
      continue;
    }
    if (marker === 0xda || marker === 0xd9) return false; // image data starts: header is over
    const length = (bytes[i + 2] << 8) | bytes[i + 3];
    if (length < 2) return false;
    if (
      marker === 0xe2 &&
      i + 8 <= bytes.length &&
      bytes[i + 4] === 0x4d && // M
      bytes[i + 5] === 0x50 && // P
      bytes[i + 6] === 0x46 && // F
      bytes[i + 7] === 0x00
    ) {
      return true;
    }
    i += 2 + length;
  }
  return false;
}

export async function flattenHdrPhoto(file: File): Promise<File> {
  if (file.type !== "image/jpeg") return file;
  try {
    // The MPF segment sits in the header, well inside the first 256 KB.
    const head = new Uint8Array(await file.slice(0, 256 * 1024).arrayBuffer());
    if (!hasMultiPicture(head)) return file;

    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.92),
    );
    if (!blob) return file;
    return new File([blob], file.name, { type: "image/jpeg", lastModified: file.lastModified });
  } catch {
    return file;
  }
}
