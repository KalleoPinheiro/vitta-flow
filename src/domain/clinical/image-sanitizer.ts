import { detectImageType } from "./condition-photo";

/**
 * Remove metadados sensíveis de imagens antes do armazenamento (AD-002):
 * fotos de ferida tiradas de celular carregam EXIF com GPS da casa do
 * paciente — dado pessoal sensível que não pode viver no prontuário.
 *
 * Implementação em TS puro por tipo (JPEG/PNG/WebP), sem re-encode do bitmap.
 * Fail-safe: qualquer estrutura malformada devolve os bytes ORIGINAIS sem
 * lançar — nunca corromper; a validação existente do pipeline decide depois.
 */
export interface StripResult {
  data: Uint8Array;
  /** false → bytes originais mantidos; metadados podem ter sobrevivido. */
  stripped: boolean;
}

export function stripImageMetadata(data: Uint8Array): StripResult {
  try {
    switch (detectImageType(data)) {
      case "image/jpeg":
        return { data: stripJpeg(data), stripped: true };
      case "image/png":
        return { data: stripPng(data), stripped: true };
      case "image/webp":
        return { data: stripWebp(data), stripped: true };
      default:
        return { data, stripped: false };
    }
  } catch {
    return { data, stripped: false };
  }
}

// --- JPEG: fluxo de segmentos FF xx; remove APP1..APP15 (EXIF/XMP) e COM. ---

const JPEG_SOI = 0xd8;
const JPEG_SOS = 0xda;
const JPEG_APP1 = 0xe1;
const JPEG_APP15 = 0xef;
const JPEG_COM = 0xfe;
/** APP2 = perfil ICC, APP14 = transformação de cor Adobe: preservam a cor. */
const JPEG_COLOR_MARKERS = new Set([0xe2, 0xee]);
/** Marcadores sem payload de comprimento (standalone). */
const JPEG_STANDALONE = new Set([0x01, 0xd0, 0xd1, 0xd2, 0xd3, 0xd4, 0xd5, 0xd6, 0xd7]);

interface JpegSegment {
  end: number;
  keep: boolean;
  /** SOS: do marcador em diante é fluxo comprimido — copia integral. */
  copyRest?: boolean;
}

function readJpegSegment(data: Uint8Array, offset: number): JpegSegment | null {
  if (data[offset] !== 0xff) {
    return null;
  }
  // Qualquer número de bytes 0xFF pode preceder o marcador (ITU-T T.81).
  let markerAt = offset + 1;
  while (markerAt < data.length && data[markerAt] === 0xff) {
    markerAt += 1;
  }
  const marker = data[markerAt];
  if (marker === undefined) {
    return null;
  }
  if (marker === JPEG_SOS) {
    return { end: data.length, keep: true, copyRest: true };
  }
  if (marker === JPEG_SOI || JPEG_STANDALONE.has(marker)) {
    return { end: markerAt + 1, keep: true };
  }
  if (markerAt + 3 > data.length) {
    return null;
  }
  const length = (data[markerAt + 1] << 8) | data[markerAt + 2];
  const end = markerAt + 1 + length;
  if (length < 2 || end > data.length) {
    return null;
  }
  return { end, keep: !isJpegMetadataMarker(marker) };
}

/**
 * APP1..APP15 (EXIF/XMP) e COM são metadados. Ficam de fora: APP0 (JFIF),
 * APP2 (ICC) e APP14 (Adobe) — removê-los altera a cor renderizada da foto.
 */
function isJpegMetadataMarker(marker: number): boolean {
  if (JPEG_COLOR_MARKERS.has(marker)) {
    return false;
  }
  return (marker >= JPEG_APP1 && marker <= JPEG_APP15) || marker === JPEG_COM;
}

