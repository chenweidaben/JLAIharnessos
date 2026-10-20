/**
 * 健澜科技 jlmedaios - M481 P0 合规：后勤保障管理（被服/膳食/保卫/保洁）
 *
 * 被服管理 / 膳食供应 / 保卫管理 / 保洁管理
 * （logistics/energy、logistics/parking 已存在，不重复建）。
 * 避开 M463 后勤物业既有（energy/water-electric、property/cleaning·laundry·greening、logistics/catering-facility）、M471-M480 各端点、/outpatient/* 路由。
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/logistics/linen - 被服管理（科室/洗涤量/在库量/损耗率/洗涤次数）5 条 */
async function handleLinen(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'LIN-001', dept: '科室：全院被服周转汇总', washVolume: '本月洗涤量：18,640 件（床单/被服/手术衣）', inStock: '在库量：8,200 件（周转库存）', loss: '损耗率：0.8%（破损报废）', turns: '周转洗涤次数：约 4.2 次/件·月' },
    { id: 'LIN-002', dept: '科室：手术部', washVolume: '洗涤量：手术衣/铺单 3,860 件', inStock: '在库量：1,680 件（无菌专窗）', loss: '损耗率：0.5%（管控严格）', turns: '周转洗涤次数：6.0 次/件·月（高周转）' },
    { id: 'LIN-003', dept: '科室：ICU', washVolume: '洗涤量：2,140 件（含感染被服专洗）', inStock: '在库量：980 件', loss: '损耗率：1.2%（污染重，单独通道）', turns: '周转洗涤次数：5.4 次/件·月' },
    { id: 'LIN-004', dept: '科室：普通病区（床位 480）', washVolume: '洗涤量：10,860 件', inStock: '在库量：4,520 件', loss: '损耗率：0.7%', turns: '周转洗涤次数：3.8 次/件·月' },
    { id: 'LIN-005', dept: '科室：门诊/急诊', washVolume: '洗涤量：1,780 件（枕套/隔帘）', inStock: '在库量：1,020 件', loss: '损耗率：0.9%', turns: '周转洗涤次数：2.1 次/件·月' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/logistics/catering - 膳食供应（餐次/就餐人次/满意度/食品安全检查数）5 条 */
async function handleCatering(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'CAT-001', meal: '餐次：全院职工早/中/晚三餐汇总', diners: '就餐人次：本月 28,600 人次', satisfaction: '满意度：86.5 分（五档制，较上月 +1.2）', foodSafety: '食品安全检查数：4 次（原料/留样/操作间抽检，均合格）' },
    { id: 'CAT-002', meal: '餐次：患者治疗饮食（低盐/低脂/糖尿病餐）', diners: '就餐人次：本月 6,840 人次（按医嘱订餐）', satisfaction: '满意度：88.0 分（营养科督导）', foodSafety: '食品安全检查数：2 次（治疗餐配送温度/留样，合格）' },
    { id: 'CAT-003', meal: '餐次：营养科治疗膳食个性化餐', diners: '就餐人次：本月 1,260 人次（个体化配餐）', satisfaction: '满意度：90.5 分', foodSafety: '食品安全检查数：1 次（专窗专标，合格）' },
    { id: 'CAT-004', meal: '餐次：职工早高峰（早餐窗口）', diners: '就餐人次：本月 8,420 人次', satisfaction: '满意度：82.0 分（高峰排队偏长，已增窗口）', foodSafety: '食品安全检查数：1 次（早餐档口，合格）' },
    { id: 'CAT-005', meal: '餐次：探视/陪护家属外卖与便民餐', diners: '就餐人次：本月 3,200 人次（便民窗口）', satisfaction: '满意度：84.0 分', foodSafety: '食品安全检查数：1 次（半成品/外卖专区，合格）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/logistics/security - 保卫管理（日期/巡逻次数/治安事件数/消防检查数）5 条 */
async function handleSecurity(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'SEC-001', date: '日期：2026-10-19（全天汇总）', patrol: '巡逻次数：日间 8 次 + 夜间 12 次（重点科室/危化品库）', securityEvent: '治安事件数：0 起（纠纷 1 起已现场调解）', fireCheck: '消防检查数：1 次（消控室+重点部位巡查）' },
    { id: 'SEC-002', date: '日期：2026-10-18', patrol: '巡逻次数：日间 8 次 + 夜间 12 次', securityEvent: '治安事件数：0 起', fireCheck: '消防检查数：1 次（灭火器月检，均在有效期）' },
    { id: 'SEC-003', date: '日期：2026-10-17（含周五夜查）', patrol: '巡逻次数：日间 8 次 + 夜间 14 次（加密）', securityEvent: '治安事件数：1 起（车辆剐蹭，已处理）', fireCheck: '消防检查数：2 次（消防通道专项+消控室）' },
    { id: 'SEC-004', date: '日期：2026-10-16', patrol: '巡逻次数：日间 8 次 + 夜间 12 次', securityEvent: '治安事件数：0 起', fireCheck: '消防检查数：1 次（应急照明测试）' },
    { id: 'SEC-005', date: '日期：2026-10-15', patrol: '巡逻次数：日间 8 次 + 夜间 12 次', securityEvent: '治安事件数：0 起（走失寻人 1 起，协助找回）', fireCheck: '消防检查数：1 次（疏散标识专项）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/logistics/cleaning - 保洁管理（区域/检查项/合格率/不合格数/整改数）5 条 */
async function handleCleaning(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'CLN-001', area: '区域：门诊大厅/候诊区', item: '检查项：环境卫生·物表消毒·卫生间保洁', passRate: '合格率：96.5%（本月抽检 200 点）', fail: '不合格数：7 点（地面水渍/异味）', rectify: '整改数：7 点（当日整改完成）' },
    { id: 'CLN-002', area: '区域：住院病区（480 床）', item: '检查项：病房整洁·终末消毒·治疗室保洁', passRate: '合格率：95.0%', fail: '不合格数：10 点（床单位杂物/窗台积尘）', rectify: '整改数：10 点（已闭环）' },
    { id: 'CLN-003', area: '区域：手术部/ICU（洁净区）', item: '检查项：洁净环境·物表采样·终末消毒', passRate: '合格率：98.5%（院感联合检查）', fail: '不合格数：1 点（回风口积尘）', rectify: '整改数：1 点（当日消杀）' },
    { id: 'CLN-004', area: '区域：卫生间/公共洗漱区', item: '检查项：保洁频次·异味·耗材补充', passRate: '合格率：92.0%（高峰时段易不足）', fail: '不合格数：16 点（纸巾缺补/地面湿滑）', rectify: '整改数：15 点（1 点待增保洁频次）' },
    { id: 'CLN-005', area: '区域：电梯/楼梯间/地下车库', item: '检查项：轿厢消毒·扶手清洁·地库无积尘', passRate: '合格率：94.0%', fail: '不合格数：8 点（轿厢指纹/地库角落）', rectify: '整改数：8 点（已闭环）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m481Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/logistics/linen', handle: handleLinen, auth: true },
  { method: 'GET', path: '/api/v1/logistics/catering', handle: handleCatering, auth: true },
  { method: 'GET', path: '/api/v1/logistics/security', handle: handleSecurity, auth: true },
  { method: 'GET', path: '/api/v1/logistics/cleaning', handle: handleCleaning, auth: true },
];
