/**
 * 健澜科技 jlmedaios - M377 P1 业务扩展：病历管理深度打磨
 *
 * 模板详情/病历质控/病历检索/病历归档（补缺失）
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/emr/templates-detail - 模板详情 5 条 */
async function handleEmrTemplatesDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'ETD-001', templateName: '入院记录模板（标准版）', fieldCount: '25 个字段', chapters: '一般项目 + 主诉 + 现病史 + 既往史 + 个人史 + 家族史 + 体格检查 + 辅助检查 + 初步诊断', applicableDept: '全院通用', version: 'v2.1（2026-01-01 发布）' },
    { id: 'ETD-002', templateName: '首次病程记录模板（标准版）', fieldCount: '15 个字段', chapters: '病例特点 + 初步诊断 + 诊断依据 + 鉴别诊断 + 诊疗计划', applicableDept: '全院通用', version: 'v2.0（2026-01-01 发布）' },
    { id: 'ETD-003', templateName: '手术记录模板（标准版）', fieldCount: '20 个字段', chapters: '一般项目 + 术前诊断 + 术后诊断 + 手术名称 + 术者 + 麻醉方式 + 手术经过 + 术中出血 + 标本处理', applicableDept: '外科系统', version: 'v1.5（2026-03-01 发布）' },
    { id: 'ETD-004', templateName: '出院记录模板（标准版）', fieldCount: '18 个字段', chapters: '入院时间 + 出院时间 + 入院诊断 + 出院诊断 + 住院经过 + 出院情况 + 出院医嘱', applicableDept: '全院通用', version: 'v2.0（2026-01-01 发布）' },
    { id: 'ETD-005', templateName: '会诊记录模板（标准版）', fieldCount: '10 个字段', chapters: '会诊时间 + 会诊科室 + 会诊医师 + 病情摘要 + 会诊意见', applicableDept: '全院通用', version: 'v1.0（2026-01-01 发布）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/emr/quality-check - 病历质控 5 条 */
async function handleEmrQualityCheck(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'EQC-001', medicalRecordId: 'MR-2026-1001（张***的入院记录）', checkItem: '入院记录完整性检查（24 小时内完成）', result: '不通过（入院记录在入院后 36 小时才完成）', issue: '入院记录超时完成（超过 24 小时）', doctor: '质控科主治医师李***' },
    { id: 'EQC-002', medicalRecordId: 'MR-2026-1002（李***的首次病程记录）', checkItem: '首次病程记录及时性检查（8 小时内完成）', result: '不通过（首次病程记录在入院后 12 小时才完成）', issue: '首次病程记录超时完成（超过 8 小时）', doctor: '质控科主治医师赵***' },
    { id: 'EQC-003', medicalRecordId: 'MR-2026-1003（王***的手术记录）', checkItem: '手术记录完整性检查（术后 24 小时内完成）', result: '通过（手术记录在术后 12 小时完成）', issue: '无（手术记录完整、及时）', doctor: '质控科主治医师孙***' },
    { id: 'EQC-004', medicalRecordId: 'MR-2026-1004（刘***的出院记录）', checkItem: '出院记录完整性检查（出院 24 小时内完成）', result: '不通过（出院记录在出院后 48 小时才完成）', issue: '出院记录超时完成（超过 24 小时）', doctor: '质控科主治医师周***' },
    { id: 'EQC-005', medicalRecordId: 'MR-2026-1005（陈***的会诊记录）', checkItem: '会诊记录及时性检查（会诊后 24 小时内完成）', result: '通过（会诊记录在会诊后 12 小时完成）', issue: '无（会诊记录完整、及时）', doctor: '质控科主治医师吴***' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/emr/retrieval - 病历检索 5 条 */
async function handleEmrRetrieval(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'ER-001', patientName: '张***（55 岁男性）', searchCondition: '按患者姓名 + 住院号检索（住院号：ZY2026001）', resultCount: '5 份病历（入院记录 + 首次病程记录 + 日常病程记录 + 手术记录 + 出院记录）', time: '2026-10-20 09:00:00（检索时间）', status: '检索成功（找到 5 份病历）' },
    { id: 'ER-002', patientName: '李***（60 岁女性）', searchCondition: '按患者姓名 + 出院时间检索（出院时间：2026-10-01）', resultCount: '3 份病历（入院记录 + 日常病程记录 + 出院记录）', time: '2026-10-20 10:00:00（检索时间）', status: '检索成功（找到 3 份病历）' },
    { id: 'ER-003', patientName: '王***（65 岁男性）', searchCondition: '按患者姓名 + 手术名称检索（手术名称：胆囊切除术）', resultCount: '2 份病历（手术记录 + 出院记录）', time: '2026-10-20 11:00:00（检索时间）', status: '检索成功（找到 2 份病历）' },
    { id: 'ER-004', patientName: '刘***（70 岁女性）', searchCondition: '按患者姓名 + 诊断检索（诊断：2 型糖尿病）', resultCount: '4 份病历（入院记录 + 日常病程记录 + 会诊记录 + 出院记录）', time: '2026-10-20 14:00:00（检索时间）', status: '检索成功（找到 4 份病历）' },
    { id: 'ER-005', patientName: '陈***（50 岁男性）', searchCondition: '按患者姓名 + 科室检索（科室：心内科）', resultCount: '6 份病历（入院记录 + 首次病程记录 + 日常病程记录 + 会诊记录 + 手术记录 + 出院记录）', time: '2026-10-20 15:00:00（检索时间）', status: '检索成功（找到 6 份病历）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/emr/archive - 病历归档 5 条 */
async function handleEmrArchive(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'EA-001', medicalRecordId: 'MR-2026-1001（张***的住院病历）', archiveTime: '2026-10-15 10:00:00（归档时间）', status: '已归档（病历完整、已签字）', storageLocation: '医院病案室（第 3 档案柜，第 15 层）', doctor: '住院医师李***' },
    { id: 'EA-002', medicalRecordId: 'MR-2026-1002（李***的住院病历）', archiveTime: '2026-10-16 14:00:00（归档时间）', status: '已归档（病历完整、已签字）', storageLocation: '医院病案室（第 3 档案柜，第 16 层）', doctor: '住院医师赵***' },
    { id: 'EA-003', medicalRecordId: 'MR-2026-1003（王***的住院病历）', archiveTime: '2026-10-17 09:00:00（归档时间）', status: '已归档（病历完整、已签字）', storageLocation: '医院病案室（第 4 档案柜，第 1 层）', doctor: '住院医师孙***' },
    { id: 'EA-004', medicalRecordId: 'MR-2026-1004（刘***的住院病历）', archiveTime: '2026-10-18 11:00:00（归档时间）', status: '已归档（病历完整、已签字）', storageLocation: '医院病案室（第 4 档案柜，第 2 层）', doctor: '住院医师周***' },
    { id: 'EA-005', medicalRecordId: 'MR-2026-1005（陈***的住院病历）', archiveTime: '2026-10-19 16:00:00（归档时间）', status: '已归档（病历完整、已签字）', storageLocation: '医院病案室（第 4 档案柜，第 3 层）', doctor: '住院医师吴***' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m377Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/emr/templates-detail', handle: handleEmrTemplatesDetail, auth: true },
  { method: 'GET', path: '/api/v1/emr/quality-check', handle: handleEmrQualityCheck, auth: true },
  { method: 'GET', path: '/api/v1/emr/retrieval', handle: handleEmrRetrieval, auth: true },
  { method: 'GET', path: '/api/v1/emr/archive', handle: handleEmrArchive, auth: true },
];
