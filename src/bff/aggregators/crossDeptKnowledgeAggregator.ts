/**
 * 健澜科技 jlmedaios - 跨科室知识联邦推荐聚合器（依据宪法第三章）
 *
 * 职责：
 *  - DEPT_SIMILARITY：科室间临床关联图谱（依据宪法第三章）——
 *      心血管内科 ↔ 内分泌科 ↔ 肾内科（糖代谢-心血管-肾病共病轴）；
 *      呼吸与危重症医学科 ↔ 胸外科（肺-胸膜外科共病轴）；
 *      神经内科 ↔ 康复医学科（卒中/神经损伤康复轴）；
 *      儿科 ↔ 新生儿科（围产-儿童连续诊疗轴）；
 *      肿瘤科 ↔ 放疗科（肿瘤综合治疗轴）。
 *  - crossDeptKnowledge(deptCode, knowledgeType, allDepts)：纯函数。
 *    当前科室在某知识类型上沉淀不足（条目数 < MIN_OWN_ENTRIES）时，
 *    自动从 DEPT_SIMILARITY 关联科室联邦拉取同类型高成功率知识，
 *    按 success_rate 降序、usage_count 降序、title 字典序升序排序返回。
 *  - getCrossDeptKnowledgeView(code, type)：路由层视图，从 medmuse.dept_knowledge
 *    读取全院该类型知识并喂给纯函数；数据库不可用时回退确定性演示数据（demo=true），
 *    绝不向路由层抛 500。
 *
 * 医疗安全红线（依据宪法第三章）：
 *  - 本模块只做知识检索与排序推荐，不改变医嘱、不强制改派诊疗方案；
 *  - 跨科室推荐仅作医师辅助参考，最终诊疗决策由主管医师作出并签名负责。
 *
 * 权限：medmuse:view。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb } from '@/db/pool.js';
import type { KnowledgeType } from './deptKnowledgeAggregator.js';

/* ------------------------------- 类型契约 ------------------------------- */

/** 科室中文名称表（DEPT_SIMILARITY 图谱覆盖的科室） */
export const DEPT_NAMES: Readonly<Record<string, string>> = {
  'DEP-CARDIO': '心血管内科',
  'DEP-ENDO': '内分泌科',
  'DEP-NEPHRO': '肾内科',
  'DEP-RESP': '呼吸与危重症医学科',
  'DEP-THORACIC': '胸外科',
  'DEP-NEURO': '神经内科',
  'DEP-REHAB': '康复医学科',
  'DEP-PED': '儿科',
  'DEP-NICU': '新生儿科',
  'DEP-ONC': '肿瘤科',
  'DEP-RADONC': '放疗科',
};

/**
 * 科室临床关联图谱（依据宪法第三章）：
 * key = 科室编码，value = 与其构成共病/连续诊疗轴的关联科室编码列表。
 * 关联关系在两侧对称登记（心血管↔内分泌、内分泌↔肾内科为三角共病轴）。
 */
export const DEPT_SIMILARITY: Readonly<Record<string, readonly string[]>> = {
  'DEP-CARDIO': ['DEP-ENDO', 'DEP-NEPHRO'],
  'DEP-ENDO': ['DEP-CARDIO', 'DEP-NEPHRO'],
  'DEP-NEPHRO': ['DEP-CARDIO', 'DEP-ENDO'],
  'DEP-RESP': ['DEP-THORACIC'],
  'DEP-THORACIC': ['DEP-RESP'],
  'DEP-NEURO': ['DEP-REHAB'],
  'DEP-REHAB': ['DEP-NEURO'],
  'DEP-PED': ['DEP-NICU'],
  'DEP-NICU': ['DEP-PED'],
  'DEP-ONC': ['DEP-RADONC'],
  'DEP-RADONC': ['DEP-ONC'],
};

/**
 * 当前科室自身知识「充足」阈值：
 * 本科室同类型知识条目数 ≥ MIN_OWN_ENTRIES 视为沉淀充足，不再跨科联邦推荐；
 * 低于该阈值（含 0 条空知识）即触发关联科室联邦补充。
 */
export const MIN_OWN_ENTRIES = 2;

/** 联邦推荐输入单元：某科室在某知识类型下的一条知识（BFF 视图层契约，camelCase） */
export interface CrossDeptKnowledgeItem {
  /** 科室编码（对应 clinical.departments.code） */
  deptCode: string;
  /** 知识类型 */
  knowledgeType: KnowledgeType;
  /** 条目标题 */
  title: string;
  /** 知识正文 */
  content: string;
  /** 采纳成功率 0~1 */
  successRate: number;
  /** 累计被采纳/调用次数 */
  usageCount: number;
}

/** 一条跨科室联邦推荐（GET /api/v1/dept/:code/related-knowledge 返回的明细） */
export interface CrossDeptRecommendation {
  /** 推荐知识来源科室编码 */
  deptCode: string;
  /** 推荐知识来源科室中文名称 */
  deptName: string;
  /** 关联关系说明，如「心血管内科 ↔ 内分泌科」 */
  relation: string;
  /** 知识条目标题 */
  title: string;
  /** 知识正文 */
  content: string;
  /** 来源科室该条知识的采纳成功率 0~1 */
  successRate: number;
  /** 来源科室该条知识的累计使用次数 */
  usageCount: number;
}

