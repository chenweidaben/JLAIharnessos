/**
 * 健澜科技 jlmedaios - 科室知识沉淀引擎聚合器（M101-A）
 *
 * 科室在临床路径 / 用药 / 诊断三类场景下沉淀的专属知识条目，按「采纳成功率」
 * 排序驱动 AI 推荐优先级。知识来源两路：系统内置（system）与医生反馈回流
 * （doctor_feedback）。
 *
 * 纯函数核心（可单测、不触库）：
 *  - rankBySuccess(entries)：按 success_rate 降序排序（返回新数组，不改原数组）；
 *  - recordUsage(entry, success)：记录一次采纳使用，增量重算 usage_count 与
 *    success_rate（成功加权滑动均值），返回更新后的新条目（不改原对象）。
 *
 * 视图：getDeptKnowledge(view, deptCode, type) 按科室 + 类型拉取并排序返回；
 * DEMO_MODE 下不连 PostgreSQL，返回确定性演示基线；查询失败回退空列表，绝不向
 * 路由层抛 500。
 *
 * 权限：dept_knowledge:view。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { getDb } from '@/db/pool.js';
import { getEnv } from '../config/env.js';
import type { AuthView } from '../view/userView.js';

export class DeptKnowledgeError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'DeptKnowledgeError';
  }
}

/* ------------------------------- 类型契约 ------------------------------- */

/** 知识类型：临床路径 / 用药知识 / 诊断要点 */
export type KnowledgeType = 'pathway' | 'drug' | 'diagnosis';

/** 知识来源：系统内置 / 医生反馈回流 */
export type KnowledgeSource = 'system' | 'doctor_feedback';

/** 科室知识条目（BFF 视图层契约，camelCase） */
export interface DeptKnowledgeEntry {
  /** 主键 uuid */
  id: string;
  /** 科室编码（对应 clinical.departments.code） */
  deptCode: string;
  /** 知识类型 */
  knowledgeType: KnowledgeType;
  /** 条目标题 */
  title: string;
  /** 知识正文 */
  content: string;
  /** 来源 */
  source: KnowledgeSource;
  /** 累计被采纳/调用次数 */
  usageCount: number;
  /** 采纳成功率 0~1（成功次数 / 累计使用次数） */
  successRate: number;
  /** 最近更新时间（ISO） */
  updatedAt: string;
}

/** getDeptKnowledge 返回视图 */
export interface DeptKnowledgeView {
  /** true 表示无历史数据时的演示基线 */
  demo: boolean;
  deptCode: string;
  knowledgeType: KnowledgeType;
  /** 已按 success_rate 降序排序的条目 */
  entries: DeptKnowledgeEntry[];
}

/** 数据库原始行（snake_case） */
interface RawRow {
  id: string;
  dept_code: string;
  knowledge_type: string;
  title: string | null;
  content: string | null;
  source: string;
  usage_count: string | number;
  success_rate: string | number;
  updated_at: string;
}

/** 合法知识类型枚举白名单 */
const KNOWLEDGE_TYPES: readonly KnowledgeType[] = ['pathway', 'drug', 'diagnosis'];

/* ------------------------------ 纯函数核心 ------------------------------ */

/**
 * rankBySuccess：按采纳成功率对知识条目降序排序。
 *
 * 口径：
 *  - 主排序键 success_rate 降序（成功率越高越靠前）；
 *  - 成功率相同则 usage_count 降序（被采纳次数多者优先）；
 *  - 仍相同则 title 字典序升序，保证排序结果确定、可单测。
 *
 * 纯函数：返回排序后的新数组，不修改入参数组。
 *
 * @param entries 待排序条目（只读视图）
 * @returns 排序后的新条目数组
 */
export function rankBySuccess(
  entries: readonly DeptKnowledgeEntry[],
): DeptKnowledgeEntry[] {
  return [...entries].sort((a, b) => {
    if (b.successRate !== a.successRate) return b.successRate - a.successRate;
    if (b.usageCount !== a.usageCount) return b.usageCount - a.usageCount;
    return a.title.localeCompare(b.title);
  });
}

/**
 * recordUsage：记录一次知识条目被采纳使用，增量更新使用次数与成功率。
 *
 * 口径（滑动成功加权均值）：
 *  - usageCount' = usageCount + 1；
 *  - successRate' = (successRate × usageCount + (success ? 1 : 0)) / usageCount'，
 *    四舍五入保留 4 位小数；
 *  - 首次使用（usageCount = 0）时成功率即本次是否成功（0 或 1）。
 *
 * 纯函数：返回更新后的新条目对象，不修改入参；updatedAt 由调用方/数据库刷新，
 * 此处原样透传。
 *
 * @param entry 被采纳的知识条目
 * @param success 本次采纳是否成功（命中/被医生认可）
 * @returns 更新 usage_count / success_rate 后的新条目
 */
export function recordUsage(
  entry: DeptKnowledgeEntry,
  success: boolean,
): DeptKnowledgeEntry {
  const usageCount = entry.usageCount + 1;
  const prevSum = entry.successRate * entry.usageCount;
  const nextRate = (prevSum + (success ? 1 : 0)) / usageCount;
  return {
    ...entry,
    usageCount,
    successRate: Math.round(nextRate * 10000) / 10000,
  };
}

/* ------------------------------ 演示基线 ------------------------------ */

