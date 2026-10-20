/**
 * 健澜科技 jlmedaios - M485b P0 合规：患者投诉汇总（与 M471 /patient/complaints 明细区分）
 *
 * 投诉汇总（按类型/投诉数/已处理数/处理率/满意度）
 * （research/projects、papers、patents、funds、patient/satisfaction 已存在，不重复建）。
 * 避开 M464·M478·M485 research 既有、M471 patient/complaints 明细、M479 patient-safety、M483 finance、M484 pharmacy·hr、/outpatient/* 路由。
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/patient/complaint-summary - 投诉汇总（类型/投诉数/已处理数/处理率/满意度）5 条 */
async function handleComplaintSummary(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'PCS-001', type: '类型：全院投诉汇总（本月）', total: '投诉数：58 件', processed: '已处理数：56 件（2 件在跟进）', rate: '处理率：96.6%（院投诉管理闭环）', satisfaction: '投诉处理满意度：88.0 分（回访满意/基本满意占比）' },
    { id: 'PCS-002', type: '类型：服务态度类（医护沟通/语气）', total: '投诉数：18 件', processed: '已处理数：18 件', rate: '处理率：100%（已约谈+培训）', satisfaction: '投诉处理满意度：90.0 分' },
    { id: 'PCS-003', type: '类型：等候时间类（挂号/缴费/检查排队）', total: '投诉数：14 件', processed: '已处理数：13 件（1 件高峰时段排班待优化）', rate: '处理率：92.9%', satisfaction: '投诉处理满意度：84.0 分（已增开窗口/预约分流）' },
    { id: 'PCS-004', type: '类型：费用/收费类（医保结算/清单疑问）', total: '投诉数：12 件', processed: '已处理数：12 件（逐条核对解释）', rate: '处理率：100%', satisfaction: '投诉处理满意度：92.0 分（无乱收费，解释清楚后均满意）' },
    { id: 'PCS-005', type: '类型：医疗技术/疗效类（诊疗效果异议）', total: '投诉数：8 件', processed: '已处理数：7 件（1 件走医疗纠纷调解）', rate: '处理率：87.5%（疑难件需多学科沟通）', satisfaction: '投诉处理满意度：78.0 分（已组织专家复核并书面答复）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m485bRoutes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/patient/complaint-summary', handle: handleComplaintSummary, auth: true },
];
