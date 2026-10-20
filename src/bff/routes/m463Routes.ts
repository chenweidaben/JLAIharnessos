/**
 * 健澜科技 jlmedaios - M463 后勤能耗与物业管理（energy / property / logistics）
 *
 * 水电能耗 / 清洁保洁 / 被服洗涤 / 绿化养护 / 食堂设施 / 物业巡检
 * 避开后勤设备物资、设备维修、行政办公、耗材供应链既有口径。
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/energy/water-electric - 水电能耗（楼栋/月份/用水/用电/环比）5 条 */
async function handleEnWaterElectric(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'WTE-001', building: '楼栋：门诊综合楼（1–6 层）', month: '月份：2026-09', water: '用水：1,860 吨（水表读数 28,420→30,280）', electric: '用电：42,600 kWh', mom: '环比：用电 +3.2%（空调季尾段），用水 -1.5%' },
    { id: 'WTE-002', building: '楼栋：住院部 A 栋（病房）', month: '月份：2026-09', water: '用水：2,340 吨', electric: '用电：38,900 kWh', mom: '环比：用电 +1.8%，用水 +0.9%（住院量平稳）' },
    { id: 'WTE-003', building: '楼栋：住院部 B 栋（手术/ICU 区）', month: '月份：2026-09', water: '用水：1,120 吨', electric: '用电：51,300 kWh（24h 不间断设备）', mom: '环比：用电 +2.4%，用水 -0.6%（设备高耗稳定）' },
    { id: 'WTE-004', building: '楼栋：医技楼（检验/影像）', month: '月份：2026-09', water: '用水：680 吨', electric: '用电：33,700 kWh（大型设备高耗）', mom: '环比：用电 +1.1%，用水持平' },
    { id: 'WTE-005', building: '楼栋：后勤/食堂附属楼', month: '月份：2026-09', water: '用水：920 吨（含食堂）', electric: '用电：12,400 kWh', mom: '环比：用水 +4.0%（食堂用水上升，已排查无跑冒）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/property/cleaning - 清洁保洁（区域/保洁人/频次/评分/时间）5 条 */
async function handlePropCleaning(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'CLN-001', area: '区域：门诊大厅/候诊区', cleaner: '保洁人：张***（外包保洁组）', freq: '频次：每日 4 次巡回保洁（早/中/晚/闭馆）', score: '评分：96/100（物业质检，地面/扶手/座椅）', time: '时间：2026-10-20 08:00–17:30 巡回' },
    { id: 'CLN-002', area: '区域：住院部走廊/病房公共区', cleaner: '保洁人：李***（住院保洁组）', freq: '频次：每日 2 次湿式拖擦 + 随脏随清', score: '评分：94/100（病房消毒记录齐全）', time: '时间：2026-10-20 07:30 / 14:30' },
    { id: 'CLN-003', area: '区域：卫生间（门诊各层）', cleaner: '保洁人：王***（专人定点）', freq: '频次：每 2 小时巡查保洁并登记', score: '评分：92/100（1 次巡查延迟已提醒）', time: '时间：2026-10-20 全天轮值' },
    { id: 'CLN-004', area: '区域：手术室/洁净区外走廊', cleaner: '保洁人：专职保洁（感控要求）', freq: '频次：每台手术后终末消毒 + 每日深度清洁', score: '评分：98/100（感控联合验收）', time: '时间：2026-10-20 随手术台次' },
    { id: 'CLN-005', area: '区域：电梯轿厢/扶手/按钮面板', cleaner: '保洁人：赵***（公共区组）', freq: '频次：每日 3 次擦拭消毒（高频接触点）', score: '评分：95/100', time: '时间：2026-10-20 08:30 / 12:30 / 17:00' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/property/laundry - 被服洗涤（送洗批次/品类/件数/返还/状态）5 条 */
async function handlePropLaundry(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'LND-001', batch: '送洗批次：LD-20261020-01（住院部 A 栋）', category: '品类：病员床单/被套/枕套（一般污染）', count: '件数：320 件', returnBack: '返还：当日 18:00 前洁净返还', status: '状态：已送洗（在洗涤线，待烘干折叠）' },
    { id: 'LND-002', batch: '送洗批次：LD-20261020-02（手术室）', category: '品类：手术布类（可重复使用手术衣/铺单，污染分级）', count: '件数：180 件', returnBack: '返还：次日 07:00 前洁净返还（灭菌衔接）', status: '状态：专机洗涤中（污染/洁净分流）' },
    { id: 'LND-003', batch: '送洗批次：LD-20261019-03（ICU 隔离区）', category: '品类：隔离被服（疑似感染，密封袋装）', count: '件数：96 件', returnBack: '返还：消毒洗涤后单独返还', status: '状态：已返还（消毒闭环，交接单签收）' },
    { id: 'LND-004', batch: '送洗批次：LD-20261019-04（医护工作服）', category: '品类：医护白大褂/洗手衣（洁净区分色）', count: '件数：240 件', returnBack: '返还：按科室分色打包返还', status: '状态：已返还（分拣完成）' },
    { id: 'LND-005', batch: '送洗批次：LD-20261018-05（急诊污衣）', category: '品类：急诊污染被服（紧急加急）', count: '件数：110 件', returnBack: '返还：4 小时内加急返还', status: '状态：已闭环（加急完成）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/property/greening - 绿化养护（区域/植物/养护人/项目/时间）5 条 */
async function handlePropGreening(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'GRN-001', area: '区域：门诊一楼大厅室内绿植区', plant: '植物：绿萝柱/发财树（观叶）', keeper: '养护人：外包绿化 陈***', task: '项目：浇水 + 擦叶 + 黄叶修剪', time: '时间：2026-10-20 09:00（每周 2 次）' },
    { id: 'GRN-002', area: '区域：住院部中庭绿化花园', plant: '植物：桂花/冬青绿篱（户外）', keeper: '养护人：外包绿化 林***', task: '项目：秋季修剪 + 施肥 + 除草', time: '时间：2026-10-19 15:00（月度养护）' },
    { id: 'GRN-003', area: '区域：屋顶花园/连廊', plant: '植物：月季/草坪（观赏）', keeper: '养护人：外包绿化 陈***', task: '项目：草坪修剪 + 病虫害巡查', time: '时间：2026-10-18 10:00（每两周 1 次）' },
    { id: 'GRN-004', area: '区域：各楼层等候区盆栽', plant: '植物：长寿花/绿萝（小型盆栽）', keeper: '养护人：外包绿化 王***', task: '项目：浇水 + 叶面清洁 + 更换枯萎植株', time: '时间：2026-10-20 11:00（每周 1 次巡查）' },
    { id: 'GRN-005', area: '区域：院区入口主干道行道树', plant: '植物：香樟/香泡（行道树）', keeper: '养护人：市政/外包联合', task: '项目：枯枝清理 + 支撑加固（台风季后）', time: '时间：2026-10-15（季度专项）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/logistics/catering-facility - 食堂设施（设备/位置/维护人/状态/检查）5 条 */
async function handleLogCatering(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'CTF-001', equip: '设备：商用蒸饭柜/蒸箱', location: '位置：职工食堂主厨房', maintainer: '维护人：后勤电工 周***（外包厨工协同）', status: '状态：正常（蒸汽稳定，门封完好）', inspect: '检查：2026-10-20 日常点检（燃气/安全阀正常）' },
    { id: 'CTF-002', equip: '设备：双层商用炒灶（燃气）', location: '位置：职工食堂炒菜间', maintainer: '维护人：后勤电工 周***', status: '状态：正常（火焰稳定，熄火保护有效）', inspect: '检查：2026-10-20 燃气泄漏检漏无异常' },
    { id: 'CTF-003', equip: '设备：四门冷藏冷冻柜（留样/原料）', location: '位置：食堂冷藏间', maintainer: '维护人：食堂管理员 + 后勤', status: '状态：正常（冷藏 4℃ / 冷冻 -18℃ 达标）', inspect: '检查：2026-10-20 温度记录齐全，留样柜单独上锁' },
    { id: 'CTF-004', equip: '设备：商用洗碗机（高温消毒）', location: '位置：食堂洗消间', maintainer: '维护人：后勤设备 吴***', status: '状态：待维修（喷淋泵压力不足，已报修）', inspect: '检查：2026-10-19 发现，工单待上门' },
    { id: 'CTF-005', equip: '设备：餐具保洁消毒柜（紫外线+高温）', location: '位置：食堂洗消间', maintainer: '维护人：食堂管理员', status: '状态：正常（消毒时长/温度达标）', inspect: '检查：2026-10-20 消毒记录完整' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/property/inspections - 物业巡检（巡检项/区域/结果/隐患/整改人）5 条 */
async function handlePropInspections(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'PIN-001', item: '巡检项：消防通道/灭火器/应急照明', area: '区域：门诊综合楼各层', result: '结果：合格（通道无堵塞，灭火器在有效期）', hazard: '隐患：3 层应急指示灯 1 个亮度偏暗', fixer: '整改人：后勤电工（已登记更换）' },
    { id: 'PIN-002', item: '巡检项：电梯运行/五方对讲/年检标识', area: '区域：全院 8 台客梯/货梯', result: '结果：合格（年检标识齐全，对讲畅通）', hazard: '隐患：B2 货梯门机开关偶发异响（观察）', fixer: '整改人：电梯维保单位（已约检）' },
    { id: 'PIN-003', item: '巡检项：给排水/跑冒滴漏/地漏', area: '区域：住院部公共卫生间/管井', result: '结果：基本合格', hazard: '隐患：A 栋 3 楼 1 处水龙头微滴（待换阀芯）', fixer: '整改人：后勤水工 郑***' },
    { id: 'PIN-004', item: '巡检项：公共照明/开关/线路安全', area: '区域：走廊/楼梯间/停车场', result: '结果：合格', hazard: '隐患：停车场 2 盏 LED 灯不亮（待补换）', fixer: '整改人：后勤电工 周***' },
    { id: 'PIN-005', item: '巡检项：防滑/扶手/地面湿滑标识', area: '区域：门诊/住院大厅易湿滑区', result: '结果：合格（警示牌到位）', hazard: '隐患：雨天入口防滑垫移位（已复位）', fixer: '整改人：保洁组长 李***' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m463Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/energy/water-electric', handle: handleEnWaterElectric, auth: true },
  { method: 'GET', path: '/api/v1/property/cleaning', handle: handlePropCleaning, auth: true },
  { method: 'GET', path: '/api/v1/property/laundry', handle: handlePropLaundry, auth: true },
  { method: 'GET', path: '/api/v1/property/greening', handle: handlePropGreening, auth: true },
  { method: 'GET', path: '/api/v1/logistics/catering-facility', handle: handleLogCatering, auth: true },
  { method: 'GET', path: '/api/v1/property/inspections', handle: handlePropInspections, auth: true },
];
