/**
 * 健澜科技 jlmedaios - 医疗纠纷管理聚合器（M141-C · 质量与安全）
 *
 * 【质量与安全】医疗纠纷管理：保护医生，也保护患者。
 *   - registerDispute：登记一起纠纷（五类口径：服务态度 / 医疗质量 /
 *     费用争议 / 沟通问题 / 其他），patient_id 一律脱敏后入台账；
 *   - updateDisputeStatus：状态流转 登记 → 调查中 → 协商中 → 已解决 / 已诉讼，
 *     非法跳变一律拒绝（纯函数强校验），终态必须填写处理结果；
 *   - analyzeDisputeTrend：按账期（YYYY-MM）出趋势——总量 / 分类计数 /
 *     分状态计数 / 闭环率，供质量与安全科看板。
 *
 * 与全仓聚合器约定一致（同 teachingAggregator）：
 *   - 三个对外函数均为纯计算（校验、组包、状态机、汇总），不修改入参；
 *   - 进程内台账 disputes 是趋势查询的在读索引；
 *     PostgreSQL 为持久化，落库为 best-effort（断库 / 表未迁移时降级，
 *     不阻断登记与趋势主流程）；
 *   - 入参非法一律抛错，由路由层收敛为 400 结构化错误信封。
 *
 * 隐私红线：patient_id 在登记瞬间脱敏（P0****23），台账 / 出参 / 落库
 *   全程不接触患者明文标识——台账本身即不沉淀患者 PII。
 * 不触碰 WebSocket，不新增依赖（uuid 取自 node 内置 crypto）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { randomUUID } from 'node:crypto';
import { getDb } from '../../db/pool.js';

/* ------------------------------------------------------------------ */
/* 类型与口径                                                           */
/* ------------------------------------------------------------------ */

/** 纠纷类型代码（与 clinical.medical_dispute.dispute_type CHECK 一致） */
export type DisputeType =
  | 'service_attitude'
  | 'medical_quality'
  | 'fee_dispute'
  | 'communication'
  | 'other';

/** 纠纷状态代码（与 clinical.medical_dispute.status CHECK 一致） */
export type DisputeStatus =
  | 'registered'
  | 'investigating'
  | 'negotiating'
  | 'resolved'
  | 'litigated';

/** 类型元数据：代码 → 中文标签 */
const TYPE_META: Readonly<Record<DisputeType, string>> = {
  service_attitude: '服务态度',
  medical_quality: '医疗质量',
  fee_dispute: '费用争议',
  communication: '沟通问题',
  other: '其他',
};

/** 状态元数据：代码 → 中文标签 */
const STATUS_META: Readonly<Record<DisputeStatus, string>> = {
  registered: '登记',
  investigating: '调查中',
  negotiating: '协商中',
  resolved: '已解决',
  litigated: '已诉讼',
};

/** 中文标签 → 类型代码（登记接口同时接受代码或中文） */
const TYPE_BY_LABEL: Readonly<Record<string, DisputeType>> = {
  服务态度: 'service_attitude',
  医疗质量: 'medical_quality',
  费用争议: 'fee_dispute',
  沟通问题: 'communication',
  其他: 'other',
};

/** 中文标签 → 状态代码（状态流转接口同时接受代码或中文） */
const STATUS_BY_LABEL: Readonly<Record<string, DisputeStatus>> = {
  登记: 'registered',
  调查中: 'investigating',
  协商中: 'negotiating',
  已解决: 'resolved',
  已诉讼: 'litigated',
};

/**
 * 【质量与安全】状态机：合法流转边。
 * 登记 → 调查中 → 协商中 → 已解决 / 已诉讼；终态（已解决/已诉讼）不可再流转。
 * 保护医生：未走完调查不得径行定性；保护患者：终态必须留下处理结果。
 */
const NEXT_STATUS: Readonly<Record<DisputeStatus, readonly DisputeStatus[]>> = {
  registered: ['investigating'],
  investigating: ['negotiating'],
  negotiating: ['resolved', 'litigated'],
  resolved: [],
  litigated: [],
};

