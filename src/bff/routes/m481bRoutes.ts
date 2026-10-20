/**
 * 健澜科技 jlmedaios - M481b P0 合规：医保管理（费用审核/DRG·DIP 结算）+ 后勤保洁工单
 *
 * 医保费用审核 / DRG 月度结算 / DIP 月度结算 / 保洁工单
 * （insurance/rejection、logistics/linen 已存在，不重复建）。
 * 避开 M442 insurance 既有、M475 drg/*、M459b report/drg-submit、M481 logistics/*、M471-M480 各端点、/outpatient/* 路由。
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/insurance/expense-audit - 医保费用审核（科室/不合理费用条目/涉及金额/审核率/整改数）5 条 */
async function handleExpenseAudit(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'IEA-001', dept: '科室：全院医保费用审核汇总', invalidItems: '不合理费用条目：本月 86 条（超限定/重复收费/无指征用药）', amount: '涉及金额：42,600 元', auditRate: '审核率：住院医嘱 100% 前置审核、门诊处方覆盖 85%', rectify: '整改数：82 条已整改（4 条待科室反馈）' },
    { id: 'IEA-002', dept: '科室：心血管内科', invalidItems: '不合理费用条目：14 条（辅助用药超疗程）', amount: '涉及金额：8,200 元', auditRate: '审核率：100%', rectify: '整改数：14 条已整改' },
    { id: 'IEA-003', dept: '科室：骨科', invalidItems: '不合理费用条目：12 条（高值耗材与术式不匹配）', amount: '涉及金额：9,600 元', auditRate: '审核率：100%', rectify: '整改数：11 条已整改（1 条申诉中）' },
    { id: 'IEA-004', dept: '科室：呼吸内科', invalidItems: '不合理费用条目：9 条（抗菌药物越级使用）', amount: '涉及金额：5,400 元', auditRate: '审核率：100%', rectify: '整改数：9 条已整改' },
    { id: 'IEA-005', dept: '科室：门诊药房（处方前置审核）', invalidItems: '不合理费用条目：32 条（门诊超量/无指征检查）', amount: '涉及金额：6,800 元', auditRate: '审核率：门诊处方 85% 覆盖（剩余为离线代配）', rectify: '整改数：30 条已整改（2 条医生驳回申诉）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/insurance/drg-settlement - DRG 月度结算（月份/结算率/超支额/结余留用/盈亏状态）5 条 */
async function handleDrgSettlement(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'IDS-001', month: '月份：2026-05', settleRate: '结算率：96.8%（已完成清算）', overspend: '超支额：-18.6 万元（整体结余）', retain: '结余留用：32.4 万元', status: '盈亏状态：结余（费用控制良好）' },
    { id: 'IDS-002', month: '月份：2026-06', settleRate: '结算率：97.2%', overspend: '超支额：+6.2 万元（个别高权重组亏损）', retain: '结余留用：28.0 万元', status: '盈亏状态：基本持平' },
    { id: 'IDS-003', month: '月份：2026-07', settleRate: '结算率：96.5%', overspend: '超支额：-12.4 万元', retain: '结余留用：30.8 万元', status: '盈亏状态：结余' },
    { id: 'IDS-004', month: '月份：2026-08', settleRate: '结算率：97.0%', overspend: '超支额：+9.8 万元（康复周期长组亏损）', retain: '结余留用：26.5 万元', status: '盈亏状态：微亏（需专项管控）' },
    { id: 'IDS-005', month: '月份：2026-09', settleRate: '结算率：96.9%（当月已清算）', overspend: '超支额：-15.2 万元', retain: '结余留用：31.0 万元', status: '盈亏状态：结余（环比改善）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/insurance/dip-settlement - DIP 月度结算（月份/点数/分值/结算额/结算率）5 条 */
async function handleDipSettlement(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'IDS2-001', month: '月份：2026-07', points: 'DIP 点数：全院 286.4 万点', value: '点值：2.62 元/点（当月结算区均值）', settleAmount: '结算额：750.4 万元', settleRate: '结算率：96.0%' },
    { id: 'IDS2-002', month: '月份：2026-08', points: 'DIP 点数：302.8 万点', value: '点值：2.58 元/点', settleAmount: '结算额：781.2 万元', settleRate: '结算率：96.5%' },
    { id: 'IDS2-003', month: '月份：2026-09', points: 'DIP 点数：298.5 万点', value: '点值：2.60 元/点', settleAmount: '结算额：776.1 万元', settleRate: '结算率：96.8%（当月清算）' },
    { id: 'IDS2-004', month: '月份：2026-09（亏损项目组）', points: '点数：亏损病组 42.0 万点', value: '点值：2.60 元/点', settleAmount: '结算额：109.2 万元（对应亏损 12 万元）', settleRate: '结算率：—' },
    { id: 'IDS2-005', month: '月份：2026-10（预缴预估）', points: '预估点数：约 300 万点', value: '预估点值：2.60 元/点', settleAmount: '预估结算额：约 780 万元', settleRate: '结算率：—（未到清算期）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/logistics/housekeeping - 保洁工单（工单号/区域/类型/状态/处理人）5 条 */
async function handleHousekeeping(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'HK-001', orderNo: '工单号：HK-20261020-0088', area: '区域：门诊 3 楼候诊大厅', type: '类型：地面水渍/污渍紧急清洁', status: '状态：已完成（接报后 8 分钟到场）', handler: '处理人：保洁组 张***（已拍照回单）' },
    { id: 'HK-002', orderNo: '工单号：HK-20261020-0089', area: '区域：住院部 5 楼病区卫生间', type: '类型：卫生间异味/耗材缺补', status: '状态：处理中（已安排补纸）', handler: '处理人：保洁组 李***' },
    { id: 'HK-003', orderNo: '工单号：HK-20261020-0090', area: '区域：地下车库 B2 层', type: '类型：地面积水/落叶清扫', status: '状态：待处理（排班中）', handler: '处理人：待派单' },
    { id: 'HK-004', orderNo: '工单号：HK-20261020-0091', area: '区域：手术部外围通道', type: '类型：终末消毒后保洁', status: '状态：已完成', handler: '处理人：保洁组 王***（洁净区专岗）' },
    { id: 'HK-005', orderNo: '工单号：HK-20261020-0092', area: '区域：急诊大厅', type: '类型：电梯轿厢深度清洁消毒', status: '状态：处理中（高峰后执行）', handler: '处理人：保洁组 赵***' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m481bRoutes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/insurance/expense-audit', handle: handleExpenseAudit, auth: true },
  { method: 'GET', path: '/api/v1/insurance/drg-settlement', handle: handleDrgSettlement, auth: true },
  { method: 'GET', path: '/api/v1/insurance/dip-settlement', handle: handleDipSettlement, auth: true },
  { method: 'GET', path: '/api/v1/logistics/housekeeping', handle: handleHousekeeping, auth: true },
];
