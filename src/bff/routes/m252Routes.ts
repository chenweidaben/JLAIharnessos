/**
 * 健澜科技 jlmedaios - M252 FHIR 扩展 + 患者 360 深化
 *
 * FHIR Location/Practitioner/Organization + 患者 360 概览/时间线/风险评估
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/* ==================== 一、FHIR 扩展资源 ==================== */

/** GET /api/v1/fhir/location - FHIR Location 资源 5 条 */
async function handleFhirLocation(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const locations = [
    { resourceType: 'Location', id: 'LOC-001', department: '心内科', ward: '心内科一病区', bedCount: 40, status: 'active' },
    { resourceType: 'Location', id: 'LOC-002', department: '内分泌科', ward: '内分泌科病区', bedCount: 30, status: 'active' },
    { resourceType: 'Location', id: 'LOC-003', department: '急诊医学科', ward: '急诊抢救室', bedCount: 12, status: 'active' },
    { resourceType: 'Location', id: 'LOC-004', department: '骨科', ward: '骨科一病区', bedCount: 35, status: 'active' },
    { resourceType: 'Location', id: 'LOC-005', department: '老年医学科', ward: '老年科病区（改造中）', bedCount: 20, status: 'inactive' },
  ];

  return json(ok({ resourceType: 'Bundle', type: 'searchset', total: locations.length, entry: locations }));
}

/** GET /api/v1/fhir/practitioner - FHIR Practitioner 资源 5 条 */
async function handleFhirPractitioner(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const practitioners = [
    { resourceType: 'Practitioner', id: 'PRAC-001', name: '李***', department: '心内科', title: '主任医师', licenseNo: '1103300001***' },
    { resourceType: 'Practitioner', id: 'PRAC-002', name: '王***', department: '急诊医学科', title: '副主任医师', licenseNo: '1103300002***' },
    { resourceType: 'Practitioner', id: 'PRAC-003', name: '赵***', department: '内分泌科', title: '副主任医师', licenseNo: '1103300003***' },
    { resourceType: 'Practitioner', id: 'PRAC-004', name: '陈***', department: '骨科', title: '主治医师', licenseNo: '1103300004***' },
    { resourceType: 'Practitioner', id: 'PRAC-005', name: '刘***', department: '护理部', title: '护士长', licenseNo: '2003300001***' },
  ];

  return json(ok({ resourceType: 'Bundle', type: 'searchset', total: practitioners.length, entry: practitioners }));
}

/** GET /api/v1/fhir/organization - FHIR Organization 资源 5 条 */
async function handleFhirOrganization(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const orgs = [
    { resourceType: 'Organization', id: 'ORG-001', hospital: '杭州健澜医院（总院）', department: '院本部', type: '三级综合医院', address: '浙江省杭州市西湖区文三路***', phone: '0571-8800****' },
    { resourceType: 'Organization', id: 'ORG-002', hospital: '杭州健澜医院（滨江院区）', department: '滨江区', type: '分院', address: '浙江省杭州市滨江区江南大道***', phone: '0571-8600****' },
    { resourceType: 'Organization', id: 'ORG-003', hospital: '杭州健澜医院（心内科）', department: '心内科', type: '临床科室', address: '总院住院楼 5F', phone: '0571-8800-5001' },
    { resourceType: 'Organization', id: 'ORG-004', hospital: '杭州健澜医院（检验科）', department: '检验科', type: '医技科室', address: '总院门诊楼 3F', phone: '0571-8800-3002' },
    { resourceType: 'Organization', id: 'ORG-005', hospital: '杭州健澜互联网医院', department: '线上诊疗', type: '互联网医院', address: '线上（https://health.jianlan.example.cn）', phone: '400-888-****' },
  ];

  return json(ok({ resourceType: 'Bundle', type: 'searchset', total: orgs.length, entry: orgs }));
}

/* ==================== 二、患者 360 深化 ==================== */

/** GET /api/v1/patient/360-overview - 患者 360 概览 */
async function handlePatient360Overview(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const overview = {
    patient: { id: 'P-001', name: '张***', gender: '男', age: 68, mrn: 'MRN-100451' },
    diagnoses: [
      { code: 'I25.101', name: '冠状动脉粥样硬化性心脏病', severity: '中度' },
      { code: 'I10.x05', name: '高血压 2 级（很高危）', severity: '中度' },
    ],
    medications: [
      { name: '阿司匹林肠溶片', dosage: '100mg po qd' },
      { name: '阿托伐他汀钙片', dosage: '20mg po qn' },
    ],
    imaging: [
      { name: '胸部 CT（平扫）', date: '2026-10-20', result: '未见明显异常' },
    ],
    labs: [
      { name: '血常规', date: '2026-10-20', result: 'WBC 6.5，Hb 135，均正常' },
    ],
  };

  return json(ok(overview));
}

/** GET /api/v1/patient/360-timeline - 患者 360 时间线 5 条 */
async function handlePatient360Timeline(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const timeline = [
    { id: 'PT-001', type: '出院', time: '2026-10-10 10:00', dept: '心内科', desc: '上次住院出院，诊断：不稳定型心绞痛' },
    { id: 'PT-002', type: '手术', time: '2026-10-18 14:00', dept: '心内科', desc: '冠脉造影（CAG）+ 支架植入（PCI）' },
    { id: 'PT-003', type: '用药', time: '2026-10-20 09:30', dept: '心内科', desc: '开具阿司匹林 100mg qd + 阿托伐他汀 20mg qn' },
    { id: 'PT-004', type: '检查', time: '2026-10-20 09:00', dept: '放射科', desc: '胸部 CT（平扫），未见明显异常' },
    { id: 'PT-005', type: '就诊', time: '2026-10-20 08:30', dept: '心内科', desc: '门诊就诊，主诉胸闷 3 天' },
  ];

  return json(ok({ timeline, totalCount: timeline.length }));
}

/** GET /api/v1/patient/360-risk - 患者风险评估 */
async function handlePatient360Risk(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const risk = {
    patient: '张***（P-001）',
    riskLevel: '中',
    comorbidityCount: 2,
    readmissionRiskScore: 0.32,
    readmissionRiskLevel: '中（30 天再入院概率约 32%）',
    recommendedActions: [
      '出院后 7 天内心内科门诊随访',
      '继续双联抗血小板治疗（DAPT）12 个月',
      '控制血压 < 130/80mmHg',
      '低脂饮食 + 适量运动',
    ],
  };

  return json(ok(risk));
}

export const m252Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/fhir/location', handle: handleFhirLocation, auth: true },
  { method: 'GET', path: '/api/v1/fhir/practitioner', handle: handleFhirPractitioner, auth: true },
  { method: 'GET', path: '/api/v1/fhir/organization', handle: handleFhirOrganization, auth: true },
  { method: 'GET', path: '/api/v1/patient/360-overview', handle: handlePatient360Overview, auth: true },
  { method: 'GET', path: '/api/v1/patient/360-timeline', handle: handlePatient360Timeline, auth: true },
  { method: 'GET', path: '/api/v1/patient/360-risk', handle: handlePatient360Risk, auth: true },
];
