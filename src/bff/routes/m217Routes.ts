/**
 * 健澜科技 jlmedaios - M217 医院管理深度 + 后勤保障 + 区域协同
 *
 * 组织架构/科室详情/人员花名册 + 医废/食堂/停车 + 区域影像/检验互认
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/* ==================== 一、医院管理深度 ==================== */

/** GET /api/v1/hospital/organization - 医院组织架构树形结构 */
async function handleHospitalOrganization(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const tree = {
    name: '健澜医院',
    children: [
      {
        name: '院领导',
        children: [
          { name: '院长' },
          { name: '医疗副院长' },
          { name: '行政副院长' },
        ],
      },
      {
        name: '职能科室',
        children: [
          { name: '医务处' },
          { name: '护理部' },
          { name: '院感科' },
          { name: '质控科' },
          { name: '人事科' },
          { name: '财务科' },
        ],
      },
      {
        name: '临床科室',
        children: [
          { name: '心内科' }, { name: '呼吸科' }, { name: '消化科' },
          { name: '神经内科' }, { name: '内分泌科' }, { name: '骨科' },
          { name: '普外科' }, { name: '妇产科' }, { name: '儿科' }, { name: '急诊科' },
        ],
      },
      {
        name: '医技科室',
        children: [
          { name: '检验科' }, { name: '放射科' }, { name: '超声科' },
          { name: '药剂科' }, { name: '病理科' }, { name: '营养科' },
        ],
      },
    ],
  };

  return json(ok({ tree }));
}

/** GET /api/v1/hospital/departments-detail - 科室详情 */
async function handleHospitalDepartmentsDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const depts = [
    { id: 'DET-001', name: '心内科', director: '李主任', beds: 60, doctors: 25, nurses: 45, yearOutpatient: 102000, yearDischarge: 1560 },
    { id: 'DET-002', name: '呼吸科', director: '王主任', beds: 50, doctors: 18, nurses: 32, yearOutpatient: 86000, yearDischarge: 1280 },
    { id: 'DET-003', name: '普外科', director: '张主任', beds: 70, doctors: 22, nurses: 40, yearOutpatient: 82000, yearDischarge: 1820 },
    { id: 'DET-004', name: '妇产科', director: '陈主任', beds: 55, doctors: 20, nurses: 38, yearOutpatient: 98000, yearDischarge: 1350 },
    { id: 'DET-005', name: '急诊科', director: '刘主任', beds: 30, doctors: 15, nurses: 35, yearOutpatient: 156000, yearDischarge: 820 },
  ];

  return json(ok({ departments: depts, totalCount: depts.length }));
}

/** GET /api/v1/hospital/staff - 人员花名册 */
async function handleHospitalStaff(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const staff = [
    { id: 'STAFF-001', name: '李主任', employeeNo: 'YL001', title: '主任医师', dept: '心内科', hireDate: '2000-07-01', status: '在职' },
    { id: 'STAFF-002', name: '李医生', employeeNo: 'YL015', title: '主治医师', dept: '心内科', hireDate: '2015-08-01', status: '在职' },
    { id: 'STAFF-003', name: '王护士', employeeNo: 'HL008', title: '主管护师', dept: '心内科', hireDate: '2012-09-01', status: '在职' },
    { id: 'STAFF-004', name: '张药师', employeeNo: 'YJ003', title: '副主任药师', dept: '药剂科', hireDate: '2008-07-01', status: '休假' },
    { id: 'STAFF-005', name: '陈医生', employeeNo: 'YL028', title: '住院医师', dept: '呼吸科', hireDate: '2022-08-01', status: '在职' },
  ];

  return json(ok({ staff, totalCount: staff.length }));
}

/* ==================== 二、后勤保障 ==================== */

/** GET /api/v1/logistics/medical-waste - 医疗废物管理 */
async function handleLogisticsMedicalWaste(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const waste = [
    { id: 'WST-001', type: '感染性废物', weight: 15.5, dept: '呼吸科', handoverTime: '2026-10-20 10:00', transporter: '赵师傅' },
    { id: 'WST-002', type: '损伤性废物', weight: 2.3, dept: '普外科', handoverTime: '2026-10-20 10:30', transporter: '赵师傅' },
    { id: 'WST-003', type: '病理性废物', weight: 5.8, dept: '病理科', handoverTime: '2026-10-20 11:00', transporter: '孙师傅' },
    { id: 'WST-004', type: '药物性废物', weight: 1.2, dept: '药剂科', handoverTime: '2026-10-20 11:30', transporter: '孙师傅' },
    { id: 'WST-005', type: '化学性废物', weight: 0.8, dept: '检验科', handoverTime: '2026-10-20 12:00', transporter: '赵师傅' },
  ];

  return json(ok({ waste, totalCount: waste.length }));
}

