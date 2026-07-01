// Minimal in-memory D1 stand-in for route tests. It implements just the
// `prepare().bind().{first,all,run}()` surface the app uses, with a tiny SQL
// matcher for the INSERT/SELECT/UPDATE/DELETE statements issued by the auth
// and todo routes. Rows are plain objects keyed by lowercase column names.

type Row = Record<string, unknown>;

interface Bound {
  sql: string;
  params: unknown[];
}

class FakePreparedStatement {
  private params: unknown[] = [];
  constructor(
    private d1: FakeD1,
    private sql: string,
  ) {}

  bind(...args: unknown[]): this {
    this.params = args;
    return this;
  }

  private get bound(): Bound {
    return { sql: this.sql, params: this.params };
  }

  async first<T = Row>(): Promise<T | null> {
    return (this.d1.execute(this.bound, "first") as T | null) ?? null;
  }

  async all<T = Row>(): Promise<{ results: T[] }> {
    const results = (this.d1.execute(this.bound, "all") as Row[]) ?? [];
    return { results: results as T[] };
  }

  async run(): Promise<{ meta: { changes: number } }> {
    const changes = (this.d1.execute(this.bound, "run") as number) ?? 0;
    return { meta: { changes } };
  }
}

export class FakeD1 {
  tables: Record<string, Row[]> = { users: [], sessions: [], todos: [] };

  prepare(sql: string): FakePreparedStatement {
    return new FakePreparedStatement(this, sql);
  }

  private static normalize(sql: string): string {
    return sql.toLowerCase().replace(/\s+/g, " ").trim();
  }

  execute(bound: Bound, mode: "first" | "all" | "run"): Row | Row[] | number | null {
    const sql = FakeD1.normalize(bound.sql);
    if (sql.startsWith("insert into")) return this.handleInsert(sql, bound.params);
    if (sql.startsWith("select")) return this.handleSelect(sql, bound.params, mode);
    if (sql.startsWith("delete from")) return this.handleDelete(sql, bound.params);
    if (sql.startsWith("update")) return this.handleUpdate(sql, bound.params);
    throw new Error(`FakeD1: unsupported SQL: ${sql}`);
  }

