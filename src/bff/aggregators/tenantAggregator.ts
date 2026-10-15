/**
 * 健澜科技数智医院智能体（jlmedaios）— M133-A 多医院数据隔离聚合器
 *
 * 【SaaS化+智慧度】这是多租户行级隔离在 BFF 聚合层的唯一收口：
 *  - 所有跨库/跨表查询在落到 SQL 前，必须经 withTenantScope 强制叠加 hospital_id 谓词；
 *  - 所有越权访问判断统一走 validateTenantAccess，fail-closed（未知/空归属一律拒绝）；
 *  - 智慧度：院级看板、集团对比、跨院科研均以 hospital_id 为分片键，严禁越权取数。
 *
 * 安全红线：
 *  - 本模块不读写数据库、不发请求，纯函数 + 内存目录，可单测、可审计；
 *  - withTenantScope 会「权威覆盖」调用方自带的 hospital_id 谓词，防止越权串院；
 *  - hospitalId 为空直接抛错（fail-closed），绝不允许生成「不限医院」的查询；
 *  - filterRowsByScope 对缺 hospital_id 的脏行一律不可见。
 *
 * 员工→医院归属目录在 BFF 启动时由 seedStaffDirectory/addStaffHospitalBinding 注水，
 * 单测用 resetStaffDirectory 清空后自行注水，互不污染。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 * SPDX-License-Identifier: Apache-2.0
 */

// ============================================================================
// 0. 类型
// ============================================================================

/** 隔离谓词列名（与 261-multi-tenant.sql 一致） */
export const HOSPITAL_COLUMN = 'hospital_id';

/** 结构化过滤条件（AND 语义；value 不被本模块拼进 SQL 字符串，杜绝注入） */
export interface TenantFilter {
  column: string;
  op: '=';
  value: unknown;
}

/** 调用方传入的原始查询描述（table 须为已校验的合法标识符） */
export interface TenantQuery {
  /** 主表名，如 clinical.visits */
  table: string;
  /** 既有业务过滤条件（AND）；其中若自带 hospital_id 将被权威覆盖 */
  filters?: TenantFilter[];
}

/** 叠加医院隔离后的查询描述（hospital_id 谓词必然存在且唯一） */
export interface ScopedQuery {
  table: string;
  /** 全部过滤条件（AND），含且仅含一条医院谓词 */
  filters: TenantFilter[];
  /** 医院谓词列名，恒为 hospital_id */
  hospitalColumn: typeof HOSPITAL_COLUMN;
  /** 被强制限定的医院 id */
  hospitalScope: string;
}

/** 任意业务行的最小医院标记结构 */
export interface HospitalScopedRow {
  hospitalId?: string | null;
}

/** 隔离作用域非法时抛出（fail-closed，不允许静默放宽） */
export class TenantScopeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TenantScopeError';
  }
}

// ============================================================================
// 1. withTenantScope：纯函数，强制叠加医院谓词
// ============================================================================

/**
 * 给查询强制叠加 hospital_id = :hospitalId 谓词（fail-closed）。
 *
 * 纯函数语义：不读外部状态、不写外部状态、相同入参恒定返回新对象（不可变）。
 *
 * 安全要点：
 *  - hospitalId 为空/非串 → 抛 TenantScopeError，绝不生成「全院可见」查询；
 *  - 调用方若已自带 hospital_id 谓词，一律剔除后以「可信入参」重建，防止前端/上游
 *    通过预埋 hospital_id='别家医院' 实现越权取数；
 *  - 返回结构化谓词，value 不拼进 SQL 文本，由仓储层用参数绑定执行。
 */
export function withTenantScope(query: TenantQuery, hospitalId: string): ScopedQuery {
  if (!hospitalId || typeof hospitalId !== 'string' || hospitalId.trim() === '') {
    throw new TenantScopeError(
      '多租户查询必须显式提供 hospitalId：拒绝生成不限医院的查询（fail-closed）',
    );
  }
  if (!query || typeof query.table !== 'string' || query.table.length === 0) {
    throw new TenantScopeError('withTenantScope 缺少合法 table');
  }
  // 权威覆盖：丢弃任何已有 hospital_id 谓词，避免越权/串院
  const rest = (query.filters ?? []).filter((f) => f.column !== HOSPITAL_COLUMN);
  const scoped: ScopedQuery = {
    table: query.table,
    filters: [...rest, { column: HOSPITAL_COLUMN, op: '=', value: hospitalId }],
    hospitalColumn: HOSPITAL_COLUMN,
    hospitalScope: hospitalId,
  };
  return scoped;
}

// ============================================================================
// 2. 行级过滤：把「查询谓词」落到内存行上，验证跨院不可见
// ============================================================================

/**
 * 仅保留属于作用域医院的行（fail-closed）。
 *  - 行缺 hospital_id（脏数据/未打标）→ 不可见，防止漏隔离；
 *  - hospital_id 不匹配 → 不可见。
 */
export function filterRowsByScope<T extends HospitalScopedRow>(
  rows: readonly T[],
  scope: ScopedQuery,
): T[] {
  return rows.filter((r) => {
    const rowHospital = r?.hospitalId;
    if (!rowHospital) return false; // fail-closed：无医院标记不泄露
    return rowHospital === scope.hospitalScope;
  });
}

// ============================================================================
// 3. validateTenantAccess：员工→医院归属校验（纯查询，无副作用）
// ============================================================================

/** 员工 → 其有权访问的医院 id 集合（进程内目录，启动注水，测试重置） */
const staffHospitalDir = new Map<string, ReadonlySet<string>>();

/** 注入一条员工-医院归属（可重复调用，员工可挂多院） */
export function addStaffHospitalBinding(staffId: string, hospitalId: string): void {
  if (!staffId || !hospitalId) return;
  const existing = staffHospitalDir.get(staffId);
  const next = new Set<string>(existing ?? []);
  next.add(hospitalId);
  staffHospitalDir.set(staffId, Object.freeze(next));
}

/** 批量注水归属目录（BFF 启动时从 iam.users.hospital_id 加载） */
export function seedStaffDirectory(
  entries: ReadonlyArray<{ staffId: string; hospitalId: string }>,
): void {
  for (const e of entries) addStaffHospitalBinding(e.staffId, e.hospitalId);
}

/** 清空归属目录（仅供单测在 beforeEach/afterEach 使用） */
export function resetStaffDirectory(): void {
  staffHospitalDir.clear();
}

/**
 * 校验某员工是否有权访问指定医院（fail-closed）。
 *
 * 纯函数语义：以进程内目录为只读输入，无任何副作用；
 * 相同 (staffId, hospitalId) 与相同目录状态下恒定返回同一布尔值。
 *
 * 拒绝（false）情形：
 *  - staffId / hospitalId 任一为空；
 *  - 员工未在目录登记（未知账号一律拒绝，不允许默认放行）；
 *  - 员工登记的医院集合不含目标医院（跨院越权）。
 */
export function validateTenantAccess(staffId: string, hospitalId: string): boolean {
  if (!staffId || typeof staffId !== 'string') return false;
  if (!hospitalId || typeof hospitalId !== 'string') return false;
  const hospitals = staffHospitalDir.get(staffId);
  if (!hospitals || hospitals.size === 0) return false;
  return hospitals.has(hospitalId);
}
