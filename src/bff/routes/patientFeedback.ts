/**
 * 健澜科技 jlmedaios - M122-D 患者满意度反馈闭环路由
 *
 * 依据宪法第四十五条（发展医疗卫生事业、保护人民健康）：
 * 患者就诊后有权对服务作出真实评价，医疗机构据此持续改进。
 *
 *  - POST /api/v1/patient/feedback          患者提交就诊后评价；
 *      写 medmuse.patient_feedback，同一就诊 visit_id 幂等（唯一约束兜底）。
 *  - GET  /api/v1/admin/feedback/analysis    管理员查看反馈分析；
 *      取近期反馈 -> analyzePatientFeedback 纯函数聚合 -> 返回排名/问题/改进方向。
 *
 * 两个端点均需登录（auth:true）。患者端只写本人；管理员端只读聚合，不下发明细。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb } from '../../db/pool.js';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  analyzePatientFeedback,
  type PatientFeedbackItem,
} from '../aggregators/patientFeedbackAggregator';

/** 患者提交请求体 */
interface SubmitFeedbackBody {
  patientId?: string;
  visitId?: string;
  doctorId?: string;
  deptCode?: string;
  rating?: number;
  comment?: string;
}

/** 近期分析窗口：只取最近 500 条，避免全表扫描拖慢管理员看板 */
const ANALYSIS_LIMIT = 500;

/** 评论最大长度：自由文本做长度截断，防止超长垃圾数据入库 */
const MAX_COMMENT_LEN = 500;

/**
 * POST /api/v1/patient/feedback
 * 患者提交一次就诊的满意度评价。
 */
async function handleSubmit(c: Ctx): Promise<Response> {
  let body: SubmitFeedbackBody;
  try {
    body = await c.body<SubmitFeedbackBody>();
  } catch {
    return json(fail(ErrorCode.BAD_REQUEST, '请求体不是合法 JSON'), 400);
  }

  const patientId = (body.patientId ?? '').trim();
  const visitId = (body.visitId ?? '').trim();
  if (!patientId) return json(fail(ErrorCode.BAD_REQUEST, 'patientId 不能为空'), 400);
  if (!visitId) return json(fail(ErrorCode.BAD_REQUEST, 'visitId 不能为空'), 400);

  const rating = Number(body.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return json(fail(ErrorCode.BAD_REQUEST, 'rating 必须为 1-5 的整数'), 400);
  }

  const doctorId = (body.doctorId ?? '').trim();
  const deptCode = (body.deptCode ?? '').trim();
  const comment = (body.comment ?? '').trim().slice(0, MAX_COMMENT_LEN);

  try {
    const db = getDb();
    // 一次就诊只评价一次：冲突时忽略（幂等），不报错回吐给患者。
    await db`
      INSERT INTO medmuse.patient_feedback
        (patient_id, visit_id, doctor_id, dept_code, rating, comment)
      VALUES (
        ${patientId}, ${visitId}, ${doctorId}, ${deptCode}, ${rating}, ${comment}
      )
      ON CONFLICT (visit_id) DO NOTHING
    `;
    return json(
      ok({ accepted: true, visitId }, '感谢您的评价，我们将持续改进服务'),
    );
  } catch (err) {
    return json(
      fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '提交失败'),
      500,
    );
  }
}

/**
 * GET /api/v1/admin/feedback/analysis
 * 管理员查看科室满意度排名、高频问题与改进方向。
 */
async function handleAnalysis(): Promise<Response> {
  if (process.env.DEMO_MODE === '1') {
    const now = new Date().toISOString();
    const list: PatientFeedbackItem[] = [
      {
        patientId: 'demo-p-001', visitId: 'demo-v-001', doctorId: 'demo-doc-001',
        deptCode: 'INTERNAL', rating: 5,
        comment: '医生解释清楚，候诊时间可以接受。',
        createdAt: now,
      },
      {
        patientId: 'demo-p-002', visitId: 'demo-v-002', doctorId: 'demo-doc-002',
        deptCode: 'CARDIO', rating: 3,
        comment: '候诊等待时间偏长，希望改进。',
        createdAt: now,
      },
    ];
    return json(ok(analyzePatientFeedback(list)));
  }

  try {
    const db = getDb();
    // 只取聚合所需列，按创建时间倒序取近期窗口，配合 idx_patient_feedback_dept_created。
    const rows = await db`
      SELECT
        patient_id AS "patientId",
        visit_id   AS "visitId",
        doctor_id  AS "doctorId",
        dept_code  AS "deptCode",
        rating,
        comment,
        created_at AS "createdAt"
      FROM medmuse.patient_feedback
      ORDER BY created_at DESC
      LIMIT ${ANALYSIS_LIMIT}
    `;
    const list = (rows as unknown as PatientFeedbackItem[]).map((r) => ({
      patientId: r.patientId ?? '',
      visitId: r.visitId ?? '',
      doctorId: r.doctorId ?? '',
      deptCode: r.deptCode ?? '',
      rating: Number(r.rating),
      comment: r.comment ?? '',
      createdAt: r.createdAt,
    }));
    const analysis = analyzePatientFeedback(list);
    return json(ok(analysis));
  } catch (err) {
    return json(
      fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '分析失败'),
      500,
    );
  }
}

export const patientFeedbackRoutes: RouteDef[] = [
  {
    method: 'POST',
    path: '/api/v1/patient/feedback',
    auth: true,
    handle: handleSubmit,
  },
  {
    method: 'GET',
    path: '/api/v1/admin/feedback/analysis',
    auth: true,
    handle: handleAnalysis,
  },
];
