/**
 * 健澜科技 jlmedaios - 院前急救与 120 调度（ems/ambulance）
 *
 * 急救调度 / 急救病历 / 救护车状态 / 急救物资 / 急救轨迹 / 急救质量
 * 独立文件 m467bRoutes.ts（m467Routes.ts 已被三大中心批次占用，不复用）。
 * ems/* 与上一批 emergency/* 为不同路径，不冲突；避开急诊、医技预约、设备工单口径。
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/ems/dispatch - 急救调度（呼叫号/地址/病情分级/派车时间/状态）5 条 */
async function handleEmsDispatch(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'DPS-001', callNo: '呼叫号：120-20261019-301（胸痛呼救）', address: '地址：城区文化路 88 号小区 3 栋（就近调度）', level: '病情分级：Ⅰ级（急危重症，胸痛+大汗，立即派车）', dispatchTime: '派车时间：06:45:03（接单后 20s 内派车）', status: '状态：已送达急诊，任务闭环' },
    { id: 'DPS-002', callNo: '呼叫号：120-20261018-158（卒中呼救）', address: '地址：城郊阳光家园 12 幢（跨片区）', level: '病情分级：Ⅰ级（突发偏瘫，疑似卒中）', dispatchTime: '派车时间：07:42:10', status: '状态：已送达卒中中心，闭环' },
    { id: 'DPS-003', callNo: '呼叫号：120-20261017-220（车祸伤）', address: '地址：国道 K12+300 段（事故现场）', level: '病情分级：Ⅰ级（多发伤，同步通报创伤中心）', dispatchTime: '派车时间：14:02:48（双通道派车）', status: '状态：已送达创伤中心，闭环' },
    { id: 'DPS-004', callNo: '呼叫号：120-20261015-096（跌倒老人）', address: '地址：社区老年公寓 5 楼（需电梯/楼梯评估）', level: '病情分级：Ⅲ级（非急重症，扭伤可协助行走）', dispatchTime: '派车时间：21:08:22', status: '状态：已送达急诊，闭环（家属陪同）' },
    { id: 'DPS-005', callNo: '呼叫号：120-20261012-044（咨询/误呼回访）', address: '地址：城区（回拨核实为误呼，无患者）', level: '病情分级：Ⅳ级（非急救，电话指导，未派车）', dispatchTime: '派车时间：未派车（话务回访闭环）', status: '状态：已结案（误呼登记，无出车）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/ems/records - 急救病历（呼叫号/患者/主诉/现场处置/交接医院）5 条 */
async function handleEmsRecords(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'REC-001', callNo: '呼叫号：120-20261019-301', patient: '患者：男 62 岁（急性胸痛，意识清）', complaint: '主诉：胸骨后压榨样痛 40min，伴大汗、放射至左臂', scene: '现场处置：吸氧、心电监护、建立静脉通路、含服硝酸甘油、心电传输', handoff: '交接医院：本院急诊胸痛通道（口头+书面双交接，签字）' },
    { id: 'REC-002', callNo: '呼叫号：120-20261018-158', patient: '患者：女 70 岁（突发右侧肢体无力、言语不清）', complaint: '主诉：醒后发现口角歪斜、右肢不能抬举（疑似卒中）', scene: '现场处置：血糖排查、卧位保护、记录最后正常时间、血压监测', handoff: '交接医院：本院卒中中心（DNT 衔接，绿色通道交接）' },
    { id: 'REC-003', callNo: '呼叫号：120-20261017-220', patient: '患者：男 35 岁（车祸，胸部+下肢伤）', complaint: '主诉：车祸撞击后胸痛、右大腿畸形、出血', scene: '现场处置：止血包扎、夹板固定、脊柱保护、液体复苏、胸腔评估', handoff: '交接医院：本院创伤中心（创伤团队提前到位，直接交接抢救）' },
    { id: 'REC-004', callNo: '呼叫号：120-20261015-096', patient: '患者：女 81 岁（跌倒，左踝扭伤）', complaint: '主诉：夜间起夜滑倒，左踝肿痛、可扶助行器行走', scene: '现场处置：冰敷、弹性绷带固定、评估无头部外伤、测量血压', handoff: '交接医院：本院急诊骨科分诊（家属陪同交接）' },
    { id: 'REC-005', callNo: '呼叫号：120-20261012-044', patient: '患者：无（误呼，未接诊）', complaint: '主诉：电话误呼，回拨确认无不适、无患者', scene: '现场处置：未出车，话务登记误呼并安全回访', handoff: '交接医院：无（闭环结案，纳入话务质量记录）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/ambulance/status - 救护车状态（车号/驾驶员/位置/任务状态/消毒状态）5 条 */
async function handleAmbulanceStatus(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'AMB-001', plate: '车号：浙A·12001（监护型急救车）', driver: '驾驶员：王师傅 + 急救员 李***', location: '位置：院区待命点（GPS：院区停车场 A 区）', task: '任务状态：待命（无任务，随时可派）', disinfect: '消毒状态：已完成终末消毒（上趟任务后）' },
    { id: 'AMB-002', plate: '车号：浙A·12003（监护型，溶栓携行）', driver: '驾驶员：赵师傅 + 医师 周***', location: '位置：返回途中（城郊→本院，GPS 动态更新）', task: '任务状态：执行中（任务完成返院）', disinfect: '消毒状态：返院后待消毒（队列中）' },
    { id: 'AMB-003', plate: '车号：浙A·12002（创伤抢救型）', driver: '驾驶员：孙师傅 + 急救团队', location: '位置：国道事故现场（执行任务中）', task: '任务状态：执行中（多发伤转运）', disinfect: '消毒状态：任务中（到院后统一终末消毒）' },
    { id: 'AMB-004', plate: '车号：浙A·12005（转运型，非急救）', driver: '驾驶员：钱师傅', location: '位置：院区车库（保养/检修位）', task: '任务状态：停运检修（制动保养 1 天）', disinfect: '消毒状态：已清洁（检修期间停用）' },
    { id: 'AMB-005', plate: '车号：浙A·12004（监护型）', driver: '驾驶员：吴师傅 + 急救员', location: '位置：急诊楼前交接点（刚完成交接）', task: '任务状态：待命（准备下一趟）', disinfect: '消毒状态：消毒中（一次性用品已更换）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/ems/supplies - 急救物资（车号/急救药品/耗材/效期/数量）5 条 */
async function handleEmsSupplies(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'SUP-001', plate: '车号：浙A·12001（胸痛任务车）', drugs: '急救药品：硝酸甘油/阿司匹林/肾上腺素/阿托品/多巴胺', consumables: '耗材：除颤电极片、吸氧管、静脉留置针、止血包', expiry: '效期：药品均在有效期内（最近一批 2027-03 到期）', qty: '数量：药品按基数配齐，耗材备用充足（周盘点）' },
    { id: 'SUP-002', plate: '车号：浙A·12003（溶栓携行车）', drugs: '急救药品：静脉溶栓药（专人冷链携带，双人双锁）', consumables: '耗材：采血包、溶栓配套注射器、时间标签贴', expiry: '效期：溶栓药冷藏链记录完整，效期至 2027-01', qty: '数量：溶栓基数 1 份（用后即时补配）' },
    { id: 'SUP-003', plate: '车号：浙A·12002（创伤车）', drugs: '急救药品：镇痛/止血/液体复苏晶体液', consumables: '耗材：夹板、止血带、颈托、脊柱板、包扎敷料', expiry: '效期：敷料/夹板在有效期，液体无破损', qty: '数量：创伤固定耗材成套配齐（事故后已补充）' },
    { id: 'SUP-004', plate: '车号：浙A·12005（检修车）', drugs: '急救药品：随车药品已封存移至备用箱', consumables: '耗材：检修期间暂存车库，待复运前补配', expiry: '效期：封存登记（停用期间不占用车载效期）', qty: '数量：检修停运，复运前按基数盘点' },
    { id: 'SUP-005', plate: '车号：浙A·12004（常规监护车）', drugs: '急救药品：常规急救药 + 葡萄糖/生理盐水', consumables: '耗材：口罩/手套/氧气面罩/简易呼吸器', expiry: '效期：1 项敷料临近效期（已列入本月更换清单）', qty: '数量：基本充足，临近效期项待更换' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/ems/track - 急救轨迹（车号/GPS点/时间戳/里程）5 条 */
async function handleEmsTrack(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'TRK-001', plate: '车号：浙A·12001（301 胸痛任务）', gps: 'GPS 点：院区待命点→文化路小区（沿途 6 个定位点）', ts: '时间戳：06:45 出车 / 06:52 到达 / 07:08 返院', mileage: '里程：往返 14.6 km（城区单程 6.2km）' },
    { id: 'TRK-002', plate: '车号：浙A·12003（158 卒中任务）', gps: 'GPS 点：院区→阳光家园（跨片区，11 个定位点）', ts: '时间戳：07:42 出车 / 07:58 到达 / 08:25 返院', mileage: '里程：往返 31.0 km（郊区单程 12.8km）' },
    { id: 'TRK-003', plate: '车号：浙A·12002（220 车祸任务）', gps: 'GPS 点：院区→国道 K12 事故点（高速/国道段）', ts: '时间戳：14:02 出车 / 14:14 到达 / 15:05 返院', mileage: '里程：往返 46.8 km（含现场停留）' },
    { id: 'TRK-004', plate: '车号：浙A·12004（096 跌倒任务）', gps: 'GPS 点：院区→老年公寓（城区短途 3 个点）', ts: '时间戳：21:08 出车 / 21:19 到达 / 21:48 返院', mileage: '里程：往返 7.4 km' },
    { id: 'TRK-005', plate: '车号：无（044 误呼未出车）', gps: 'GPS 点：无轨迹（话务闭环，车辆未移动）', ts: '时间戳：12:31 呼叫 / 12:33 回拨结案', mileage: '里程：0 km（未派车）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/ems/quality - 急救质量（呼叫号/反应时间/现场处置时长/成功率/评分）5 条 */
async function handleEmsQuality(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'QAL-001', callNo: '呼叫号：120-20261019-301（胸痛）', response: '反应时间：接单-出车 20s，出车-到达 7min（城区达标）', sceneTime: '现场处置时长：11min（监护+给药后转运）', success: '成功率：成功衔接急诊 PCI，患者恢复（院前环节成功）', score: '评分：96 分（话务/调度/处置/交接全流程达标）' },
    { id: 'QAL-002', callNo: '呼叫号：120-20261018-158（卒中）', response: '反应时间：接单-出车 18s，出车-到达 16min（郊区达标）', sceneTime: '现场处置时长：9min（血糖排查+最后正常时间记录）', success: '成功率：衔接静脉溶栓，症状改善（院前成功）', score: '评分：94 分（时间记录规范，郊区路程偏长已注明）' },
    { id: 'QAL-003', callNo: '呼叫号：120-20261017-220（车祸创伤）', response: '反应时间：接单-出车 25s，出车-到达 12min', sceneTime: '现场处置时长：18min（止血固定+复苏，创伤复杂）', success: '成功率：安全送达创伤中心，生命体征稳定（院前成功）', score: '评分：92 分（处置到位，现场耗时偏长因伤情复杂）' },
    { id: 'QAL-004', callNo: '呼叫号：120-20261015-096（跌倒）', response: '反应时间：接单-出车 22s，出车-到达 11min', sceneTime: '现场处置时长：7min（冰敷固定+评估）', success: '成功率：非急重症安全送达，无并发症（成功）', score: '评分：90 分（非急救类，流程规范）' },
    { id: 'QAL-005', callNo: '呼叫号：120-20261012-044（误呼）', response: '反应时间：12:31 接听，12:33 回拨核实（2min 内）', sceneTime: '现场处置时长：0min（未出车，话务处置）', success: '成功率：准确识别误呼，避免无效出车（闭环成功）', score: '评分：95 分（话务识别与回访规范）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m467bRoutes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/ems/dispatch', handle: handleEmsDispatch, auth: true },
  { method: 'GET', path: '/api/v1/ems/records', handle: handleEmsRecords, auth: true },
  { method: 'GET', path: '/api/v1/ambulance/status', handle: handleAmbulanceStatus, auth: true },
  { method: 'GET', path: '/api/v1/ems/supplies', handle: handleEmsSupplies, auth: true },
  { method: 'GET', path: '/api/v1/ems/track', handle: handleEmsTrack, auth: true },
  { method: 'GET', path: '/api/v1/ems/quality', handle: handleEmsQuality, auth: true },
];
