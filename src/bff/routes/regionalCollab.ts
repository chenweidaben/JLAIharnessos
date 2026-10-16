/**
 * 健澜科技 jlmedaios - 区域医疗协同 BFF 路由（M159-B）【集团化扩展·区域医疗协同】
 *
 *   GET /api/v1/regional/referral/match        跨院转诊匹配（上转/下转/双向 + 号源共享）
 *   GET /api/v1/regional/exam-recognition      跨院检验检查结果互认校验
 *
 * 仅登录用户可访问（c.user 内部处理 401）。
 * 业务内核为 regionalCollabAggregator 的纯函数，本层只做参数校验与响应封装。
 * 【数据隔离】所有查询按 hospital_id / groupId 严格过滤，跨院共享的 patient_id 一律脱敏，
 *   原始 EMPI 不出院。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { json, ok, fail, ErrorCode, type Ctx, type RouteDef } from '../types';
import {
  buildRegionalCollaboration,
  matchReferral,
  verifyCrossHospitalResult,
  type ReferralPatient,
} from '../aggregators/regionalCollabAggregator';

/** 跨院结果项目类型（与 aggregator 对齐） */
type CrossExamType = '检验' | '影像' | '病理' | '超声';

/** GET /api/v1/regional/referral/match?sourceHospitalId=&sourceLevel=&targetHospitalId=&targetLevel=&condition=&specialties=&expertSlots= */
async function handleReferralMatch(c: Ctx): Promise<Response> {
  if (!c.user) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
  try {
    const sourceHospitalId = c.query.get('sourceHospitalId') ?? '';
    const sourceLevel = c.query.get('sourceLevel') ?? '二级';
    const targetHospitalId = c.query.get('targetHospitalId') ?? '';
    const targetLevel = c.query.get('targetLevel') ?? '三级';
    const condition = c.query.get('condition') ?? '';
    const specialties = (c.query.get('specialties') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
    const expertSlots = Number(c.query.get('expertSlots') ?? 0);
    // 脱敏占位患者：真实场景由上下文注入，这里用隔离键占位，不外泄 PII
    const sourcePatient: ReferralPatient = {
      patientId: c.query.get('patientId') ?? 'P00000000',
      hospitalId: sourceHospitalId,
      sourceLevel: sourceLevel as ReferralPatient['sourceLevel'],
      name: '',
      age: 0,
      gender: '男',
      condition,
      severity: 3,
    };
    const match = matchReferral(
      sourcePatient,
      {
        hospitalId: targetHospitalId,
        name: c.query.get('targetHospitalName') ?? targetHospitalId,
        level: targetLevel as '三级' | '二级' | '一级',
        specialties,
        expertSlots,
      },
      condition,
    );
    return json(ok(match, '转诊匹配完成'));
  } catch (e) {
    return json(fail(ErrorCode.BAD_REQUEST, e instanceof Error ? e.message : '转诊匹配失败'), 400);
  }
}

/** GET /api/v1/regional/exam-recognition?resultId=&sourceHospitalId=&examType=&examDate=&accredited=&qualityFlag=&targetDept= */
async function handleExamRecognition(c: Ctx): Promise<Response> {
  if (!c.user) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
  try {
    const result = verifyCrossHospitalResult(
      {
        resultId: c.query.get('resultId') ?? '',
        sourceHospitalId: c.query.get('sourceHospitalId') ?? '',
        patientId: c.query.get('patientId') ?? '',
        examType: (c.query.get('examType') ?? '检验') as CrossExamType,
        examDate: c.query.get('examDate') ?? '',
        accredited: (c.query.get('accredited') ?? 'true') === 'true',
        qualityFlag: (c.query.get('qualityFlag') ?? '合格') === '存疑' ? '存疑' : '合格',
      },
      c.query.get('targetDept') ?? '全科',
    );
    return json(ok(result, '互认校验完成'));
  } catch (e) {
    return json(fail(ErrorCode.BAD_REQUEST, e instanceof Error ? e.message : '互认校验失败'), 400);
  }
}

/** GET /api/v1/regional/collaboration/map?groupId= */
async function handleCollaborationMap(c: Ctx): Promise<Response> {
  if (!c.user) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
  try {
    const groupId = c.query.get('groupId') ?? '';
    const map = buildRegionalCollaboration(groupId);
    return json(ok(map, '区域协同地图已加载'));
  } catch (e) {
    return json(fail(ErrorCode.BAD_REQUEST, e instanceof Error ? e.message : '协同地图加载失败'), 400);
  }
}

export const regionalCollabRoutes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/regional/referral/match', auth: true, handle: handleReferralMatch },
  { method: 'GET', path: '/api/v1/regional/exam-recognition', auth: true, handle: handleExamRecognition },
  { method: 'GET', path: '/api/v1/regional/collaboration/map', auth: true, handle: handleCollaborationMap },
];
