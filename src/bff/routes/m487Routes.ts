/**
 * 健澜科技 jlmedaios - M487 P0 合规：消毒供应中心 CSSD + 营养科
 *
 * CSSD 工作量 / 质量 / 库存追溯；营养科菜单 / 咨询 / 疾病治疗饮食。
 * 避开 M486 equipment·energy、M481 logistics、M485 research·patient、M453 pharmacy、M435 药品供应链、/outpatient/* 路由。
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/cssd/workload - CSSD 工作量（日期/清洗包数/包装包数/灭菌包数/发放包数）5 条 */
async function handleCssdWorkload(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'CW-001', date: '日期：2026-10-20（今日汇总）', wash: '清洗包数：2,860 包（回收器械+器具）', pack: '包装包数：2,840 包（分类包装）', sterilize: '灭菌包数：2,830 包（压力蒸汽/低温）', issue: '发放包数：2,820 包（可追溯发放至科室）' },
    { id: 'CW-002', date: '日期：2026-10-19', wash: '清洗包数：2,920 包', pack: '包装包数：2,900 包', sterilize: '灭菌包数：2,890 包', issue: '发放包数：2,880 包' },
    { id: 'CW-003', date: '日期：2026-10-18（手术高峰期）', wash: '清洗包数：3,140 包（手术器械占比高）', pack: '包装包数：3,120 包', sterilize: '灭菌包数：3,110 包', issue: '发放包数：3,100 包' },
    { id: 'CW-004', date: '日期：2026-10-17', wash: '清洗包数：2,680 包', pack: '包装包数：2,660 包', sterilize: '灭菌包数：2,650 包', issue: '发放包数：2,640 包' },
    { id: 'CW-005', date: '日期：2026-10-16', wash: '清洗包数：2,740 包', pack: '包装包数：2,720 包', sterilize: '灭菌包数：2,710 包', issue: '发放包数：2,700 包' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/cssd/quality - CSSD 质量（日期/包装合格率/生物监测合格率/湿包率/追溯合格率）5 条 */
async function handleCssdQuality(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'CQ-001', date: '日期：2026-10-20', packPass: '包装合格率：99.6%（外观/标识/化学指示合格）', bioPass: '生物监测合格率：100%（每锅次 B-D+生物指示剂均合格）', wetPack: '湿包率：0.1%（1 包，已重新灭菌）', tracePass: '追溯合格率：100%（每包可追溯至锅次/操作者）' },
    { id: 'CQ-002', date: '日期：2026-10-19', packPass: '包装合格率：99.5%', bioPass: '生物监测合格率：100%', wetPack: '湿包率：0.2%', tracePass: '追溯合格率：100%' },
    { id: 'CQ-003', date: '日期：2026-10-18', packPass: '包装合格率：99.8%', bioPass: '生物监测合格率：100%', wetPack: '湿包率：0%', tracePass: '追溯合格率：100%' },
    { id: 'CQ-004', date: '日期：2026-10-17', packPass: '包装合格率：99.4%', bioPass: '生物监测合格率：100%（1 锅次生物阳性，已召回重灭）', wetPack: '湿包率：0.3%', tracePass: '追溯合格率：100%' },
    { id: 'CQ-005', date: '日期：2026-10-16', packPass: '包装合格率：99.6%', bioPass: '生物监测合格率：100%', wetPack: '湿包率：0.1%', tracePass: '追溯合格率：100%' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/cssd/stock - CSSD 库存（无菌包名/库存数量/效期/缺包预警状态）5 条 */
async function handleCssdStock(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'CS-001', name: '无菌包名：腹腔镜器械包', stock: '库存数量：在用 24 包 + 备用 12 包（在灭菌区）', expiry: '效期：2026-10-27 前（7 天效期内）', warn: '缺包预警状态：无（库存充足，日消耗约 18 包）' },
    { id: 'CS-002', name: '无菌包名：骨科手术器械包（内固定）', stock: '库存数量：在用 18 包 + 备用 8 包', expiry: '效期：2026-10-26 前', warn: '缺包预警状态：低（手术日高峰前已补包至 26 包）' },
    { id: 'CS-003', name: '无菌包名：剖宫产器械包', stock: '库存数量：在用 12 包 + 备用 6 包', expiry: '效期：2026-10-28 前', warn: '缺包预警状态：无' },
    { id: 'CS-004', name: '无菌包名：一般换药包（门诊/急诊）', stock: '库存数量：在用 80 包 + 备用 40 包', expiry: '效期：2026-11-05 前', warn: '缺包预警状态：无（日消耗约 90 包，动态周转）' },
    { id: 'CS-005', name: '无菌包名：介入手术敷料包', stock: '库存数量：在用 16 包 + 备用 6 包', expiry: '效期：2026-10-25 前', warn: '缺包预警状态：低（明日介入手术 6 台，已提前备包）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/nutrition/menu - 营养科菜单（日期/治疗饮食种类数/普通饮食数/肠内营养数/特殊膳食数）5 条 */
async function handleNutritionMenu(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'NM-001', date: '日期：2026-10-20（今日食谱）', therapeutic: '治疗饮食种类数：12 种（低盐/低脂/糖尿病/肾病/低嘌呤等）', normal: '普通饮食数：3 档（普食/软食/半流）', enteral: '肠内营养数：6 种（整蛋白/短肽/糖尿病型/肾病型）', special: '特殊膳食数：3 种（匀浆膳/低蛋白/管饲混合奶）' },
    { id: 'NM-002', date: '日期：2026-10-21（明日食谱已排）', therapeutic: '治疗饮食种类数：12 种（已按医嘱订餐）', normal: '普通饮食数：3 档', enteral: '肠内营养数：6 种', special: '特殊膳食数：3 种' },
    { id: 'NM-003', date: '日期：2026-10-19', therapeutic: '治疗饮食种类数：11 种（当日肾病餐减 1 种）', normal: '普通饮食数：3 档', enteral: '肠内营养数：5 种', special: '特殊膳食数：3 种' },
    { id: 'NM-004', date: '日期：2026-10-18', therapeutic: '治疗饮食种类数：12 种', normal: '普通饮食数：3 档', enteral: '肠内营养数：6 种', special: '特殊膳食数：3 种' },
    { id: 'NM-005', date: '日期：2026-10-17', therapeutic: '治疗饮食种类数：12 种', normal: '普通饮食数：3 档', enteral: '肠内营养数：6 种', special: '特殊膳食数：2 种（当日无低蛋白医嘱）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/nutrition/counseling - 营养咨询（科室/门诊咨询人次/住院会诊人次/营养宣教场次）5 条 */
async function handleNutritionCounseling(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'NC-001', dept: '科室：营养科工作汇总（本月）', outpatient: '门诊咨询人次：320 人次（糖尿病/减重/孕产营养）', inpatient: '住院会诊人次：186 人次（重症/肿瘤/肾病营养支持）', education: '营养宣教场次：8 场（病区健康宣教+患教室）' },
    { id: 'NC-002', dept: '科室：内分泌（糖尿病营养门诊）', outpatient: '门诊咨询人次：120 人次', inpatient: '住院会诊人次：42 人次', education: '营养宣教场次：3 场（糖尿病饮食课堂）' },
    { id: 'NC-003', dept: '科室：肿瘤科（放化疗营养支持）', outpatient: '门诊咨询人次：56 人次', inpatient: '住院会诊人次：68 人次（营养风险筛查高危）', education: '营养宣教场次：2 场' },
    { id: 'NC-004', dept: '科室：肾内科（CKD 饮食管理）', outpatient: '门诊咨询人次：86 人次（低蛋白饮食指导）', inpatient: '住院会诊人次：40 人次', education: '营养宣教场次：2 场（透析患者饮食）' },
    { id: 'NC-005', dept: '科室：ICU/外科（肠内营养支持）', outpatient: '门诊咨询人次：10 人次', inpatient: '住院会诊人次：36 人次（早期肠内营养启动）', education: '营养宣教场次：1 场（医护培训）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/nutrition/disease-diet - 疾病治疗饮食（病种/糖尿病餐/肾病餐/高血压餐/流质餐适用人数）5 条 */
async function handleDiseaseDiet(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'NDD-001', disease: '病种：全院治疗饮食适用汇总（今日在院）', dm: '糖尿病餐适用人数：86 人（按升糖指数配餐）', ckd: '肾病餐适用人数：42 人（低蛋白/限磷钾）', ht: '高血压餐适用人数：68 人（低盐<5g/d）', fluid: '流质/半流质餐适用人数：24 人（术后/吞咽困难）' },
    { id: 'NDD-002', disease: '病种：内分泌病区', dm: '糖尿病餐适用人数：32 人', ckd: '肾病餐适用人数：4 人', ht: '高血压餐适用人数：12 人', fluid: '流质餐适用人数：2 人' },
    { id: 'NDD-003', disease: '病种：肾内科病区', dm: '糖尿病餐适用人数：6 人（糖尿病肾病）', ckd: '肾病餐适用人数：38 人（CKD3-5 期）', ht: '高血压餐适用人数：20 人', fluid: '流质餐适用人数：0 人' },
    { id: 'NDD-004', disease: '病种：心血管内科病区', dm: '糖尿病餐适用人数：18 人', ckd: '肾病餐适用人数：2 人', ht: '高血压餐适用人数：30 人', fluid: '流质餐适用人数：4 人' },
    { id: 'NDD-005', disease: '病种：普外科（术后）', dm: '糖尿病餐适用人数：8 人', ckd: '肾病餐适用人数：2 人', ht: '高血压餐适用人数：6 人', fluid: '流质/半流质餐适用人数：18 人（术后早期）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m487Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/cssd/workload', handle: handleCssdWorkload, auth: true },
  { method: 'GET', path: '/api/v1/cssd/quality', handle: handleCssdQuality, auth: true },
  { method: 'GET', path: '/api/v1/cssd/stock', handle: handleCssdStock, auth: true },
  { method: 'GET', path: '/api/v1/nutrition/menu', handle: handleNutritionMenu, auth: true },
  { method: 'GET', path: '/api/v1/nutrition/counseling', handle: handleNutritionCounseling, auth: true },
  { method: 'GET', path: '/api/v1/nutrition/disease-diet', handle: handleDiseaseDiet, auth: true },
];
