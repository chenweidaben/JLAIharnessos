/**
 * 健澜科技 jlmedaios - 区域医疗协同 BFF 路由（M143-D）【互联网医院与远程医疗】
 *
 *   POST /api/v1/regional/hospitals            登记一家区域协同医院
 *   GET  /api/v1/regional/hospitals            列出全部协同医院（新登记的排最前）
 *   GET  /api/v1/regional/referral-suggest     按病种/区域/最低等级推荐转诊承接医院
 *
 * 仅登录用户可访问（c.user 内部处理 401）。
 * 业务内核为 regionalCoopAggregator 的纯函数，本层只做参数校验与响应封装。
 * 跨院共享数据中的 patient_id 一律经 maskPatientId 脱敏（P0****23），原始 EMPPI 不出院。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { json, ok, fail, ErrorCode, type Ctx, type RouteDef } from '../types';
import {
  registerRegionalHospital,
  listRegionalHospitals,
  findBestReferralHospital,
  maskPatientId,
} from '../aggregators/regionalCoopAggregator';

/** POST /api/v1/regional/hospitals：登记一家区域协同医院 */
async function handleRegister(c: Ctx): Promise<Response> {
  if (!c.user) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
  try {
    const body = await c.body<{
      name?: string; level?: string; services?: string[];
      specialties?: string[]; capacity?: number; contact?: string;
      /** 可选：演示跨院共享时的 patient_id 脱敏 */
      patientId?: string;
    }>();
    const hosp = registerRegionalHospital(
      body.name ?? '',
      body.level ?? '',
      body.services ?? [],
      body.specialties ?? [],
      Number(body.capacity ?? 0),
      body.contact ?? '',
    );
    // 若请求携带了 patientId，出网前强制脱敏，示例：P01234523 -> P0****23
    const maskedPid = body.patientId ? maskPatientId(body.patientId) : null;
    return json(ok({ hospital: hosp, maskedPatientId: maskedPid }, '协同医院登记成功'), 201);
  } catch (e) {
    return json(fail(ErrorCode.BAD_REQUEST, e instanceof Error ? e.message : '登记失败'), 400);
  }
}

/** GET /api/v1/regional/hospitals：列出全部协同医院 */
async function handleList(c: Ctx): Promise<Response> {
  if (!c.user) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
  return json(ok({ list: listRegionalHospitals() }));
}

/** GET /api/v1/regional/referral-suggest?condition=&location=&level=：转诊建议 */
async function handleReferralSuggest(c: Ctx): Promise<Response> {
  if (!c.user) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
  const condition = c.query.get('condition') ?? '';
  const location = c.query.get('location') ?? '';
  const level = c.query.get('level') ?? '';
  const list = findBestReferralHospital(condition, location, level);
  return json(ok({
    condition,
    location,
    minLevel: level,
    list,
    // 跨院共享提示：示例 patient_id 已脱敏
    maskedPatientId: maskPatientId('P01234523'),
  }));
}

export const regionalCoopRoutes: RouteDef[] = [
  { method: 'POST', path: '/api/v1/regional/hospitals', auth: true, handle: handleRegister },
  { method: 'GET', path: '/api/v1/regional/hospitals', auth: true, handle: handleList },
  { method: 'GET', path: '/api/v1/regional/referral-suggest', auth: true, handle: handleReferralSuggest },
];
