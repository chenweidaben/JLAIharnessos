/**
 * 健澜科技 jlmedaios - M330 妇幼保健 + 急诊急救域
 *
 * 产前检查/产后随访/儿童保健 + 急诊红箱/急救呼叫（补缺失）
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/maternal/prenatal - 产前检查 5 条 */
async function handleMaternalPrenatal(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'MP-001', pregnantWoman: '张***（女，28 岁，孕 12 周）', gestationalWeek: '12 周（首次产检）', checkItems: '血常规+尿常规+肝肾功能+乙肝五项+梅毒+HIV+B 超（NT）', result: '一切正常，NT 值 1.5mm（<2.5mm 正常）', doctor: '李***（妇产科主治医师）' },
    { id: 'MP-002', pregnantWoman: '王***（女，32 岁，孕 24 周）', gestationalWeek: '24 周（糖耐量试验）', checkItems: 'OGTT（75g 葡萄糖耐量试验）+ 系统 B 超（大排畸）', result: 'OGTT 正常（空腹 4.5mmol/L，1h 8.2mmol/L，2h 6.8mmol/L），大排畸未见明显异常', doctor: '陈***（妇产科副主任医师）' },
    { id: 'MP-003', pregnantWoman: '刘***（女，35 岁，孕 32 周）', gestationalWeek: '32 周（常规产检）', checkItems: '血常规+尿常规+胎心监护（NST）+ B 超（估测胎儿体重）', result: '胎心监护反应型（正常），估测胎儿体重 1.8kg（符合孕周），尿常规尿蛋白（-）', doctor: '赵***（妇产科主任医师）' },
    { id: 'MP-004', pregnantWoman: '孙***（女，29 岁，孕 36 周）', gestationalWeek: '36 周（常规产检）', checkItems: '血常规+凝血功能+胎心监护（NST）+ B 超（胎位/羊水/胎盘）', result: '胎心监护反应型（正常），胎位头位，羊水指数 12cm（正常），胎盘 II 级', doctor: '周***（妇产科主治医师）' },
    { id: 'MP-005', pregnantWoman: '吴***（女，27 岁，孕 38 周）', gestationalWeek: '38 周（孕晚期产检）', checkItems: '胎心监护（NST）+ B 超（估测胎儿体重）+ 宫颈评分（Bishop）', result: '胎心监护反应型（正常），估测胎儿体重 3.2kg（符合孕周），宫颈评分 5 分（未成熟）', doctor: '郑***（妇产科副主任医师）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/maternal/postnatal - 产后随访 5 条 */
async function handleMaternalPostnatal(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'MP-001', postpartumWoman: '张***（女，28 岁，顺产 1 周）', visitTime: '2026-10-18（产后第 7 天，社区上门访视）', recoveryStatus: '子宫复旧良好（宫底脐下 3 指），恶露量正常（红色恶露），母乳喂养良好（乳头无皲裂）', guidanceDoctor: '李***（社区卫生服务中心全科医生）' },
    { id: 'MP-002', postpartumWoman: '王***（女，32 岁，剖宫产 2 周）', visitTime: '2026-10-15（产后第 14 天，社区上门访视）', recoveryStatus: '腹部切口愈合良好（无红肿渗液），子宫复旧良好，母乳喂养良好（每日哺乳 6-8 次）', guidanceDoctor: '陈***（社区卫生服务中心全科医生）' },
    { id: 'MP-003', postpartumWoman: '刘***（女，35 岁，顺产 42 天）', visitTime: '2026-10-20（产后第 42 天，回院复查）', recoveryStatus: '子宫复旧良好（已降至盆腔），恶露干净，盆底肌评估 II 级（建议盆底康复训练）', guidanceDoctor: '赵***（妇产科主任医师）' },
    { id: 'MP-004', postpartumWoman: '孙***（女，29 岁，剖宫产 1 周）', visitTime: '2026-10-19（产后第 7 天，社区上门访视）', recoveryStatus: '腹部切口愈合良好，子宫复旧良好，母乳喂养良好（每日哺乳 5-6 次）', guidanceDoctor: '周***（社区卫生服务中心全科医生）' },
    { id: 'MP-005', postpartumWoman: '吴***（女，27 岁，顺产 2 周）', visitTime: '2026-10-17（产后第 14 天，社区上门访视）', recoveryStatus: '子宫复旧良好，恶露量减少（转为浆液性恶露），母乳喂养良好（婴儿体重增长正常）', guidanceDoctor: '郑***（社区卫生服务中心全科医生）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/maternal/child-health - 儿童保健 5 条 */
async function handleMaternalChildHealth(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'MCH-001', child: '张宝宝（男，3 月龄）', age: '3 月龄（首次体检）', checkItems: '身高体重测量 + 体格检查（心肺腹）+ 神经行为评估（NBNA）+ 接种卡介苗/乙肝疫苗', result: '身高 62cm（+2SD），体重 6.5kg（+1SD），体格检查正常，NBNA 评分 38 分（满分 40 分，正常）', doctor: '李***（儿科主治医师）' },
    { id: 'MCH-002', child: '王宝宝（女，6 月龄）', age: '6 月龄（常规体检）', checkItems: '身高体重测量 + 体格检查 + 血常规（贫血筛查）+ 辅食添加指导', result: '身高 68cm（+1SD），体重 8.0kg（+1SD），血常规正常（Hb 115g/L），辅食添加良好', doctor: '陈***（儿科副主任医师）' },
    { id: 'MCH-003', child: '刘宝宝（男，12 月龄）', age: '12 月龄（周岁体检）', checkItems: '身高体重测量 + 体格检查 + 发育评估（DDST）+ 接种手足口病/流感疫苗', result: '身高 75cm（+1SD），体重 10.0kg（+1SD），DDST 发育正常（大运动/精细运动/语言/个人社交均符合月龄）', doctor: '赵***（儿科主任医师）' },
    { id: 'MCH-004', child: '孙宝宝（女，18 月龄）', age: '18 月龄（常规体检）', checkItems: '身高体重测量 + 体格检查 + 口腔检查（乳牙萌出情况）+ 语言发育评估', result: '身高 80cm（+1SD），体重 10.5kg（+1SD），乳牙萌出 12 颗（正常），语言发育正常（会说 10-20 个单词）', doctor: '周***（儿科主治医师）' },
    { id: 'MCH-005', child: '吴宝宝（男，24 月龄）', age: '24 月龄（两周岁体检）', checkItems: '身高体重测量 + 体格检查 + 发育评估（DDST）+ 血常规（贫血筛查）', result: '身高 88cm（+2SD），体重 12.5kg（+2SD），DDST 发育正常，血常规正常（Hb 120g/L）', doctor: '郑***（儿科副主任医师）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/emergency/redbox - 急诊红箱 5 条 */
async function handleEmergencyRedbox(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'ER-001', redboxNo: 'REDBOX-001', location: '急诊抢救室 1 号床位旁', items: '气管插管包 ×1、喉镜 ×1、简易呼吸器 ×1、肾上腺素注射液 ×5、阿托品注射液 ×5', status: '完好（物品齐全，药品在有效期内）', checkTime: '2026-10-20 08:00（每日早班检查）' },
    { id: 'ER-002', redboxNo: 'REDBOX-002', location: '急诊抢救室 2 号床位旁', items: '气管插管包 ×1、喉镜 ×1、简易呼吸器 ×1、肾上腺素注射液 ×5、胺碘酮注射液 ×2', status: '完好（物品齐全，药品在有效期内）', checkTime: '2026-10-20 08:00（每日早班检查）' },
    { id: 'ER-003', redboxNo: 'REDBOX-003', location: '急诊分诊台旁', items: '止血包 ×1、绷带 ×5、无菌纱布 ×10、碘伏消毒液 ×1', status: '完好（物品齐全）', checkTime: '2026-10-20 08:00（每日早班检查）' },
    { id: 'ER-004', redboxNo: 'REDBOX-004', location: '急诊输液室旁', items: '肾上腺素注射液 ×2、地塞米松注射液 ×2、氧气袋 ×1', status: '完好（物品齐全，药品在有效期内）', checkTime: '2026-10-20 08:00（每日早班检查）' },
    { id: 'ER-005', redboxNo: 'REDBOX-005', location: '急诊留观室旁', items: '气管插管包 ×1、简易呼吸器 ×1、肾上腺素注射液 ×3', status: '需补充（肾上腺素仅剩 2 支，需补充至 5 支）', checkTime: '2026-10-20 08:00（每日早班检查）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/emergency/calls - 急救呼叫 5 条 */
async function handleEmergencyCalls(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'EC-001', callNo: 'CALL-2026-000001', patient: '张***（男，65 岁，突发胸痛 30 分钟）', location: '院内心内科病房 3 床（院内急救呼叫）', callTime: '2026-10-20 09:15:00', status: '已到达（急诊团队 5 分钟内到达，已开始抢救）' },
    { id: 'EC-002', callNo: 'CALL-2026-000002', patient: '王***（女，58 岁，突发呼吸困难 10 分钟）', location: '院内呼吸内科病房 5 床（院内急救呼叫）', callTime: '2026-10-20 10:30:00', status: '已到达（急诊团队 4 分钟内到达，已开始抢救）' },
    { id: 'EC-003', callNo: 'CALL-2026-000003', patient: '刘***（男，72 岁，意识不清 15 分钟）', location: '院外（杭州市余杭区某小区，120 急救呼叫）', callTime: '2026-10-20 11:00:00', status: '已派出（救护车已出发，预计 15 分钟到达现场）' },
    { id: 'EC-004', callNo: 'CALL-2026-000004', patient: '孙***（女，45 岁，突发腹痛 20 分钟）', location: '院内普外科病房 2 床（院内急救呼叫）', callTime: '2026-10-20 11:30:00', status: '已到达（急诊团队 6 分钟内到达，已开始评估）' },
    { id: 'EC-005', callNo: 'CALL-2026-000005', patient: '吴***（男，60 岁，心跳呼吸骤停）', location: '院外（杭州市西湖区某街道，120 急救呼叫）', callTime: '2026-10-20 12:00:00', status: '已到达（救护车已到达现场，正在进行 CPR）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m330Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/maternal/prenatal', handle: handleMaternalPrenatal, auth: true },
  { method: 'GET', path: '/api/v1/maternal/postnatal', handle: handleMaternalPostnatal, auth: true },
  { method: 'GET', path: '/api/v1/maternal/child-health', handle: handleMaternalChildHealth, auth: true },
  { method: 'GET', path: '/api/v1/emergency/redbox', handle: handleEmergencyRedbox, auth: true },
  { method: 'GET', path: '/api/v1/emergency/calls', handle: handleEmergencyCalls, auth: true },
];
