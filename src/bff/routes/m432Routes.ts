/**
 * 健澜科技 jlmedaios - M432 互联互通四甲深度打磨（interop）
 *
 * 平台消息交换/共享数据字典/接口注册目录/跨院患者索引EMPI/调用审计/质量评分
 * DEMO_MODE 下返回 mock 数据。对标国家医疗健康信息互联互通标准化成熟度四级甲等。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/interop/messages - 平台消息交换记录（消息ID/类型/源系统/目标系统/状态/时间）5 条 */
async function handleInteropMessages(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'IMSG-001', msgId: '消息ID：MSG-20261020-0001（HL7 v2.5 ADT^A01 入院通知）', msgType: '类型：患者入院事件（ADT 入院登记）', source: '源系统：本院 HIS（10.20.1.11）', target: '目标系统：区域卫生信息平台 / EMR / LIS / PACS', status: '状态：已送达（ACK 确认，无重发）', time: '时间：2026-10-20 08:32:14' },
    { id: 'IMSG-002', msgId: '消息ID：MSG-20261020-0002（CDA 出院摘要 XML）', msgType: '类型：文档交换（出院小结 CDA R2）', source: '源系统：本院 EMR（10.20.1.21）', target: '目标系统：区域平台 + 医保结算系统', status: '状态：已送达（XML 校验通过，签章有效）', time: '时间：2026-10-20 09:10:48' },
    { id: 'IMSG-003', msgId: '消息ID：MSG-20261020-0003（HL7 ORU 检验结果回传）', msgType: '类型：检验结果（ORU^R01 报告）', source: '源系统：本院 LIS（10.20.1.31）', target: '目标系统：区域平台 / 电子病历', status: '状态：已送达（结果字段映射一致）', time: '时间：2026-10-20 09:45:03' },
    { id: 'IMSG-004', msgId: '消息ID：MSG-20261020-0004（影像检查报告 DICOM SR）', msgType: '类型：检查报告（PACS 结构化报告）', source: '源系统：本院 PACS（10.20.1.41）', target: '目标系统：区域平台 / 上级转诊医院', status: '状态：重发 1 次后送达（首次网络超时，重试成功）', time: '时间：2026-10-20 10:18:37' },
    { id: 'IMSG-005', msgId: '消息ID：MSG-20261020-0005（HL7 ADT^A03 出院通知）', msgType: '类型：患者出院事件（ADT 出院登记）', source: '源系统：本院 HIS（10.20.1.11）', target: '目标系统：区域平台 / 结算 / 随访系统', status: '状态：已送达（ACK 确认，闭环完成）', time: '时间：2026-10-20 11:02:20' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/interop/data-dictionary - 共享数据字典（字典项/标准编码/本地编码/映射/版本）5 条 */
async function handleInteropDataDictionary(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'IDD-001', dictItem: '字典项：性别（AdministrativeGender）', stdCode: '标准编码：HL7 FHIR AdministrativeGender（M/F/U/OTH）', localCode: '本地编码：HIS 字典 XB-01（1=男,2=女,9=未知）', mapping: '映射：1→M，2→F，9→U（一对一直转，无歧义）', version: '版本：国标 WH03.01.003 / 字典 v2.4' },
    { id: 'IDD-002', dictItem: '字典项：ICD-10 疾病诊断编码', stdCode: '标准编码：ICD-10 国标临床版 2.0（I21.4 等）', localCode: '本地编码：本院诊断库 DZ-07（内部拼音首字母+扩展码）', mapping: '映射：本地码经对照表转国标 ICD-10，覆盖率 98.6%', version: '版本：ICD-10 临床版 v2.0 / 对照表 v12' },
    { id: 'IDD-003', dictItem: '字典项：手术操作编码（ICD-9-CM-3）', stdCode: '标准编码：ICD-9-CM-3 国标临床版（81.51 等）', localCode: '本地编码：本院手术库 SS-03', mapping: '映射：本地手术名→国标编码，人工+自动双映射，覆盖率 97.2%', version: '版本：ICD-9-CM-3 v2.0 / 对照表 v11' },
    { id: 'IDD-004', dictItem: '字典项：药品编码（国家医保药品目录）', stdCode: '标准编码：医保药品编码（2026 版，乙/甲类）', localCode: '本地编码：本院药品库 YP-11（院内商品名+规格码）', mapping: '映射：通用名+规格+厂家三要素匹配，集采药品单独标识', version: '版本：医保药品目录 2026 版 / 对照表 v8' },
    { id: 'IDD-005', dictItem: '字典项：生命体征观察项（LOINC）', stdCode: '标准编码：LOINC（8480-6 收缩压 / 8462-4 舒张压）', localCode: '本地编码：护理评估库 VS-02', mapping: '映射：护理记录项映射 LOINC，供区域数据汇聚使用', version: '版本：LOINC 2.72 / 对照表 v5' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/interop/registry - 接口注册目录（接口名/标准协议/提供方/调用量/状态）5 条 */
async function handleInteropRegistry(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'IRE-001', apiName: '接口名：患者基本信息查询（GetPatientInfo）', protocol: '标准协议：HL7 FHIR R4 /Patient 只读 REST', provider: '提供方：本院 EMR 服务总线（10.20.1.21）', callVolume: '调用量：本月 12,600 次（成功率 99.9%）', status: '状态：在线（已注册、鉴权通过、可被授权调用）' },
    { id: 'IRE-002', apiName: '接口名：检验报告查询（GetLabReport）', protocol: '标准协议：FHIR R4 DiagnosticReport / ORU 订阅', provider: '提供方：本院 LIS（10.20.1.31）', callVolume: '调用量：本月 8,400 次（成功率 99.7%）', status: '状态：在线' },
    { id: 'IRE-003', apiName: '接口名：影像报告调阅（GetImagingReport）', protocol: '标准协议：DICOM Web（WADO-RS）+ CDA 摘要', provider: '提供方：本院 PACS（10.20.1.41）', callVolume: '调用量：本月 3,200 次（成功率 99.5%）', status: '状态：在线' },
    { id: 'IRE-004', apiName: '接口名：出院摘要推送（PushDischargeSummary）', protocol: '标准协议：CDA R2 文档 + 消息总线订阅', provider: '提供方：本院 EMR 服务总线', callVolume: '调用量：本月 1,800 次（成功率 100%）', status: '状态：在线（单向推送）' },
    { id: 'IRE-005', apiName: '接口名：跨院患者索引匹配（EMPI Match）', protocol: '标准协议：区域平台 EMPI 服务（HL7 PDQ 扩展）', provider: '提供方：区域卫生信息平台（上级）', callVolume: '调用量：本月 5,600 次（成功率 99.8%）', status: '状态：在线（订阅区域 EMPI 结果）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/interop/patients - 跨院患者索引EMPI（全局ID/院内号集/匹配度/来源/状态）5 条 */
async function handleInteropPatients(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'IPAT-001', globalId: '全局ID：EMPI-GID-8801234567（区域唯一患者标识）', localIds: '院内号集：本院 MRN-2026-001188；市一院 A-33210；社区卫生中心 C-7781', matchScore: '匹配度：99.2%（身份证+姓名+手机号强匹配）', source: '来源：区域 EMPI 主索引合并结果', status: '状态：已合并（同一患者，三院档案关联成功）' },
    { id: 'IPAT-002', globalId: '全局ID：EMPI-GID-8801234568', localIds: '院内号集：本院 MRN-2026-002340；社区卫生中心 C-9012', matchScore: '匹配度：92.0%（姓名+出生日期匹配，证件号缺失待补）', source: '来源：区域 EMPI 概率匹配', status: '状态：待人工复核（低置信，暂未合并）' },
    { id: 'IPAT-003', globalId: '全局ID：EMPI-GID-8801234569', localIds: '院内号集：本院 MRN-2025-11876（唯一，无跨院档案）', matchScore: '匹配度：100%（本院单档案建档）', source: '来源：本院建档上报区域', status: '状态：单档案（无重复，无需合并）' },
    { id: 'IPAT-004', globalId: '全局ID：EMPI-GID-8801234570', localIds: '院内号集：本院 MRN-2026-004512；中医院 Z-5520；妇幼保健院 M-0988', matchScore: '匹配度：96.5%（姓名+性别+出生年月+地址匹配）', source: '来源：区域 EMPI 主索引合并结果', status: '状态：已合并（三院档案关联，就诊史可调阅）' },
    { id: 'IPAT-005', globalId: '全局ID：EMPI-GID-8801234571（疑似重复，待拆分）', localIds: '院内号集：本院 MRN-2026-006671 与 MRN-2026-006672（同姓不同人误并）', matchScore: '匹配度：61.0%（仅同姓+同城，证件不符）', source: '来源：区域 EMPI 自动误合并', status: '状态：待拆分（已发起复核工单，等待拆档）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/interop/audit - 互联互通调用审计（接口/调用方/入参摘要/结果/耗时）5 条 */
async function handleInteropAudit(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'IAU-001', api: '接口：GetPatientInfo（FHIR Patient 查询）', caller: '调用方：区域平台网关（appid=REG-PLAT-01）', paramSummary: '入参摘要：name=张***,birthDate=1961-03-12（脱敏）', result: '结果：200 成功，返回 1 条匹配档案', latency: '耗时：126ms' },
    { id: 'IAU-002', api: '接口：GetLabReport（ORU 检验报告）', caller: '调用方：上级转诊医院（appid=REF-HOSP-03）', paramSummary: '入参摘要：patientId=MRN-2026-001188,reportType=blood-routine', result: '结果：200 成功，返回 3 份报告', latency: '耗时：208ms' },
    { id: 'IAU-003', api: '接口：PushDischargeSummary（CDA 推送）', caller: '调用方：本院 EMR 内部服务（系统发起）', paramSummary: '入参摘要：documentId=CDA-20261020-009,patientId=MRN-2026-002340', result: '结果：200 成功，平台 ACK 确认', latency: '耗时：342ms' },
    { id: 'IAU-004', api: '接口：GetImagingReport（DICOM Web）', caller: '调用方：区域影像调阅中心（appid=IMG-CENTER-02）', paramSummary: '入参摘要：studyUid=1.2.840.xxx,modal=CT', result: '结果：500 超时 1 次后重试成功（首次网络抖动）', latency: '耗时：首试 3200ms 超时 / 重试 410ms' },
    { id: 'IAU-005', api: '接口：EMPI Match（跨院索引）', caller: '调用方：本院 HIS 建档服务（内部）', paramSummary: '入参摘要：idCard=3301**********1234（脱敏）,name=李***', result: '结果：200 成功，返回 1 个全局匹配 ID', latency: '耗时：88ms' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/interop/quality - 互联互通质量评分（维度/得分/目标值/等级/备注）5 条 */
async function handleInteropQuality(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'IQS-001', dimension: '维度：基础设施（网络/服务器/安全域）', score: '得分：96.0 分', target: '目标值：≥90 分（四甲要求）', grade: '等级：达标（优秀）', note: '备注：双链路冗余、等保三级，满足四甲' },
    { id: 'IQS-002', dimension: '维度：数据标准化（字典映射/编码统一）', score: '得分：94.5 分', target: '目标值：≥90 分', grade: '等级：达标（优秀）', note: '备注：主数据字典覆盖率 98.6%，ICD/LOINC 映射完善' },
    { id: 'IQS-003', dimension: '维度：互联互通业务应用（跨院调阅/协作）', score: '得分：92.0 分', target: '目标值：≥85 分', grade: '等级：达标（良好）', note: '备注：跨院就诊调阅、检验结果互认已上线' },
    { id: 'IQS-004', dimension: '维度：平台安全（鉴权/审计/脱敏）', score: '得分：95.0 分', target: '目标值：≥90 分', grade: '等级：达标（优秀）', note: '备注：OAuth2 鉴权、全量调用审计、出参脱敏齐备' },
    { id: 'IQS-005', dimension: '维度：综合成熟度（四甲综合）', score: '得分：93.1 分（加权总分）', target: '目标值：四级甲等 ≥90 分', grade: '等级：达到四级甲等', note: '备注：五维加权综合 93.1 分，满足互联互通四级甲等评审要求' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m432Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/interop/messages', handle: handleInteropMessages, auth: true },
  { method: 'GET', path: '/api/v1/interop/data-dictionary', handle: handleInteropDataDictionary, auth: true },
  { method: 'GET', path: '/api/v1/interop/registry', handle: handleInteropRegistry, auth: true },
  { method: 'GET', path: '/api/v1/interop/patients', handle: handleInteropPatients, auth: true },
  { method: 'GET', path: '/api/v1/interop/audit', handle: handleInteropAudit, auth: true },
  { method: 'GET', path: '/api/v1/interop/quality', handle: handleInteropQuality, auth: true },
];
