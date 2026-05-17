// Tiny hand-rolled SQL parser. Supports the dialect documented in the console
// instructions: CREATE TABLE, INSERT INTO, SELECT, DROP TABLE, DELETE FROM,
// SHOW TABLE. Identifiers are case-insensitive, strings are single-quoted,
// numbers are integers.

export type ColumnType = "TEXT" | "INT";

export type Statement =
  | {
      kind: "create";
      name: string;
      columns: { name: string; type: ColumnType }[];
    }
  | { kind: "insert"; name: string; columns: string[] | null; values: string[] }
  | { kind: "select"; name: string; columns: "*" | string[] }
  | { kind: "drop"; name: string }
  | { kind: "flip"; name: string }
  | { kind: "delete"; name: string }
  | { kind: "show" };

type Token =
  | { type: "kw"; value: string }
  | { type: "ident"; value: string }
  | { type: "string"; value: string }
  | { type: "number"; value: string }
  | { type: "lparen" }
  | { type: "rparen" }
  | { type: "comma" }
  | { type: "star" }
  | { type: "semi" };

const KEYWORDS = new Set([
  "CREATE",
  "TABLE",
  "INSERT",
  "INTO",
  "VALUES",
  "SELECT",
  "FROM",
  "DROP",
  "FLIP",
  "DELETE",
  "SHOW",
  "TEXT",
  "INT",
]);

function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (ch === " " || ch === "\t" || ch === "\n" || ch === "\r") {
      i++;
      continue;
    }
    if (ch === "(") {
      tokens.push({ type: "lparen" });
      i++;
      continue;
    }
    if (ch === ")") {
      tokens.push({ type: "rparen" });
      i++;
      continue;
    }
    if (ch === ",") {
      tokens.push({ type: "comma" });
      i++;
      continue;
    }
    if (ch === ";") {
      tokens.push({ type: "semi" });
      i++;
      continue;
    }
    if (ch === "*") {
      tokens.push({ type: "star" });
      i++;
      continue;
    }
    if (ch === "'") {
      let j = i + 1;
      let s = "";
      while (j < src.length && src[j] !== "'") {
        s += src[j];
        j++;
      }
      if (j >= src.length)
        throw new SqlParseError("Unterminated string literal");
      tokens.push({ type: "string", value: s });
      i = j + 1;
      continue;
    }
    if (/[0-9-]/.test(ch)) {
      let j = i;
      if (ch === "-") j++;
      while (j < src.length && /[0-9]/.test(src[j])) j++;
      if (j === i || (ch === "-" && j === i + 1))
        throw new SqlParseError(`Unexpected character "${ch}"`);
      tokens.push({ type: "number", value: src.slice(i, j) });
      i = j;
      continue;
    }
    if (/[A-Za-z_]/.test(ch)) {
      let j = i;
      while (j < src.length && /[A-Za-z0-9_]/.test(src[j])) j++;
      const word = src.slice(i, j);
      const up = word.toUpperCase();
      if (KEYWORDS.has(up)) {
        tokens.push({ type: "kw", value: up });
      } else {
        tokens.push({ type: "ident", value: word });
      }
      i = j;
      continue;
    }
    throw new SqlParseError(`Unexpected character "${ch}"`);
  }
  return tokens;
}

export class SqlParseError extends Error {}

class Parser {
  constructor(
    private readonly tokens: Token[],
    private pos = 0,
  ) {}
  peek(): Token | undefined {
    return this.tokens[this.pos];
  }
  next(): Token | undefined {
    return this.tokens[this.pos++];
  }
  expectKw(kw: string): void {
    const t = this.next();
    if (!t || t.type !== "kw" || t.value !== kw) {
      throw new SqlParseError(`Expected ${kw}, got ${describe(t)}`);
    }
  }
  expectType(type: Token["type"]): Token {
    const t = this.next();
    if (!t || t.type !== type) {
      throw new SqlParseError(`Expected ${type}, got ${describe(t)}`);
    }
    return t;
  }
  matchKw(kw: string): boolean {
    const t = this.peek();
    if (t && t.type === "kw" && t.value === kw) {
      this.pos++;
      return true;
    }
    return false;
  }
  identifier(): string {
    const t = this.next();
    if (!t || t.type !== "ident") {
      throw new SqlParseError(`Expected identifier, got ${describe(t)}`);
    }
    return t.value;
  }
}

function describe(t: Token | undefined): string {
  if (!t) return "end of input";
  if (
    t.type === "kw" ||
    t.type === "ident" ||
    t.type === "string" ||
    t.type === "number"
  ) {
    return `${t.type} "${t.value}"`;
  }
  return t.type;
}

