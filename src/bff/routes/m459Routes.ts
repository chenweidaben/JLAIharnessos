/**
 * 健澜科技 jlmedaios - M459 医疗设备维修工单闭环（equipment / maintenance）
 *
 * 设备巡检 / 报修工单 / 维修记录 / 保养计划 / 设备折旧
 * （equipment/ledger 台账已存在，此处不重复）。
 * 避开后勤设备物资、自助终端硬件、耗材库存既有口径。
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/equipment/inspections - 设备巡检（设备号/巡检人/项目/结果/时间）5 条 */
async function handleEqInspections(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'INS-001', eqNo: '设备号：EQ-CT-01（64 排螺旋 CT）', inspector: '巡检人：设备科 吴***（工程师）', items: '巡检项目：球管预热、水冷系统、机架运动、剂量校准', result: '结果：正常（各项参数达标，无异常告警）', time: '时间：2026-10-20 08:30:00' },
    { id: 'INS-002', eqNo: '设备号：EQ-MRI-01（1.5T 磁共振）', inspector: '巡检人：设备科 郑***（工程师）', items: '巡检项目：冷头、失超管、梯度水温、屏蔽间密封性', result: '结果：基本正常（冷头声音略大，列入观察）', time: '时间：2026-10-20 08:45:00' },
    { id: 'INS-003', eqNo: '设备号：EQ-UV-03（医用超声诊断仪）', inspector: '巡检人：设备科 王***（助理工程师）', items: '巡检项目：探头外观、图像质量、按键面板、消毒记录', result: '结果：正常（探头无划痕，图像清晰）', time: '时间：2026-10-20 09:00:00' },
    { id: 'INS-004', eqNo: '设备号：EQ-VENT-07（ICU 呼吸机）', inspector: '巡检人：设备科 + ICU 护士联检', items: '巡检项目：气源、潮气量监测、报警阈值、电池续航、管路气密', result: '结果：正常（备用机已充满电，管路气密合格）', time: '时间：2026-10-20 09:15:00' },
    { id: 'INS-005', eqNo: '设备号：EQ-DEFI-02（除颤仪）', inspector: '巡检人：设备科 王***（助理工程师）', items: '巡检项目：电极片有效期、电池、自检放电、胶水黏附', result: '结果：异常（1 号电极片临近效期，已申请更换）', time: '时间：2026-10-20 09:30:00' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/maintenance/work-orders - 报修工单（工单号/设备号/故障描述/报修人/状态）5 条 */
async function handleMntWorkOrders(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'WO-001', orderNo: '工单号：WO-20261020-001', eqNo: '设备号：EQ-UV-03（超声诊断仪）', fault: '故障描述：3.5MHz 腹部探头图像偶发条纹干扰，重启后短暂恢复', reporter: '报修人：超声科 陈***（2026-10-20 08:10 报修）', status: '状态：待派单（设备科受理，待工程师上门）' },
    { id: 'WO-002', orderNo: '工单号：WO-20261019-018', eqNo: '设备号：EQ-MON-12（病房监护仪）', fault: '故障描述：血压测量模块偶发报错 E403，无法测压', reporter: '报修人：心内科病房 林***（2026-10-19 16:40 报修）', status: '状态：维修中（工程师已上门，排查模块）' },
    { id: 'WO-003', orderNo: '工单号：WO-20261018-009', eqNo: '设备号：EQ-XR-02（DR 拍片机）', fault: '故障描述：曝光后图像传输延迟约 20 秒，偶发丢帧', reporter: '报修人：放射科 赵***（2026-10-18 10:05 报修）', status: '状态：已完工（更换采集板，复测正常，待验收）' },
    { id: 'WO-004', orderNo: '工单号：WO-20261017-021', eqNo: '设备号：EQ-INF-05（输液泵）', fault: '故障描述：流速漂移，设置 50ml/h 实测约 46ml/h', reporter: '报修人：急诊输液室 孙***（2026-10-17 14:20 报修）', status: '状态：已完工（校准传感器，验收通过，闭环）' },
    { id: 'WO-005', orderNo: '工单号：WO-20261020-002', eqNo: '设备号：EQ-DEFI-02（除颤仪）', fault: '故障描述：电极片临近效期 + 自检提示电池健康度 72%', reporter: '报修人：急诊科 李***（2026-10-20 09:35 报修）', status: '状态：待配件（待采购电极片与电池，已走备件申请）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/maintenance/repairs - 维修记录（工单号/维修人/故障原因/耗材/完工时间）5 条 */
async function handleMntRepairs(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'RPR-001', orderNo: '工单号：WO-20261018-009（DR 延迟丢帧）', repairer: '维修人：设备科 郑***（原厂工程师协修）', cause: '故障原因：图像采集板缓存老化导致丢帧与延迟', parts: '耗材：采集板 1 块、信号排线 1 根', finishTime: '完工时间：2026-10-19 15:30:00（复测正常）' },
    { id: 'RPR-002', orderNo: '工单号：WO-20261017-021（输液泵流速漂移）', repairer: '维修人：设备科 吴***（工程师）', cause: '故障原因：流量传感器积垢 + 校准偏移', parts: '耗材：流量传感器清洗、校准液（无换件）', finishTime: '完工时间：2026-10-17 18:00:00（验收通过）' },
    { id: 'RPR-003', orderNo: '工单号：WO-20261015-004（监护仪血氧探头失效）', repairer: '维修人：设备科 王***（助理工程师）', cause: '故障原因：SpO2 探头线缆内部断路', parts: '耗材：SpO2 指夹探头 1 个', finishTime: '完工时间：2026-10-15 17:10:00（闭环）' },
    { id: 'RPR-004', orderNo: '工单号：WO-20261012-011（雾化器不出雾）', repairer: '维修人：设备科 吴***（工程师）', cause: '故障原因：压电换能片积垢堵塞，电源板接触不良', parts: '耗材：换能片清洁、电源排线 1 根', finishTime: '完工时间：2026-10-12 16:45:00（验收通过）' },
    { id: 'RPR-005', orderNo: '工单号：WO-20261010-006（离心机异响）', repairer: '维修人：设备科 郑***（工程师）', cause: '故障原因：轴承磨损导致高速运转异响，动平衡偏差', parts: '耗材：轴承 1 套、减震胶垫 4 个', finishTime: '完工时间：2026-10-10 14:20:00（动平衡校正，闭环）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/equipment/preventive-plan - 保养计划（设备号/保养周期/负责人/下次保养/状态）5 条 */
async function handleEqPreventive(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'PPL-001', eqNo: '设备号：EQ-CT-01（64 排螺旋 CT）', cycle: '保养周期：季度保养（每 3 个月 1 次）', owner: '负责人：设备科 郑***（原厂年度维保合同覆盖）', nextTime: '下次保养：2026-12-10（已排入计划）', status: '状态：按期执行（上次 2026-09-10 完成）' },
    { id: 'PPL-002', eqNo: '设备号：EQ-MRI-01（1.5T 磁共振）', cycle: '保养周期：半年保养 + 日常巡检', owner: '负责人：设备科 郑***（原厂协议）', nextTime: '下次保养：2027-01-15', status: '状态：按期执行（冷头列入观察项）' },
    { id: 'PPL-003', eqNo: '设备号：EQ-VENT-07（ICU 呼吸机）', cycle: '保养周期：月度保养（临床高频设备）', owner: '负责人：设备科 吴***（科内自修）', nextTime: '下次保养：2026-11-05', status: '状态：按期执行（上次 2026-10-05 完成）' },
    { id: 'PPL-004', eqNo: '设备号：EQ-DEFI-02（除颤仪）', cycle: '保养周期：月度自检 + 季度深度保养', owner: '负责人：设备科 王***（助理工程师）', nextTime: '下次保养：2026-10-30（含电极片/电池更换）', status: '状态：临期待办（电极片更换已挂工单）' },
    { id: 'PPL-005', eqNo: '设备号：EQ-UV-03（超声诊断仪）', cycle: '保养周期：半年保养（探头/图像系统）', owner: '负责人：设备科 吴***（工程师）', nextTime: '下次保养：2027-03-20', status: '状态：正常（当前故障走工单维修，保养不冲突）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/equipment/depreciation - 设备折旧（设备号/原值/已折旧/净值/折旧年限）5 条 */
async function handleEqDepreciation(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'DEP-001', eqNo: '设备号：EQ-CT-01（64 排螺旋 CT）', original: '原值：人民币 1,280,000.00 元', dep: '已折旧：人民币 768,000.00 元（已用 6 年）', net: '净值：人民币 512,000.00 元', life: '折旧年限：10 年（直线法，残值率 5%）' },
    { id: 'DEP-002', eqNo: '设备号：EQ-MRI-01（1.5T 磁共振）', original: '原值：人民币 2,860,000.00 元', dep: '已折旧：人民币 1,716,000.00 元（已用 6 年）', net: '净值：人民币 1,144,000.00 元', life: '折旧年限：10 年（直线法，残值率 5%）' },
    { id: 'DEP-003', eqNo: '设备号：EQ-UV-03（超声诊断仪）', original: '原值：人民币 168,000.00 元', dep: '已折旧：人民币 134,400.00 元（已用 8 年，临近到期）', net: '净值：人民币 33,600.00 元', life: '折旧年限：8 年（直线法）' },
    { id: 'DEP-004', eqNo: '设备号：EQ-VENT-07（ICU 呼吸机）', original: '原值：人民币 86,000.00 元', dep: '已折旧：人民币 34,400.00 元（已用 4 年）', net: '净值：人民币 51,600.00 元', life: '折旧年限：8 年（直线法，残值率 5%）' },
    { id: 'DEP-005', eqNo: '设备号：EQ-DEFI-02（除颤仪）', original: '原值：人民币 32,000.00 元', dep: '已折旧：人民币 12,800.00 元（已用 4 年）', net: '净值：人民币 19,200.00 元', life: '折旧年限：8 年（直线法，残值率 5%）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m459Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/equipment/inspections', handle: handleEqInspections, auth: true },
  { method: 'GET', path: '/api/v1/maintenance/work-orders', handle: handleMntWorkOrders, auth: true },
  { method: 'GET', path: '/api/v1/maintenance/repairs', handle: handleMntRepairs, auth: true },
  { method: 'GET', path: '/api/v1/equipment/preventive-plan', handle: handleEqPreventive, auth: true },
  { method: 'GET', path: '/api/v1/equipment/depreciation', handle: handleEqDepreciation, auth: true },
];
