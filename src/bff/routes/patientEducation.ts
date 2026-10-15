/**
 * 健澜科技 jlmedaios - M147-B 患者健康教育路由（知识图谱与患者教育）
 *
 * GET  /api/v1/patient/education
 *   查询患者本人已推送的健康科普材料（按推送时间倒序），并折算已读进度；
 *   库里暂无材料时，按 ?disease= 现场生成一份兜底返回，保证患者端不白屏。
 *
 * POST /api/v1/patient/education/push
 *   按 { patientId, disease } 调用纯函数 pushEducationMaterial 生成六张大白话
 *   科普卡片，并逐条写入 medmuse.patient_education_material；
 *   同一患者 + 疾病 + 栏目重复推送由唯一约束兜底（ON CONFLICT DO NOTHING），
 *   不覆盖患者已经读过的状态。
 *
 * 依据宪法第四十五条：患者有权获得通俗易懂的健康知识；
 * 医疗安全：科普内容为健康教育，不构成诊断，红旗症状一律引导急诊 / 120。
 * 权限：patient_portal:view。不碰 WebSocket。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb } from '../../db/pool.js';
import { requirePermissionCode } from '../middleware/auth';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  generateHealthEducation,
  pushEducationMaterial,
  readStatsOf,
  type EducationSection,
  type ReadStats,
} from '../aggregators/patientEducationAggregator';

/** 无 DB 演示模式：仅生成并返回结果，不写 PostgreSQL */
const isDemo = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';

/** POST 推送请求体 */
interface PushEducationBody {
  patientId?: string;
  disease?: string;
}

/** 库里捞回来的一行科普材料（SELECT 别名对齐驼峰） */
interface MaterialRow {
  id: string | number;
  patientId: string;
  disease: string;
  category: string;
  categoryLabel?: string;
  title: string;
  content: string;
  isRead: boolean;
  pushedAt: string;
}

/** GET 返回体 */
interface EducationView {
  patientId: string;
  disease: string;
  diseaseLabel: string;
  /** 材料来源：db = 库里已推送；generated = 现场生成兜底 */
  source: 'db' | 'generated';
  list: MaterialRow[];
  stats: ReadStats;
}

/**
 * GET /api/v1/patient/education
 * 入参（query）：patientId 可空（缺省取当前登录用户）；disease 可空。
 */
async function handleList(c: Ctx): Promise<Response> {
  const denied = requirePermissionCode(c, 'patient_portal:view');
  if (denied) return denied;
  if (!c.user) return json(fail(ErrorCode.UNAUTHORIZED, '未登录或用户不存在'), 401);

  const patientId = (c.query.get('patientId') || c.user.id || '').trim();
  const disease = (c.query.get('disease') || '').trim();
  if (!patientId) {
    return json(fail(ErrorCode.BAD_REQUEST, 'patientId 不能为空'), 400);
  }

  // 1) 优先从库里读已推送材料（生产路径）
  if (!isDemo) {
    try {
      const db = getDb();
      const rows = (await db`
        SELECT
          id,
          patient_id AS "patientId",
          disease,
          category,
          title,
          content,
          is_read  AS "isRead",
          pushed_at AS "pushedAt"
        FROM medmuse.patient_education_material
        WHERE patient_id = ${patientId}
        ORDER BY pushed_at DESC, id ASC
      `) as unknown as MaterialRow[];

      const list: MaterialRow[] = rows.map((r) => ({ ...r, isRead: Boolean(r.isRead) }));
      const stats = readStatsOf(list);
      const first = list[0];
      return json(
        ok<EducationView>({
          patientId,
          disease: first?.disease ?? disease,
          diseaseLabel: '',
          source: 'db',
          list,
          stats,
        }),
      );
    } catch (err) {
      // 表不存在 / 库未就绪：落到现场生成兜底，不让患者端白屏
      console.error(`[patientEducation] GET list fallback [${c.traceId}]`, err);
    }
  }

  // 2) 兜底：按 disease 现场生成一份六张卡片（演示模式或库不可用）
  const material = generateHealthEducation(patientId, disease || 'hypertension');
  const list: MaterialRow[] = material.sections.map((s: EducationSection, i) => ({
    id: `gen-${material.disease}-${s.category}-${i}`,
    patientId,
    disease: material.disease,
    category: s.category,
    title: s.title,
    content: s.body,
    isRead: false,
    pushedAt: material.generatedAt,
  }));
  return json(
    ok<EducationView>({
      patientId,
      disease: material.disease,
      diseaseLabel: material.diseaseLabel,
      source: 'generated',
      list,
      stats: readStatsOf(list),
    }),
  );
}

/**
 * POST /api/v1/patient/education/push
 * 入参（body）：{ patientId, disease }
 */
async function handlePush(c: Ctx): Promise<Response> {
  const denied = requirePermissionCode(c, 'patient_portal:view');
  if (denied) return denied;
  if (!c.user) return json(fail(ErrorCode.UNAUTHORIZED, '未登录或用户不存在'), 401);

  let body: PushEducationBody;
  try {
    body = await c.body<PushEducationBody>();
  } catch {
    return json(fail(ErrorCode.BAD_REQUEST, '请求体必须为合法 JSON'), 400);
  }

  const patientId = (body.patientId || c.user.id || '').trim();
  const disease = (body.disease || '').trim();
  if (!patientId) return json(fail(ErrorCode.BAD_REQUEST, 'patientId 不能为空'), 400);
  if (!disease) return json(fail(ErrorCode.BAD_REQUEST, 'disease 不能为空'), 400);

  try {
    // 知识图谱与患者教育：纯函数生成六张大白话卡片
    const result = pushEducationMaterial(patientId, disease);

    if (!isDemo) {
      const db = getDb();
      // 逐条落库；同一患者+疾病+栏目重复推送由唯一约束兜底，已读状态不被覆盖
      for (const s of result.sections) {
        await db`
          INSERT INTO medmuse.patient_education_material
            (patient_id, disease, category, title, content, pushed_at)
          VALUES
            (${result.patientId}, ${result.disease}, ${s.category},
             ${s.title}, ${s.body}, ${result.pushedAt})
          ON CONFLICT (patient_id, disease, category) DO NOTHING
        `;
      }
    }

    return json(ok(result));
  } catch (err) {
    console.error(`[patientEducation] POST push [${c.traceId}]`, err);
    return json(
      fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '科普推送失败'),
      500,
    );
  }
}

export const patientEducationRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/patient/education',
    auth: true,
    handle: handleList,
  },
  {
    method: 'POST',
    path: '/api/v1/patient/education/push',
    auth: true,
    handle: handlePush,
  },
];

export default patientEducationRoutes;