function stripJpeg(data: Uint8Array): Uint8Array {
  const kept: Array<Uint8Array> = [data.subarray(0, 2)];
  let offset = 2;

  while (offset < data.length) {
    const segment = readJpegSegment(data, offset);
    if (!segment) {
      return data;
    }
    if (segment.keep) {
      kept.push(data.subarray(offset, segment.end));
    }
    if (segment.copyRest) {
      return concat(kept);
    }
    offset = segment.end;
  }
  return concat(kept);
}

// --- PNG: chunks [len(4) type(4) data crc(4)]; remove texto/EXIF/timestamp. ---

const PNG_SIGNATURE_LENGTH = 8;
const PNG_METADATA_CHUNKS = new Set(["tEXt", "zTXt", "iTXt", "eXIf", "tIME"]);

function stripPng(data: Uint8Array): Uint8Array {
  const kept: Array<Uint8Array> = [data.subarray(0, PNG_SIGNATURE_LENGTH)];
  let offset = PNG_SIGNATURE_LENGTH;

  while (offset < data.length) {
    if (offset + 8 > data.length) {
      return data;
    }
    const length =
      (data[offset] << 24) | (data[offset + 1] << 16) | (data[offset + 2] << 8) | data[offset + 3];
    const type = String.fromCharCode(
      data[offset + 4],
      data[offset + 5],
      data[offset + 6],
      data[offset + 7],
    );
    const chunkEnd = offset + 8 + length + 4;
    if (length < 0 || chunkEnd > data.length) {
      return data;
    }
    if (!PNG_METADATA_CHUNKS.has(type)) {
      kept.push(data.subarray(offset, chunkEnd));
    }
    offset = chunkEnd;
  }
  return concat(kept);
}

// --- WebP: RIFF chunks [fourcc(4) size(4 LE) data(+pad)]; remove EXIF/XMP. ---

const WEBP_HEADER_LENGTH = 12;
const WEBP_METADATA_CHUNKS = new Set(["EXIF", "XMP "]);
const VP8X_EXIF_FLAG = 0x08;
const VP8X_XMP_FLAG = 0x04;

function stripWebp(data: Uint8Array): Uint8Array {
  const kept: Array<Uint8Array> = [];
  let offset = WEBP_HEADER_LENGTH;

  while (offset < data.length) {
    if (offset + 8 > data.length) {
      return data;
    }
    const fourcc = String.fromCharCode(
      data[offset],
      data[offset + 1],
      data[offset + 2],
      data[offset + 3],
    );
    const size =
      data[offset + 4] | (data[offset + 5] << 8) | (data[offset + 6] << 16) | (data[offset + 7] << 24);
    const paddedEnd = offset + 8 + size + (size % 2);
    if (size < 0 || paddedEnd > data.length) {
      return data;
    }
    if (!WEBP_METADATA_CHUNKS.has(fourcc)) {
      const chunk = new Uint8Array(data.subarray(offset, paddedEnd));
      if (fourcc === "VP8X" && chunk.length > 8) {
        // Chunks EXIF/XMP removidos → flags correspondentes zeradas.
        chunk[8] &= ~(VP8X_EXIF_FLAG | VP8X_XMP_FLAG);
      }
      kept.push(chunk);
    }
    offset = paddedEnd;
  }

  const bodyLength = kept.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(WEBP_HEADER_LENGTH + bodyLength);
  output.set(data.subarray(0, WEBP_HEADER_LENGTH));
  // Tamanho RIFF = tudo após os 8 primeiros bytes ("RIFF" + size).
  const riffSize = output.length - 8;
  output[4] = riffSize & 0xff;
  output[5] = (riffSize >> 8) & 0xff;
  output[6] = (riffSize >> 16) & 0xff;
  output[7] = (riffSize >> 24) & 0xff;
  let cursor = WEBP_HEADER_LENGTH;
  for (const part of kept) {
    output.set(part, cursor);
    cursor += part.length;
  }
  return output;
}

function concat(parts: Array<Uint8Array>): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(total);
  let cursor = 0;
  for (const part of parts) {
    output.set(part, cursor);
    cursor += part.length;
  }
  return output;
}
