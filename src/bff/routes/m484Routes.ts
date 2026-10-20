/**
 * 健澜科技 jlmedaios - M484 P0 合规：药学管理（特殊药品台账）+ HR（科室绩效/考勤汇总）
 *
 * 特殊药品台账（麻精/毒性）/ 科室绩效 / 考勤汇总
 * （pharmacy/inventory、pharmacy/prescription-review、hr/leave 已存在，不重复建）。
 * 避开 M453 pharmacy 既有、M435 药品供应链、M14 AMS、M483 finance·emergency、M481b insurance、M458 hr 既有、M483b hr 既有、/outpatient/* 路由。
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/pharmacy/special-drug - 特殊药品台账（麻精药品/毒性药品/存放点/库存数/双人复核状态）5 条 */
async function handleSpecialDrug(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'PSD-001', drug: '麻精药品：盐酸吗啡缓释片（三阶梯镇痛）', location: '存放点：药房麻精专柜（双锁双人）', stock: '库存数：在用 126 片 + 备用基数 30 片（逐日专账）', doubleCheck: '双人复核状态：每班交接双人复核签字齐全（无差错）' },
    { id: 'PSD-002', drug: '麻精药品：枸橼酸舒芬太尼注射液（手术麻醉）', location: '存放点：手术部麻精药柜（麻醉医生专管）', stock: '库存数：在用 42 支 + 基数 20 支（按台次核销）', doubleCheck: '双人复核状态：术中使用双签名，空安瓿回收登记齐全' },
    { id: 'PSD-003', drug: '第一类精神药品：盐酸氯胺酮注射液', location: '存放点：药房麻精专柜', stock: '库存数：在用 18 支（按医嘱凭红处方领取）', doubleCheck: '双人复核状态：处方双人核对，专册登记完整' },
    { id: 'PSD-004', drug: '医疗用毒性药品：A型肉毒毒素注射液', location: '存放点：毒性药品专柜（与麻精分柜存放）', stock: '库存数：在用 20 瓶（按支专账）', doubleCheck: '双人复核状态：领用双人签字，用后空瓶回收销毁登记' },
    { id: 'PSD-005', drug: '特殊管理：放射性药品（核科碘-131）', location: '存放点：核医学科放射源专库（按辐射防护要求）', stock: '库存数：按订货批次专用（在用 2 批次）', doubleCheck: '双人复核状态：放射源出入库双人双锁，定期盘点无差异' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/hr/dept-performance - 科室绩效（科室/总分/排名/同比）5 条 */
async function handleDeptPerformance(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'HDP-001', dept: '科室：全院科室绩效汇总（本月）', score: '绩效总分：业务+质量+成本综合评分（百分制）', rank: '排名：以科室维度排名公示', yoy: '同比：整体较上月 +1.2 分（质量权重提升）' },
    { id: 'HDP-002', dept: '科室：心血管内科', score: '绩效总分：92.5 分（CMI 高、费用控制良好）', rank: '排名：全院 第 2 名', yoy: '同比：+2.0 分' },
    { id: 'HDP-003', dept: '科室：骨科', score: '绩效总分：88.0 分（高值耗材占比偏高扣分项）', rank: '排名：全院 第 8 名', yoy: '同比：+0.5 分（集采后改善）' },
    { id: 'HDP-004', dept: '科室：急诊科', score: '绩效总分：86.5 分（工作量大但亏损病组偏多）', rank: '排名：全院 第 12 名', yoy: '同比：-0.8 分（成本管控待加强）' },
    { id: 'HDP-005', dept: '科室：医学影像科', score: '绩效总分：90.0 分（检查收入稳定、设备利用率高）', rank: '排名：全院 第 5 名', yoy: '同比：+1.6 分' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/hr/attendance-summary - 考勤汇总（科室/出勤率/夜班数/加班时长/缺卡数）5 条 */
async function handleAttendanceSummary(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'HAS-001', dept: '科室：全院考勤汇总（本月）', rate: '出勤率：97.2%', nightShift: '夜班数：护理/医技 1,860 个夜班', overtime: '加班时长：人均 6.5 小时（高峰门急诊）', missing: '缺卡数：42 人次（已补卡审批）' },
    { id: 'HAS-002', dept: '科室：护理队伍', rate: '出勤率：96.5%（倒班制）', nightShift: '夜班数：1,520 个（3 班轮转）', overtime: '加班时长：人均 8.2 小时（床位高峰）', missing: '缺卡数：26 人次' },
    { id: 'HAS-003', dept: '科室：临床医师', rate: '出勤率：98.0%（值班含夜班）', nightShift: '夜班数：240 个（二线/三线值班）', overtime: '加班时长：人均 5.0 小时', missing: '缺卡数：8 人次' },
    { id: 'HAS-004', dept: '科室：医技（检验/影像/药剂）', rate: '出勤率：97.5%', nightShift: '夜班数：100 个（检验/影像值班）', overtime: '加班时长：人均 4.0 小时', missing: '缺卡数：5 人次' },
    { id: 'HAS-005', dept: '科室：行政后勤', rate: '出勤率：98.5%（白班为主）', nightShift: '夜班数：—（值班含信息/财务）', overtime: '加班时长：人均 3.0 小时', missing: '缺卡数：3 人次' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m484Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/pharmacy/special-drug', handle: handleSpecialDrug, auth: true },
  { method: 'GET', path: '/api/v1/hr/dept-performance', handle: handleDeptPerformance, auth: true },
  { method: 'GET', path: '/api/v1/hr/attendance-summary', handle: handleAttendanceSummary, auth: true },
];
