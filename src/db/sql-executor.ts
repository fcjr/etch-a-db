import type { World } from "koota";
import { actions } from "../core/actions/actions";
import { Flip, IsEtchSketch, Shake } from "../core/traits";
import { parseSql, SqlParseError, type Statement } from "./sql-parser";
import { planCreateTable, planInsertRow } from "./draw-plan";

export type SqlResult =
  | { kind: "ok"; message: string }
  | {
      kind: "rows";
      columns: string[];
      rows: string[][];
      rawOcr?: string;
      note?: string;
    }
  | { kind: "schema"; name: string; columns: { name: string; type: string }[] }
  | { kind: "error"; message: string };

export type ExecutorDeps = {
  // Render one OCR-friendly canvas per existing data row, with the polyline
  // clipped to that row's bbox. Returns column-edge x-pixel positions for
  // bucketing OCR'd words.
  rasterizeRows: (
    dataRowCount: number,
  ) => Array<{ canvas: HTMLCanvasElement; row: number; columnXsPx: number[] }>;
  // OCR a single-line image, returning trimmed text and per-word x centers.
  recognizeRow: (
    canvas: HTMLCanvasElement,
  ) => Promise<{ text: string; words: { text: string; bboxCx: number }[] }>;
};

export async function executeSql(
  world: World,
  src: string,
  deps: ExecutorDeps,
): Promise<SqlResult> {
  let ast: Statement;
  try {
    ast = parseSql(src);
  } catch (err) {
    return {
      kind: "error",
      message: err instanceof SqlParseError ? err.message : String(err),
    };
  }

  const a = actions(world);

  switch (ast.kind) {
    case "create": {
      const existing = a.getSchema();
      if (existing && existing.name) {
        return {
          kind: "error",
          message: `Table "${existing.name}" already exists. DROP it first.`,
        };
      }
      const headerNames = ast.columns.map((c) => c.name);
      const plan = planCreateTable(headerNames);

      // Teleport to the table's top-left corner (clearing the canvas) so the
      // new table starts on a blank screen. The stylus physically can't lift,
      // so any drawn connector from a prior position will streak through at
      // least one row's OCR clip; clearing first is the only way to keep the
      // captured rows free of connector artifacts.
      const first = plan.waypoints[0];
      a.teleportStylus(first.x, first.y);

      a.setSchema(
        ast.name,
        ast.columns,
        plan.columnLefts,
        plan.columnRights,
        plan.columnCenters,
        plan.rowBaselines,
      );
      await a.enqueueDrawJob(plan.waypoints);
      return {
        kind: "ok",
        message: `Created table "${ast.name}" (${ast.columns.length} columns).`,
      };
    }

    case "insert": {
      const schema = a.getSchema();
      if (!schema || !schema.name) {
        return { kind: "error", message: "No table. CREATE one first." };
      }
      if (ast.name !== schema.name) {
        return { kind: "error", message: `No such table "${ast.name}".` };
      }
      let values = ast.values;
      if (ast.columns) {
        const remapped: string[] = new Array(schema.columns.length).fill("");
        for (let i = 0; i < ast.columns.length; i++) {
          const ci = schema.columns.findIndex(
            (c) => c.name === ast.columns![i],
          );
          if (ci < 0) {
            return {
              kind: "error",
              message: `Unknown column "${ast.columns[i]}".`,
            };
          }
          remapped[ci] = ast.values[i];
        }
        values = remapped;
      } else if (values.length !== schema.columns.length) {
        return {
          kind: "error",
          message: `Expected ${schema.columns.length} values, got ${values.length}.`,
        };
      }

      const cursor = a.getCursor();
      if (!cursor) return { kind: "error", message: "Cursor missing (bug)." };
      if (cursor.row >= schema.rowBaselines.length - 1) {
        return {
          kind: "error",
          message: "Table is full. DROP it or DELETE to start over.",
        };
      }

      const waypoints = planInsertRow(
        cursor.row,
        values,
        schema.columnLefts,
        schema.columnRights,
        schema.rowBaselines,
      );
      await a.enqueueDrawJob(waypoints);
      a.advanceCursor();
      return { kind: "ok", message: `Inserted 1 row.` };
    }

    case "select": {
      const schema = a.getSchema();
      if (!schema || !schema.name) {
        return { kind: "error", message: "No table. CREATE one first." };
      }
      if (ast.name !== schema.name) {
        return { kind: "error", message: `No such table "${ast.name}".` };
      }

      const visible = projectColumns(
        schema.columns.map((c) => c.name),
        ast.columns,
      );
      if ("error" in visible) return { kind: "error", message: visible.error };

      const cursor = a.getCursor();
      const dataRowCount = cursor?.row ?? 0;
      if (dataRowCount === 0) {
        return { kind: "rows", columns: visible.names, rows: [] };
      }

      const rowImages = deps.rasterizeRows(dataRowCount);
      if (rowImages.length === 0) {
        return { kind: "rows", columns: visible.names, rows: [] };
      }

      let ocrResults: {
        text: string;
        words: { text: string; bboxCx: number }[];
      }[];
      try {
        ocrResults = await Promise.all(
          rowImages.map(({ canvas }) => deps.recognizeRow(canvas)),
        );
      } catch (err) {
        return {
          kind: "error",
          message: `OCR failed: ${err instanceof Error ? err.message : String(err)}`,
        };
      }

      const fullRows: string[][] = rowImages.map(({ columnXsPx }, idx) => {
        const result = ocrResults[idx];
        return bucketWordsByColumn(
          result.words,
          columnXsPx,
          schema.columns.length,
        );
      });

      const visibleRows = fullRows.map((r) =>
        visible.indices.map((i) => r[i] ?? ""),
      );
      const rawOcr = ocrResults
        .map((r, i) => `row ${i + 1}: ${r.text}`)
        .join("\n");

      return {
        kind: "rows",
        columns: visible.names,
        rows: visibleRows,
        rawOcr,
        note: "OCR-derived... it's trying its best.",
      };
    }

    case "drop": {
      const schema = a.getSchema();
      if (!schema || !schema.name) {
        return { kind: "error", message: "No table to drop." };
      }
      if (ast.name !== schema.name) {
        return { kind: "error", message: `No such table "${ast.name}".` };
      }
      a.requestClear();
      await waitForShakeDone(world);
      a.removeSchema();
      return { kind: "ok", message: `Dropped "${ast.name}".` };
    }

    case "flip": {
      const schema = a.getSchema();
      if (!schema || !schema.name) {
        return { kind: "error", message: "No table to flip." };
      }
      if (ast.name !== schema.name) {
        return { kind: "error", message: `No such table "${ast.name}".` };
      }
      a.requestFlip();
      await waitForFlipDone(world);
      // tick-flip already removes the schema, but call removeSchema for safety
      // in case the flip never started (e.g. mid-shake).
      a.removeSchema();
      return { kind: "ok", message: `(╯°□°）╯︵ ┻━┻  flipped "${ast.name}".` };
    }

    case "delete": {
      const schema = a.getSchema();
      if (!schema || !schema.name) {
        return { kind: "error", message: "No table." };
      }
      if (ast.name !== schema.name) {
        return { kind: "error", message: `No such table "${ast.name}".` };
      }
      const headerNames = schema.columns.map((c) => c.name);
      const plan = planCreateTable(headerNames);
      const first = plan.waypoints[0];
      a.teleportStylus(first.x, first.y);
      a.setSchema(
        schema.name,
        schema.columns,
        plan.columnLefts,
        plan.columnRights,
        plan.columnCenters,
        plan.rowBaselines,
      );
      await a.enqueueDrawJob(plan.waypoints);
      return { kind: "ok", message: `Cleared table "${schema.name}".` };
    }

    case "show": {
      const schema = a.getSchema();
      if (!schema || !schema.name) {
        return { kind: "error", message: "No table." };
      }
      return {
        kind: "schema",
        name: schema.name,
        columns: schema.columns.map((c) => ({ name: c.name, type: c.type })),
      };
    }
  }
}

