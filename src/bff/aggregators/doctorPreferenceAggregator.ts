/**
 * 健澜科技 jlmedaios - 门诊医生工作台「越用越懂医生」偏好自学习聚合器
 *
 * 依据宪法第四章（医生工作台智能化）：从医生历史门诊医嘱 / 检查检验中
 *   结构化学习出该医生的开方习惯——常用药品 TOP5、常用检查检验 TOP5、
 *   常用临床路径，并以 medmuse.doctor_preference 表持久化。
 *
 * 设计要点：
 *  - buildDoctorPreference / topN 为纯函数，不修改入参、不打库，
 *    便于单测与前端侧本地复用；
 *  - getStoredPreference / rebuildStoredPreference 为薄持久化层，
 *    全部包 try/catch：断库 / 表未迁移时降级为空偏好，不抛 5xx；
 *  - 只聚合「药品 / 检查 / 路径」级权重，不落患者直接标识符。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb } from '../../db/pool.js';

/* ------------------------------------------------------------------ */
/* 类型                                                                */
/* ------------------------------------------------------------------ */

/** 历史用药医嘱行（门诊处方/medicine 类医嘱） */
export interface HistoryOrder {
  /** 药品名称（通用名） */
  drugName: string;
  /** 规格，如 5mg×7片 */
  spec?: string;
  /** 单次剂量，如 5mg */
  dosage?: string;
  /** 频次，如 qd / bid */
  frequency?: string;
  /** 所属临床路径标签，如 高血压门诊路径 */
  pathwayTag?: string;
}

/** 历史检查检验行（exam / lab 类医嘱） */
export interface HistoryExam {
  /** 检查/检验项目名称 */
  itemName: string;
  /** 业务分类：检查 imaging / 检验 lab / 处置 treatment */
  category?: '检查' | '检验' | '处置';
  /** 项目编码 */
  itemCode?: string;
}

/** 偏好条目（带出现次数权重） */
export interface PreferenceItem {
  /** 药品 / 检查 / 路径名称 */
  name: string;
  /** 历史出现次数（权重，降序） */
  count: number;
  /** 分类（药品无分类；检查检验带分类） */
  category?: string;
}

/** 医生偏好聚合结果 */
export interface DoctorPreference {
  /** 常用药品 TOP5 */
  preferredDrugs: PreferenceItem[];
  /** 常用检查检验 TOP5 */
  preferredExams: PreferenceItem[];
  /** 常用临床路径 TOP5 */
  commonPathways: PreferenceItem[];
}

/** 持久化后的医生偏好（含学习元数据） */
export interface StoredDoctorPreference extends DoctorPreference {
  doctorId: string;
  /** 平均单次门诊时长（分钟），未学习为 null */
  avgVisitMinutes: number | null;
  /** 累计学习（刷新）次数 */
  visitCount: number;
  /** 最近一次学习时间 ISO */
  updatedAt: string;
}

/* ------------------------------------------------------------------ */
/* 纯函数                                                              */
/* ------------------------------------------------------------------ */

/**
 * topN：按权重（count 降序）取前 n 条。
 *
 * 排序口径：count 高者在前；count 相同时按名称字典序（zh-CN）升序，
 *   保证输出确定、可快照、可单测。
 *
 * 纯函数：返回新数组，不修改入参；n <= 0 或入参为空时返回空数组。
 *
 * @param items 待排序条目（须含 name / count）
 * @param n     取前 N 条，默认 5
 */
