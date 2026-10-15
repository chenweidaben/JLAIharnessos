/**
 * 健澜科技 jlmedaios - 数据库迁移状态聚合器（M124-C）
 *
 * 【运维工具】
 * 分层：
 *  - 纯函数：getMigrationStatus / runPendingMigrations。不直接读时钟之外的 IO、
 *    不修改入参（排序在副本上进行），可直接单测。
 *  - 进程内失败登记：recordMigrationFailure / listMigrationFailures /
 *    clearMigrationFailures 写入有界数组（默认 100 条，零新依赖），
 *    由 admin 路由在 POST /migrate/run 失败时回填，供 GET 面板展示最近失败。
 *
 * 生产安全加固：
 *  - 失败登记有界（MAX_FAILURES），反复失败下不会内存无限增长；
 *  - 纯函数对 null / 非数组 / 单条 / 重复版本全部防御，返回空集而非抛错；
 *  - runPendingMigrations 逐个 try/catch，单个迁移失败不中断后续迁移，
 *    失败原因以结构化结果返回，不向外抛裸异常；
 *  - 不记录 SQL 正文、不记录数据库凭证，只记录版本号 / 文件名 / 耗时 / 错误摘要。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ------------------------------------------------------------------ */
/* 类型                                                                */
/* ------------------------------------------------------------------ */

/** 单条迁移的状态（与 deploy/postgres/init/*.sql 一一对应） */
export type MigrationStatus = 'executed' | 'pending' | 'failed';

/** 单条迁移描述符（由路由层根据 SQL 目录 + schema_migrations 表装配） */
export interface MigrationDescriptor {
  /** 版本号（即 SQL 文件名，如 001_init.sql） */
  version: string;
  /** 文件名（与 version 一致，便于前端展示） */
  filename: string;
  /** 当前状态：executed=已执行 / pending=待执行 / failed=最近一次执行失败 */
  status: MigrationStatus;
  /** 已执行完成的时间（ISO 字符串，来自 schema_migrations.applied_at） */
  executedAt?: string;
  /** 失败原因摘要（仅 failed 状态有值） */
  error?: string;
  /** 最近一次执行耗时（ms） */
  durationMs?: number;
}

/** GET 面板返回的汇总视图 */
export interface MigrationStatusSummary {
  /** 迁移总数（SQL 目录文件数） */
  total: number;
  /** 已执行数 */
  executed: number;
  /** 待执行数 */
  pending: number;
  /** 最近执行的 10 条（按 executedAt 倒序，无则空数组） */
  recent10: MigrationDescriptor[];
  /** 失败列表（来自进程内失败登记，按失败时间倒序） */
  failures: MigrationDescriptor[];
}

/** 单条迁移执行结果（POST /migrate/run 返回） */
export interface MigrationRunResult {
  version: string;
  filename: string;
  /** 是否成功 */
  success: boolean;
  /** 失败原因（仅 success=false 有值） */
  error?: string;
  /** 耗时（ms） */
  durationMs: number;
  /** 执行开始时间（ISO） */
  ranAt: string;
}

/**
 * 单条迁移执行器（依赖注入）。
 * 生产环境由路由层注入真实 DB 执行器；单测中注入 mock 以断言编排逻辑。
 * 实现方应在失败时 throw，由 runPendingMigrations 统一捕获。
 */
export type MigrationRunner = (m: MigrationDescriptor) => Promise<void>;

/* ------------------------------------------------------------------ */
/* 纯函数                                                              */
/* ------------------------------------------------------------------ */

/**
 * 纯函数：把迁移列表汇总为面板视图。
 * 口径：
 *  - total = 列表长度；
 *  - executed = status === 'executed' 的条数；
 *  - pending = status === 'pending' 的条数（failed 不计入 pending，也不计入 executed）；
 *  - recent10 = 已执行且有 executedAt 的条目，按时间倒序取前 10；
 *  - failures = status === 'failed' 的条目（倒序由调用方保证，这里原样透传）。
 * 对 null / 非数组 / 空数组全部防御，返回零值视图而非抛错。
 */
export function getMigrationStatus(migrations: MigrationDescriptor[]): MigrationStatusSummary {
  const list = Array.isArray(migrations) ? migrations : [];

  const executed = list.filter((m) => m && m.status === 'executed');
  const pending = list.filter((m) => m && m.status === 'pending');
  const failures = list.filter((m) => m && m.status === 'failed');

  const recent10 = executed
    .filter((m) => typeof m.executedAt === 'string')
    .slice()
    .sort((a, b) => (a.executedAt! < b.executedAt! ? 1 : a.executedAt! > b.executedAt! ? -1 : 0))
    .slice(0, 10);

  return {
    total: list.length,
    executed: executed.length,
    pending: pending.length,
    recent10,
    failures,
  };
}

/**
 * 纯编排函数：顺序执行待执行迁移，逐个 try/catch 收集结果。
 *  - 单个失败不中断后续迁移（与 DB 迁移器"遇错即停"的策略互补，
 *    这里面向运维面板，优先把所有问题一次性暴露）；
 *  - 入参 pending 为空时立即返回空数组；
 *  - 每个结果记录 ranAt / durationMs，失败时把 err.message 写入 error 字段；
 *  - 不修改入参数组，不吞掉 runner 抛出之外的异常。
 */
export async function runPendingMigrations(
  pending: MigrationDescriptor[],
  runner: MigrationRunner,
): Promise<MigrationRunResult[]> {
  const list = Array.isArray(pending) ? pending : [];
  if (list.length === 0 || typeof runner !== 'function') return [];

  const results: MigrationRunResult[] = [];
  for (const m of list) {
    const ranAt = new Date().toISOString();
    const t0 = Date.now();
    try {
      await runner(m);
      results.push({
        version: m.version,
        filename: m.filename,
        success: true,
        durationMs: Math.max(0, Date.now() - t0),
        ranAt,
      });
    } catch (err) {
      results.push({
        version: m.version,
        filename: m.filename,
        success: false,
        error: err instanceof Error ? err.message : String(err),
        durationMs: Math.max(0, Date.now() - t0),
        ranAt,
      });
    }
  }
  return results;
}

/* ------------------------------------------------------------------ */
/* 进程内失败登记（零新依赖，模块级有界数组）                            */
/* ------------------------------------------------------------------ */

/** 生产安全加固：失败登记上限，超出后丢弃最旧记录 */
const MAX_FAILURES = 100;
const failureRegistry: MigrationDescriptor[] = [];

/** 登记一次迁移失败（由路由层在 POST 执行失败时调用） */
export function recordMigrationFailure(desc: MigrationDescriptor): void {
  if (!desc || !desc.version) return;
  // 同版本号去重：若已存在旧失败记录，先移除再追加（保持最新）
  for (let i = failureRegistry.length - 1; i >= 0; i--) {
    if (failureRegistry[i].version === desc.version) {
      failureRegistry.splice(i, 1);
    }
  }
  failureRegistry.push({ ...desc, status: 'failed' as const });
  if (failureRegistry.length > MAX_FAILURES) {
    failureRegistry.splice(0, failureRegistry.length - MAX_FAILURES);
  }
}

/** 读取失败登记快照（返回副本，外部无法篡改内部数组） */
export function listMigrationFailures(): MigrationDescriptor[] {
  return failureRegistry.map((m) => ({ ...m }));
}

/** 清空失败登记（主要用于单测隔离，生产环境一般不调用） */
export function clearMigrationFailures(): void {
  failureRegistry.length = 0;
}