  private handleInsert(sql: string, params: unknown[]): number {
    const m = sql.match(/^insert into (\w+) \(([^)]+)\) values \(([^)]+)\)$/);
    if (!m) throw new Error(`FakeD1: cannot parse INSERT: ${sql}`);
    const [, table, colsRaw, valsRaw] = m;
    const cols = colsRaw.split(",").map((c) => c.trim());
    const vals = valsRaw.split(",").map((v) => v.trim());
    let pIdx = 0;
    const row: Row = {};
    for (let i = 0; i < cols.length; i++) {
      const v = vals[i];
      row[cols[i]] = v === "?" ? params[pIdx++] : Number(v);
    }
    this.tables[table].push(row);
    return 1;
  }

  // Parse `col = ?` conditions separated by `and`, assigning each `?` the next
  // positional bind param in the order it appears in the clause.
  private parseWhere(whereRaw: string, startIdx: number) {
    const conds: { col: string; paramIdx: number }[] = [];
    let pIdx = startIdx;
    for (const part of whereRaw.split(" and ")) {
      const cm = part.trim().match(/^(\w+) = \?$/);
      if (!cm) throw new Error(`FakeD1: cannot parse WHERE clause: ${whereRaw}`);
      conds.push({ col: cm[1], paramIdx: pIdx++ });
    }
    return conds;
  }

  private rowMatches(row: Row, conds: { col: string; paramIdx: number }[], params: unknown[]): boolean {
    return conds.every((c) => String(row[c.col]) === String(params[c.paramIdx]));
  }

  private project(row: Row, selects: { col: string; as: string }[]): Row {
    const out: Row = {};
    for (const s of selects) out[s.as] = row[s.col];
    return out;
  }

  private handleSelect(sql: string, params: unknown[], mode: "first" | "all"): Row | Row[] | null {
    // Special-case the sessions JOIN users lookup used by resolveUser.
    if (sql.includes("join")) {
      return this.handleSessionJoin(sql, params, mode);
    }

    const m = sql.match(/^select (.+?) from (\w+)(?: where (.+?))?(?: order by (\w+) (asc|desc))?$/);
    if (!m) throw new Error(`FakeD1: cannot parse SELECT: ${sql}`);
    const [, colsRaw, table, whereRaw, orderCol, orderDir] = m;
    const selects = colsRaw.split(",").map((c) => {
      const trimmed = c.trim();
      const am = trimmed.match(/^(\w+) as (\w+)$/);
      return am ? { col: am[1], as: am[2] } : { col: trimmed, as: trimmed };
    });

    let rows = [...this.tables[table]];
    if (whereRaw) {
      const conds = this.parseWhere(whereRaw, 0);
      rows = rows.filter((r) => this.rowMatches(r, conds, params));
    }
    if (orderCol) {
      rows.sort((a, b) => Number(a[orderCol]) - Number(b[orderCol]));
      if (orderDir === "desc") rows.reverse();
    }
    const projected = rows.map((r) => this.project(r, selects));
    return mode === "first" ? (projected[0] ?? null) : projected;
  }

  private handleSessionJoin(sql: string, params: unknown[], mode: "first" | "all"): Row | Row[] | null {
    // `SELECT u.id AS id, u.email AS email, s.expires_at AS expires_at
    //    FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id = ?`
    void sql;
    const session = this.tables.sessions.find((s) => String(s.id) === String(params[0]));
    if (!session) return mode === "first" ? null : [];
    const user = this.tables.users.find((u) => String(u.id) === String(session.user_id));
    if (!user) return mode === "first" ? null : [];
    const row: Row = { id: user.id, email: user.email, expires_at: session.expires_at };
    return mode === "first" ? row : [row];
  }

  private handleDelete(sql: string, params: unknown[]): number {
    const m = sql.match(/^delete from (\w+) where (.+)$/);
    if (!m) throw new Error(`FakeD1: cannot parse DELETE: ${sql}`);
    const [, table, whereRaw] = m;
    const conds = this.parseWhere(whereRaw, 0);
    const before = this.tables[table].length;
    this.tables[table] = this.tables[table].filter((r) => !this.rowMatches(r, conds, params));
    return before - this.tables[table].length;
  }

  private handleUpdate(sql: string, params: unknown[]): number {
    const m = sql.match(/^update (\w+) set (.+?) where (.+)$/);
    if (!m) throw new Error(`FakeD1: cannot parse UPDATE: ${sql}`);
    const [, table, setRaw, whereRaw] = m;
    const setCols: { col: string; paramIdx: number }[] = [];
    let pIdx = 0;
    for (const part of setRaw.split(",")) {
      const sm = part.trim().match(/^(\w+) = \?$/);
      if (!sm) throw new Error(`FakeD1: cannot parse SET clause: ${setRaw}`);
      setCols.push({ col: sm[1], paramIdx: pIdx++ });
    }
    const conds = this.parseWhere(whereRaw, pIdx);
    let changes = 0;
    this.tables[table] = this.tables[table].map((r) => {
      if (!this.rowMatches(r, conds, params)) return r;
      changes++;
      const next = { ...r };
      for (const s of setCols) next[s.col] = params[s.paramIdx];
      return next;
    });
    return changes;
  }
}

// Builds a Durable Object namespace stub whose `fetch` always allows the
// request, satisfying the rate-limiter middleware without a real DO.
export function fakeRateLimiter(): {
  idFromName: () => string;
  get: () => { fetch: () => Promise<Response> };
} {
  const stub = {
    fetch: () =>
      Promise.resolve(
        new Response(JSON.stringify({ allowed: true, limit: 100, remaining: 99, reset: Date.now() + 60_000 }), {
          headers: { "content-type": "application/json" },
        }),
      ),
  };
  return { idFromName: () => "id", get: () => stub };
}