/** 终态集合（到达终态必须填写处理结果） */
const TERMINAL_STATUSES: ReadonlySet<DisputeStatus> = new Set(['resolved', 'litigated']);

/** 一起医疗纠纷（BFF 对外形态，camelCase；patientId 已脱敏） */
export interface Dispute {
  /** 纠纷唯一标识 */
  id: string;
  /** 脱敏患者标识（如 P0****23，全程不存明文） */
  patientId: string;
  /** 关联就诊号（可空串） */
  visitId: string;
  /** 类型代码 */
  type: DisputeType;
  /** 类型中文标签（前端看板直接展示） */
  typeLabel: string;
  /** 纠纷经过 / 患者诉求描述 */
  description: string;
  /** 状态代码 */
  status: DisputeStatus;
  /** 状态中文标签 */
  statusLabel: string;
  /** 处理结果（终态填写：协商结论 / 诉讼案号） */
  resolution: string;
  /** 登记时间 ISO 串 */
  createdAt: string;
  /** 最近一次状态流转时间 ISO 串 */
  updatedAt: string;
}

/** 某一类别的纠纷计数 */
export interface DisputeTypeStat {
  type: DisputeType;
  typeLabel: string;
  /** 账期内该类型纠纷数 */
  count: number;
}

/** 某一状态的纠纷计数 */
export interface DisputeStatusStat {
  status: DisputeStatus;
  statusLabel: string;
  /** 账期内处于该状态的纠纷数 */
  count: number;
}

/** 纠纷趋势（质量与安全科月度看板） */
export interface DisputeTrend {
  /** 账期 YYYY-MM */
  period: string;
  /** 账期内登记纠纷总数 */
  total: number;
  /** 已解决数（闭环口径之一） */
  resolvedCount: number;
  /** 已诉讼数 */
  litigatedCount: number;
  /** 在办数（登记/调查中/协商中合计） */
  openCount: number;
  /** 闭环率（已解决+已诉讼）/ 总数，0~1；无纠纷为 0 */
  resolutionRate: number;
  /** 分类别计数（按数量降序） */
  byType: DisputeTypeStat[];
  /** 分状态计数（按状态机顺序） */
  byStatus: DisputeStatusStat[];
  generatedAt: string;
}

/** registerDispute 的可选元数据（测试/回放用） */
export interface DisputeMeta {
  /** 覆盖登记时间（测试用）；缺省取当前时钟 */
  createdAt?: string;
}

/* ------------------------------------------------------------------ */
/* 进程内纠纷台账（趋势查询的在读索引）                                 */
/* ------------------------------------------------------------------ */

const disputes: Dispute[] = [];

/** rate 四舍五入到 4 位小数，避免浮点噪声 */
function roundRate(rate: number): number {
  return Math.round(rate * 10000) / 10000;
}

/** 宽松收敛为 trim 后字符串 */
function toText(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'string') return v.trim();
  return String(v).trim();
}

/**
 * 【质量与安全】患者标识脱敏：保留前 2 位与后 2 位，中间以 **** 代替。
 * 短于 4 位的标识整体打码为 ****，绝不明文入台账。
 */
export function maskPatientId(patientId: string): string {
  const id = toText(patientId);
  if (id.length < 4) return '****';
  return `${id.slice(0, 2)}****${id.slice(-2)}`;
}

/** 把类型（代码或中文标签）收敛为代码；非法一律抛错 */
function resolveType(input: unknown): DisputeType {
  const raw = toText(input);
  if (raw in TYPE_META) return raw as DisputeType;
  if (raw in TYPE_BY_LABEL) return TYPE_BY_LABEL[raw];
  throw new Error(
    `纠纷类型 type=${raw || '空'} 非法（应为：服务态度/医疗质量/费用争议/沟通问题/其他）`,
  );
}

/** 把状态（代码或中文标签）收敛为代码；非法一律抛错 */
function resolveStatus(input: unknown): DisputeStatus {
  const raw = toText(input);
  if (raw in STATUS_META) return raw as DisputeStatus;
  if (raw in STATUS_BY_LABEL) return STATUS_BY_LABEL[raw];
  throw new Error(
    `纠纷状态 status=${raw || '空'} 非法（应为：登记/调查中/协商中/已解决/已诉讼）`,
  );
}

