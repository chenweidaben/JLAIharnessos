/**
 * 健澜科技 jlmedaios - M302 人力资源域
 *
 * 医生列表/护士列表/科室列表/绩效考核/培训记录/请假记录
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/hr/doctors - 医生列表 8 条 */
async function handleHrDoctors(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'D-001', name: '李***', dept: '心血管内科', title: '主任医师', licenseNo: '110330100001234' },
    { id: 'D-002', name: '陈***', dept: '普外科', title: '副主任医师', licenseNo: '110330100001235' },
    { id: 'D-003', name: '王***', dept: '骨科', title: '主治医师', licenseNo: '110330100001236' },
    { id: 'D-004', name: '刘***', dept: '呼吸内科', title: '主任医师', licenseNo: '110330100001237' },
    { id: 'D-005', name: '张***', dept: '神经内科', title: '副主任医师', licenseNo: '110330100001238' },
    { id: 'D-006', name: '赵***', dept: '消化内科', title: '主治医师', licenseNo: '110330100001239' },
    { id: 'D-007', name: '孙***', dept: '急诊科', title: '主治医师', licenseNo: '110330100001240' },
    { id: 'D-008', name: '周***', dept: '麻醉科', title: '副主任医师', licenseNo: '110330100001241' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/hr/nurses - 护士列表 8 条 */
async function handleHrNurses(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'N-001', name: '吴***', dept: '心血管内科', title: '护士长（主管护师）', licenseNo: '311330100005678' },
    { id: 'N-002', name: '郑***', dept: '普外科', title: '护师', licenseNo: '311330100005679' },
    { id: 'N-003', name: '冯***', dept: 'ICU', title: '主管护师', licenseNo: '311330100005680' },
    { id: 'N-004', name: '褚***', dept: '呼吸内科', title: '护师', licenseNo: '311330100005681' },
    { id: 'N-005', name: '卫***', dept: '骨科', title: '护士', licenseNo: '311330100005682' },
    { id: 'N-006', name: '蒋***', dept: '急诊科', title: '护师', licenseNo: '311330100005683' },
    { id: 'N-007', name: '沈***', dept: '儿科', title: '主管护师', licenseNo: '311330100005684' },
    { id: 'N-008', name: '韩***', dept: '手术室', title: '护师', licenseNo: '311330100005685' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/hr/departments - 科室列表 5 条 */
async function handleHrDepartments(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { name: '心血管内科', director: '李***主任医师', beds: 60, staffCount: 45, intro: '擅长冠心病、心律失常、心衰诊疗' },
    { name: '普外科', director: '陈***副主任医师', beds: 55, staffCount: 38, intro: '擅长腹部外科、甲状腺、乳腺疾病诊疗' },
    { name: '骨科', director: '王***主治医师', beds: 50, staffCount: 35, intro: '擅长关节置换、脊柱外科、创伤骨科' },
    { name: '呼吸内科', director: '刘***主任医师', beds: 45, staffCount: 32, intro: '擅长肺部感染、慢阻肺、哮喘诊疗' },
    { name: '神经内科', director: '张***副主任医师', beds: 40, staffCount: 28, intro: '擅长脑血管病、癫痫、帕金森病诊疗' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/hr/performance - 绩效考核 5 条 */
async function handleHrPerformance(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { employee: '李***', dept: '心血管内科', indicator: '门诊量+手术量+患者满意度', score: 92, grade: 'A' },
    { employee: '陈***', dept: '普外科', indicator: '门诊量+手术量+病历质量', score: 88, grade: 'B+' },
    { employee: '王***', dept: '骨科', indicator: '手术量+平均住院日+患者满意度', score: 85, grade: 'B' },
    { employee: '刘***', dept: '呼吸内科', indicator: '门诊量+病历质量+科研论文', score: 90, grade: 'A-' },
    { employee: '张***', dept: '神经内科', indicator: '门诊量+疑难病例数+患者满意度', score: 82, grade: 'B' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/hr/training - 培训记录 5 条 */
async function handleHrTraining(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { employee: '李***', course: '最新冠心病指南解读', lecturer: '全国知名专家（线上）', hours: 4, score: '95 分' },
    { employee: '陈***', course: '腹腔镜手术进阶培训', lecturer: '省人民医院专家（线下）', hours: 8, score: '90 分' },
    { employee: '王***', course: '关节置换围手术期管理', lecturer: '本院骨科主任（科内）', hours: 2, score: '92 分' },
    { employee: '刘***', course: '抗菌药物合理使用培训', lecturer: '药剂科主任（院内）', hours: 3, score: '88 分' },
    { employee: '张***', course: '医疗法律法规培训', lecturer: '医务科主任（院内）', hours: 2, score: '95 分' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/hr/leave - 请假记录 5 条 */
async function handleHrLeave(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { employee: '李***', type: '年休假', days: 5, time: '2026-10-21 ~ 2026-10-25', status: '已批准' },
    { employee: '陈***', type: '病假', days: 3, time: '2026-10-18 ~ 2026-10-20', status: '已销假' },
    { employee: '王***', type: '事假', days: 1, time: '2026-10-22', status: '待审批' },
    { employee: '刘***', type: '产假', days: 98, time: '2026-09-01 ~ 2026-12-08', status: '休假中' },
    { employee: '张***', type: '婚假', days: 3, time: '2026-11-01 ~ 2026-11-03', status: '已批准' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m302Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/hr/doctors', handle: handleHrDoctors, auth: true },
  { method: 'GET', path: '/api/v1/hr/nurses', handle: handleHrNurses, auth: true },
  { method: 'GET', path: '/api/v1/hr/departments', handle: handleHrDepartments, auth: true },
  { method: 'GET', path: '/api/v1/hr/performance', handle: handleHrPerformance, auth: true },
  { method: 'GET', path: '/api/v1/hr/training', handle: handleHrTraining, auth: true },
  { method: 'GET', path: '/api/v1/hr/leave', handle: handleHrLeave, auth: true },
];