/** 跨科室推荐视图（路由返回的 data） */
export interface CrossDeptKnowledgeView {
  /** 查询的科室编码 */
  deptCode: string;
  /** 查询的科室中文名称（未知科室编码为空串） */
  deptName: string;
  /** 查询的知识类型 */
  knowledgeType: KnowledgeType;
  /** 当前科室自身该类型知识条目数（< MIN_OWN_ENTRIES 视为不足，触发联邦） */
  ownCount: number;
  /** 跨科室联邦推荐（关联科室高成功率知识，成功率降序） */
  recommended: CrossDeptRecommendation[];
  /** true 表示无数据时的离线演示兜底 */
  demo: boolean;
  /** 视图生成时间（ISO 8601） */
  generatedAt: string;
}

/** 数据库原始行（snake_case） */
interface RawRow {
  dept_code: string;
  knowledge_type: string;
  title: string | null;
  content: string | null;
  usage_count: string | number;
  success_rate: string | number;
}

/** 合法知识类型枚举白名单（与 deptKnowledgeAggregator 保持一致） */
const KNOWLEDGE_TYPES: readonly KnowledgeType[] = ['pathway', 'drug', 'diagnosis'];

/* ------------------------------ 纯函数核心 ------------------------------ */

/**
 * crossDeptKnowledge：当前科室知识不足时，联邦推荐关联科室的高成功率知识。
 *
 * 口径（依据宪法第三章）：
 *  1. 从 allDepts 中筛出 knowledgeType 命中的条目；
 *  2. 统计当前科室 deptCode 自身条目数 ownCount：
 *     - ownCount >= MIN_OWN_ENTRIES：本科室沉淀充足，返回空数组（不跨科推荐）；
 *     - ownCount <  MIN_OWN_ENTRIES：本科室知识不足，触发联邦补充；
 *  3. 查 DEPT_SIMILARITY 得到关联科室集合，收集关联科室同类型条目；
 *  4. 推荐条目排序：success_rate 降序 → usage_count 降序 → title 字典序升序，
 *     保证排序结果确定、可单测；
 *  5. 纯函数：不修改入参数组/对象；deptCode 无关联图谱或 allDepts 为空时
 *     返回空数组（空知识兜底，绝不抛错）。
 *
 * @param deptCode     当前科室编码
 * @param knowledgeType 知识类型（pathway/drug/diagnosis）
 * @param allDepts     全院各科室知识条目全集（只读视图）
 * @returns 跨科室推荐明细（已排序）；本科室知识充足或无关联数据时为 []
 */
export function crossDeptKnowledge(
  deptCode: string,
  knowledgeType: KnowledgeType,
  allDepts: readonly CrossDeptKnowledgeItem[],
): CrossDeptRecommendation[] {
  const code = (deptCode ?? '').trim();
  if (!code || !KNOWLEDGE_TYPES.includes(knowledgeType)) return [];

  const related = DEPT_SIMILARITY[code];
  if (!related || related.length === 0) return [];
  const relatedSet = new Set<string>(related);

  // 1. 本科室同类型条目数
  const ownCount = allDepts.filter(
    (d) => d.deptCode === code && d.knowledgeType === knowledgeType,
  ).length;

  // 2. 本科室知识充足 → 不跨科推荐
  if (ownCount >= MIN_OWN_ENTRIES) return [];

  // 3. 联邦收集关联科室同类型条目
  const relationLabel = `${DEPT_NAMES[code] ?? code} ↔ `;
  const collected: CrossDeptRecommendation[] = [];
  for (const d of allDepts) {
    if (d.knowledgeType !== knowledgeType) continue;
    if (!relatedSet.has(d.deptCode)) continue;
    collected.push({
      deptCode: d.deptCode,
      deptName: DEPT_NAMES[d.deptCode] ?? d.deptCode,
      relation: relationLabel + (DEPT_NAMES[d.deptCode] ?? d.deptCode),
      title: d.title,
      content: d.content,
      successRate: d.successRate,
      usageCount: d.usageCount,
    });
  }

  // 4. 排序：成功率降序 → 使用次数降序 → 标题字典序升序
  return collected.sort((a, b) => {
    if (b.successRate !== a.successRate) return b.successRate - a.successRate;
    if (b.usageCount !== a.usageCount) return b.usageCount - a.usageCount;
    return a.title.localeCompare(b.title);
  });
}

/* ------------------------------ 演示基线 ------------------------------ */

