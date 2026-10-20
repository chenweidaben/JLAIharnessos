/**
 * 健澜科技 jlmedaios - M465 医疗设备全生命周期管理（equipment）
 *
 * 采购验收 / 计量检定 / 维保计划 / 报废评估 / 设备效益
 * （equipment/ledger 台账已存在，此处不重复）。
 * 避开 M459 维修工单、M463 后勤物业、M455 耗材供应链口径。
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/equipment/acceptance - 采购验收（设备号/供应商/验收日期/验收结论/责任人）5 条 */
async function handleEqAcceptance(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'ACC-001', eqNo: '设备号：EQ-CT-02（新增 64 排 CT）', supplier: '供应商：某影像设备有限公司（原厂+代理）', acceptDate: '验收日期：2026-09-15', conclusion: '验收结论：合格（性能/剂量/图像检测全部达标，资料齐全）', owner: '责任人：设备科 郑***（联合临床验收）' },
    { id: 'ACC-002', eqNo: '设备号：EQ-UV-04（新增超声）', supplier: '供应商：某超声设备代理商', acceptDate: '验收日期：2026-08-28', conclusion: '验收结论：合格（探头/图像/附属配件清点无误）', owner: '责任人：设备科 吴***' },
    { id: 'ACC-003', eqNo: '设备号：EQ-VENT-08（新增呼吸机）', supplier: '供应商：某呼吸治疗设备厂商', acceptDate: '验收日期：2026-10-05', conclusion: '验收结论：合格（通气模式/报警/电池测试通过）', owner: '责任人：设备科 + ICU 联合验收' },
    { id: 'ACC-004', eqNo: '设备号：EQ-MON-15（新增监护仪 5 台）', supplier: '供应商：某监护设备公司', acceptDate: '验收日期：2026-10-12', conclusion: '验收结论：附条件合格（1 台 NIBP 模块待换，限期整改后复验）', owner: '责任人：设备科 王***' },
    { id: 'ACC-005', eqNo: '设备号：EQ-DEFI-03（新增除颤仪 2 台）', supplier: '供应商：某急救设备公司', acceptDate: '验收日期：2026-10-18', conclusion: '验收结论：合格（放电自检/电极片/备件齐全）', owner: '责任人：设备科 吴***（急诊联合）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/equipment/metrology - 计量检定（设备号/检定项/上次检定/有效期/结论）5 条 */
async function handleEqMetrology(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'MET-001', eqNo: '设备号：EQ-MON-12（病房监护仪）', item: '检定项：无创血压 NIBP 计量检定', last: '上次检定：2026-04-10（计量院所出具证书）', valid: '有效期：至 2027-04-09（1 年周期）', conclusion: '结论：合格（误差在允许范围）' },
    { id: 'MET-002', eqNo: '设备号：EQ-INF-06（输液泵）', item: '检定项：流量/流速计量检定', last: '上次检定：2026-05-22', valid: '有效期：至 2027-05-21', conclusion: '结论：合格（流速误差达标）' },
    { id: 'MET-003', eqNo: '设备号：EQ-UV-03（超声）', item: '检定项：超声输出声功率/声强安全检定', last: '上次检定：2026-03-18', valid: '有效期：至 2027-03-17', conclusion: '结论：合格（输出安全达标）' },
    { id: 'MET-004', eqNo: '设备号：EQ-XR-02（DR 拍片机）', item: '检定项：辐射剂量/影像质量强制检定', last: '上次检定：2026-06-30（强制周期 1 年）', valid: '有效期：至 2027-06-29（临近提前排期）', conclusion: '结论：合格（辐射防护检测通过）' },
    { id: 'MET-005', eqNo: '设备号：EQ-DEFI-02（除颤仪）', item: '检定项：除颤能量输出检定', last: '上次检定：2026-02-14', valid: '有效期：至 2027-02-13（已临近，需提前送检）', conclusion: '结论：合格（能量输出达标，待下次检定）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/equipment/maintenance-plan - 维保计划（设备号/维保类型/周期/下次维保/服务商）5 条 */
async function handleEqMaintPlan(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'MPL-001', eqNo: '设备号：EQ-CT-01（64 排 CT）', type: '维保类型：原厂全包年度维保（含配件/上门）', cycle: '周期：12 个月合同（季度上门保养）', next: '下次维保：2026-12-10（季度巡检）', vendor: '服务商：原厂工程师团队（年度合同覆盖）' },
    { id: 'MPL-002', eqNo: '设备号：EQ-MRI-01（1.5T 磁共振）', type: '维保类型：原厂全包（含冷头/失超保障）', cycle: '周期：12 个月合同（半年深度保养）', next: '下次维保：2027-01-15', vendor: '服务商：原厂协议服务商' },
    { id: 'MPL-003', eqNo: '设备号：EQ-UV-03（超声）', type: '维保类型：预防性自修 + 保修内响应', cycle: '周期：半年预防性保养', next: '下次维保：2027-03-20', vendor: '服务商：设备科自修（保修内原厂备援）' },
    { id: 'MPL-004', eqNo: '设备号：EQ-VENT-07（ICU 呼吸机）', type: '维保类型：厂方响应 + 月度自保养', cycle: '周期：月度自检 + 年度厂方巡检', next: '下次维保：2026-11-05（月度自保养）', vendor: '服务商：设备科 + 厂商远程支持' },
    { id: 'MPL-005', eqNo: '设备号：EQ-DEFI-02（除颤仪）', type: '维保类型：厂方响应式（故障上门）', cycle: '周期：月度自检 + 年度厂方检定联动', next: '下次维保：2026-10-30（含电池/电极片更换）', vendor: '服务商：急救设备厂商响应' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/equipment/scrap - 报废评估（设备号/使用年限/残值/报废理由/审批状态）5 条 */
async function handleEqScrap(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'SCR-001', eqNo: '设备号：EQ-OLD-XR-01（老旧 2008 年 CR 相机）', age: '使用年限：18 年（超期服役）', residual: '残值：人民币 1,800.00 元（已提足折旧）', reason: '报废理由：部件停产、维修不经济、图像质量落后，已由 DR 替代', approval: '审批状态：院务会已批准报废（待资产核销）' },
    { id: 'SCR-002', eqNo: '设备号：EQ-OLD-UV-01（2010 年黑白超声）', age: '使用年限：16 年', residual: '残值：人民币 900.00 元', reason: '报废理由：探头老化、无法维修，已淘汰', approval: '审批状态：设备科已申报（待院长办公会审批）' },
    { id: 'SCR-003', eqNo: '设备号：EQ-OLD-MON-03（2012 年老式监护仪）', age: '使用年限：14 年', residual: '残值：人民币 350.00 元', reason: '报废理由：故障频发、模块停产，备件无供应', approval: '审批状态：已批准报废（待集中处置）' },
    { id: 'SCR-004', eqNo: '设备号：EQ-OLD-OPT-01（2011 年裂隙灯）', age: '使用年限：15 年', residual: '残值：人民币 600.00 元', reason: '报废理由：光学系统老化，维修成本超设备价值', approval: '审批状态：评估中（科室申报，待技术鉴定）' },
    { id: 'SCR-005', eqNo: '设备号：EQ-OLD-ECG-02（2009 年单道心电图机）', age: '使用年限：17 年', residual: '残值：人民币 120.00 元', reason: '报废理由：导联线老化、电池失效，已被联网心电替代', approval: '审批状态：已批准报废（列入本批处置清单）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/equipment/benefit - 设备效益（设备号/开机率/检查例次/收入/成本）5 条 */
async function handleEqBenefit(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'BEN-001', eqNo: '设备号：EQ-CT-01（64 排 CT）', utilization: '开机率：82%（工作日满负荷时段排队）', cases: '检查例次：本月 1,860 例', revenue: '收入：人民币 468,000.00 元', cost: '成本：折旧+维保+耗材 198,000.00 元（净收益良好）' },
    { id: 'BEN-002', eqNo: '设备号：EQ-MRI-01（1.5T 磁共振）', utilization: '开机率：78%（需预约排期）', cases: '检查例次：本月 620 例', revenue: '收入：人民币 372,000.00 元', cost: '成本：折旧+原厂维保 265,000.00 元（高价值设备）' },
    { id: 'BEN-003', eqNo: '设备号：EQ-UV-03（超声诊断仪）', utilization: '开机率：68%（门诊+床旁）', cases: '检查例次：本月 1,420 例', revenue: '收入：人民币 142,000.00 元', cost: '成本：折旧+维保 38,000.00 元（性价比高）' },
    { id: 'BEN-004', eqNo: '设备号：EQ-XR-02（DR 拍片机）', utilization: '开机率：71%（急诊+门诊）', cases: '检查例次：本月 2,150 例', revenue: '收入：人民币 172,000.00 元', cost: '成本：折旧+维保+胶片 52,000.00 元（高效）' },
    { id: 'BEN-005', eqNo: '设备号：EQ-OLD-UV-01（待报废黑白超声）', utilization: '开机率：12%（低频闲置）', cases: '检查例次：本月 28 例', revenue: '收入：人民币 1,680.00 元', cost: '成本：维保占用高于产出（低效益，支撑报废）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m465Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/equipment/acceptance', handle: handleEqAcceptance, auth: true },
  { method: 'GET', path: '/api/v1/equipment/metrology', handle: handleEqMetrology, auth: true },
  { method: 'GET', path: '/api/v1/equipment/maintenance-plan', handle: handleEqMaintPlan, auth: true },
  { method: 'GET', path: '/api/v1/equipment/scrap', handle: handleEqScrap, auth: true },
  { method: 'GET', path: '/api/v1/equipment/benefit', handle: handleEqBenefit, auth: true },
];
