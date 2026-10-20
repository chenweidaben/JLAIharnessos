/**
 * 健澜科技 jlmedaios - M309 社区医疗域
 *
 * 居民健康档案/家庭医生签约/预防接种/慢病管理/健康教育
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/community/residents - 居民健康档案 5 条 */
async function handleCommunityResidents(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'CR-001', name: '王***', gender: '男', age: 65, address: '余杭区某某街道某某社区 1-1-101', healthStatus: '高血压+糖尿病（控制尚可）' },
    { id: 'CR-002', name: '李***', gender: '女', age: 58, address: '余杭区某某街道某某社区 2-3-202', healthStatus: '健康（定期体检）' },
    { id: 'CR-003', name: '张***', gender: '男', age: 72, address: '余杭区某某街道某某社区 3-5-301', healthStatus: '冠心病+脑梗后遗症（需康复）' },
    { id: 'CR-004', name: '赵***', gender: '女', age: 35, address: '余杭区某某街道某某社区 4-2-102', healthStatus: '健康（产后恢复中）' },
    { id: 'CR-005', name: '孙***', gender: '男', age: 8, address: '余杭区某某街道某某社区 5-1-501', healthStatus: '健康（儿童保健中）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/community/family-doctor - 家庭医生签约 5 条 */
async function handleCommunityFamilyDoctor(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'CFD-001', resident: '王***', doctor: '陈***主治医师（社区卫生服务中心）', signDate: '2025-06-01', serviceContent: '慢病随访+健康指导+优先转诊', status: '服务中' },
    { id: 'CFD-002', resident: '李***', doctor: '刘***主治医师（社区卫生服务中心）', signDate: '2026-01-15', serviceContent: '定期体检+健康咨询', status: '服务中' },
    { id: 'CFD-003', resident: '张***', doctor: '王***副主任医师（社区卫生服务中心）', signDate: '2024-09-01', serviceContent: '慢病管理+康复指导+上门访视', status: '服务中（已续约）' },
    { id: 'CFD-004', resident: '赵***', doctor: '周***主治医师（社区卫生服务中心）', signDate: '2026-03-20', serviceContent: '产后访视+儿童保健指导', status: '服务中' },
    { id: 'CFD-005', resident: '孙***（儿童）', doctor: '儿科 吴***主治医师（社区卫生服务中心）', signDate: '2026-01-01', serviceContent: '预防接种+生长发育监测', status: '服务中' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/community/vaccination - 预防接种 5 条 */
async function handleCommunityVaccination(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'CV-001', person: '孙***（8 岁）', vaccine: '流感疫苗（灭活）', dose: '第 1 剂', time: '2026-10-15', location: '社区卫生服务中心预防接种门诊' },
    { id: 'CV-002', person: '王***（65 岁）', vaccine: '23 价肺炎球菌多糖疫苗', dose: '第 1 剂', time: '2026-10-12', location: '社区卫生服务中心预防接种门诊' },
    { id: 'CV-003', person: '李***（58 岁）', vaccine: '流感疫苗（灭活）', dose: '第 1 剂', time: '2026-10-10', location: '社区卫生服务中心预防接种门诊' },
    { id: 'CV-004', person: '新生儿 张宝宝', vaccine: '乙肝疫苗（第 3 剂）', dose: '第 3 剂', time: '2026-10-08', location: '社区卫生服务中心预防接种门诊' },
    { id: 'CV-005', person: '赵***（35 岁）', vaccine: 'HPV 疫苗（九价）', dose: '第 2 剂', time: '2026-10-05', location: '社区卫生服务中心预防接种门诊' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/community/chronic-management - 慢病管理 5 条 */
async function handleCommunityChronicManagement(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'CCM-001', patient: '王***', disease: '高血压（3 级，很高危）', manager: '陈***主治医师', followupCount: 4, controlStatus: '控制良好（血压 130/80 mmHg）' },
    { id: 'CCM-002', patient: '王***', disease: '2 型糖尿病', manager: '陈***主治医师', followupCount: 3, controlStatus: '控制一般（HbA1c 7.2%）' },
    { id: 'CCM-003', patient: '张***', disease: '冠心病+脑梗死后遗症', manager: '王***副主任医师', followupCount: 6, controlStatus: '稳定（需康复训练）' },
    { id: 'CCM-004', patient: '李***', disease: '慢阻肺（稳定期）', manager: '刘***主治医师', followupCount: 2, controlStatus: '控制良好（无急性加重）' },
    { id: 'CCM-005', patient: '周***', disease: '高血压（2 级，高危）', manager: '周***主治医师', followupCount: 5, controlStatus: '控制良好（血压 135/85 mmHg）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/community/health-education - 健康教育 5 条 */
async function handleCommunityHealthEducation(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'CHE-001', topic: '高血压的日常管理与饮食指导', time: '2026-10-22 14:00', location: '社区卫生服务中心 3 楼宣教厅', participants: 85, lecturer: '陈***主治医师' },
    { id: 'CHE-002', topic: '糖尿病自我管理与血糖监测', time: '2026-10-25 09:30', location: '社区卫生服务中心 3 楼宣教厅', participants: 62, lecturer: '内分泌科 李***副主任医师' },
    { id: 'CHE-003', topic: '老年人防跌倒与居家安全', time: '2026-10-28 14:00', location: '某某社区居委会活动室', participants: 45, lecturer: '王***副主任医师' },
    { id: 'CHE-004', topic: '儿童常见呼吸道疾病防治', time: '2026-11-01 10:00', location: '社区卫生服务中心 2 楼儿保科', participants: 38, lecturer: '儿科 吴***主治医师' },
    { id: 'CHE-005', topic: '心脑血管疾病的早期识别与急救', time: '2026-11-05 14:00', location: '社区卫生服务中心 3 楼宣教厅', participants: 90, lecturer: '心血管内科 李***主任医师' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m309Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/community/residents', handle: handleCommunityResidents, auth: true },
  { method: 'GET', path: '/api/v1/community/family-doctor', handle: handleCommunityFamilyDoctor, auth: true },
  { method: 'GET', path: '/api/v1/community/vaccination', handle: handleCommunityVaccination, auth: true },
  { method: 'GET', path: '/api/v1/community/chronic-management', handle: handleCommunityChronicManagement, auth: true },
  { method: 'GET', path: '/api/v1/community/health-education', handle: handleCommunityHealthEducation, auth: true },
];
