/**
 * 健澜科技 jlmedaios - 数据库迁移状态面板 BFF 路由（M124-C）
 *
 * 【运维工具】
 * GET  /api/v1/admin/migrations
 *  - auth: true + requirePermissionCode('system:migrations:view')；
 *    admin 角色自动放行，非 admin 且无该权限码者一律 403（仅 admin 可读）；
 *  - 扫描 deploy/postgres/init/*.sql 并比对 public.schema_migrations，
 *    返回 {total, executed, pending, recent10, failures}；
 *  - 失败列表来自进程内登记（migrationStatusAggregator），重启后清空。
 *
 * POST /api/v1/admin/migrate/run
 *  - auth: true + requirePermissionCode('system:migrations:run')；
 *  - 顺序执行所有 pending 迁移，逐个 try/catch 收集结果；
 *  - 单个失败不中断后续迁移，失败原因写入进程内登记，供下次 GET 展示；
 *  - 无 pending 时直接返回空结果与当前汇总，不触发任何 DB 写入。
 *
 * 生产安全加固：
 *  - 不返回 SQL 正文、不返回数据库连接串；
 *  - DB 不可达时返回 503 结构化错误，不返回 HTML 错误页；
 *  - POST 幂等：已执行的迁移不会被重复执行（pending 集合在执行前已过滤）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { readdirSync } from 'node:fs';
import { join } from 'node:path';

import { getDb, runSingleMigration, type Sql } from '@/db';
import { requirePermissionCode } from '../middleware/auth';
import { ErrorCode, fail, json, ok, type Ctx, type RouteDef } from '../types';
import {
  getMigrationStatus,
  listMigrationFailures,
  recordMigrationFailure,
  runPendingMigrations,
  type MigrationDescriptor,
  type MigrationStatusSummary,
} from '../aggregators/migrationStatusAggregator';

/* ------------------------------------------------------------------ */
/* 内部装配：扫描 SQL 目录 + 比对 schema_migrations                     */
/* ------------------------------------------------------------------ */

/** 迁移目录（与 src/db/migrate.ts 保持一致） */
const MIGRATIONS_DIR = join(process.cwd(), 'deploy', 'postgres', 'init');
const MIGRATION_TABLE = 'public.schema_migrations';

/** 按数字前缀排序（与 runMigrations 同口径） */
function sortSqlFiles(files: string[]): string[] {
  return files
    .filter((f) => f.endsWith('.sql'))
    .sort((a, b) => {
      const numA = parseInt(a.match(/^(\d+)/)?.[1] ?? '0', 10);
      const numB = parseInt(b.match(/^(\d+)/)?.[1] ?? '0', 10);
      if (numA !== numB) return numA - numB;
      return a.localeCompare(b);
    });
}

/** 查询已执行版本及其执行时间 */
async function queryAppliedVersions(
  sql: Sql,
): Promise<Map<string, string>> {
  const rows = await sql`
    SELECT version, applied_at
    FROM ${sql(MIGRATION_TABLE)}
  `;
  const map = new Map<string, string>();
  for (const r of rows) {
    const version = String(r.version);
    const appliedAt = r.applied_at instanceof Date ? r.applied_at.toISOString() : String(r.applied_at ?? '');
    map.set(version, appliedAt);
  }
  return map;
}

/**
 * 装配迁移描述符列表。
 *  - 扫描 SQL 目录 → applied → pending；
 *  - 叠加进程内失败登记（同版本号的 pending 升级为 failed）。
 */
async function buildMigrationDescriptors(): Promise<{
  list: MigrationDescriptor[];
  summary: MigrationStatusSummary;
}> {
  const sql = getDb();

  // 确保迁移记录表存在（首次部署时可能尚未建表）
  await sql`
    CREATE TABLE IF NOT EXISTS ${sql(MIGRATION_TABLE)} (
      version     text PRIMARY KEY,
      applied_at  timestamptz NOT NULL DEFAULT now()
    )
  `;

  const [files, appliedMap] = await Promise.all([
    Promise.resolve(readdirSync(MIGRATIONS_DIR)),
    queryAppliedVersions(sql),
  ]);

  const failures = listMigrationFailures();
  const failureByVersion = new Map<string, MigrationDescriptor>();
  for (const f of failures) failureByVersion.set(f.version, f);

  const list: MigrationDescriptor[] = [];
  for (const filename of sortSqlFiles(files)) {
    if (appliedMap.has(filename)) {
      list.push({
        version: filename,
        filename,
        status: 'executed',
        executedAt: appliedMap.get(filename),
      });
    } else if (failureByVersion.has(filename)) {
      list.push({
        ...failureByVersion.get(filename)!,
        version: filename,
        filename,
        status: 'failed',
      });
    } else {
      list.push({
        version: filename,
        filename,
        status: 'pending',
      });
    }
  }

  return { list, summary: getMigrationStatus(list) };
}

/* ------------------------------------------------------------------ */
/* 路由定义                                                              */
/* ------------------------------------------------------------------ */

export const adminMigrationsRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/migrations',
    auth: true,
    handle: async (c: Ctx) => {
      // 【运维工具】业务权限守卫：未登录 401 / admin 放行 / 其余需 system:migrations:view
      const denied = requirePermissionCode(c, 'system:migrations:view');
      if (denied) return denied;
      try {
        const { summary } = await buildMigrationDescriptors();
        return json(ok(summary));
      } catch (err) {
        const message = err instanceof Error ? err.message : '迁移状态采集失败';
        // DB 不可达时返回 503，便于前端展示 error 态
        return json(fail(ErrorCode.SERVICE_UNAVAILABLE, message, c.traceId), 503);
      }
    },
  },
  {
    method: 'POST',
    path: '/api/v1/admin/migrate/run',
    auth: true,
    handle: async (c: Ctx) => {
      // 【运维工具】业务权限守卫：未登录 401 / admin 放行 / 其余需 system:migrations:run
      const denied = requirePermissionCode(c, 'system:migrations:run');
      if (denied) return denied;
      try {
        const { list, summary: before } = await buildMigrationDescriptors();
        const pending = list.filter((m) => m.status === 'pending' || m.status === 'failed');

        if (pending.length === 0) {
          return json(
            ok({
              results: [],
              summary: before,
              message: '没有待执行的迁移',
            }),
          );
        }

        // 依赖注入真实执行器：逐个文件跑事务，失败由聚合器捕获
        const realRunner = async (m: MigrationDescriptor): Promise<void> => {
          const filePath = join(MIGRATIONS_DIR, m.filename);
          await runSingleMigration(filePath, m.version);
        };

        const results = await runPendingMigrations(pending, realRunner);

        // 失败结果写入进程登记，供下次 GET 面板展示
        for (const r of results) {
          if (!r.success) {
            recordMigrationFailure({
              version: r.version,
              filename: r.filename,
              status: 'failed',
              error: r.error,
              durationMs: r.durationMs,
            });
          }
        }

        // 重新装配汇总（失败已登记、成功的已落库）
        const { summary: after } = await buildMigrationDescriptors();

        return json(
          ok({
            results,
            summary: after,
            message: `已处理 ${results.length} 个迁移，成功 ${results.filter((r) => r.success).length} 个，失败 ${results.filter((r) => !r.success).length} 个`,
          }),
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : '迁移执行失败';
        return json(fail(ErrorCode.INTERNAL_ERROR, message, c.traceId), 500);
      }
    },
  },
];
