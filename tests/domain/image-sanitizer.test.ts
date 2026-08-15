import { describe, it, expect } from "vitest";
import { stripImageMetadata } from "@/domain/clinical/image-sanitizer";
import { detectImageType } from "@/domain/clinical/condition-photo";

// --- Construtores de fixtures binárias (byte a byte, sem dependências) ---

function jpegSegment(marker: number, payload: number[]): number[] {
  const length = payload.length + 2;
  return [0xff, marker, (length >> 8) & 0xff, length & 0xff, ...payload];
}

/** JPEG mínimo: SOI + segmentos + SOS + dados + EOI. */
function jpegBytes(segments: number[][]): Uint8Array {
  return new Uint8Array([
    0xff, 0xd8,
    ...segments.flat(),
    ...jpegSegment(0xda, [0x01, 0x02]),
    0xaa, 0xbb, 0xcc,
    0xff, 0xd9,
  ]);
}

const EXIF_APP1 = jpegSegment(0xe1, [0x45, 0x78, 0x69, 0x66, 0x00, 0x00, 0x99]); // "Exif\0\0" + GPS fake
const JFIF_APP0 = jpegSegment(0xe0, [0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01]);
const COMMENT = jpegSegment(0xfe, [0x6f, 0x69]);
const DQT = jpegSegment(0xdb, [0x00, 0x43]);

function pngChunk(type: string, payload: number[]): number[] {
  const typeBytes = [...type].map((c) => c.charCodeAt(0));
  const len = payload.length;
  return [
    (len >> 24) & 0xff, (len >> 16) & 0xff, (len >> 8) & 0xff, len & 0xff,
    ...typeBytes,
    ...payload,
    0, 0, 0, 0, // CRC não validado pelo sanitizer
  ];
}

function pngBytes(chunks: number[][]): Uint8Array {
  return new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ...chunks.flat(),
  ]);
}

const IHDR = pngChunk("IHDR", Array.from({ length: 13 }, () => 1));
const IDAT = pngChunk("IDAT", [5, 6, 7]);
const IEND = pngChunk("IEND", []);
const TEXT = pngChunk("tEXt", [0x47, 0x50, 0x53]);

function webpChunk(fourcc: string, payload: number[]): number[] {
  const bytes = [...fourcc].map((c) => c.charCodeAt(0));
  const size = payload.length;
  const padded = size % 2 === 1 ? [...payload, 0] : payload;
  return [...bytes, size & 0xff, (size >> 8) & 0xff, (size >> 16) & 0xff, (size >> 24) & 0xff, ...padded];
}

function webpBytes(chunks: number[][]): Uint8Array {
  const body = chunks.flat();
  const riffSize = body.length + 4; // + "WEBP"
  return new Uint8Array([
    0x52, 0x49, 0x46, 0x46, // RIFF
    riffSize & 0xff, (riffSize >> 8) & 0xff, (riffSize >> 16) & 0xff, (riffSize >> 24) & 0xff,
    0x57, 0x45, 0x42, 0x50, // WEBP
    ...body,
  ]);
}

const includesSubsequence = (haystack: Uint8Array, needle: number[]): boolean => {
  outer: for (let i = 0; i <= haystack.length - needle.length; i += 1) {
    for (let j = 0; j < needle.length; j += 1) {
      if (haystack[i + j] !== needle[j]) continue outer;
    }
    return true;
  }
  return false;
};