/* ------------------------------------------------------------------ */
/* 对外纯函数                                                          */
/* ------------------------------------------------------------------ */

/**
 * 【质量与安全】登记一起医疗纠纷。
 *
 * 校验 → patientId 脱敏 → 组包 → 写入进程内台账 → 返回纠纷副本。
 * 登记后初始状态恒为「登记」，流转交由 updateDisputeStatus 强校验。
 *
 * @param patientId   患者标识（登记瞬间脱敏，如 P000123 → P0****23）
 * @param visitId     关联就诊号（可空串）
 * @param type        纠纷类型（代码或中文标签）
 * @param description 纠纷经过 / 患者诉求描述
 */
export function registerDispute(
  patientId: unknown,
  visitId: unknown,
  type: unknown,
  description: unknown,
  meta?: DisputeMeta,
): Dispute {
  const rawPatient = toText(patientId);
  if (!rawPatient) throw new Error('患者标识 patientId 不能为空');
  const t = resolveType(type);

  const dispute: Dispute = {
    id: randomUUID(),
    patientId: maskPatientId(rawPatient),
    visitId: toText(visitId),
    type: t,
    typeLabel: TYPE_META[t],
    description: toText(description),
    status: 'registered',
    statusLabel: STATUS_META.registered,
    resolution: '',
    createdAt: meta?.createdAt ?? new Date().toISOString(),
    updatedAt: meta?.createdAt ?? new Date().toISOString(),
  };
  disputes.push(dispute);
  return { ...dispute };
}

/**
 * 【质量与安全】纠纷状态流转：登记 → 调查中 → 协商中 → 已解决 / 已诉讼。
 *
 * 纯函数强校验状态机，非法跳变（如 登记→已解决）一律抛错；
 * 到达终态（已解决 / 已诉讼）必须填写处理结果 resolution。
 *
 * @param disputeId 纠纷 id
 * @param status   目标状态（代码或中文标签）
 * @param resolution 处理结果；终态必填（协商结论 / 诉讼案号）
 */
export function updateDisputeStatus(
  disputeId: unknown,
  status: unknown,
  resolution?: unknown,
): Dispute {
  const id = toText(disputeId);
  if (!id) throw new Error('纠纷 disputeId 不能为空');

  const dispute = disputes.find((d) => d.id === id);
  if (!dispute) throw new Error(`纠纷 disputeId=${id} 不存在，无法流转状态`);

  const next = resolveStatus(status);
  if (dispute.status === next) {
    throw new Error(`纠纷已处于「${STATUS_META[next]}」状态，无需重复流转`);
  }
  if (!NEXT_STATUS[dispute.status].includes(next)) {
    throw new Error(
      `状态流转非法：「${STATUS_META[dispute.status]}」→「${STATUS_META[next]}」，` +
        `合法路径为 登记 → 调查中 → 协商中 → 已解决 / 已诉讼`,
    );
  }

  const resolutionText = toText(resolution);
  if (TERMINAL_STATUSES.has(next) && !resolutionText) {
    throw new Error(`到达终态「${STATUS_META[next]}」必须填写处理结果 resolution`);
  }

  dispute.status = next;
  dispute.statusLabel = STATUS_META[next];
  dispute.resolution = resolutionText;
  dispute.updatedAt = new Date().toISOString();
  return { ...dispute };
}

/**
 * 【质量与安全】按账期（YYYY-MM）出纠纷趋势（质量与安全科月度看板）。
 *
 * 统计口径：
 *   - total / byType / byStatus：账期内登记的纠纷；
 *   - resolutionRate：（已解决 + 已诉讼）/ 总数，账期闭环率；
 *   - openCount：仍在办（登记 / 调查中 / 协商中）的纠纷数。
 *
 * 纯计算核心在 analyzeTrendOn(disputes, period)，本函数从进程内台账取数。
 */
export function analyzeDisputeTrend(period: string): DisputeTrend {
  return analyzeTrendOn(disputes, period);
}

