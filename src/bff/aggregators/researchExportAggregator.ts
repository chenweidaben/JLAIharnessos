/**
 * 健澜科技 jlmedaios - 科研专病队列导出聚合器
 *
 * 专病队列数据导出（CSV）：
 *  - listView(filters)：按纳入/排除条件筛选患者队列；筛选无命中时返回 demo:true 演示行，
 *    保证导出始终有可读的表头与示例，便于评审与离线演示；
 *  - buildCsv(rows)：纯函数，把队列数据行序列化为带 BOM 的 UTF-8 CSV（RFC4180）。
 *
 * 设计原则：
 *  - buildCsv / listView 均为纯函数、零数据库依赖、零副作用，可直接单测；
 *  - 复用 exportCsv.toCsv 统一转义与 BOM，不重复造轮子；
 *  - 患者姓名一律脱敏展示（张*三），导出不写明文身份，队列不用于诊疗。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { toCsv, type CsvCell } from './exportCsv';

/* -------------------------------- 类型定义 -------------------------------- */

/** 纳入/排除筛选条件（均可选，全部为 AND 关系） */
export interface CohortFilters {
  /** 专病关键词：主诊断名称或 ICD 编码包含（不区分大小写） */
  disease?: string;
  /** 性别精确匹配：男 / 女，空串表示不限 */
  gender?: string;
  /** 最小年龄（周岁，含） */
  minAge?: number;
  /** 最大年龄（周岁，含） */
  maxAge?: number;
  /** 最短住院天数（含），用于排除短住院病例 */
  minLos?: number;
  /** 科室名称包含（不区分大小写） */
  department?: string;
}

/** 队列导出数据行（脱敏后的扁平视图） */
export interface CohortRow {
  /** 患者脱敏 ID */
  patientId: string;
  /** 脱敏姓名（张*三） */
  name: string;
  /** 性别 */
  gender: string;
  /** 周岁年龄 */
  age: number;
  /** 就诊科室 */
  department: string;
  /** 主诊断名称 */
  primaryDx: string;
  /** 主诊断 ICD-10 编码 */
  icd: string;
  /** 住院天数 */
  losDays: number;
  /** 最近就诊日期 yyyy-mm-dd */
  lastVisit: string;
  /** true = 演示/兜底数据（无真实命中时） */
  demo?: boolean;
}

/* ------------------------------ 候选队列池 ------------------------------ */

/**
 * 内置候选队列（确定性样例，供无库环境筛选与演示）。
 * 覆盖糖尿病 / 高血压 / 慢阻肺三类专病，性别、年龄、住院天数梯度分布。
 */
const CANDIDATE_POOL: CohortRow[] = [
  { patientId: 'P001', name: '张*三', gender: '男', age: 58, department: '内分泌科', primaryDx: '2型糖尿病', icd: 'E11.900', losDays: 7, lastVisit: '2026-09-20' },
  { patientId: 'P002', name: '李*四', gender: '女', age: 63, department: '内分泌科', primaryDx: '2型糖尿病伴肾病', icd: 'E11.200', losDays: 10, lastVisit: '2026-09-25' },
  { patientId: 'P003', name: '王*五', gender: '男', age: 71, department: '心血管内科', primaryDx: '原发性高血压3级', icd: 'I10  3级', losDays: 5, lastVisit: '2026-09-18' },
  { patientId: 'P004', name: '赵*六', gender: '女', age: 55, department: '心血管内科', primaryDx: '原发性高血压', icd: 'I10.900', losDays: 3, lastVisit: '2026-09-22' },
  { patientId: 'P005', name: '陈*七', gender: '男', age: 68, department: '呼吸与危重症医学科', primaryDx: '慢性阻塞性肺疾病', icd: 'J44.900', losDays: 12, lastVisit: '2026-09-28' },
  { patientId: 'P006', name: '周*八', gender: '女', age: 74, department: '呼吸与危重症医学科', primaryDx: '慢阻肺急性加重', icd: 'J44.100', losDays: 14, lastVisit: '2026-09-30' },
  { patientId: 'P007', name: '吴*九', gender: '男', age: 49, department: '内分泌科', primaryDx: '2型糖尿病', icd: 'E11.900', losDays: 4, lastVisit: '2026-10-02' },
  { patientId: 'P008', name: '郑*十', gender: '女', age: 66, department: '心血管内科', primaryDx: '高血压性心脏病', icd: 'I11.900', losDays: 8, lastVisit: '2026-10-05' },
];

