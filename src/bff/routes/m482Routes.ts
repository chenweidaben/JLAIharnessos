/**
 * 健澜科技 jlmedaios - M482 P0 合规：应急管理（应急预案 / 应急物资）
 *
 * 应急预案 / 应急物资储备
 * （insurance/expense-audit、drg-settlement、dip-settlement、rejection 已存在，不重复建）。
 * 避开 M475 drg/cost-summary、M471 patient/complaints、M479 patient-safety、M481 logistics、M471-M481b 各端点、/outpatient/* 路由。
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/emergency/plans - 应急预案（预案名/类型/责任部门/演练周期）5 条 */
async function handleEmergencyPlans(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'EP-001', name: '预案名：医院火灾应急疏散预案', type: '类型：火灾', dept: '责任部门：保卫科牵头 + 总务/护理/临床配合', drill: '演练周期：每半年 1 次全员疏散演练（最近一次 2026-09）' },
    { id: 'EP-002', name: '预案名：突发停电（含市电中断）应急处置预案', type: '类型：停电', dept: '责任部门：总务科（设备能源）牵头 + 信息科/UPS 保障', drill: '演练周期：每季度 1 次（柴油发电机带载切换测试）' },
    { id: 'EP-003', name: '预案名：突发停水应急保障预案', type: '类型：停水', dept: '责任部门：总务科牵头 + 护理部（手术/ICU 优先）', drill: '演练周期：每半年 1 次（应急储水启用流程）' },
    { id: 'EP-004', name: '预案名：医院感染暴发应急处置预案', type: '类型：院感暴发', dept: '责任部门：院感科牵头 + 医务/护理/临床科室', drill: '演练周期：每年 1 次桌面推演 + 实战（MDRO/传染病暴发）' },
    { id: 'EP-005', name: '预案名：大规模伤员群体性事件（车祸/灾害）应急救治预案', type: '类型：突发公共事件批量伤员', dept: '责任部门：医务科牵头 + 急诊/检验/影像/输血/手术联动', drill: '演练周期：每半年 1 次（伤员检伤分类+绿色通道全流程）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/emergency/supplies - 应急物资（物资名/类别/库存数量/效期/存放点）5 条 */
async function handleEmergencySupplies(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'ES-001', name: '物资名：战备急救药械（止血带/夹板/便携式呼吸机）', category: '类别：战备药械', stock: '库存数量：急救箱 12 套、便携式呼吸机 4 台', expiry: '效期：药品有效期均在 2027 年以后（按月巡检）', location: '存放点：急诊科 + 各病区抢救车定点' },
    { id: 'ES-002', name: '物资名：医用防护用品（N95 口罩/防护服/护目镜）', category: '类别：防护用品（院感应急储备）', stock: '库存数量：N95 口罩 12,000 只、防护服 1,500 套、护目镜 800 副', expiry: '效期：2027-06 前（动态周转）', location: '存放点：库房一楼应急物资专区（专人双锁）' },
    { id: 'ES-003', name: '物资名：应急储水与发电设备', category: '类别：后勤能源（停水/停电）', stock: '库存数量：10 吨应急水箱 1 套、500kW 柴油发电机 2 台（储油 800L）', expiry: '效期：机油/滤芯按季更换', location: '存放点：地下室设备间' },
    { id: 'ES-004', name: '物资名：消防应急器材（灭火器/防毒面具/应急照明）', category: '类别：消防器材', stock: '库存数量：灭火器 460 具、防毒面具 120 个、应急照明灯 320 盏', expiry: '效期：灭火器月检，有效期内均合格', location: '存放点：各楼层消防点位定点' },
    { id: 'ES-005', name: '物资名：批量伤员应急物资（检伤分类带/担架/输液套件）', category: '类别：突发公共事件批量伤员', stock: '库存数量：检伤分类带 200 套、折叠担架 30 副、应急输液套件 150 套', expiry: '效期：2027 年前', location: '存放点：急诊科应急储备间（30 秒可启用）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m482Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/emergency/plans', handle: handleEmergencyPlans, auth: true },
  { method: 'GET', path: '/api/v1/emergency/supplies', handle: handleEmergencySupplies, auth: true },
];