/** GET /api/v1/logistics/canteen - 食堂管理 */
async function handleLogisticsCanteen(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  return json(ok({
    todayMenu: {
      breakfast: ['稀饭', '包子', '鸡蛋'],
      lunch: ['红烧肉', '清蒸鲈鱼', '炒青菜'],
      dinner: ['番茄炒蛋', '红烧肉', '凉拌黄瓜'],
    },
    todayMealCount: { breakfast: 350, lunch: 820, dinner: 450 },
    satisfaction: 88.5,
    ingredientCost: 12500.00,
  }));
}

/** GET /api/v1/logistics/parking - 停车场管理 */
async function handleLogisticsParking(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  return json(ok({
    totalSpaces: 500,
    occupied: 385,
    available: 115,
    todayRevenue: 3250.00,
  }));
}

/* ==================== 三、区域协同深度 ==================== */

/** GET /api/v1/regional/imaging - 区域影像协同 */
async function handleRegionalImaging(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const images = [
    { id: 'RIMG-001', patient: '张演示', type: 'CT', uploadStatus: '已出报告', radiologist: '区域会诊中心-王主任', uploadTime: '2026-10-20 09:00' },
    { id: 'RIMG-002', patient: '李患者', type: 'MRI', uploadStatus: '已上传', radiologist: '-', uploadTime: '2026-10-20 09:30' },
    { id: 'RIMG-003', patient: '王先生', type: 'DR', uploadStatus: '审核中', radiologist: '区域会诊中心-刘医生', uploadTime: '2026-10-20 10:00' },
    { id: 'RIMG-004', patient: '赵女士', type: 'CT', uploadStatus: '已出报告', radiologist: '区域会诊中心-王主任', uploadTime: '2026-10-19 15:00' },
    { id: 'RIMG-005', patient: '刘大爷', type: 'MRI', uploadStatus: '已上传', radiologist: '-', uploadTime: '2026-10-19 16:00' },
  ];

  return json(ok({ images, totalCount: images.length }));
}

/** GET /api/v1/regional/lab - 区域检验协同 */
async function handleRegionalLab(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const labTests = [
    { id: 'RLAB-001', item: '血常规', result: '正常', reportTime: '2026-10-20 08:30', mutualRecognition: '已互认' },
    { id: 'RLAB-002', item: '肝功能', result: '异常（ALT升高）', reportTime: '2026-10-20 09:00', mutualRecognition: '已互认' },
    { id: 'RLAB-003', item: '肾功能', result: '正常', reportTime: '2026-10-20 09:30', mutualRecognition: '已互认' },
    { id: 'RLAB-004', item: '血糖', result: '异常（空腹血糖升高）', reportTime: '2026-10-20 10:00', mutualRecognition: '待互认' },
    { id: 'RLAB-005', item: '血脂', result: '正常', reportTime: '2026-10-20 10:30', mutualRecognition: '已互认' },
  ];

  return json(ok({ labTests, totalCount: labTests.length }));
}

export const m217Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/hospital/organization', handle: handleHospitalOrganization, auth: true },
  { method: 'GET', path: '/api/v1/hospital/departments-detail', handle: handleHospitalDepartmentsDetail, auth: true },
  { method: 'GET', path: '/api/v1/hospital/staff', handle: handleHospitalStaff, auth: true },
  { method: 'GET', path: '/api/v1/logistics/medical-waste', handle: handleLogisticsMedicalWaste, auth: true },
  { method: 'GET', path: '/api/v1/logistics/canteen', handle: handleLogisticsCanteen, auth: true },
  { method: 'GET', path: '/api/v1/logistics/parking', handle: handleLogisticsParking, auth: true },
  { method: 'GET', path: '/api/v1/regional/imaging', handle: handleRegionalImaging, auth: true },
  { method: 'GET', path: '/api/v1/regional/lab', handle: handleRegionalLab, auth: true },
];