// Split a script into individual statement strings on top-level `;`,
// preserving semicolons inside single-quoted string literals. Trailing
// semicolons are dropped, empty pieces (whitespace only) are skipped.
export function splitStatements(src: string): string[] {
  const out: string[] = [];
  let buf = "";
  let inString = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inString) {
      buf += ch;
      if (ch === "'") inString = false;
      continue;
    }
    if (ch === "'") {
      inString = true;
      buf += ch;
      continue;
    }
    if (ch === ";") {
      if (buf.trim().length > 0) out.push(buf.trim());
      buf = "";
      continue;
    }
    buf += ch;
  }
  if (buf.trim().length > 0) out.push(buf.trim());
  return out;
}

export function parseSql(src: string): Statement {
  const tokens = tokenize(src);
  // Strip trailing semicolon.
  while (tokens.length && tokens[tokens.length - 1].type === "semi")
    tokens.pop();
  if (tokens.length === 0) throw new SqlParseError("Empty statement");

  const p = new Parser(tokens);
  const first = p.peek();
  if (!first || first.type !== "kw")
    throw new SqlParseError(`Expected SQL keyword, got ${describe(first)}`);

  switch (first.value) {
    case "CREATE":
      return parseCreate(p);
    case "INSERT":
      return parseInsert(p);
    case "SELECT":
      return parseSelect(p);
    case "DROP":
      return parseDrop(p);
    case "FLIP":
      return parseFlip(p);
    case "DELETE":
      return parseDelete(p);
    case "SHOW":
      return parseShow(p);
    default:
      throw new SqlParseError(`Unsupported statement: ${first.value}`);
  }
}

function parseCreate(p: Parser): Statement {
  p.expectKw("CREATE");
  p.expectKw("TABLE");
  const name = p.identifier();
  p.expectType("lparen");
  const cols: { name: string; type: ColumnType }[] = [];
  for (;;) {
    const cname = p.identifier();
    const typeTok = p.next();
    if (
      !typeTok ||
      typeTok.type !== "kw" ||
      (typeTok.value !== "TEXT" && typeTok.value !== "INT")
    ) {
      throw new SqlParseError(`Expected TEXT or INT, got ${describe(typeTok)}`);
    }
    cols.push({ name: cname, type: typeTok.value as ColumnType });
    const next = p.next();
    if (!next) throw new SqlParseError("Expected , or )");
    if (next.type === "rparen") break;
    if (next.type !== "comma")
      throw new SqlParseError(`Expected , or ), got ${describe(next)}`);
  }
  if (cols.length === 0)
    throw new SqlParseError("CREATE TABLE requires at least one column");
  if (cols.length > 4)
    throw new SqlParseError("etch-db supports at most 4 columns per table");
  return { kind: "create", name, columns: cols };
}

function parseInsert(p: Parser): Statement {
  p.expectKw("INSERT");
  p.expectKw("INTO");
  const name = p.identifier();
  let columns: string[] | null = null;
  if (p.peek()?.type === "lparen") {
    p.expectType("lparen");
    columns = [];
    for (;;) {
      columns.push(p.identifier());
      const t = p.next();
      if (!t) throw new SqlParseError("Expected , or )");
      if (t.type === "rparen") break;
      if (t.type !== "comma")
        throw new SqlParseError(`Expected , or ), got ${describe(t)}`);
    }
  }
  p.expectKw("VALUES");
  p.expectType("lparen");
  const values: string[] = [];
  for (;;) {
    const t = p.next();
    if (!t) throw new SqlParseError("Expected value");
    if (t.type === "string") values.push(t.value);
    else if (t.type === "number") values.push(t.value);
    else if (t.type === "ident") values.push(t.value);
    else throw new SqlParseError(`Expected value, got ${describe(t)}`);
    const sep = p.next();
    if (!sep) throw new SqlParseError("Expected , or )");
    if (sep.type === "rparen") break;
    if (sep.type !== "comma")
      throw new SqlParseError(`Expected , or ), got ${describe(sep)}`);
  }
  return { kind: "insert", name, columns, values };
}

function parseSelect(p: Parser): Statement {
  p.expectKw("SELECT");
  let columns: "*" | string[];
  const t = p.peek();
  if (t && t.type === "star") {
    p.next();
    columns = "*";
  } else {
    const cols: string[] = [];
    for (;;) {
      cols.push(p.identifier());
      const sep = p.peek();
      if (!sep || sep.type !== "comma") break;
      p.next();
    }
    columns = cols;
  }
  p.expectKw("FROM");
  const name = p.identifier();
  return { kind: "select", name, columns };
}

function parseDrop(p: Parser): Statement {
  p.expectKw("DROP");
  p.expectKw("TABLE");
  const name = p.identifier();
  return { kind: "drop", name };
}

function parseFlip(p: Parser): Statement {
  p.expectKw("FLIP");
  p.expectKw("TABLE");
  const name = p.identifier();
  return { kind: "flip", name };
}

function parseDelete(p: Parser): Statement {
  p.expectKw("DELETE");
  p.expectKw("FROM");
  const name = p.identifier();
  return { kind: "delete", name };
}

function parseShow(p: Parser): Statement {
  p.expectKw("SHOW");
  p.expectKw("TABLE");
  return { kind: "show" };
}
