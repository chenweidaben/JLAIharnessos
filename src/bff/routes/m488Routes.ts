/**
 * 健澜科技 jlmedaios - M488 P0 合规：病案首页质量 + DRG/DIP 分组考核
 *
 * 病案首页质量 / 首页缺陷项统计 / DRG 权重 / DIP 分值 / DIP 考核
 * （drg/groups 已存在，不重复建）。
 * 避开 M475·M476·M481b·M485·M472·M473·M487 既有端点、/outpatient/* 路由。
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/emr/homepage-quality - 病案首页质量（月份/合格率/缺项率/主要诊断编码正确率/手术编码正确率）5 条 */
async function handleHomepageQuality(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'EHQ-001', month: '月份：2026-09（归档病案 3,860 份）', pass: '首页合格率：96.8%', missing: '缺项率：1.8%（必填项漏填）', dx: '主要诊断编码正确率：96.5%', sx: '手术编码正确率：95.8%' },
    { id: 'EHQ-002', month: '月份：2026-08', pass: '首页合格率：96.0%', missing: '缺项率：2.2%', dx: '主要诊断编码正确率：96.0%', sx: '手术编码正确率：95.0%' },
    { id: 'EHQ-003', month: '月份：2026-07', pass: '首页合格率：95.5%', missing: '缺项率：2.6%', dx: '主要诊断编码正确率：95.2%', sx: '手术编码正确率：94.5%' },
    { id: 'EHQ-004', month: '月份：2026-06', pass: '首页合格率：95.0%', missing: '缺项率：2.8%', dx: '主要诊断编码正确率：94.8%', sx: '手术编码正确率：94.0%' },
    { id: 'EHQ-005', month: '月份：2026-05', pass: '首页合格率：94.5%', missing: '缺项率：3.2%', dx: '主要诊断编码正确率：94.0%', sx: '手术编码正确率：93.5%' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/emr/homepage-items - 首页缺陷项统计（月份/年龄/性别/诊断/手术/离院方式缺陷数）5 条 */
async function handleHomepageItems(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'EHI-001', month: '月份：2026-09（缺陷项合计 138 条）', age: '年龄缺陷数：8 条（出生日期与年龄不一致）', gender: '性别缺陷数：4 条', dx: '诊断缺陷数：62 条（主要诊断选择不当/漏填并发症）', sx: '手术缺陷数：48 条（术式编码漏填/不匹配）', discharge: '离院方式缺陷数：16 条（离院方式与实际不符）' },
    { id: 'EHI-002', month: '月份：2026-08', age: '年龄缺陷数：10 条', gender: '性别缺陷数：6 条', dx: '诊断缺陷数：68 条', sx: '手术缺陷数：52 条', discharge: '离院方式缺陷数：18 条' },
    { id: 'EHI-003', month: '月份：2026-07', age: '年龄缺陷数：12 条', gender: '性别缺陷数：8 条', dx: '诊断缺陷数：72 条', sx: '手术缺陷数：58 条', discharge: '离院方式缺陷数：20 条' },
    { id: 'EHI-004', month: '月份：2026-06', age: '年龄缺陷数：14 条', gender: '性别缺陷数：10 条', dx: '诊断缺陷数：78 条', sx: '手术缺陷数：62 条', discharge: '离院方式缺陷数：22 条' },
    { id: 'EHI-005', month: '月份：2026-05', age: '年龄缺陷数：16 条', gender: '性别缺陷数：12 条', dx: '诊断缺陷数：84 条', sx: '手术缺陷数：68 条', discharge: '离院方式缺陷数：24 条' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/drg/weights - DRG 权重（病组/权重/平均费用/费用消耗指数/时间消耗指数）5 条 */
async function handleDrgWeights(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'DRGW-001', group: '病组：FM1 神经系统诊断（伴并发症）', weight: '权重：1.86', avgCost: '平均费用：12.4 万元', costIdx: '费用消耗指数：1.12（高于院均）', timeIdx: '时间消耗指数：1.05' },
    { id: 'DRGW-002', group: '病组：IB2 冠脉支架植入术', weight: '权重：2.42', avgCost: '平均费用：18.6 万元', costIdx: '费用消耗指数：0.98（费用控制良好）', timeIdx: '时间消耗指数：0.92' },
    { id: 'DRGW-003', group: '病组：GB1 髋关节置换术', weight: '权重：2.14', avgCost: '平均费用：15.8 万元', costIdx: '费用消耗指数：1.08', timeIdx: '时间消耗指数：1.15（术后住院偏长）' },
    { id: 'DRGW-004', group: '病组：A1 内科呼吸（不伴并发症）', weight: '权重：0.72', avgCost: '平均费用：4.2 万元', costIdx: '费用消耗指数：0.90', timeIdx: '时间消耗指数：0.88' },
    { id: 'DRGW-005', group: '病组：EB2 阴道分娩', weight: '权重：0.68', avgCost: '平均费用：3.8 万元', costIdx: '费用消耗指数：0.95', timeIdx: '时间消耗指数：0.92' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/dip/points - DIP 分值（病种/病种分值/月均分值/分值消耗指数）5 条 */
async function handleDipPoints(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'DIPP-001', disease: '病种：急性心肌梗死（PCI 术后）', points: '病种分值：1,860 分', avgPoints: '月均分值：1,820 分', idx: '分值消耗指数：1.02' },
    { id: 'DIPP-002', disease: '病种：2 型糖尿病（伴并发症）', points: '病种分值：620 分', avgPoints: '月均分值：608 分', idx: '分值消耗指数：0.98' },
    { id: 'DIPP-003', disease: '病种：社区获得性肺炎', points: '病种分值：480 分', avgPoints: '月均分值：472 分', idx: '分值消耗指数：0.96' },
    { id: 'DIPP-004', disease: '病种：胆囊结石伴胆囊炎（腹腔镜）', points: '病种分值：860 分', avgPoints: '月均分值：850 分', idx: '分值消耗指数：1.05' },
    { id: 'DIPP-005', disease: '病种：脑梗死（急性期）', points: '病种分值：1,240 分', avgPoints: '月均分值：1,220 分', idx: '分值消耗指数：1.08' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/dip/examination - DIP 考核（月份/惊喜病例/高倍率/违规拒付/考核得分）5 条 */
async function handleDipExamination(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'DIPE-001', month: '月份：2026-09（DIP 结算 286.4 万点）', surprise: '惊喜病例数：18 例（低费用高疗效）', high: '高倍率病例数：24 例（费用超病种均值 3 倍）', reject: '违规拒付病例数：6 例（编码高套/分解住院）', score: '考核得分：92 分（满分 100）' },
    { id: 'DIPE-002', month: '月份：2026-08', surprise: '惊喜病例数：16 例', high: '高倍率病例数：28 例', reject: '违规拒付病例数：8 例', score: '考核得分：90 分' },
    { id: 'DIPE-003', month: '月份：2026-07', surprise: '惊喜病例数：14 例', high: '高倍率病例数：32 例', reject: '违规拒付病例数：10 例', score: '考核得分：88 分' },
    { id: 'DIPE-004', month: '月份：2026-06', surprise: '惊喜病例数：12 例', high: '高倍率病例数：36 例', reject: '违规拒付病例数：12 例', score: '考核得分：86 分' },
    { id: 'DIPE-005', month: '月份：2026-05', surprise: '惊喜病例数：10 例', high: '高倍率病例数：40 例', reject: '违规拒付病例数：14 例', score: '考核得分：84 分（环比改善中）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m488Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/emr/homepage-quality', handle: handleHomepageQuality, auth: true },
  { method: 'GET', path: '/api/v1/emr/homepage-items', handle: handleHomepageItems, auth: true },
  { method: 'GET', path: '/api/v1/drg/weights', handle: handleDrgWeights, auth: true },
  { method: 'GET', path: '/api/v1/dip/points', handle: handleDipPoints, auth: true },
  { method: 'GET', path: '/api/v1/dip/examination', handle: handleDipExamination, auth: true },
];
