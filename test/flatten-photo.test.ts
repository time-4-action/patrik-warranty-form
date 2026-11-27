import { describe, expect, it } from "vitest";
import { hasMultiPicture } from "@/lib/flatten-photo";

// SOI, then segments as [marker, payload], then SOS.
function jpeg(...segments: [number, number[]][]): Uint8Array {
  const out = [0xff, 0xd8];
  for (const [marker, payload] of segments) {
    const len = payload.length + 2;
    out.push(0xff, marker, len >> 8, len & 0xff, ...payload);
  }
  out.push(0xff, 0xda, 0x00, 0x02);
  return new Uint8Array(out);
}
const ascii = (s: string) => [...s].map((c) => c.charCodeAt(0));
const JFIF = ascii("JFIF\0\x01\x01\0\0\x01\0\x01\0\0");

describe("hasMultiPicture", () => {
  it("finds the MPF segment of an iPhone HDR photo", () => {
    expect(hasMultiPicture(jpeg([0xe0, JFIF], [0xe1, ascii("Exif\0\0")], [0xe2, ascii("MPF\0MM")]))).toBe(true);
  });

  it("ignores a plain JPEG and an ICC profile APP2", () => {
    expect(hasMultiPicture(jpeg([0xe0, JFIF]))).toBe(false);
    expect(hasMultiPicture(jpeg([0xe0, JFIF], [0xe2, ascii("ICC_PROFILE\0")]))).toBe(false);
  });

  it("does not look past the start of the image data", () => {
    const bytes = jpeg([0xe0, JFIF]);
    const tail = new Uint8Array([0xff, 0xe2, 0x00, 0x08, ...ascii("MPF\0MM")]);
    expect(hasMultiPicture(new Uint8Array([...bytes, ...tail]))).toBe(false);
  });

  it("rejects non-JPEG and truncated input", () => {
    expect(hasMultiPicture(new Uint8Array(ascii("%PDF-1.3")))).toBe(false);
    expect(hasMultiPicture(new Uint8Array([0xff, 0xd8, 0xff]))).toBe(false);
  });
});
