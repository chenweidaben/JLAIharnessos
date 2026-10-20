/**
 * 健澜科技 jlmedaios - M454 手术麻醉与围术期管理（surgery / anesthesia）
 *
 * 术后复苏 PACU / 器械准备 / 手术安全核查 / 术后随访
 * （schedule 手术排程、records 麻醉记录已存在，此处不重复）。
 * 只补缺失，不重复已做的手术麻醉主域口径。
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/surgery/pacu - 术后复苏PACU（患者/入室出室时间/评分/并发症/护士）5 条 */
async function handlePacu(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'PACU-001', patient: '患者：张***（男，62 岁，腹腔镜胆囊切除）', inOut: '入室 2026-10-20 10:45 / 出室 11:30（复苏 45 分钟）', score: '评分：Aldrete 评分 10 分（达标回病房）', complication: '并发症：无（生命体征平稳，无恶心呕吐）', nurse: '护士：PACU 护士 林***' },
    { id: 'PACU-002', patient: '患者：李***（女，55 岁，乳腺良性肿物切除）', inOut: '入室 2026-10-20 13:10 / 出室 13:55（复苏 45 分钟）', score: '评分：Aldrete 9 分（达标，观察后回病房）', complication: '并发症：轻度恶心，止吐处理后缓解', nurse: '护士：PACU 护士 郑***' },
    { id: 'PACU-003', patient: '患者：王***（男，48 岁，下肢静脉造影+硬化）', inOut: '入室 2026-10-19 15:20 / 出室 16:05（复苏 45 分钟）', score: '评分：Aldrete 10 分（达标）', complication: '并发症：无（穿刺点加压包扎良好）', nurse: '护士：PACU 护士 黄***' },
    { id: 'PACU-004', patient: '患者：赵***（女，66 岁，膝关节置换术）', inOut: '入室 2026-10-19 09:00 / 出室 10:10（复苏 70 分钟，延迟评估）', score: '评分：Aldrete 8 分（未立即达标，延长观察）', complication: '并发症：一过性血压偏低，补液后回升，留观', nurse: '护士：PACU 护士 周***' },
    { id: 'PACU-005', patient: '患者：孙***（男，35 岁，阑尾切除（腹腔镜））', inOut: '入室 2026-10-18 16:30 / 出室 17:15（复苏 45 分钟）', score: '评分：Aldrete 10 分（达标）', complication: '并发症：无（清醒，活动良好）', nurse: '护士：PACU 护士 林***' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/surgery/instruments - 器械准备（手术/器械包/清点数/灭菌状态/准备人）5 条 */
async function handleInstruments(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'INS-001', surgery: '手术：腹腔镜胆囊切除（OR-2026-1020-01）', pack: '器械包：腹腔镜基础包 + 分离钳/抓钳套装', count: '清点数：术前清点 18 件、关腹前复核 18 件（一致）', sterilize: '灭菌状态：高压蒸汽灭菌合格（化学/生物指示均达标）', preparer: '准备人：器械护士 钱***' },
    { id: 'INS-002', surgery: '手术：乳腺肿物切除（OR-2026-1020-02）', pack: '器械包：小手术包 + 乳腺拉钩/止血器械', count: '清点数：术前 12 件、关腔前 12 件（一致，无遗漏）', sterilize: '灭菌状态：环氧乙烷灭菌合格（一次性包装完好）', preparer: '准备人：器械护士 孙***' },
    { id: 'INS-003', surgery: '手术：膝关节置换（OR-2026-1019-03）', pack: '器械包：关节置换专用包 + 截骨/假体试模套装', count: '清点数：术前 32 件、关腹前 32 件（双人复核一致）', sterilize: '灭菌状态：高压蒸汽灭菌合格（双层包装）', preparer: '准备人：器械护士 吴***' },
    { id: 'INS-004', surgery: '手术：阑尾切除（腹腔镜）（OR-2026-1018-04）', pack: '器械包：腹腔镜基础包 + 穿刺 trocar 套装', count: '清点数：术前 16 件、关腹前 16 件（一致）', sterilize: '灭菌状态：高压蒸汽灭菌合格', preparer: '准备人：器械护士 钱***' },
    { id: 'INS-005', surgery: '手术：下肢静脉介入（OR-2026-1019-05）', pack: '器械包：介入穿刺包 + 导管鞘/导丝套件', count: '清点数：术前 10 件、术毕 10 件（一次性耗材登记）', sterilize: '灭菌状态：一次性无菌耗材（包装与有效期核验合格）', preparer: '准备人：器械护士 郑***' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/surgery/safety-check - 手术安全核查（手术号/三方核查项/结果/核查人/时间）5 条 */
async function handleSafetyCheck(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'SCH-001', opNo: '手术号：OR-2026-1020-01（腹腔镜胆囊切除）', items: '三方核查项：身份/术式/部位标识/知情同意/过敏史/抗菌皮试/备血/影像', result: '结果：全部通过（三方：术者/麻醉/护士共同确认）', checker: '核查人：巡回护士 林***（术者王***、麻醉赵***共同签核）', time: '时间：2026-10-20 09:55（麻醉前核查）' },
    { id: 'SCH-002', opNo: '手术号：OR-2026-1020-02（乳腺肿物切除）', items: '三方核查项：部位左右侧核对、知情同意、过敏史、术前用药', result: '结果：全部通过（切皮前核查）', checker: '核查人：巡回护士 孙***（术者李***、麻醉郑***）', time: '时间：2026-10-20 12:50' },
    { id: 'SCH-003', opNo: '手术号：OR-2026-1019-03（膝关节置换）', items: '三方核查项：假体型号核对、备血、过敏史、皮肤/假体消毒、时间记录', result: '结果：全部通过（患者入室 + 切皮前 + 离室三次核查）', checker: '核查人：巡回护士 吴***（术者赵***、麻醉周***）', time: '时间：2026-10-19 08:40' },
    { id: 'SCH-004', opNo: '手术号：OR-2026-1018-04（阑尾腹腔镜切除）', items: '三方核查项：急诊身份核对、感染指标、知情同意、过敏史', result: '结果：通过（急诊绿色通道，简化但关键项齐全）', checker: '核查人：巡回护士 钱***（术者孙***、麻醉黄***）', time: '时间：2026-10-18 15:50' },
    { id: 'SCH-005', opNo: '手术号：OR-2026-1019-05（下肢静脉介入）', items: '三方核查项：穿刺侧核对、抗凝状态、造影剂过敏史、知情同意', result: '结果：全部通过', checker: '核查人：巡回护士 郑***（术者王***、麻醉赵***）', time: '时间：2026-10-19 15:05' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/surgery/post-op-followup - 术后随访（手术号/随访时间/伤口/疼痛/恢复评级）5 条 */
async function handlePostOpFollowup(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'POF-001', opNo: '手术号：OR-2026-1020-01（腹腔镜胆囊切除）', followTime: '随访时间：术后第 1 天（2026-10-21 09:00 床旁）', wound: '伤口：敷料干燥，无红肿渗液，愈合良好', pain: '疼痛：VAS 2 分（轻度，可耐受，无需加止痛）', recovery: '恢复评级：优（活动自如，已排气，恢复顺利）' },
    { id: 'POF-002', opNo: '手术号：OR-2026-1020-02（乳腺肿物切除）', followTime: '随访时间：术后第 2 天（2026-10-22 查房）', wound: '伤口：对合良好，无皮下血肿', pain: '疼痛：VAS 1 分（轻微，局部包扎舒适）', recovery: '恢复评级：优（创口愈合佳，当日可出院）' },
    { id: 'POF-003', opNo: '手术号：OR-2026-1019-03（膝关节置换）', followTime: '随访时间：术后第 3 天（2026-10-22 康复评估）', wound: '伤口：引流量已减少，切口无感染征象', pain: '疼痛：VAS 4 分（中度，规范镇痛后缓解）', recovery: '恢复评级：良（肌力恢复中，已开始 CPM 锻炼）' },
    { id: 'POF-004', opNo: '手术号：OR-2026-1018-04（阑尾腹腔镜切除）', followTime: '随访时间：术后第 1 天（2026-10-19 床旁）', wound: '伤口：3 个穿刺点干燥，无感染', pain: '疼痛：VAS 3 分（轻度，口服止痛即可）', recovery: '恢复评级：良（已下床活动，胃肠道功能恢复）' },
    { id: 'POF-005', opNo: '手术号：OR-2026-1019-05（下肢静脉介入）', followTime: '随访时间：术后 24 小时（2026-10-20 观察穿刺点）', wound: '伤口：穿刺点加压止血，无血肿、无渗血', pain: '疼痛：VAS 1 分（轻微酸胀，可耐受）', recovery: '恢复评级：优（穿刺侧足背动脉搏动良好，无并发症）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m454Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/surgery/pacu', handle: handlePacu, auth: true },
  { method: 'GET', path: '/api/v1/surgery/instruments', handle: handleInstruments, auth: true },
  { method: 'GET', path: '/api/v1/surgery/safety-check', handle: handleSafetyCheck, auth: true },
  { method: 'GET', path: '/api/v1/surgery/post-op-followup', handle: handlePostOpFollowup, auth: true },
];
