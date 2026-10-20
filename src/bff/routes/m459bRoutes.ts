/**
 * 健澜科技 jlmedaios - 监管数据上报与报送任务（report）
 *
 * HQMS 病案首页 / DRG-DIP 分组上报 / 传染病网报 / 妇幼卫生报送 / 监测直报 / 报送任务台账
 * 避开病案、公卫传染病随访、医保结算、审计日志既有口径。
 * 独立文件 m459bRoutes.ts（m459Routes.ts 已被设备工单批次占用，不复用）。
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/report/hqms - HQMS病案首页上报（上报批次/科室/病案数/状态/上报时间）5 条 */
async function handleRpHqms(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'HQMS-001', batch: '上报批次：HQMS-202610-01（2026 年 10 月上旬）', dept: '科室：心内科（出院病案首页）', count: '病案数：42 份（已完成质控校验）', status: '状态：已上报（省 HQMS 平台回执成功）', time: '上报时间：2026-10-18 10:20:00' },
    { id: 'HQMS-002', batch: '上报批次：HQMS-202610-01（2026 年 10 月上旬）', dept: '科室：普外科（出院病案首页）', count: '病案数：36 份', status: '状态：已上报（回执成功，无退回）', time: '上报时间：2026-10-18 10:25:00' },
    { id: 'HQMS-003', batch: '上报批次：HQMS-202610-01（2026 年 10 月上旬）', dept: '科室：妇产科（出院病案首页）', count: '病案数：28 份', status: '状态：待补正（3 份缺主要诊断编码，退回修改中）', time: '上报时间：2026-10-18 10:30:00（待重报）' },
    { id: 'HQMS-004', batch: '上报批次：HQMS-202609-02（2026 年 9 月下旬）', dept: '科室：神经内科（出院病案首页）', count: '病案数：31 份', status: '状态：已上报（历史批次，已归档）', time: '上报时间：2026-09-28 15:10:00' },
    { id: 'HQMS-005', batch: '上报批次：HQMS-202610-02（2026 年 10 月下旬）', dept: '科室：全院汇总（待出月）', count: '病案数：待统计（月末汇总）', status: '状态：待上报（数据采集进行中）', time: '上报时间：计划 2026-11-05 前完成' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/report/drg-submit - DRG/DIP分组上报（分组批次/入组病例数/权重/状态）5 条 */
async function handleRpDrg(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'DRG-001', batch: '分组批次：DRG-202610-01（10 月上旬出院）', cases: '入组病例数：186 例（入组率 96.9%）', weight: '权重：CMI 1.18（总权重 219.5）', status: '状态：已上报（医保 DRG 平台回执成功）' },
    { id: 'DRG-002', batch: '分组批次：DIP-202610-01（10 月上旬出院）', cases: '入组病例数：204 例（DIP 入组率 98.1%）', weight: '权重：点值总分 1,520 点（均点 7.45）', status: '状态：已上报（DIP 平台回执成功）' },
    { id: 'DRG-003', batch: '分组批次：DRG-202610-01（10 月上旬出院）', cases: '入组病例数：6 例（未入组/歧义病例）', weight: '权重：待人工分组（低倍率/超高倍率待审）', status: '状态：待审核（病案室人工复核中）' },
    { id: 'DRG-004', batch: '分组批次：DRG-202609-02（9 月下旬出院）', cases: '入组病例数：192 例（历史批次）', weight: '权重：CMI 1.15（总权重 220.8）', status: '状态：已归档（结算完成，无申诉）' },
    { id: 'DRG-005', batch: '分组批次：DIP-202610-02（10 月下旬出院）', cases: '入组病例数：待统计（月中采集）', weight: '权重：待分组（数据滚动中）', status: '状态：采集中（暂未上报）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/report/infectious - 传染病网报（报告卡/病种/诊断/报卡医生/审核状态；区别于公卫传染病随访）5 条 */
async function handleRpInfectious(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'INF-001', cardNo: '报告卡：CR-20261020-001（传染病报告卡）', disease: '病种：乙类·肺结核（痰涂片阳性）', diagnosis: '诊断：继发性肺结核（上中下，涂阳）', doctor: '报卡医生：呼吸科 刘***（24h 内网报）', status: '审核状态：已审核（区疾控确认，网报成功）' },
    { id: 'INF-002', cardNo: '报告卡：CR-20261019-006', disease: '病种：乙类·细菌性痢疾', diagnosis: '诊断：急性细菌性痢疾（福氏志贺菌）', doctor: '报卡医生：感染科 周***', status: '审核状态：已审核（网报成功，转社区随访）' },
    { id: 'INF-003', cardNo: '报告卡：CR-20261020-003', disease: '病种：丙类·流行性感冒（流感样病例）', diagnosis: '诊断：甲型流感（轻症，居家建议）', doctor: '报卡医生：发热门诊 陈***', status: '审核状态：待审核（本院防保科复核中）' },
    { id: 'INF-004', cardNo: '报告卡：CR-20261018-002', disease: '病种：乙类·病毒性肝炎（乙型，急性）', diagnosis: '诊断：急性乙型病毒性肝炎', doctor: '报卡医生：感染科 周***', status: '审核状态：已审核（疾控归档）' },
    { id: 'INF-005', cardNo: '报告卡：CR-20261020-005', disease: '病种：乙类·梅毒（二期）', diagnosis: '诊断：二期梅毒（血清学阳性）', doctor: '报卡医生：皮肤科 赵***', status: '审核状态：待审核（隐私保护报卡，复核中）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/report/maternal-child - 妇幼卫生报送（报表期/机构/指标项/数值/报送状态）5 条 */
async function handleRpMatChild(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'MCH-001', period: '报表期：2026 年 9 月月报', org: '机构：本院（助产机构/妇幼保健科）', metric: '指标项：住院分娩活产数', value: '数值：68 例（本月）', status: '报送状态：已报送（妇幼保健平台回执成功）' },
    { id: 'MCH-002', period: '报表期：2026 年 9 月月报', org: '机构：本院（围产保健）', metric: '指标项：孕产妇系统管理率', value: '数值：96.2%（目标≥95%）', status: '报送状态：已报送' },
    { id: 'MCH-003', period: '报表期：2026 年 9 月月报', org: '机构：本院（儿童保健）', metric: '指标项：0–6 岁儿童健康管理率', value: '数值：94.8%（目标≥90%）', status: '报送状态：已报送' },
    { id: 'MCH-004', period: '报表期：2026 年 10 月月报（采集期）', org: '机构：本院（出生缺陷监测）', metric: '指标项：出生缺陷发生率（监测）', value: '数值：采集进行中（待月末汇总）', status: '报送状态：待报送（数据采集中）' },
    { id: 'MCH-005', period: '报表期：2026 年 3 季度季报', org: '机构：本院（妇幼综合指标）', metric: '指标项：产后访视率 / 新生儿访视率', value: '数值：产后访视 98.5% / 新生儿访视 99.1%', status: '报送状态：已归档（季度已审核）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/report/surveillance-direct - 监测直报（监测点/病种/病例数/直报时间/接收方）5 条 */
async function handleRpSurvDirect(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'SUR-001', point: '监测点：食源性疾病监测点（本院）', disease: '病种：食源性疾病（疑似沙门菌感染）', cases: '病例数：3 例（本周采集上报）', time: '直报时间：2026-10-19 11:00:00', receiver: '接收方：国家食源性疾病监测报告系统' },
    { id: 'SUR-002', point: '监测点：心血管病监测点', disease: '病种：急性心梗/脑卒中（发病登记）', cases: '病例数：本周 2 例（卒中 1 + 心梗 1）', time: '直报时间：2026-10-20 09:30:00', receiver: '接收方：国家慢病监测平台（心脑血管事件报告）' },
    { id: 'SUR-003', point: '监测点：肿瘤登记监测点', disease: '病种：新发恶性肿瘤（登记补报）', cases: '病例数：本月 5 例（按 ICD 编码登记）', time: '直报时间：2026-10-18 16:00:00', receiver: '接收方：国家肿瘤登记年报系统' },
    { id: 'SUR-004', point: '监测点：药物滥用监测点', disease: '病种：麻醉/精神药品使用相关登记', cases: '病例数：本月 1 例（重点监测登记）', time: '直报时间：2026-10-17 14:20:00', receiver: '接收方：国家药物滥用监测中心' },
    { id: 'SUR-005', point: '监测点：药品不良反应监测点（ADR）', disease: '病种：药品不良反应（个例报告）', cases: '病例数：本月 2 例（轻度/中度各 1）', time: '直报时间：2026-10-16 10:10:00', receiver: '接收方：国家药品不良反应监测系统' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/report/tasks - 报送任务台账（任务名/上报机构/周期/下次截止/完成状态）5 条 */
async function handleRpTasks(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'TSK-001', taskName: '任务名：HQMS 病案首页月度上报', target: '上报机构：省病案质控/HQMS 平台', cycle: '周期：每月 5 日前报上月', nextDue: '下次截止：2026-11-05（10 月数据）', status: '完成状态：9 月已完成，10 月采集中' },
    { id: 'TSK-002', taskName: '任务名：DRG/DIP 分组结算上报', target: '上报机构：市医保局 DRG/DIP 平台', cycle: '周期：每月结算批次滚动上报', nextDue: '下次截止：2026-10-28（10 月下旬批次）', status: '完成状态：9 月批次已闭环，10 月进行中' },
    { id: 'TSK-003', taskName: '任务名：传染病网络直报（24h 时限）', target: '上报机构：中国疾病预防控制信息系统', cycle: '周期：确诊后 24 小时内即时报卡', nextDue: '下次截止：即时制（无固定截止）', status: '完成状态：本月在报，待审核卡 2 张' },
    { id: 'TSK-004', taskName: '任务名：妇幼卫生月度/季度报送', target: '上报机构：省妇幼保健信息平台', cycle: '周期：月报次月 10 日前 / 季报季后 15 日', nextDue: '下次截止：2026-11-10（10 月月报）', status: '完成状态：9 月月报已完成' },
    { id: 'TSK-005', taskName: '任务名：慢病/肿瘤/食源性监测直报', target: '上报机构：国家各专项监测平台', cycle: '周期：按监测点要求周报/月报', nextDue: '下次截止：2026-10-24（本周食源性周报）', status: '完成状态：在报，无逾期' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m459bRoutes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/report/hqms', handle: handleRpHqms, auth: true },
  { method: 'GET', path: '/api/v1/report/drg-submit', handle: handleRpDrg, auth: true },
  { method: 'GET', path: '/api/v1/report/infectious', handle: handleRpInfectious, auth: true },
  { method: 'GET', path: '/api/v1/report/maternal-child', handle: handleRpMatChild, auth: true },
  { method: 'GET', path: '/api/v1/report/surveillance-direct', handle: handleRpSurvDirect, auth: true },
  { method: 'GET', path: '/api/v1/report/tasks', handle: handleRpTasks, auth: true },
];