function projectColumns(
  schemaNames: string[],
  selector: "*" | string[],
): { names: string[]; indices: number[] } | { error: string } {
  if (selector === "*") {
    return { names: schemaNames, indices: schemaNames.map((_, i) => i) };
  }
  const indices: number[] = [];
  for (const name of selector) {
    const idx = schemaNames.findIndex((n) => n === name);
    if (idx < 0) return { error: `Unknown column "${name}".` };
    indices.push(idx);
  }
  return { names: indices.map((i) => schemaNames[i]), indices };
}

function bucketWordsByColumn(
  words: { text: string; bboxCx: number }[],
  columnXsPx: number[],
  numColumns: number,
): string[] {
  const cells = new Array<string>(numColumns).fill("");
  for (const word of words) {
    let colIndex = numColumns - 1;
    for (let i = 0; i < numColumns; i++) {
      if (word.bboxCx < columnXsPx[i + 1]) {
        colIndex = i;
        break;
      }
    }
    cells[colIndex] = cells[colIndex]
      ? `${cells[colIndex]} ${word.text}`
      : word.text;
  }
  return cells;
}

function waitForShakeDone(world: World): Promise<void> {
  return new Promise((resolve) => {
    const tick = () => {
      const etch = world.queryFirst(IsEtchSketch);
      if (!etch || !etch.has(Shake)) {
        resolve();
        return;
      }
      setTimeout(tick, 60);
    };
    setTimeout(tick, 30);
  });
}

function waitForFlipDone(world: World): Promise<void> {
  return new Promise((resolve) => {
    const tick = () => {
      const etch = world.queryFirst(IsEtchSketch);
      if (!etch || !etch.has(Flip)) {
        resolve();
        return;
      }
      setTimeout(tick, 60);
    };
    setTimeout(tick, 30);
  });
}