/** 确定性演示知识条目（DEMO_MODE / 空库兜底用） */
function demoEntries(deptCode: string, type: KnowledgeType): DeptKnowledgeEntry[] {
  const seed: Record<KnowledgeType, Array<Pick<DeptKnowledgeEntry, 'title' | 'content' | 'successRate' | 'usageCount'>>> = {
    pathway: [
      { title: '社区获得性肺炎路径', content: 'CAP 经验性抗感染 + 48~72h 复评，退热平稳后序贯口服。', successRate: 0.92, usageCount: 128 },
      { title: '2 型糖尿病入院路径', content: '入院即糖代谢评估，二甲双胍耐受前提下优先口服，防低血糖。', successRate: 0.84, usageCount: 96 },
      { title: '急性阑尾炎术后路径', content: '术后 24h 下床、尽早经口进食，按切口分级择期拆线。', successRate: 0.78, usageCount: 54 },
    ],
    drug: [
      { title: 'β 内酰胺类皮试口径', content: '青霉素类按说明书皮试，头孢类一般不常规皮试，询问过敏史。', successRate: 0.95, usageCount: 210 },
      { title: '质子泵抑制剂围术期使用', content: '高危应激性溃疡人群术前 1 日起 PPI，术后 3~5 日评估停药。', successRate: 0.81, usageCount: 73 },
    ],
    diagnosis: [
      { title: '不明原因发热鉴别要点', content: '先感染、后肿瘤、再自身免疫；常规血象 + 培养 + 影像三层排查。', successRate: 0.88, usageCount: 142 },
      { title: '老年跌倒风险初筛', content: 'Morse 评分 + 用药复核（镇静/降压），高风险纳入交接班。', successRate: 0.86, usageCount: 88 },
    ],
  };
  return seed[type].map((s, i) => ({
    id: `demo-${type}-${i + 1}`,
    deptCode,
    knowledgeType: type,
    title: s.title,
    content: s.content,
    source: 'system',
    usageCount: s.usageCount,
    successRate: s.successRate,
    updatedAt: new Date(0).toISOString(),
  }));
}

/* ------------------------------- 数据装载 ------------------------------- */

/** 权限断言：dept_knowledge:view */
function assertPermission(view: AuthView): void {
  if (!view.permissions.includes('dept_knowledge:view')) {
    throw new DeptKnowledgeError(403, '无权限：需要 dept_knowledge:view');
  }
}

/** 校验并归一知识类型入参，非法值回退 pathway */
function normalizeType(type: string | undefined): KnowledgeType {
  return KNOWLEDGE_TYPES.includes(type as KnowledgeType)
    ? (type as KnowledgeType)
    : 'pathway';
}

/** 数据库行 → BFF 条目 */
function toEntry(row: RawRow): DeptKnowledgeEntry {
  return {
    id: row.id,
    deptCode: row.dept_code,
    knowledgeType: row.knowledge_type as KnowledgeType,
    title: row.title ?? '',
    content: row.content ?? '',
    source: (row.source as KnowledgeSource) ?? 'system',
    usageCount: Number(row.usage_count) || 0,
    successRate: Number(row.success_rate) || 0,
    updatedAt: row.updated_at,
  };
}

/** 按科室 + 类型拉取知识条目，失败返回空数组 */
async function loadRows(deptCode: string, type: KnowledgeType): Promise<RawRow[]> {
  try {
    const db = getDb();
    const rows = await db`
      SELECT id, dept_code, knowledge_type, title, content, source,
             usage_count, success_rate, updated_at
      FROM medmuse.dept_knowledge
      WHERE dept_code = ${deptCode} AND knowledge_type = ${type}
      ORDER BY success_rate DESC, usage_count DESC
    `;
    return rows as unknown as RawRow[];
  } catch {
    return [];
  }
}

/* ------------------------------- 对外入口 ------------------------------- */

/**
 * getDeptKnowledge：按科室编码 + 知识类型拉取沉淀知识，并按成功率排序。
 *
 * 权限：dept_knowledge:view。DEMO_MODE 直接返回确定性演示基线；
 * 真实模式下无记录（或查询失败）时同样回退演示基线（demo=true），
 * 绝不向路由层抛 500。
 *
 * @param view 当前登录用户（含权限清单）
 * @param deptCode 科室编码
 * @param type 知识类型（pathway/drug/diagnosis，缺省或非法回退 pathway）
 */
export async function getDeptKnowledge(
  view: AuthView,
  deptCode: string,
  type: string | undefined,
): Promise<DeptKnowledgeView> {
  assertPermission(view);
  const normalized = normalizeType(type);
  const code = (deptCode ?? '').trim();
  if (!code) {
    throw new DeptKnowledgeError(400, '科室编码 dept_code 不能为空');
  }

  // DEMO_MODE：短路，避免 getDb() 在无 PG 环境下建池/连库
  if (getEnv().demoMode) {
    return {
      demo: true,
      deptCode: code,
      knowledgeType: normalized,
      entries: rankBySuccess(demoEntries(code, normalized)),
    };
  }

  const rows = await loadRows(code, normalized);
  if (rows.length === 0) {
    return {
      demo: true,
      deptCode: code,
      knowledgeType: normalized,
      entries: rankBySuccess(demoEntries(code, normalized)),
    };
  }

  return {
    demo: false,
    deptCode: code,
    knowledgeType: normalized,
    entries: rankBySuccess(rows.map(toEntry)),
  };
}
