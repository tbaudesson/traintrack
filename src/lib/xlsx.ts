/**
 * Just enough of the Excel format (.xlsx) to read the first sheet of a
 * workbook as rows of text, and to write a one-sheet workbook. An .xlsx file
 * is a zip of XML files: the browser inflates them itself
 * (DecompressionStream), so no library is needed. Works with files saved by
 * Excel, Numbers, LibreOffice and Google Sheets.
 */

/** Files over this are refused: a program sheet is a few kilobytes. */
export const MAX_XLSX_BYTES = 5_000_000;
/** No part may inflate over this: a guard against zip bombs. */
const MAX_PART_BYTES = 20_000_000;

export class XlsxError extends Error {}

// ── Zip ──────────────────────────────────────────────────────────────

const u16 = (b: Uint8Array, at: number) => b[at] | (b[at + 1] << 8);
const u32 = (b: Uint8Array, at: number) => (b[at] | (b[at + 1] << 8) | (b[at + 2] << 16) | (b[at + 3] << 24)) >>> 0;

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** The files of a zip, by name, inflated on demand. */
function unzip(bytes: Uint8Array): Map<string, () => Promise<Uint8Array>> {
  // The end record sits in the last 22 bytes, plus a comment of up to 64 KB.
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65_557); i--) {
    if (u32(bytes, i) === 0x06054b50) {
      end = i;
      break;
    }
  }
  if (end < 0) throw new XlsxError("NOT_XLSX");
  const count = u16(bytes, end + 10);
  let at = u32(bytes, end + 16);
  const files = new Map<string, () => Promise<Uint8Array>>();
  const decoder = new TextDecoder();
  for (let n = 0; n < count; n++) {
    if (u32(bytes, at) !== 0x02014b50) throw new XlsxError("NOT_XLSX");
    const method = u16(bytes, at + 10);
    const size = u32(bytes, at + 20);
    const fullSize = u32(bytes, at + 24);
    const nameLength = u16(bytes, at + 28);
    const local = u32(bytes, at + 42);
    const name = decoder.decode(bytes.subarray(at + 46, at + 46 + nameLength));
    at += 46 + nameLength + u16(bytes, at + 30) + u16(bytes, at + 32);
    files.set(name, async () => {
      if (fullSize > MAX_PART_BYTES) throw new XlsxError("TOO_BIG");
      if (u32(bytes, local) !== 0x04034b50) throw new XlsxError("NOT_XLSX");
      const start = local + 30 + u16(bytes, local + 26) + u16(bytes, local + 28);
      const data = bytes.subarray(start, start + size);
      if (method === 0) return data;
      if (method === 8) {
        const out = await inflateRaw(data);
        if (out.length > MAX_PART_BYTES) throw new XlsxError("TOO_BIG");
        return out;
      }
      throw new XlsxError("NOT_XLSX");
    });
  }
  return files;
}

// ── Reading ──────────────────────────────────────────────────────────