/**
 * 纯计算核心：在给定纠纷集合上按账期汇总趋势。
 * 不读全局台账、不修改入参，便于单测直接喂数据集验证。
 */
export function analyzeTrendOn(
  allDisputes: readonly Dispute[],
  period: string,
): DisputeTrend {
  const p = toText(period);
  if (!/^[0-9]{4}-(0[1-9]|1[0-2])$/.test(p)) {
    throw new Error(`账期 period=${p} 非法（应为 YYYY-MM）`);
  }

  const inPeriod = allDisputes.filter((d) => d.createdAt.slice(0, 7) === p);

  const resolvedCount = inPeriod.filter((d) => d.status === 'resolved').length;
  const litigatedCount = inPeriod.filter((d) => d.status === 'litigated').length;
  const openCount = inPeriod.length - resolvedCount - litigatedCount;
  const resolutionRate =
    inPeriod.length > 0 ? roundRate((resolvedCount + litigatedCount) / inPeriod.length) : 0;

  // 分类别计数（按数量降序，同量按类型代码字典序稳定）
  const typeMap = new Map<DisputeType, number>();
  for (const d of inPeriod) typeMap.set(d.type, (typeMap.get(d.type) ?? 0) + 1);
  const byType: DisputeTypeStat[] = [...typeMap.entries()]
    .map(([type, count]) => ({ type, typeLabel: TYPE_META[type], count }))
    .sort((a, b) => b.count - a.count || a.type.localeCompare(b.type));

  // 分状态计数（按状态机固定顺序）
  const byStatus: DisputeStatusStat[] = (
    Object.keys(STATUS_META) as DisputeStatus[]
  ).map((status) => ({
    status,
    statusLabel: STATUS_META[status],
    count: inPeriod.filter((d) => d.status === status).length,
  }));

  return {
    period: p,
    total: inPeriod.length,
    resolvedCount,
    litigatedCount,
    openCount,
    resolutionRate,
    byType,
    byStatus,
    generatedAt: new Date().toISOString(),
  };
}

/** 列出全部纠纷（按登记时间倒序，路由 GET 看板直接消费） */
export function listDisputes(): Dispute[] {
  return [...disputes].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** 测试专用：清空进程内台账，保证用例之间互不污染。 */
export function resetDisputeLedger(): void {
  disputes.length = 0;
}

/* ------------------------------------------------------------------ */
/* 薄持久化层：best-effort 写入 PostgreSQL，失败降级不阻断               */
/* ------------------------------------------------------------------ */

/**
 * 把已登记的纠纷落库到 clinical.medical_dispute。
 * 由路由层在 registerDispute 之后显式 await；断库 / 表未迁移时静默降级，
 * 进程内台账仍可出趋势，持久化留待重连后补写。
 */
export async function persistDispute(dispute: Dispute): Promise<void> {
  try {
    const db = getDb();
    await db`
      INSERT INTO clinical.medical_dispute
        (id, patient_id, visit_id, dispute_type, description, status,
         resolution, created_at, updated_at)
      VALUES
        (${dispute.id}, ${dispute.patientId}, ${dispute.visitId}, ${dispute.type},
         ${dispute.description}, ${dispute.status}, ${dispute.resolution},
         ${dispute.createdAt}::timestamptz, ${dispute.updatedAt}::timestamptz)
      ON CONFLICT (id) DO NOTHING
    `;
  } catch {
    // 断库 / 表未迁移：进程内台账仍可出趋势，落库留待重连后补写
  }
}

/**
 * 把状态流转结果回写 clinical.medical_dispute。best-effort，断库降级不阻断。
 */
export async function persistDisputeStatus(dispute: Dispute): Promise<void> {
  try {
    const db = getDb();
    await db`
      UPDATE clinical.medical_dispute
      SET status = ${dispute.status},
          resolution = ${dispute.resolution},
          updated_at = ${dispute.updatedAt}::timestamptz
      WHERE id = ${dispute.id}
    `;
  } catch {
    // 断库 / 表未迁移：进程内台账状态已生效，回写留待重连后补写
  }
}