export function topN<T extends { name: string; count: number }>(
  items: T[],
  n = 5,
): T[] {
  if (!items || items.length === 0) return [];
  const limit = Math.max(0, Math.floor(n));
  return items
    .slice()
    .sort(
      (a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh-CN'),
    )
    .slice(0, limit);
}

/**
 * 累计计数器：把名称流聚合成 {name,count} 权重表。
 * 空名 / 纯空白名一律忽略；同名（trim 后）累计次数。
 */
function accumulate(
  map: Map<string, PreferenceItem>,
  name: string,
  category?: string,
): void {
  const key = (name ?? '').trim();
  if (!key) return;
  const existing = map.get(key);
  if (existing) {
    existing.count += 1;
  } else {
    map.set(key, { name: key, count: 1, ...(category ? { category } : {}) });
  }
}

/**
 * buildDoctorPreference：从历史医嘱 / 检查提取医生偏好。
 *
 * 产出：
 *   - preferredDrugs：用药医嘱按药品名累计 → TOP5
 *   - preferredExams：检查检验按项目名累计 → TOP5（带分类）
 *   - commonPathways：医嘱携带的临床路径标签累计 → TOP5
 *
 * 纯函数：不修改入参；historyOrders / historyExams 为 null / undefined /
 *   空数组时，三类偏好均返回空数组（空历史兜底，不抛错）。
 *
 * @param historyOrders 历史用药医嘱行
 * @param historyExams   历史检查检验行
 */
export function buildDoctorPreference(
  historyOrders: HistoryOrder[] | null | undefined,
  historyExams: HistoryExam[] | null | undefined,
): DoctorPreference {
  const drugMap = new Map<string, PreferenceItem>();
  const pathwayMap = new Map<string, PreferenceItem>();

  for (const order of historyOrders ?? []) {
    if (!order) continue;
    accumulate(drugMap, order.drugName);
    accumulate(pathwayMap, order.pathwayTag ?? '');
  }

  const examMap = new Map<string, PreferenceItem>();
  for (const exam of historyExams ?? []) {
    if (!exam) continue;
    accumulate(examMap, exam.itemName, exam.category);
  }

  return {
    preferredDrugs: topN(Array.from(drugMap.values()), 5),
    preferredExams: topN(Array.from(examMap.values()), 5),
    commonPathways: topN(Array.from(pathwayMap.values()), 5),
  };
}

/* ------------------------------------------------------------------ */
/* 薄持久化层（断库降级，不抛 5xx）                                       */
/* ------------------------------------------------------------------ */

/** medmuse.doctor_preference 行（postgres.js 返回形态） */
interface DoctorPreferenceDbRow {
  doctor_id: string;
  preferred_drugs: PreferenceItem[] | null;
  preferred_exams: PreferenceItem[] | null;
  common_pathways: PreferenceItem[] | null;
  avg_visit_minutes: string | number | null;
  visit_count: number | null;
  updated_at: string | Date;
}

/** clinical.orders 历史行（仅取偏好学习所需列） */
interface OrderHistoryRow {
  order_type: string;
  content: string;
  dosage: string | null;
  frequency: string | null;
}

function asDate(v: string | Date): string {
  return v instanceof Date ? v.toISOString() : v;
}

/**
 * getStoredPreference：读取某医生已沉淀的偏好。
 *
 * 降级口径：表未迁移 / 断库 / 无记录时统一返回 null，
 *   由路由层兜底为空偏好视图，不抛错。
 */
export async function getStoredPreference(
  doctorId: string,
): Promise<StoredDoctorPreference | null> {
  try {
    const rows = await getDb()<DoctorPreferenceDbRow[]>`
      SELECT doctor_id, preferred_drugs, preferred_exams, common_pathways,
             avg_visit_minutes, visit_count, updated_at
      FROM medmuse.doctor_preference
      WHERE doctor_id = ${doctorId}
      LIMIT 1
    `;
    const row = rows[0];
    if (!row) return null;
    return {
      doctorId: row.doctor_id,
      preferredDrugs: row.preferred_drugs ?? [],
      preferredExams: row.preferred_exams ?? [],
      commonPathways: row.common_pathways ?? [],
      avgVisitMinutes:
        row.avg_visit_minutes === null ? null : Number(row.avg_visit_minutes),
      visitCount: row.visit_count ?? 0,
      updatedAt: asDate(row.updated_at),
    };
  } catch (e) {
    console.warn('[doctor-preference] 读取失败，降级为空偏好:', e instanceof Error ? e.message : e);
    return null;
  }
}

/**
 * upsertPreference：把学习结果 UPSERT 到 medmuse.doctor_preference。
 * visit_count 在既有记录上 +1，updated_at 刷新为 now()。
 */
async function upsertPreference(
  doctorId: string,
  pref: DoctorPreference,
): Promise<void> {
  await getDb()`
    INSERT INTO medmuse.doctor_preference
      (doctor_id, preferred_drugs, preferred_exams, common_pathways, visit_count, updated_at)
    VALUES
      (${doctorId}, ${pref.preferredDrugs}::jsonb, ${pref.preferredExams}::jsonb,
       ${pref.commonPathways}::jsonb, 1, now())
    ON CONFLICT (doctor_id) DO UPDATE SET
      preferred_drugs = EXCLUDED.preferred_drugs,
      preferred_exams = EXCLUDED.preferred_exams,
      common_pathways = EXCLUDED.common_pathways,
      visit_count     = medmuse.doctor_preference.visit_count + 1,
      updated_at      = now()
  `;
}

/**
 * rebuildStoredPreference：后台异步重算某医生偏好（fire-and-forget 入口）。
 *
 * 流程：best-effort 拉取该医生近 500 条 completed 医嘱（medicine → 药品；
 *   exam/lab → 检查检验），交 buildDoctorPreference 纯函数聚合后 UPSERT。
 *
 * 降级口径：历史查询失败（断库 / 表结构未就绪）时不写脏数据，仅告警并返回
 *   当前已存偏好（无记录则返回空偏好）；调用方无需捕获。
 */
export async function rebuildStoredPreference(
  doctorId: string,
): Promise<DoctorPreference> {
  let pref: DoctorPreference = {
    preferredDrugs: [],
    preferredExams: [],
    commonPathways: [],
  };
  try {
    const rows = await getDb()<OrderHistoryRow[]>`
      SELECT order_type, content, dosage, frequency
      FROM clinical.orders
      WHERE ordered_by = ${doctorId}
        AND status = 'completed'
      ORDER BY created_at DESC
      LIMIT 500
    `;

    const orders: HistoryOrder[] = rows
      .filter((r) => r.order_type === 'medicine')
      .map((r) => ({
        drugName: r.content,
        dosage: r.dosage ?? undefined,
        frequency: r.frequency ?? undefined,
      }));
    const exams: HistoryExam[] = rows
      .filter((r) => r.order_type === 'exam' || r.order_type === 'lab')
      .map((r) => ({
        itemName: r.content,
        category: r.order_type === 'exam' ? '检查' : '检验',
      }));

    pref = buildDoctorPreference(orders, exams);
    await upsertPreference(doctorId, pref);
  } catch (e) {
    console.warn('[doctor-preference] 偏好重算失败，保留原偏好:', e instanceof Error ? e.message : e);
    const stored = await getStoredPreference(doctorId);
    if (stored) {
      pref = {
        preferredDrugs: stored.preferredDrugs,
        preferredExams: stored.preferredExams,
        commonPathways: stored.commonPathways,
      };
    }
  }
  return pref;
}