/** 确定性演示知识条目（空库 / DB 不可用时联邦兜底） */
const DEMO_ITEMS: CrossDeptKnowledgeItem[] = [
  // 心血管 ↔ 内分泌 ↔ 肾内科（糖代谢共病轴）
  { deptCode: 'DEP-ENDO', knowledgeType: 'pathway', title: '糖尿病合并心血管风险路径', content: 'HbA1c 达标前提下启动心血管二级预防，他汀+降压多靶点管控。', successRate: 0.93, usageCount: 156 },
  { deptCode: 'DEP-NEPHRO', knowledgeType: 'pathway', title: '糖尿病肾病早期路径', content: 'eGFR+UACR 分层，首选 SGLT2i/ARB 肾保护，每年肾科随访。', successRate: 0.88, usageCount: 96 },
  { deptCode: 'DEP-ENDO', knowledgeType: 'drug', title: '围术期糖皮质激素桥接口径', content: '长期激素使用者术前评估肾上腺皮质功能，围术期应激剂量补充。', successRate: 0.9, usageCount: 64 },
  // 呼吸 ↔ 胸外
  { deptCode: 'DEP-RESP', knowledgeType: 'pathway', title: '社区获得性肺炎路径', content: 'CAP 经验性抗感染 + 48~72h 复评，退热平稳后序贯口服。', successRate: 0.92, usageCount: 128 },
  { deptCode: 'DEP-THORACIC', knowledgeType: 'pathway', title: '肺结节术前评估路径', content: 'Lung-RADS 分层，≥8mm 实性结节多学科评估后择期手术，术后快速康复。', successRate: 0.85, usageCount: 72 },
  // 神经 ↔ 康复
  { deptCode: 'DEP-REHAB', knowledgeType: 'pathway', title: '脑梗死后早期康复路径', content: '生命体征平稳后 24~48h 启动床旁康复，按 Brunnstrom 分期进阶训练。', successRate: 0.89, usageCount: 110 },
  // 儿科 ↔ 新生儿
  { deptCode: 'DEP-NICU', knowledgeType: 'pathway', title: '早产新生儿黄疸路径', content: '小时胆红素曲线定位光疗阈值，光疗失败或达到换血标准及时转新生儿重症。', successRate: 0.87, usageCount: 84 },
  // 肿瘤 ↔ 放疗
  { deptCode: 'DEP-RADONC', knowledgeType: 'pathway', title: '肺癌术后辅助放疗路径', content: 'R0 切除后 N2 期三维适形辅助放疗，同步评估化疗与免疫序贯窗口。', successRate: 0.86, usageCount: 58 },
];

/* ------------------------------- 数据装载 ------------------------------- */

/** 校验并归一知识类型入参，非法值回退 pathway */
function normalizeType(type: string | undefined): KnowledgeType {
  return KNOWLEDGE_TYPES.includes(type as KnowledgeType)
    ? (type as KnowledgeType)
    : 'pathway';
}

/** 数据库行 → 联邦推荐输入单元 */
function toItem(row: RawRow): CrossDeptKnowledgeItem {
  return {
    deptCode: row.dept_code,
    knowledgeType: (row.knowledge_type as KnowledgeType) ?? 'pathway',
    title: row.title ?? '',
    content: row.content ?? '',
    usageCount: Number(row.usage_count) || 0,
    successRate: Number(row.success_rate) || 0,
  };
}

/** 拉取全院某类型知识条目，失败返回空数组 */
async function loadAllType(type: KnowledgeType): Promise<RawRow[]> {
  try {
    const db = getDb();
    const rows = await db`
      SELECT dept_code, knowledge_type, title, content, usage_count, success_rate
      FROM medmuse.dept_knowledge
      WHERE knowledge_type = ${type}
    `;
    return rows as unknown as RawRow[];
  } catch {
    return [];
  }
}

/* ------------------------------- 对外入口 ------------------------------- */

/**
 * getCrossDeptKnowledgeView：跨科室知识联邦推荐视图。
 *
 * 从 medmuse.dept_knowledge 读取全院同类型知识，交由纯函数 crossDeptKnowledge
 * 完成「本科室不足 → 关联科室高成功率知识联邦推荐」；DB 不可用或无记录时
 * 回退确定性演示基线（demo=true），绝不向路由层抛 500。
 *
 * @param deptCode 科室编码
 * @param type     知识类型（pathway/drug/diagnosis，缺省或非法回退 pathway）
 */
export async function getCrossDeptKnowledgeView(
  deptCode: string,
  type: string | undefined,
): Promise<CrossDeptKnowledgeView> {
  const normalized = normalizeType(type);
  const code = (deptCode ?? '').trim();

  const rows = await loadAllType(normalized);
  const items = rows.map(toItem);
  const usingDemo = items.length === 0;
  const source = usingDemo ? DEMO_ITEMS : items;

  const recommended = crossDeptKnowledge(code, normalized, source);
  const ownCount = source.filter(
    (d) => d.deptCode === code && d.knowledgeType === normalized,
  ).length;

  return {
    deptCode: code,
    deptName: DEPT_NAMES[code] ?? '',
    knowledgeType: normalized,
    ownCount,
    recommended,
    demo: usingDemo,
    generatedAt: new Date().toISOString(),
  };
}
