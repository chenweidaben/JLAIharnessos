/**
 * 健澜科技 jlmedaios - M486 P0 合规：设备全生命周期 + 能耗管理
 *
 * 设备全生命周期 / 能耗月度用量 / 能耗费用分摊 / 节能改造
 * （equipment/maintenance、equipment/utilization 已存在，不重复建）。
 * 避开 M465 设备全生命周期既有（calibration/disposal/contracts）、M463 energy 既有（cost·saving 若撞）、M480 equipment 既有、M481 logistics、M485 research·patient、/outpatient/* 路由。
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/equipment/lifecycle - 设备全生命周期（阶段/采购/验收/在用/维修/报废）5 条 */
async function handleEquipmentLifecycle(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'ELC-001', stage: '阶段：全院设备生命周期汇总（在册 1,280 台）', purchase: '采购中：12 台（含新 CT 1 台招标中）', accept: '已验收：本月 6 台（新设备安装调试完成）', inUse: '在用：1,240 台（台账与实物一致）', repair: '维修中：18 台（外修/厂家工程师）', scrap: '待报废：14 台（超期服役/维修不经济）' },
    { id: 'ELC-002', stage: '阶段：大型设备（CT/MRI/DSA）', purchase: '采购中：CT 1 台（招标流程）', accept: '已验收：0 台（本季无到货）', inUse: '在用：CT 4 台 / MRI 3 台 / DSA 2 台', repair: '维修中：MRI 1 台（梯度系统厂家处理）', scrap: '待报废：0 台（均在役）' },
    { id: 'ELC-003', stage: '阶段：生命支持设备（呼吸机/监护仪）', purchase: '采购中：呼吸机 5 台', accept: '已验收：3 台（ICU 增补）', inUse: '在用：呼吸机 86 台 / 监护仪 420 台', repair: '维修中：呼吸机 2 台（阀件更换）', scrap: '待报废：6 台（老旧监护仪）' },
    { id: 'ELC-004', stage: '阶段：检验设备（生化/免疫/血球）', purchase: '采购中：流水线 1 套', accept: '已验收：2 台（血球分析仪更新）', inUse: '在用：检验设备 62 台', repair: '维修中：生化分析仪 1 台（电极更换）', scrap: '待报废：4 台（老旧设备）' },
    { id: 'ELC-005', stage: '阶段：后勤设备（锅炉/空调/电梯）', purchase: '采购中：中央空调主机 1 台（夏季前）', accept: '已验收：电梯 1 台（新装）', inUse: '在用：锅炉 2 台 / 空调系统 1 套 / 电梯 18 部', repair: '维修中：电梯 2 部（年检整改项）', scrap: '待报废：4 台（老旧风机）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/energy/consumption - 能耗月度用量（类别/电/水/气月度用量）5 条 */
async function handleEnergyConsumption(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'ENC-001', category: '类别：全院能耗月度汇总（2026-09）', electricity: '电用量：186.5 万 kWh', water: '水用量：8.6 万吨', gas: '气用量（天然气）：12.4 万 m³（锅炉/厨房）' },
    { id: 'ENC-002', category: '类别：门诊楼', electricity: '电用量：42.0 万 kWh（空调+照明为主）', water: '水用量：1.8 万吨', gas: '气用量：0.6 万 m³' },
    { id: 'ENC-003', category: '类别：住院部（在院 480 床）', electricity: '电用量：68.0 万 kWh（空调+医疗设备）', water: '水用量：3.6 万吨', gas: '气用量：1.2 万 m³（热水供应）' },
    { id: 'ENC-004', category: '类别：手术部/ICU（洁净空调 24h）', electricity: '电用量：28.0 万 kWh（单位面积能耗最高）', water: '水用量：0.8 万吨', gas: '气用量：0 万 m³（无用气）' },
    { id: 'ENC-005', category: '类别：医技楼（检验/影像/放疗）', electricity: '电用量：30.5 万 kWh（大型设备耗电）', water: '水用量：1.2 万吨', gas: '气用量：0.6 万 m³' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/energy/cost - 能耗费用（科室/能耗分摊/同比）5 条 */
async function handleEnergyCost(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'ENC2-001', dept: '科室：全院能耗费用月度汇总', cost: '能耗分摊费用：248.6 万元（电 168 万 / 水 52 万 / 气 28.6 万）', yoy: '同比：-3.2%（节能改造见效，夏季空调电价峰谷优化）' },
    { id: 'ENC2-002', dept: '科室：门诊楼', cost: '能耗分摊：56.0 万元', yoy: '同比：-2.8%' },
    { id: 'ENC2-003', dept: '科室：住院部', cost: '能耗分摊：92.0 万元（按床位面积分摊）', yoy: '同比：-3.5%' },
    { id: 'ENC2-004', dept: '科室：手术部/ICU', cost: '能耗分摊：42.0 万元（洁净空调 24h 高能耗）', yoy: '同比：-1.2%（洁净要求高，节能空间有限）' },
    { id: 'ENC2-005', dept: '科室：医技楼', cost: '能耗分摊：38.6 万元（大型设备耗电）', yoy: '同比：-4.0%（设备更新效率提升）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/energy/saving - 节能改造（项目名/节能量/投资回收期）5 条 */
async function handleEnergySaving(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'ENS-001', name: '项目名：中央空调变频改造+楼宇自控（BA）', saving: '节能量：年节电约 42 万 kWh（约 25 万元）', payback: '投资回收期：约 3.2 年（已运行 1 年，效果符合预期）' },
    { id: 'ENS-002', name: '项目名：LED 全院照明改造', saving: '节能量：年节电约 18 万 kWh', payback: '投资回收期：约 2.0 年（已收回）' },
    { id: 'ENS-003', name: '项目名：住院部热水系统空气源热泵替代部分燃气', saving: '节能量：年节气约 3.6 万 m³（约 2.6 万元）', payback: '投资回收期：约 4.0 年' },
    { id: 'ENS-004', name: '项目名：给排水二级计量（分楼栋装表）', saving: '节能量：年节水约 1.2 万吨（漏损管控）', payback: '投资回收期：约 2.5 年（装表后漏损率从 8% 降至 4%）' },
    { id: 'ENS-005', name: '项目名：电梯能量回馈装置', saving: '节能量：年节电约 6 万 kWh', payback: '投资回收期：约 3.5 年' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m486Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/equipment/lifecycle', handle: handleEquipmentLifecycle, auth: true },
  { method: 'GET', path: '/api/v1/energy/consumption', handle: handleEnergyConsumption, auth: true },
  { method: 'GET', path: '/api/v1/energy/cost', handle: handleEnergyCost, auth: true },
  { method: 'GET', path: '/api/v1/energy/saving', handle: handleEnergySaving, auth: true },
];