/** 筛选无命中时的演示兜底行（显式 demo:true） */
const DEMO_ROWS: CohortRow[] = [
  { patientId: 'DEMO-1', name: '演*甲', gender: '男', age: 60, department: '示例科室', primaryDx: '示例专病', icd: 'Z00.000', losDays: 6, lastVisit: '2026-10-14', demo: true },
  { patientId: 'DEMO-2', name: '演*乙', gender: '女', age: 65, department: '示例科室', primaryDx: '示例专病', icd: 'Z00.000', losDays: 9, lastVisit: '2026-10-14', demo: true },
];

/* ------------------------------ 筛选逻辑 ------------------------------ */

function matches(row: CohortRow, f: CohortFilters): boolean {
  if (f.disease) {
    const kw = f.disease.trim().toLowerCase();
    const hay = `${row.primaryDx} ${row.icd}`.toLowerCase();
    if (!hay.includes(kw)) return false;
  }
  if (f.gender && row.gender !== f.gender) return false;
  if (typeof f.minAge === 'number' && row.age < f.minAge) return false;
  if (typeof f.maxAge === 'number' && row.age > f.maxAge) return false;
  if (typeof f.minLos === 'number' && row.losDays < f.minLos) return false;
  if (f.department) {
    const kw = f.department.trim().toLowerCase();
    if (!row.department.toLowerCase().includes(kw)) return false;
  }
  return true;
}

/**
 * 按纳入/排除条件筛选患者队列。
 *
 * 规则：多条件 AND；任一为空表示不限。筛选结果为空时返回 demo:true 演示行，
 * 保证导出端点在无真实命中时仍产出可读模板，而非空文件。
 *
 * @param filters 纳排条件（可为空对象）
 * @returns 命中的队列行；无命中时返回 DEMO_ROWS
 */
export function listView(filters: CohortFilters = {}): CohortRow[] {
  const hit = CANDIDATE_POOL.filter((row) => matches(row, filters));
  return hit.length > 0 ? hit : DEMO_ROWS.map((r) => ({ ...r }));
}

/* ------------------------------ CSV 序列化 ------------------------------ */

/** 列头（中文，与 CohortRow 字段一一对应） */
export const COHORT_CSV_HEADER = [
  '患者ID',
  '姓名(脱敏)',
  '性别',
  '年龄',
  '科室',
  '主诊断',
  'ICD-10',
  '住院天数',
  '最近就诊日期',
  '数据来源',
] as const;

/**
 * 纯函数：队列数据行 → CSV 字符串（带 UTF-8 BOM，CRLF 换行）。
 *
 * - 表头固定为 COHORT_CSV_HEADER；
 * - demo 行在“数据来源”列标注“演示数据”，否则“真实数据”；
 * - 含逗号 / 双引号 / 换行的单元格按 RFC4180 转义（复用 toCsv）。
 *
 * @param rows 队列数据行
 * @returns 完整 CSV 文本（BOM + 表头 + 数据行）
 */
export function buildCsv(rows: CohortRow[]): string {
  const body: CsvCell[][] = rows.map((r) => [
    r.patientId,
    r.name,
    r.gender,
    r.age,
    r.department,
    r.primaryDx,
    r.icd,
    r.losDays,
    r.lastVisit,
    r.demo ? '演示数据' : '真实数据',
  ]);
  return toCsv([[...COHORT_CSV_HEADER], ...body]);
}
