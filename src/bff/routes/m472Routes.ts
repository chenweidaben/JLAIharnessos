/**
 * 健澜科技 jlmedaios - M472 P0 合规：电子病历五级评审条款 / 互联互通接口目录 / 病案科质控监管日志
 *
 * 电子病历五级评审条款明细 / 互联互通接口清单 / 病案科质控监管日志
 * （patient/complaints、patient/satisfaction、quality/adverse-events 已存在，不重复建）。
 * 避开 M471 各端点、M466 /incident/*、M433 satisfaction、M448 病历留痕、/outpatient/* 路由。
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/emr/grade5-items - 电子病历五级评审条款明细（条款号/评审项/要求/当前达成/证据位置）5 条 */
async function handleEmrGrade5Items(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'G5I-001', clause: '条款号：4.1.1（电子病历五级·医疗业务一体化）', item: '评审项：医嘱与病历闭环、全流程数字化', requirement: '要求：医嘱开立-执行-回写全闭环，病历结构化率达标', current: '当前达成：已达成（医嘱闭环率 96%，结构化病历覆盖主要病种）', evidence: '证据位置：EMR 闭环报表 + 抽样病历集（病案室归档）' },
    { id: 'G5I-002', clause: '条款号：4.2.3（临床决策支持深度）', item: '评审项：CDS 主动推送与闭环反馈', requirement: '要求：合理用药/检验危急值等规则主动干预并留痕', current: '当前达成：基本达成（规则已推送，部分闭环反馈待补齐）', evidence: '证据位置：CDS 干预日志 + 药师审核留痕记录' },
    { id: 'G5I-003', clause: '条款号：4.3.2（数据质量与标准化）', item: '评审项：术语字典与国家标化一致', requirement: '要求：诊断/手术术语与国家标准映射率 ≥95%', current: '当前达成：达成（ICD 映射率 97.2%）', evidence: '证据位置：术语映射表 + 月度质控抽检报告' },
    { id: 'G5I-004', clause: '条款号：4.4.1（患者全程视图）', item: '评审项：跨域患者 360 与权限审计', requirement: '要求：跨域视图可溯、操作审计完整', current: '当前达成：达成（患者 360 上线，审计日志可查）', evidence: '证据位置：患者 360 视图截图 + 审计导出样本' },
    { id: 'G5I-005', clause: '条款号：4.5.2（移动与闭环应用）', item: '评审项：移动护理/床旁执行闭环', requirement: '要求：床旁扫码执行、体征采集闭环留痕', current: '当前达成：达成（病区 PDA 覆盖主要病区）', evidence: '证据位置：护理执行闭环统计 + 床旁操作日志' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/interop/interface-list - 互联互通接口清单（接口编码/名称/提供方/调用方/协议/状态）5 条 */
async function handleInteropInterfaceList(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'IFL-001', code: '接口编码：IF-PAT-QUERY-01', name: '名称：患者基本信息查询接口', provider: '提供方：本院 HIS 患者主页域', consumer: '调用方：区域平台、医联体', protocol: '协议：FHIR R4（REST/JSON + OAuth2 鉴权）', status: '状态：已上线（SLA 99.9%，版本 v2.1）' },
    { id: 'IFL-002', code: '接口编码：IF-LAB-RPT-02', name: '名称：检验报告查询/回传接口', provider: '提供方：本院 LIS', consumer: '调用方：区域互认平台、互联网医院', protocol: '协议：HL7 v2.x + 区域消息总线', status: '状态：已上线（互认标识已携带）' },
    { id: 'IFL-003', code: '接口编码：IF-IMG-SUM-03', name: '名称：影像报告摘要接口', provider: '提供方：本院 PACS', consumer: '调用方：区域影像共享、临床协同', protocol: '协议：FHIR DocumentReference + DICOM Web', status: '状态：灰度（字典映射待对齐，部分字段受限）' },
    { id: 'IFL-004', code: '接口编码：IF-EMR-DISCH-04', name: '名称：出院记录归档接口', provider: '提供方：本院 EMR', consumer: '调用方：区域健康档案、慢病随访', protocol: '协议：FHIR Bundle + 权限脱敏网关', status: '状态：已上线（按权限脱敏输出）' },
    { id: 'IFL-005', code: '接口编码：IF-APPT-REF-05', name: '名称：预约转诊号源接口', provider: '提供方：本院预约中心', consumer: '调用方：基层上转平台、互联网医院', protocol: '协议：REST/JSON + 号源同步定时任务', status: '状态：待发布（本月灰度后转正式）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/emr/supervision-log - 病案科质控监管日志（监管日期/监管项/问题数/整改要求/检查人）5 条 */
async function handleEmrSupervisionLog(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'SVL-001', date: '监管日期：2026-10-18', item: '监管项：出院病历 7 日归档率与内涵质控', problems: '问题数：抽查 60 份，缺陷 4 份（书写不完整 3、诊断不规范 1）', rectify: '整改要求：相关医师 3 日内补全，病区质控员复核', checker: '检查人：病案科 王***（质控医师）' },
    { id: 'SVL-002', date: '监管日期：2026-10-15', item: '监管项：手术知情同意与手术记录一致性', problems: '问题数：抽查 20 台，缺陷 1 份（手术记录时间与麻醉衔接偏差）', rectify: '整改要求：完善手术记录书写时限规范', checker: '检查人：病案科 李*** + 医务部' },
    { id: 'SVL-003', date: '监管日期：2026-10-12', item: '监管项：病案首页主要诊断选择正确性', problems: '问题数：抽查 80 份，缺陷 6 份（主诊选择偏误影响 DRG 分组）', rectify: '整改要求：开展主诊选择专项培训，编码员复核前置', checker: '检查人：病案编码组 张***' },
    { id: 'SVL-004', date: '监管日期：2026-10-08', item: '监管项：危急值闭环在病历中的留痕', problems: '问题数：抽查 15 例危急值，2 例病程记录未体现处置', rectify: '整改要求：危急值处置必须入病程，纳入科室月度考核', checker: '检查人：病案科 + 质控科联合' },
    { id: 'SVL-005', date: '监管日期：2026-10-05', item: '监管项：传染病/肿瘤报告卡及时性', problems: '问题数：本月应报 23 例，迟报 1 例（超 24h）', rectify: '整改要求：强化报告卡时效提醒，漏迟报纳入绩效', checker: '检查人：病案科 陈***（传染病管理岗）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m472Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/emr/grade5-items', handle: handleEmrGrade5Items, auth: true },
  { method: 'GET', path: '/api/v1/interop/interface-list', handle: handleInteropInterfaceList, auth: true },
  { method: 'GET', path: '/api/v1/emr/supervision-log', handle: handleEmrSupervisionLog, auth: true },
];
