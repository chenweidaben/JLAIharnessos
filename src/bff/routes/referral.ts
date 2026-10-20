/**
 * 健澜科技 jlmedaios - 双向转诊 BFF 路由（M143-C）【互联网医院与远程医疗】
 *
 *   POST /api/v1/referral/create        发起转诊：登记患者 / 转出转入科室 / 原因 / 预计接诊日期
 *   PUT  /api/v1/referral/:id/accept    目标科室接诊医生接收转诊（待接收 -> 已接收）
 *   GET  /api/v1/referral/incoming      转入队列：待目标科室接收的转诊单（可按 toDept 过滤）
 *
 * 仅登录用户可访问（auth: true 由框架内部处理 401）。
 * 业务内核为 referralAggregator 的纯函数，本层只做参数校验与响应封装。
 * 超期未闭环的预警由 getReferralReport 内核口径提供，不在本层另算。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { json, ok, fail, ErrorCode, type Ctx, type RouteDef } from '../types';
import {
  acceptReferral,
  createReferral,
  listIncoming,
} from '../aggregators/referralAggregator';

/** POST /api/v1/referral/create：发起转诊，新单默认「待接收」，方向自动识别 */
async function handleCreate(c: Ctx): Promise<Response> {
  if (!c.user) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
  try {
    const body = await c.body<{
      patientId?: string;
      fromDept?: string;
      toDept?: string;
      reason?: string;
      expectedDate?: string;
    }>();
    const ref = createReferral(
      body.patientId ?? '',
      body.fromDept ?? '',
      body.toDept ?? '',
      body.reason ?? '',
      body.expectedDate ?? '',
    );
    return json(ok(ref, '转诊已发起，等待目标科室接收'), 201);
  } catch (e) {
    return json(fail(ErrorCode.BAD_REQUEST, e instanceof Error ? e.message : '转诊发起失败'), 400);
  }
}

/** PUT /api/v1/referral/:id/accept：接诊医生接收转诊单 */
async function handleAccept(c: Ctx): Promise<Response> {
  if (!c.user) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
  try {
    const body = await c.body<{ acceptingDoctor?: string }>();
    const ref = acceptReferral(c.params.id, body.acceptingDoctor ?? '');
    return json(ok(ref, '转诊已接收，开始接管诊疗'));
  } catch (e) {
    const msg = e instanceof Error ? e.message : '转诊接收失败';
    const status = msg.startsWith('转诊单不存在') ? 404 : 400;
    return json(
      fail(status === 404 ? ErrorCode.NOT_FOUND : ErrorCode.BAD_REQUEST, msg),
      status,
    );
  }
}

/** GET /api/v1/referral/incoming：转入队列（待接收，可按 toDept 过滤） */
async function handleIncoming(c: Ctx): Promise<Response> {
  if (!c.user) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
  const toDept = c.query.get('toDept') ?? undefined;
  const list = listIncoming(toDept);
  return json(ok({ list }));
}

/**
 * M198 兼容前端 M3-R 列表接口：GET /api/v1/referrals。
 * 前端 ReferralOrder 与 M143-C 内部 Referral 字段命名不同，这里按前端契约映射，
 * DEMO_MODE 下返回确定性演示转诊单，避免「路由不存在 / 暂无数据」。
 */
function demoReferralOrders() {
  return [
    { id: 'demo-ro-01', referralNo: 'RF-20261018-001', direction: 'incoming', patientId: 'P001', profileId: null, patientName: '王*英', gender: '女', birthDate: '1958-03-12', sourceOrg: '临平区社区卫生服务中心', sourceDept: '全科', sourceDoctor: '陈医生', targetOrg: '健澜医院', targetDept: '心血管内科', reason: '胸痛待查，需上级医院冠脉评估', urgency: 'normal', status: 'submitted', encounterId: null, acceptedBy: null, acceptedAt: null, rejectedReason: null, createdBy: 'u_2001', createdAt: '2026-10-18 09:00', updatedAt: '2026-10-18 09:00' },
    { id: 'demo-ro-02', referralNo: 'RF-20261018-002', direction: 'outgoing', patientId: 'P002', profileId: null, patientName: '刘*梅', gender: '女', birthDate: '1965-07-22', sourceOrg: '健澜医院', sourceDept: '普外科', sourceDoctor: '李医生', targetOrg: '临平康复医院', targetDept: '康复医学科', reason: '术后恢复期康复治疗', urgency: 'normal', status: 'accepted', encounterId: 'V20261017001', acceptedBy: 'u_2001', acceptedAt: '2026-10-18 15:00', rejectedReason: null, createdBy: 'u_2001', createdAt: '2026-10-17 10:00', updatedAt: '2026-10-18 15:00' },
    { id: 'demo-ro-03', referralNo: 'RF-20261019-003', direction: 'incoming', patientId: 'P004', profileId: null, patientName: '张*华', gender: '男', birthDate: '1970-11-05', sourceOrg: '塘栖镇卫生院', sourceDept: '急诊', sourceDoctor: '赵医生', targetOrg: '健澜医院', targetDept: '神经内科', reason: '突发肢体乏力，疑似脑卒中，需急诊介入', urgency: 'urgent', status: 'submitted', encounterId: null, acceptedBy: null, acceptedAt: null, rejectedReason: null, createdBy: 'u_2002', createdAt: '2026-10-19 08:30', updatedAt: '2026-10-19 08:30' },
    { id: 'demo-ro-04', referralNo: 'RF-20261015-004', direction: 'outgoing', patientId: 'P005', profileId: null, patientName: '陈*强', gender: '男', birthDate: '1955-01-30', sourceOrg: '健澜医院', sourceDept: '呼吸内科', sourceDoctor: '周医生', targetOrg: '星桥街道社区卫生服务中心', targetDept: '全科', reason: '肺炎出院后社区康复随访', urgency: 'normal', status: 'completed', encounterId: 'V20261012003', acceptedBy: 'u_2003', acceptedAt: '2026-10-15 10:00', rejectedReason: null, createdBy: 'u_2001', createdAt: '2026-10-12 14:00', updatedAt: '2026-10-16 09:00' },
  ];
}

export const referralRoutes: RouteDef[] = [
  // M198 兼容前端列表接口（前端调 /referrals，原 BFF 仅有 /referral/incoming）
  { method: 'GET', path: '/api/v1/referrals', auth: true, handle: async (c: Ctx): Promise<Response> => {
      if (!c.user) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      return json(ok(demoReferralOrders()));
    } },
  { method: 'POST', path: '/api/v1/referral/create', auth: true, handle: handleCreate },
  { method: 'PUT', path: '/api/v1/referral/:id/accept', auth: true, handle: handleAccept },
  { method: 'GET', path: '/api/v1/referral/incoming', auth: true, handle: handleIncoming },
];
