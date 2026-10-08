export const MB = 1024 * 1024;
export type ReadProgress = { loaded: number; total: number; file?: string; index?: number; count?: number };
export type ReadReporter = (progress: ReadProgress) => void;
export type FileLimits = { maxFiles?: number; maxFileBytes?: number; maxTotalBytes?: number };

export class FileInputError extends Error {
  constructor(message: string) { super(message); this.name = 'FileInputError'; }
}

export function readableBytes(bytes: number) {
  return bytes >= MB ? `${(bytes / MB).toFixed(1)} MB` : bytes >= 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${bytes} B`;
}

export function validateFileSelection(files: File[], { maxFiles = 1, maxFileBytes = 20 * MB, maxTotalBytes = 40 * MB }: FileLimits = {}) {
  if (!files.length) throw new FileInputError('Choose a file to continue.');
  if (files.length > maxFiles) throw new FileInputError(`Too many files. Choose at most ${maxFiles}. You selected ${files.length}.`);
  for (const file of files) {
    if (!file.size) throw new FileInputError(`“${file.name}” is empty. Choose a file with readable content.`);
    if (file.size > maxFileBytes) throw new FileInputError(`File is too large. Maximum allowed size is ${maxFileBytes / MB} MB. Your file is ${readableBytes(file.size)}.`);
  }
  const total = files.reduce((sum, file) => sum + file.size, 0);
  if (total > maxTotalBytes) throw new FileInputError(`These files are too large together. Maximum total size is ${maxTotalBytes / MB} MB. Your files total ${readableBytes(total)}.`);
}

/** A fresh owned buffer for every operation. Never reuse a worker-detached buffer. */
export function readFileBytes(file: Blob, signal?: AbortSignal, report?: ReadReporter): Promise<ArrayBuffer> {
  const name = 'name' in file ? String(file.name) : undefined;
  if (signal?.aborted) return Promise.reject(new DOMException('Cancelled', 'AbortError'));
  if (typeof FileReader === 'undefined') return file.arrayBuffer().then(buffer => {
    if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
    report?.({ loaded: file.size, total: file.size, file: name }); return buffer;
  });
  return new Promise((resolve, reject) => {
    const reader = new FileReader(); let settled = false;
    function clean() { signal?.removeEventListener('abort', abort); reader.onload = reader.onerror = reader.onabort = reader.onprogress = null; }
    function fail(error: Error) { if (settled) return; settled = true; clean(); reject(error); }
    function abort() { if (reader.readyState === FileReader.LOADING) reader.abort(); fail(new DOMException('Cancelled', 'AbortError')); }
    reader.onprogress = event => {
      if (event.lengthComputable) report?.({ loaded: event.loaded, total: event.total, file: name });
    };
    reader.onerror = () => fail(new FileInputError('This file could not be read. Choose it again from your device or try another file.'));
    reader.onabort = () => fail(new DOMException('Cancelled', 'AbortError'));
    reader.onload = () => {
      const buffer = reader.result;
      if (!(buffer instanceof ArrayBuffer)) { fail(new FileInputError('This file could not be read. Choose another file.')); return; }
      if (settled) return; settled = true; clean(); report?.({ loaded: file.size, total: file.size, file: name }); resolve(buffer);
    };
    signal?.addEventListener('abort', abort, { once: true });
    report?.({ loaded: 0, total: file.size, file: name });
    try { reader.readAsArrayBuffer(file); } catch { fail(new FileInputError('File reading is unavailable. Try another file in a recent browser.')); }
  });
}

export async function readFileBatch(files: File[], signal?: AbortSignal, report?: ReadReporter) {
  const total = files.reduce((sum, file) => sum + file.size, 0); let loaded = 0;
  const result: { name: string; type: string; size: number; bytes: Uint8Array<ArrayBuffer> }[] = [];
  for (let index = 0; index < files.length; index++) {
    const file = files[index];
    const buffer = await readFileBytes(file, signal, update => report?.({ ...update, loaded: loaded + update.loaded, total, index: index + 1, count: files.length }));
    result.push({ name: file.name, type: file.type, size: file.size, bytes: new Uint8Array(buffer) }); loaded += file.size;
  }
  return result;
}

export async function validatePDF(file: File) {
  const prefix = new TextDecoder().decode(await file.slice(0, 1024).arrayBuffer());
  if (!/%PDF-\d\.\d/.test(prefix)) throw new FileInputError('This file is not a supported PDF. Choose a valid .pdf document.');
}

/** Keep known, actionable engine limits; never display internal runtime messages. */
export function friendlyFileError(error: unknown, fallback = 'We couldn’t process this file. It may be damaged or unsupported. Try another file.') {
  if (error instanceof FileInputError) return error.message;
  const name = error instanceof Error ? error.name : '';
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  // Advice such as “try an unencrypted PDF” is not evidence of encryption.
  if (/password|\bencrypted\b|\bencryption\b/i.test(name + ' ' + message)) return 'This PDF is password-protected. Choose an unencrypted copy you are authorized to use.';
  if (/memory|allocation|out of bounds|out of memory|array buffer allocation/i.test(message) || name === 'RangeError') return 'This file needs more memory than your browser can provide. Try a smaller file, fewer pages, or lower image dimensions.';
  if (/InvalidPDF|NotReadable|EncodingError/.test(name) || /invalid pdf|failed to parse|corrupt|damaged|decode.*image/i.test(message)) return 'This file is damaged or unreadable. Try opening it on your device, then choose a valid copy.';
  if (/defineProperty|undefined|null|is not a function|detached|stack|ReferenceError|TypeError|SyntaxError|DataCloneError|Cannot |Failed to fetch dynamically imported|Loading chunk/i.test(message)) return fallback;
  if (/^(Choose |Use |Enter |Select |Maximum |Each (image |output dimension )|Reduce the dimensions\.|Pages must |Page \d|Deleting |Reordering |Unsupported |This (PDF|DOCX|document|tool|browser|embedded|image)|The (combined|output|Word|DOCX|document)|A DOCX |OCR |Rendered images |Canvas rendering |Image reconstruction |Embedded images |No editable |An embedded |Unable to (export|prepare|load|start)|File is |Too many )/.test(message) && message.length < 320) return message;
  return fallback;
}
