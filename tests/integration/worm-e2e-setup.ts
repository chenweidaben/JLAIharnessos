/**
 * P5-20: E2E 自管 BFF 生命周期 + audit_e2e schema 隔离
 * - spawn BFF 在 8081，env 注入 AUDIT_DB_SCHEMA=audit_e2e
 * - beforeAll: DROP+CREATE schema + 执行 DDL
 * - afterAll: kill BFF + DROP schema
 */
import { spawn, ChildProcess } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import postgres from 'postgres';

const REPO_ROOT = path.resolve(import.meta.dir, '..', '..');
const PORT = 8081;
const SCHEMA = 'audit_e2e';
const DDL_FILE = path.join(REPO_ROOT, 'tests/integration/fixtures/audit-e2e-ddl.sql');
const DATABASE_URL = process.env.DATABASE_URL ?? 'postgres://postgres:postgres@127.0.0.1:5433/jlmedaios';

export interface BffHandle {
  baseUrl: string;
  pid: number;
  stdout: string;
  stderr: string;
}

function assertSafeSchema(schema: string): void {
  if (!/^[a-z_][a-z0-9_]+$/.test(schema)) {
    throw new Error(`invalid schema: ${schema}`);
  }
  if (schema !== 'audit_e2e') {
    throw new Error(`DROP_SCHEMA guard: only audit_e2e allowed, got ${schema} (injection self-test)`);
  }
}

export async function setupSchema(): Promise<void> {
  assertSafeSchema(SCHEMA);
  const sql = postgres(DATABASE_URL, { max: 1 });
  await sql.unsafe(`DROP SCHEMA IF EXISTS ${SCHEMA} CASCADE`);
  await sql.unsafe(`CREATE SCHEMA ${SCHEMA}`);
  const ddl = fs.readFileSync(DDL_FILE, 'utf8');
  for (const stmt of ddl.split(';').map(s => s.trim()).filter(s => s && !s.startsWith('--'))) {
    try { await sql.unsafe(stmt); } catch (e) { /* ignore idempotent notices */ }
  }
  await sql.end();
}

export async function teardownSchema(): Promise<void> {
  assertSafeSchema(SCHEMA);
  const sql = postgres(DATABASE_URL, { max: 1 });
  await sql.unsafe(`DROP SCHEMA IF EXISTS ${SCHEMA} CASCADE`);
  await sql.end();
}

export async function startBff(): Promise<BffHandle> {
  return new Promise((resolve, reject) => {
    const child: ChildProcess = spawn('bun', ['run', 'src/bff/server.ts'], {
      cwd: REPO_ROOT,
      env: {
        ...process.env,
        PORT: String(PORT),
        HTTP_PORT: String(PORT),
        DEMO_MODE: '1',
        AUDIT_STORE: 'pg',
        AUDIT_DB_SCHEMA: SCHEMA,
        WORM_BACKEND: 'memory',
        AUDIT_BACKFILL_LIMIT: '3000',
        DATABASE_URL,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false,
    });
    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', d => { stdout += d.toString(); });
    child.stderr?.on('data', d => { stderr += d.toString(); });
    child.on('exit', code => {
      reject(new Error(`BFF exited early code=${code}\n---stdout---\n${stdout}\n---stderr---\n${stderr}`));
    });
    const baseUrl = `http://127.0.0.1:${PORT}`;
    const deadline = Date.now() + 30_000;
    const tick = async () => {
      try {
        const res = await fetch(`${baseUrl}/health`, { signal: AbortSignal.timeout(1000) });
        if (res.status === 200) {
          resolve({ baseUrl, pid: child.pid ?? 0, stdout, stderr });
          return;
        }
      } catch { /* not ready */ }
      if (Date.now() > deadline) {
        reject(new Error(`BFF not ready after 30s\n---stdout---\n${stdout}\n---stderr---\n${stderr}`));
        return;
      }
      setTimeout(tick, 500);
    };
    tick();
    // attach child for later kill
    (startBff as any)._child = child;
  });
}

export async function stopBff(handle: BffHandle): Promise<void> {
  const child = (startBff as any)._child as ChildProcess | undefined;
  if (!child || child.killed) return;
  // Windows: kill process tree
  try {
    if (process.platform === 'win32') {
      spawn('taskkill', ['/T', '/F', '/PID', String(handle.pid)], { stdio: 'ignore' });
    } else {
      child.kill('SIGTERM');
    }
  } catch { /* ignore */ }
  await new Promise(r => setTimeout(r, 500));
}