describe("Feature: Remoção de metadados de imagem (SEC1-05..09)", () => {
  it("Dado JPEG com APP1 (EXIF) e COM, Quando sanitizar, Então remove metadados e preserva APP0/DQT/SOS (SEC1-05)", () => {
    const input = jpegBytes([EXIF_APP1, JFIF_APP0, COMMENT, DQT]);

    const output = stripImageMetadata(input).data;

    expect(includesSubsequence(output, EXIF_APP1)).toBe(false);
    expect(includesSubsequence(output, COMMENT)).toBe(false);
    expect(includesSubsequence(output, JFIF_APP0)).toBe(true);
    expect(includesSubsequence(output, DQT)).toBe(true);
    expect(detectImageType(output)).toBe("image/jpeg");
    expect(Array.from(output.subarray(output.length - 2))).toEqual([0xff, 0xd9]);
  });

  it("Dado PNG com tEXt, Quando sanitizar, Então remove o chunk e preserva IHDR/IDAT/IEND (SEC1-06)", () => {
    const input = pngBytes([IHDR, TEXT, IDAT, IEND]);

    const output = stripImageMetadata(input).data;

    expect(includesSubsequence(output, TEXT)).toBe(false);
    expect(includesSubsequence(output, IHDR)).toBe(true);
    expect(includesSubsequence(output, IDAT)).toBe(true);
    expect(includesSubsequence(output, IEND)).toBe(true);
    expect(detectImageType(output)).toBe("image/png");
  });

  it("Dado WebP com VP8X + EXIF + XMP, Quando sanitizar, Então remove chunks, zera flags e corrige tamanho RIFF (SEC1-07)", () => {
    const vp8x = webpChunk("VP8X", [0x0c, 0, 0, 0, 1, 0, 0, 1, 0, 0]); // flags EXIF|XMP
    const vp8 = webpChunk("VP8 ", [1, 2, 3, 4]);
    const exif = webpChunk("EXIF", [9, 9, 9]);
    const xmp = webpChunk("XMP ", [8, 8]);
    const input = webpBytes([vp8x, vp8, exif, xmp]);

    const output = stripImageMetadata(input).data;

    expect(includesSubsequence(output, [0x45, 0x58, 0x49, 0x46])).toBe(false); // "EXIF"
    expect(includesSubsequence(output, [0x58, 0x4d, 0x50, 0x20])).toBe(false); // "XMP "
    expect(detectImageType(output)).toBe("image/webp");
    // Flags do VP8X zeradas (byte 8 do chunk VP8X = primeiro byte de payload).
    expect(output[12 + 8]).toBe(0x00);
    // Tamanho RIFF = total − 8.
    const riffSize = output[4] | (output[5] << 8) | (output[6] << 16) | (output[7] << 24);
    expect(riffSize).toBe(output.length - 8);
  });

  it("Dado WebP simples sem VP8X e sem metadados, Quando sanitizar, Então conteúdo preservado (edge case)", () => {
    const vp8 = webpChunk("VP8 ", [1, 2, 3, 4]);
    const input = webpBytes([vp8]);

    const output = stripImageMetadata(input).data;

    expect(includesSubsequence(output, vp8)).toBe(true);
    expect(detectImageType(output)).toBe("image/webp");
  });

  it("Dado imagem sem metadados, Quando sanitizar, Então conteúdo de imagem intacto (SEC1-08)", () => {
    const input = jpegBytes([JFIF_APP0, DQT]);

    const output = stripImageMetadata(input).data;

    expect(Array.from(output)).toEqual(Array.from(input));
  });

  it("Dado bytes que não são imagem suportada, Quando sanitizar, Então devolve original (SEC1-09)", () => {
    const input = new Uint8Array([1, 2, 3, 4]);

    expect(stripImageMetadata(input).data).toBe(input);
  });

  it("Dado JPEG com bytes de preenchimento 0xFF antes do marcador, Quando sanitizar, Então ainda remove o EXIF", () => {
    // ITU-T T.81 permite qualquer número de 0xFF antes do marcador.
    const input = new Uint8Array([
      0xff, 0xd8,
      0xff, 0xff, 0xff, ...EXIF_APP1.slice(1),
      ...jpegSegment(0xda, [0x01, 0x02]),
      0xaa, 0xbb,
      0xff, 0xd9,
    ]);

    const output = stripImageMetadata(input).data;

    expect(includesSubsequence(output, [0x45, 0x78, 0x69, 0x66])).toBe(false); // "Exif"
    expect(detectImageType(output)).toBe("image/jpeg");
  });

  it("Dado JPEG com ICC (APP2) e Adobe (APP14), Quando sanitizar, Então preserva a cor e remove só o EXIF", () => {
    const icc = jpegSegment(0xe2, [0x49, 0x43, 0x43, 0x5f]); // "ICC_"
    const adobe = jpegSegment(0xee, [0x41, 0x64, 0x6f, 0x62, 0x65]); // "Adobe"
    const input = jpegBytes([EXIF_APP1, icc, adobe]);

    const output = stripImageMetadata(input).data;

    expect(includesSubsequence(output, icc)).toBe(true);
    expect(includesSubsequence(output, adobe)).toBe(true);
    expect(includesSubsequence(output, EXIF_APP1)).toBe(false);
  });

  it("Dado bytes sem estrutura reconhecida, Quando sanitizar, Então sinaliza que não sanitizou", () => {
    expect(stripImageMetadata(new Uint8Array([1, 2, 3, 4])).stripped).toBe(false);
    expect(stripImageMetadata(jpegBytes([EXIF_APP1])).stripped).toBe(true);
  });

  it("Dado JPEG truncado no meio de um segmento, Quando sanitizar, Então devolve original sem lançar (edge case)", () => {
    const input = new Uint8Array([0xff, 0xd8, 0xff, 0xe1, 0x7f, 0xff, 0x01]);

    expect(Array.from(stripImageMetadata(input).data)).toEqual(Array.from(input));
  });

  it("Dado PNG com chunk que ultrapassa o buffer, Quando sanitizar, Então devolve original sem lançar (edge case)", () => {
    const input = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      0x00, 0x00, 0xff, 0xff, 0x74, 0x45, 0x58, 0x74, 0x01,
    ]);

    expect(Array.from(stripImageMetadata(input).data)).toEqual(Array.from(input));
  });
});
