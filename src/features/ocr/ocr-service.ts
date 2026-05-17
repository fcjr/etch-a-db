// Tesseract worker wrapper tuned for per-row recognition:
//   - PSM 7 (treat the image as a single line of text)
//   - Whitelist restricted to the characters our font can actually draw
//   - preserve_interword_spaces keeps gaps so column bucketing works

type BBox = { x0: number; y0: number; x1: number; y1: number };
type RawWord = { text: string; bbox: BBox };
type RawLine = { text: string; bbox: BBox; words: RawWord[] };
type RawParagraph = { lines: RawLine[] };
type RawBlock = { paragraphs: RawParagraph[] };
type RecognizeData = {
  text: string;
  blocks?: RawBlock[] | null;
  lines?: RawLine[];
};

type Worker = {
  setParameters: (params: Record<string, string>) => Promise<void>;
  recognize: (
    image: HTMLCanvasElement,
    options?: Record<string, unknown>,
    output?: Record<string, unknown>
  ) => Promise<{ data: RecognizeData }>;
  terminate: () => Promise<void>;
};

const CHAR_WHITELIST = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 -_.';

let workerPromise: Promise<Worker> | null = null;

async function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      const mod = await import('tesseract.js');
      const worker = (await mod.createWorker('eng')) as unknown as Worker;
      await worker.setParameters({
        tessedit_char_whitelist: CHAR_WHITELIST,
        tessedit_pageseg_mode: '7',
        preserve_interword_spaces: '1',
      });
      return worker;
    })();
  }
  return workerPromise;
}

export type OcrWord = { text: string; bboxCx: number };
export type OcrLineResult = { text: string; words: OcrWord[] };

export async function recognizeRow(canvas: HTMLCanvasElement): Promise<OcrLineResult> {
  const worker = await getWorker();
  const result = await worker.recognize(canvas, {}, { blocks: true, text: true });
  const data = result.data;
  const lines = collectLines(data);
  const line = lines[0];
  if (!line) {
    return { text: (data.text ?? '').trim(), words: [] };
  }
  const words: OcrWord[] = (line.words ?? []).map((w) => ({
    text: w.text,
    bboxCx: (w.bbox.x0 + w.bbox.x1) / 2,
  }));
  return { text: line.text.trim(), words };
}

function collectLines(data: RecognizeData): RawLine[] {
  const out: RawLine[] = [];
  if (Array.isArray(data.blocks)) {
    for (const block of data.blocks) {
      for (const para of block.paragraphs ?? []) {
        for (const line of para.lines ?? []) {
          out.push(line);
        }
      }
    }
    if (out.length > 0) return out;
  }
  if (Array.isArray(data.lines) && data.lines.length > 0) {
    return data.lines;
  }
  // Last-ditch: synthesize a single line from data.text with empty bboxes.
  const text = (data.text ?? '').trim();
  if (text.length === 0) return [];
  return [
    {
      text,
      bbox: { x0: 0, y0: 0, x1: 0, y1: 0 },
      words: text
        .split(/\s+/)
        .filter((w) => w.length > 0)
        .map((w) => ({ text: w, bbox: { x0: 0, y0: 0, x1: 0, y1: 0 } })),
    },
  ];
}
