/**
 * 健澜科技数智医院智能体 - 轻量 SQL 迁移执行器
 *
 * 设计原则：
 *  - 不引入重型迁移框架（如 Prisma / TypeORM），保持零额外依赖
 *  - 按文件名顺序执行 deploy/postgres/init/*.sql
 *  - 用 public.schema_migrations 表记录已执行版本，幂等可重入
 *  - 启动时自动迁移；迁移失败明确报错，不静默跳过
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { getDb, type Sql } from './pool.js';

const MIGRATIONS_DIR = join(process.cwd(), 'deploy', 'postgres', 'init');
const MIGRATION_TABLE = 'public.schema_migrations';

/** 确保迁移记录表存在 */
async function ensureMigrationTable(sql: Sql): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS ${sql(MIGRATION_TABLE)} (
      version     text PRIMARY KEY,
      applied_at  timestamptz NOT NULL DEFAULT now()
    )
  `;
}

/** 获取已执行的迁移版本 */
async function getAppliedVersions(sql: Sql): Promise<Set<string>> {
  const rows = await sql`SELECT version FROM ${sql(MIGRATION_TABLE)}`;
  return new Set(rows.map((r) => r.version as string));
}

/** 执行单个 SQL 文件（整个文件作为一个事务） */
async function runMigrationFile(sql: Sql, filePath: string, version: string): Promise<void> {
  const content = readFileSync(filePath, 'utf-8');
  // 去除注释后的空语句，避免 postgres.js 对空语句报错
  const statements = content
    .split(/;\s*(?=(?:[^'"]|'[^']*'|"[^"]*")*$)/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith('--'));

  await sql.begin(async (tx) => {
    for (const stmt of statements) {
      await tx.unsafe(stmt);
    }
    await tx`
      INSERT INTO ${sql(MIGRATION_TABLE)} (version)
      VALUES (${version})
      ON CONFLICT (version) DO NOTHING
    `;
  });
}

/**
 * 执行所有未应用的迁移。
 * @param migrationsDir 可选，覆盖默认迁移目录（测试用）
 */
export async function runMigrations(migrationsDir: string = MIGRATIONS_DIR): Promise<{
  applied: string[];
  skipped: string[];
}> {
  const sql = getDb();
  await ensureMigrationTable(sql);
  const applied = await getAppliedVersions(sql);

  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const newlyApplied: string[] = [];
  const skipped: string[] = [];

  for (const file of files) {
    if (applied.has(file)) {
      skipped.push(file);
      continue;
    }
    const filePath = join(migrationsDir, file);
    try {
      await runMigrationFile(sql, filePath, file);
      newlyApplied.push(file);
    } catch (err) {
      throw new Error(
        `[db:migrate] 迁移失败: ${file}\n` +
          `请检查 SQL 语法与依赖顺序。原始错误: ${String(err)}`,
      );
    }
  }

  return { applied: newlyApplied, skipped };
}

/** 启动时自动迁移（连不上 DB 时由 verifyDbConnection 统一报错） */
export async function autoMigrate(): Promise<void> {
  const { applied, skipped } = await runMigrations();
  if (applied.length > 0) {
    console.log(`[db:migrate] 已应用 ${applied.length} 个迁移: ${applied.join(', ')}`);
  }
  if (skipped.length > 0) {
    console.log(`[db:migrate] 跳过 ${skipped.length} 个已应用迁移`);
  }
}
