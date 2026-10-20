/**
 * 健澜科技 jlmedaios - M471 P0 合规：护理NQI敏感指标 / 互联互通四甲 / 电子病历五级缺口
 *
 * NQI 发生率汇总 / META-MSG 报文日志 / 资源目录 / 五级缺口清单 / 护理不良事件漏报根因 / 一致性测评评分
 * 避开 M429 NQI 单指标、M432 互联互通既有、M448 病历留痕、/outpatient/* 路由。
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/nqi/incidence - 护理敏感指标 NQI 发生率汇总（指标名/上报例数/出院人次/发生率/目标值/环比）5 条 */
async function handleNqiIncidence(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'NQI-001', indicator: '指标名：住院患者跌倒发生率', reported: '上报例数：6 例', discharges: '出院人次：1,842 人次', rate: '发生率：0.33‰（‰口径）', target: '目标值：≤0.50‰（优于目标）', mom: '环比：较上月 -0.05‰（下降，干预见效）' },
    { id: 'NQI-002', indicator: '指标名：院内压力性损伤发生率', reported: '上报例数：4 例', discharges: '出院人次：1,842 人次', rate: '发生率：0.22‰', target: '目标值：≤0.30‰（达标）', mom: '环比：持平（0.00‰波动）' },
    { id: 'NQI-003', indicator: '指标名：管路非计划滑脱发生率', reported: '上报例数：3 例', discharges: '出院人次：1,842 人次', rate: '发生率：0.16‰', target: '目标值：≤0.20‰（达标）', mom: '环比：较上月 -0.03‰（双重固定见效）' },
    { id: 'NQI-004', indicator: '指标名：给药错误（拦截后/发生）', reported: '上报例数：2 例（1 起送达前拦截）', discharges: '出院人次：1,842 人次', rate: '发生率：0.11‰（实际伤害 1 例）', target: '目标值：≤0.15‰（达标）', mom: '环比：持平（PDA 闭环上线后趋稳）' },
    { id: 'NQI-005', indicator: '指标名：护士床护比（护患比达标率）', reported: '上报例数：在岗护士 168 人', discharges: '出院人次：1,842 人次（同期开放床位 480 张）', rate: '发生率：床护比 1:0.35（达标口径）', target: '目标值：床护比 ≥1:0.40（部分病区待补）', mom: '环比：招聘补足中，较上月 +0.02' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/interop/meta-msg-log - META-MSG 报文交换日志（报文ID/发送方/接收方/META类型/发送时间/解析状态）5 条 */
async function handleMetaMsgLog(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'MML-001', msgId: '报文ID：META-20261020-000123（患者基本信息）', sender: '发送方：本院 HIS（患者主页）', receiver: '接收方：区域平台 / 医联体转诊', metaType: 'META 类型：患者注册（PRN 通知类）', sendTime: '发送时间：2026-10-20 09:42:10', parse: '解析状态：成功（接收方 ACK，字段映射一致）' },
    { id: 'MML-002', msgId: '报文ID：META-20261020-000124（检验结果回传）', sender: '发送方：本院 LIS', receiver: '接收方：区域检验互认平台', metaType: 'META 类型：检验报告（OBR/OBX 段）', sendTime: '发送时间：2026-10-20 09:45:33', parse: '解析状态：成功（互认标识已携带）' },
    { id: 'MML-003', msgId: '报文ID：META-20261020-000125（检查影像摘要）', sender: '发送方：本院 PACS', receiver: '接收方：区域影像共享平台', metaType: 'META 类型：影像报告摘要（不含大影像文件）', sendTime: '发送时间：2026-10-20 09:48:02', parse: '解析状态：部分成功（1 项参考值字典映射待对齐）' },
    { id: 'MML-004', msgId: '报文ID：META-20261020-000126（出院小结推送）', sender: '发送方：本院 EMR', receiver: '接收方：区域健康档案平台', metaType: 'META 类型：出院记录（DOC 结构化）', sendTime: '发送时间：2026-10-20 09:51:47', parse: '解析状态：成功（归档完成）' },
    { id: 'MML-005', msgId: '报文ID：META-20261020-000127（转诊请求）', sender: '发送方：合作基层医疗机构', receiver: '接收方：本院预约转诊台', metaType: 'META 类型：上转申请（Referral 类）', sendTime: '发送时间：2026-10-20 09:55:19', parse: '解析状态：待处理（本院已收到，待预约）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/interop/resource-catalog - 互联互通资源目录（资源编码/资源名/提供方/订阅方/状态）5 条 */
async function handleResourceCatalog(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'RSC-001', code: '资源编码：RES-PAT-BASIC-01', name: '资源名：患者基本信息查询服务', provider: '提供方：本院 HIS（患者主页域）', subscriber: '订阅方：区域平台、医联体、基层转诊台', status: '状态：已上线（版本 v2.1，SLA 99.9%）' },
    { id: 'RSC-002', code: '资源编码：RES-LAB-RPT-02', name: '资源名：检验报告查询/回传服务', provider: '提供方：本院 LIS', subscriber: '订阅方：区域互认平台、互联网医院', status: '状态：已上线（互认标识已携带）' },
    { id: 'RSC-003', code: '资源编码：RES-IMG-SUM-03', name: '资源名：影像报告摘要服务', provider: '提供方：本院 PACS', subscriber: '订阅方：区域影像共享、临床协同', status: '状态：灰度（字典映射待对齐，部分字段受限）' },
    { id: 'RSC-004', code: '资源编码：RES-EMR-DISCH-04', name: '资源名：出院记录/小结归档服务', provider: '提供方：本院 EMR', subscriber: '订阅方：区域健康档案、慢病随访平台', status: '状态：已上线（按权限脱敏）' },
    { id: 'RSC-005', code: '资源编码：RES-APPT-REF-05', name: '资源名：预约转诊号源协调服务', provider: '提供方：本院预约中心', subscriber: '订阅方：基层上转平台、互联网医院', status: '状态：待发布（本月灰度后上线）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/emr/level5-gaps - 电子病历五级对照项缺口清单（评级项/等级要求/当前状态/缺口说明/整改优先级）5 条 */
async function handleEmrLevel5Gaps(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'LV5-001', item: '评级项：全院信息集成平台与统一数据中心（五级要求）', requirement: '等级要求：五级（统一视图、跨系统数据贯通）', current: '当前状态：集成平台已建，数据中心部分贯通', gap: '缺口说明：医技-医嘱闭环数据尚有 2 个未完全回填，影响单病例全程视图', priority: '整改优先级：P0（本月内补齐闭环回填）' },
    { id: 'LV5-002', item: '评级项：临床决策支持系统 CDS 深度嵌入', requirement: '等级要求：五级（规则主动推送、闭环反馈）', current: '当前状态：CDS 已上线，部分规则仅提示未闭环', gap: '缺口说明：合理用药规则反馈闭环未完全留痕，需干预-确认链路', priority: '整改优先级：P0（本季度补齐闭环留痕）' },
    { id: 'LV5-003', item: '评级项：病历内涵质控与智能化辅助', requirement: '等级要求：五级（智能质控、缺陷闭环）', current: '当前状态：人工+部分规则质控', gap: '缺口说明：内涵质控（诊断符合率、用药合理性）智能辅助覆盖不足', priority: '整改优先级：P1（下阶段）' },
    { id: 'LV5-004', item: '评级项：互联互通标准化成熟度对接', requirement: '等级要求：五级（数据标准化、术语统一）', current: '当前状态：术语字典部分对齐', gap: '缺口说明：局部字典映射与区域标准不一致（影像参考值 1 项）', priority: '整改优先级：P1（随资源目录迭代对齐）' },
    { id: 'LV5-005', item: '评级项：患者全程视图（360）与权限审计', requirement: '等级要求：五级（跨域视图、留痕可审计）', current: '当前状态：患者 360 已上线，审计留痕齐备', gap: '缺口说明：跨域权限委托场景审计模板待完善', priority: '整改优先级：P2（常规优化）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/nqi/near-miss - 护理不良事件漏报/根因（事件类型/科室/上报数/漏报估计/根因归类）5 条 */
async function handleNqiNearMiss(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'NQN-001', type: '事件类型：给药差错（隐患/无伤害）', dept: '科室：内科病区汇总', reported: '上报数：5 起（本月，主动上报）', underreport: '漏报估计：约 2 起（随访/交接班复盘推断，未计入上报）', cause: '根因归类：双人核对未落到床旁 + 相似药摆放相邻' },
    { id: 'NQN-002', type: '事件类型：跌倒（高危未发生）', dept: '科室：老年/骨科病区', reported: '上报数：3 起（含 1 起隐患拦截）', underreport: '漏报估计：约 1 起（未跌倒但助行/陪护未落实）', cause: '根因归类：跌倒评估后干预衔接断档 + 夜班设施不足' },
    { id: 'NQN-003', type: '事件类型：管路滑脱（未发生，预防）', dept: '科室：ICU/神外', reported: '上报数：2 起（实际滑脱）', underreport: '漏报估计：接近 0（监护区监控完备）', cause: '根因归类：躁动期固定失效，镇静评分未联动巡检' },
    { id: 'NQN-004', type: '事件类型：标本错标/未达', dept: '科室：门诊采血 + 病区送检', reported: '上报数：2 起（均拦截）', underreport: '漏报估计：约 1 起（延误送检未登记）', cause: '根因归类：单人贴标 + 条码闭环未上线（过渡期）' },
    { id: 'NQN-005', type: '事件类型：压疮（院外带入误计）', dept: '科室：老年/内科', reported: '上报数：4 例（含 2 例院外带入）', underreport: '漏报估计：院外带入识别较准，漏报低', cause: '根因归类：入院评估时带入属性标注需统一，避免误计院内发生' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/interop/consistency-score - 互联互通一致性测评评分（测评域/标准项/得分/满分/达标率）5 条 */
async function handleConsistencyScore(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'CNS-001', domain: '测评域：基础资源（患者/医护/机构主索引）', item: '标准项：主数据一致性与复用', score: '得分：92 / 100', full: '满分：100', pass: '达标率：92%（四甲目标 ≥90%，已达标）' },
    { id: 'CNS-002', domain: '测评域：数据标准化（术语/字典映射）', item: '标准项：本地字典与国家标准映射完整度', score: '得分：86 / 100', full: '满分：100', pass: '达标率：86%（待影像参考值等 2 项对齐，目标 90%）' },
    { id: 'CNS-003', domain: '测评域：平台服务（资源目录与接口）', item: '标准项：服务目录发布与 SLA 达成', score: '得分：94 / 100', full: '满分：100', pass: '达标率：94%（已上线资源 SLA 稳定）' },
    { id: 'CNS-004', domain: '测评域：网络安全与隐私', item: '标准项：传输加密/权限审计/脱敏', score: '得分：95 / 100', full: '满分：100', pass: '达标率：95%（合规基线齐备）' },
    { id: 'CNS-005', domain: '测评域：应用效果（跨域协同）', item: '标准项：转诊/互认/影像共享实际应用', score: '得分：88 / 100', full: '满分：100', pass: '达标率：88%（预约转诊资源待发布后提升）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m471Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/nqi/incidence', handle: handleNqiIncidence, auth: true },
  { method: 'GET', path: '/api/v1/interop/meta-msg-log', handle: handleMetaMsgLog, auth: true },
  { method: 'GET', path: '/api/v1/interop/resource-catalog', handle: handleResourceCatalog, auth: true },
  { method: 'GET', path: '/api/v1/emr/level5-gaps', handle: handleEmrLevel5Gaps, auth: true },
  { method: 'GET', path: '/api/v1/nqi/near-miss', handle: handleNqiNearMiss, auth: true },
  { method: 'GET', path: '/api/v1/interop/consistency-score', handle: handleConsistencyScore, auth: true },
];
