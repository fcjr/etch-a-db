import { useCallback, useEffect, useRef, useState } from 'react';
import { useWorld } from 'koota/react';
import { IsEtchSketch, Strokes, TableSchema } from '../../core/traits';
import { executeSql, type ExecutorDeps, type SqlResult } from '../../db/sql-executor';
import { splitStatements } from '../../db/sql-parser';
import { rasterizeRows } from '../ocr/rasterize-strokes';
import { recognizeRow } from '../ocr/ocr-service';
import { useControlsMode } from '../../utils/controls-mode';
import { Instructions } from './instructions';
import styles from './console.module.css';

type Entry = {
  id: number;
  sql: string;
  status: 'pending' | 'done';
  result?: SqlResult;
};

const SEED_HISTORY = [
  `CREATE TABLE flips (CAUSE TEXT, BORO TEXT, FURY INT);`,
  `INSERT INTO flips VALUES ('L TRAIN', 'BK', 88);`,
  `INSERT INTO flips VALUES ('THE RENT', 'QNS', 100);`,
  `INSERT INTO flips VALUES ('RAT KING', 'MAN', 42);`,
  `SELECT * FROM flips;`,
  `FLIP TABLE flips;`,
];

let entryIdCounter = 0;

export function Console() {
  const world = useWorld();
  const { setMode } = useControlsMode();
  const [input, setInput] = useState('');
  const [entries, setEntries] = useState<Entry[]>([]);
  const [pending, setPending] = useState(false);
  const [seedIndex, setSeedIndex] = useState(0);
  const feedRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const depsRef = useRef<ExecutorDeps>({
    rasterizeRows: (dataRowCount) => {
      const etch = world.queryFirst(IsEtchSketch);
      if (!etch) return [];
      const strokes = etch.get(Strokes);
      const schema = etch.get(TableSchema);
      if (!strokes || !schema || schema.columnLefts.length === 0) return [];
      return rasterizeRows(
        strokes.points,
        schema.columnLefts,
        schema.columnRights,
        schema.rowBaselines,
        dataRowCount
      );
    },
    recognizeRow,
  });

  // Auto-scroll the feed to the bottom on new entries.
  useEffect(() => {
    const feed = feedRef.current;
    if (!feed) return;
    feed.scrollTop = feed.scrollHeight;
  }, [entries]);

  const run = useCallback(
    async (raw: string) => {
      const statements = splitStatements(raw);
      if (statements.length === 0) return;
      setInput('');
      setPending(true);
      try {
        for (const sql of statements) {
          const id = ++entryIdCounter;
          setEntries((prev) => [...prev, { id, sql, status: 'pending' }]);
          try {
            const result = await executeSql(world, sql, depsRef.current);
            setEntries((prev) =>
              prev.map((e) => (e.id === id ? { ...e, status: 'done', result } : e))
            );
          } catch (err) {
            setEntries((prev) =>
              prev.map((e) =>
                e.id === id
                  ? {
                      ...e,
                      status: 'done',
                      result: { kind: 'error', message: err instanceof Error ? err.message : String(err) },
                    }
                  : e
              )
            );
          }
        }
      } finally {
        setPending(false);
        // Refocus input.
        requestAnimationFrame(() => inputRef.current?.focus());
      }
    },
    [world]
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        if (!pending) void run(input);
        return;
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!pending) void run(input);
        return;
      }
      if (e.key === 'ArrowUp' && input === '' && !pending) {
        e.preventDefault();
        const next = SEED_HISTORY[seedIndex] ?? '';
        setInput(next);
        setSeedIndex((i) => Math.min(SEED_HISTORY.length - 1, i + 1));
      }
    },
    [input, pending, run, seedIndex]
  );

  return (
    <aside
      className={styles.root}
      onPointerDown={() => setMode('console')}
    >
      <header className={styles.header}>
        <span className={styles.brand}>etch-a-db</span>
        <span className={styles.location}>@ fliptable.nyc</span>
        <a
          className={styles.githubLink}
          href="https://github.com/fcjr/etch-a-db"
          target="_blank"
          rel="noopener noreferrer"
        >
          github
        </a>
      </header>
      <Instructions />
      <div className={styles.feed} ref={feedRef}>
        {entries.length === 0 && (
          <div className={styles.feedEmpty}>
            Try{' '}
            <code>CREATE TABLE flips (CAUSE TEXT, BORO TEXT, FURY INT);</code>
            <br />
            Press ↑ to cycle through example statements.
          </div>
        )}
        {entries.map((e) => (
          <EntryView key={e.id} entry={e} />
        ))}
      </div>
      <div className={styles.inputWrap}>
        <div className={styles.inputRow}>
          <span className={styles.inputMarker}>›</span>
          <textarea
            ref={inputRef}
            className={styles.input}
            value={input}
            placeholder="SELECT * FROM flips;"
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            autoFocus
            disabled={pending}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
          />
          <button
            className={styles.runButton}
            type="button"
            onClick={() => !pending && void run(input)}
            disabled={pending || input.trim().length === 0}
          >
            {pending ? '…' : 'RUN'}
          </button>
        </div>
        <div className={styles.runHint}>↵ run · ↑ recall · select takes a sec while tesseract loads</div>
      </div>
    </aside>
  );
}

function EntryView({ entry }: { entry: Entry }) {
  const [showRaw, setShowRaw] = useState(false);
  return (
    <div className={styles.entry}>
      <div className={styles.entryPrompt}>
        <span className={styles.entryPromptMarker}>›</span>
        <span className={styles.entrySql}>{entry.sql}</span>
      </div>
      {entry.status === 'pending' && (
        <div className={`${styles.entryResult} ${styles.pending}`}>running…</div>
      )}
      {entry.status === 'done' && entry.result && <ResultView result={entry.result} showRaw={showRaw} setShowRaw={setShowRaw} />}
    </div>
  );
}

function ResultView({
  result,
  showRaw,
  setShowRaw,
}: {
  result: SqlResult;
  showRaw: boolean;
  setShowRaw: (v: boolean) => void;
}) {
  if (result.kind === 'error') {
    return <div className={`${styles.entryResult} ${styles.error}`}>error: {result.message}</div>;
  }
  if (result.kind === 'ok') {
    return <div className={`${styles.entryResult} ${styles.ok}`}>{result.message}</div>;
  }
  if (result.kind === 'schema') {
    return (
      <div className={styles.entryResult}>
        {result.name} ({result.columns.map((c) => `${c.name} ${c.type}`).join(', ')})
      </div>
    );
  }
  // rows
  return (
    <>
      <div className={styles.tableWrap}>
        <table className={styles.dataTable}>
          <thead>
            <tr>
              {result.columns.map((c) => (
                <th key={c}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.rows.length === 0 ? (
              <tr>
                <td colSpan={result.columns.length} style={{ color: 'var(--console-dim)', fontStyle: 'italic' }}>
                  (no rows)
                </td>
              </tr>
            ) : (
              result.rows.map((r, i) => (
                <tr key={i}>
                  {r.map((cell, j) => (
                    <td key={j}>{cell}</td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {result.note && <div className={styles.note}>{result.note}</div>}
      {result.rawOcr && (
        <>
          <button
            type="button"
            className={styles.rawOcrToggle}
            onClick={() => setShowRaw(!showRaw)}
          >
            {showRaw ? 'hide raw OCR' : 'show raw OCR'}
          </button>
          {showRaw && <pre className={styles.rawOcr}>{result.rawOcr}</pre>}
        </>
      )}
    </>
  );
}
