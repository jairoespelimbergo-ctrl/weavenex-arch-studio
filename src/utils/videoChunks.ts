export const CHUNK_BYTE_SIZE = 480_000; // Divisible by 3 -> 640,000 base64 chars (safe for Firestore write stream)
export const MAX_CLOUD_VIDEO_BYTES = 260 * 1024 * 1024; // 260 MB cloud-syncable limit

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) {
    const slice = bytes.subarray(i, i + step);
    binary += String.fromCharCode.apply(null, Array.from(slice));
  }
  return btoa(binary);
}

export function decodeBase64Chunk(chunk: string): ArrayBuffer {
  const raw = chunk.startsWith('b64:') ? chunk.slice(4) : chunk;
  const binary = atob(raw);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer as ArrayBuffer;
}

export function getBlobChunkCount(blob: Blob): number {
  return Math.ceil(blob.size / CHUNK_BYTE_SIZE);
}

export async function encodeBlobChunk(blob: Blob, chunkIndex: number): Promise<string> {
  const start = chunkIndex * CHUNK_BYTE_SIZE;
  const end = Math.min(blob.size, start + CHUNK_BYTE_SIZE);
  const buffer = await blob.slice(start, end).arrayBuffer();
  return `b64:${uint8ToBase64(new Uint8Array(buffer))}`;
}

export async function runWithConcurrency(
  total: number,
  concurrency: number,
  worker: (index: number) => Promise<void>,
  onProgress?: (completed: number, total: number) => void
): Promise<void> {
  let nextIndex = 0;
  let completed = 0;

  async function runWorker() {
    while (nextIndex < total) {
      const idx = nextIndex++;
      await worker(idx);
      completed++;
      onProgress?.(completed, total);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, total) }, () => runWorker());
  await Promise.all(workers);
}