const decodeXml = (text: string) =>
  text.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, e: string) => {
    const k = e.toLowerCase();
    if (k[0] === "#") return String.fromCodePoint(k[1] === "x" ? parseInt(k.slice(2), 16) : parseInt(k.slice(1), 10));
    return ({ amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" } as Record<string, string>)[k];
  });

/** The text of the <t> runs of a string item, phonetic hints left out. */
const runs = (xml: string) =>
  [...xml.replace(/<rPh\b[\s\S]*?<\/rPh>/g, "").matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((m) => decodeXml(m[1])).join("");

const attr = (tag: string, name: string) => tag.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1];

/** "AB12" → column 27 (0-based), row 11 (0-based). */
function cellRef(ref: string): { col: number; row: number } | null {
  const m = ref.match(/^([A-Z]+)(\d+)$/);
  if (!m) return null;
  let col = 0;
  for (const c of m[1]) col = col * 26 + c.charCodeAt(0) - 64;
  return { col: col - 1, row: Number(m[2]) - 1 };
}

/** The path of the workbook's first sheet. */
async function firstSheet(files: Map<string, () => Promise<Uint8Array>>, text: (b: Uint8Array) => string): Promise<string> {
  const fallback = "xl/worksheets/sheet1.xml";
  const book = files.get("xl/workbook.xml");
  const rels = files.get("xl/_rels/workbook.xml.rels");
  if (!book || !rels) return fallback;
  const sheet = (await book().then(text)).match(/<sheet\b[^>]*>/)?.[0];
  const id = sheet && attr(sheet, "r:id");
  if (!id) return fallback;
  const rel = [...(await rels().then(text)).matchAll(/<Relationship\b[^>]*>/g)].map((m) => m[0]).find((r) => attr(r, "Id") === id);
  const target = rel && attr(rel, "Target");
  if (!target) return fallback;
  return target.startsWith("/") ? target.slice(1) : `xl/${target}`;
}

/** The first sheet of a workbook, as rows of cell texts (numbers as written in the file). */
export async function readXlsx(input: ArrayBuffer | Uint8Array): Promise<string[][]> {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (bytes.length > MAX_XLSX_BYTES) throw new XlsxError("TOO_BIG");
  const files = unzip(bytes);
  const decoder = new TextDecoder();
  const text = (b: Uint8Array) => decoder.decode(b);

  const sharedPart = files.get("xl/sharedStrings.xml");
  const shared = sharedPart ? [...(await sharedPart().then(text)).matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => runs(m[1])) : [];
  const sheetPart = files.get(await firstSheet(files, text));
  if (!sheetPart) throw new XlsxError("NOT_XLSX");
  const xml = await sheetPart().then(text);

  const rows: string[][] = [];
  let rowIndex = -1;
  for (const row of xml.matchAll(/<row\b([^>]*)>([\s\S]*?)<\/row>/g)) {
    const r = attr(row[1], "r");
    rowIndex = r ? Number(r) - 1 : rowIndex + 1;
    const cells: string[] = [];
    let colIndex = -1;
    for (const cell of row[2].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const ref = attr(cell[1], "r");
      const pos = ref ? cellRef(ref) : null;
      colIndex = pos ? pos.col : colIndex + 1;
      const body = cell[2] ?? "";
      const type = attr(cell[1], "t");
      const v = body.match(/<v>([\s\S]*?)<\/v>/)?.[1];
      let value = "";
      if (type === "s") value = shared[Number(v)] ?? "";
      else if (type === "inlineStr") value = runs(body);
      else if (type === "e") value = "";
      else if (v !== undefined) value = decodeXml(v);
      cells[colIndex] = value;
    }
    rows[rowIndex] = Array.from(cells, (c) => c ?? "");
  }
  return Array.from(rows, (r) => r ?? []);
}

// ── Writing ──────────────────────────────────────────────────────────

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (const b of data) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** A zip of the files as they are (stored, not compressed): small files only. */
function zip(files: [string, string][]): Uint8Array {
  const encoder = new TextEncoder();
  const parts: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const [name, content] of files) {
    const nameBytes = encoder.encode(name);
    const data = encoder.encode(content);
    const crc = crc32(data);
    const header = (size: number) => {
      const h = new Uint8Array(size);
      const v = new DataView(h.buffer);
      return { h, v };
    };
    const local = header(30 + nameBytes.length);
    local.v.setUint32(0, 0x04034b50, true);
    local.v.setUint16(4, 20, true);
    local.v.setUint16(12, 0x21, true); // 1 January 1980
    local.v.setUint32(14, crc, true);
    local.v.setUint32(18, data.length, true);
    local.v.setUint32(22, data.length, true);
    local.v.setUint16(26, nameBytes.length, true);
    local.h.set(nameBytes, 30);
    const entry = header(46 + nameBytes.length);
    entry.v.setUint32(0, 0x02014b50, true);
    entry.v.setUint16(4, 20, true);
    entry.v.setUint16(6, 20, true);
    entry.v.setUint16(14, 0x21, true);
    entry.v.setUint32(16, crc, true);
    entry.v.setUint32(20, data.length, true);
    entry.v.setUint32(24, data.length, true);
    entry.v.setUint16(28, nameBytes.length, true);
    entry.v.setUint32(42, offset, true);
    entry.h.set(nameBytes, 46);
    parts.push(local.h, data);
    central.push(entry.h);
    offset += local.h.length + data.length;
  }
  const centralSize = central.reduce((s, c) => s + c.length, 0);
  const end = new Uint8Array(22);
  const v = new DataView(end.buffer);
  v.setUint32(0, 0x06054b50, true);
  v.setUint16(8, files.length, true);
  v.setUint16(10, files.length, true);
  v.setUint32(12, centralSize, true);
  v.setUint32(16, offset, true);
  const all = [...parts, ...central, end];
  const out = new Uint8Array(all.reduce((s, p) => s + p.length, 0));
  let at = 0;
  for (const p of all) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

const escapeXml = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const colName = (i: number): string => (i >= 26 ? colName(Math.floor(i / 26) - 1) : "") + String.fromCharCode(65 + (i % 26));

const MAIN = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
const REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const PKG_REL = "http://schemas.openxmlformats.org/package/2006/relationships";

/**
 * A workbook of one sheet: the first row in bold and frozen, columns of the
 * given widths, and the `textColumns` formatted as text, so that "8-12"
 * typed there stays "8-12" instead of becoming a date.
 */
export function writeXlsx(input: { sheet: string; rows: (string | number)[][]; widths: number[]; textColumns?: number[] }): Uint8Array {
  const text = new Set(input.textColumns ?? []);
  const cols = input.widths
    .map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"${text.has(i) ? ' style="1"' : ""}/>`)
    .join("");
  const data = input.rows
    .map((row, r) => {
      const cells = row
        .map((value, c) => {
          const ref = `${colName(c)}${r + 1}`;
          const style = r === 0 ? ' s="2"' : text.has(c) ? ' s="1"' : "";
          if (typeof value === "number") return `<c r="${ref}"${style}><v>${value}</v></c>`;
          if (value === "") return "";
          return `<c r="${ref}"${style} t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`;
        })
        .join("");
      return `<row r="${r + 1}">${cells}</row>`;
    })
    .join("");
  const head = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
  return zip([
    [
      "[Content_Types].xml",
      `${head}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`,
    ],
    ["_rels/.rels", `${head}<Relationships xmlns="${PKG_REL}"><Relationship Id="rId1" Type="${REL}/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
    ["xl/workbook.xml", `${head}<workbook xmlns="${MAIN}" xmlns:r="${REL}"><sheets><sheet name="${escapeXml(input.sheet.slice(0, 31))}" sheetId="1" r:id="rId1"/></sheets></workbook>`],
    [
      "xl/_rels/workbook.xml.rels",
      `${head}<Relationships xmlns="${PKG_REL}"><Relationship Id="rId1" Type="${REL}/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="${REL}/styles" Target="styles.xml"/></Relationships>`,
    ],
    [
      "xl/styles.xml",
      `${head}<styleSheet xmlns="${MAIN}"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="49" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`,
    ],
    [
      "xl/worksheets/sheet1.xml",
      `${head}<worksheet xmlns="${MAIN}"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${cols}</cols><sheetData>${data}</sheetData></worksheet>`,
    ],
  ]);
}
