/**
 * 健澜科技 jlmedaios - M215 系统管理深度 + 第三方集成 + 数据上报
 *
 * 用户/角色/权限树/审计 + 微信/支付/LIS集成 + 国家上报
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/* ==================== 一、系统管理深度 ==================== */

/** GET /api/v1/system/users - 用户列表 */
async function handleSystemUsers(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const users = [
    { id: 'USR-001', username: 'doctor_li', name: '李医生', role: '主治医生', dept: '心内科', status: '启用', lastLogin: '2026-10-20 08:30' },
    { id: 'USR-002', username: 'nurse_wang', name: '王护士', role: '护士', dept: '心内科', status: '启用', lastLogin: '2026-10-20 08:00' },
    { id: 'USR-003', username: 'pharmacist_zhang', name: '张药师', role: '药师', dept: '药剂科', status: '启用', lastLogin: '2026-10-20 09:00' },
    { id: 'USR-004', username: 'admin', name: '系统管理员', role: '系统管理员', dept: '信息科', status: '启用', lastLogin: '2026-10-19 17:00' },
    { id: 'USR-005', username: 'patient_test', name: '张演示', role: '患者', dept: '-', status: '锁定', lastLogin: '2026-10-15 10:00' },
  ];

  return json(ok({ users, totalCount: users.length }));
}

/** GET /api/v1/system/roles - 角色列表 */
async function handleSystemRoles(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const roles = [
    { id: 'ROLE-001', name: '系统管理员', permissionCount: 128, userCount: 3, description: '系统全部权限' },
    { id: 'ROLE-002', name: '科室主任', permissionCount: 68, userCount: 12, description: '本科室全部业务权限+审批权限' },
    { id: 'ROLE-003', name: '主治医生', permissionCount: 45, userCount: 56, description: '门诊+住院+医嘱+病历权限' },
    { id: 'ROLE-004', name: '住院医师', permissionCount: 32, userCount: 89, description: '病历书写+医嘱开立权限' },
    { id: 'ROLE-005', name: '护士', permissionCount: 28, userCount: 132, description: '护理记录+医嘱执行权限' },
    { id: 'ROLE-006', name: '收费员', permissionCount: 15, userCount: 24, description: '收费+退费+票据权限' },
  ];

  return json(ok({ roles, totalCount: roles.length }));
}

/** GET /api/v1/system/permissions - 权限树 */
async function handleSystemPermissions(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const permissionTree = [
    {
      id: 'MENU-OUTPATIENT',
      name: '门诊管理',
      type: '菜单',
      children: [
        {
          id: 'BTN-APPOINT',
          name: '预约挂号',
          type: '按钮',
          children: [
            { id: 'API-GET-APT', name: '查询预约列表', type: 'API', path: 'GET /api/v1/outpatient/appointments' },
            { id: 'API-POST-APT', name: '创建预约', type: 'API', path: 'POST /api/v1/outpatient/appointments' },
          ],
        },
        {
          id: 'BTN-CANCEL',
          name: '取消挂号',
          type: '按钮',
          children: [
            { id: 'API-POST-CANCEL', name: '取消预约', type: 'API', path: 'POST /api/v1/outpatient/cancel' },
          ],
        },
      ],
    },
    {
      id: 'MENU-INPATIENT',
      name: '住院管理',
      type: '菜单',
      children: [
        {
          id: 'BTN-ADMIT',
          name: '入院登记',
          type: '按钮',
          children: [
            { id: 'API-GET-ADM', name: '查询入院列表', type: 'API', path: 'GET /api/v1/inpatient/admissions' },
            { id: 'API-POST-ADM', name: '办理入院', type: 'API', path: 'POST /api/v1/inpatient/admissions' },
          ],
        },
      ],
    },
  ];

  return json(ok({ tree: permissionTree }));
}

/** GET /api/v1/system/audit - 系统审计日志 */
async function handleSystemAudit(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const logs = [
    { id: 'AUD-001', operator: 'admin', operationType: '登录', target: '系统登录', ip: '192.168.1.100', time: '2026-10-20 08:00', result: '成功' },
    { id: 'AUD-002', operator: 'doctor_li', operationType: '查询', target: '患者列表', ip: '192.168.1.101', time: '2026-10-20 08:30', result: '成功' },
    { id: 'AUD-003', operator: 'doctor_li', operationType: '修改', target: '医嘱开立', ip: '192.168.1.101', time: '2026-10-20 09:15', result: '成功' },
    { id: 'AUD-004', operator: 'nurse_wang', operationType: '导出', target: '护理记录报表', ip: '192.168.1.102', time: '2026-10-20 10:00', result: '成功' },
    { id: 'AUD-005', operator: 'unknown', operationType: '登录', target: '系统登录', ip: '10.0.0.55', time: '2026-10-20 07:45', result: '失败' },
  ];

  return json(ok({ logs, totalCount: logs.length }));
}

/* ==================== 二、第三方集成 ==================== */

/** GET /api/v1/integration/wechat - 微信集成配置 */
async function handleIntegrationWechat(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  return json(ok({
    appId: 'wx1234567890abcdef',
    officialAccount: { name: '健澜医院服务号', status: '已接入' },
    miniProgram: { name: '健澜医院小程序', status: '已接入' },
    templateMessages: [
      { type: '就诊提醒', status: '已启用' },
      { type: '报告推送', status: '已启用' },
      { type: '缴费通知', status: '已启用' },
    ],
    status: '已接入',
  }));
}

/** GET /api/v1/integration/payment - 支付集成配置 */
async function handleIntegrationPayment(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  return json(ok({
    wechatPay: { mchId: '1234567890', status: '已接入' },
    alipay: { appId: '2021001234567890', status: '已接入' },
    insurancePay: { area: '浙江省杭州市', status: '已接入' },
    reconciliation: { status: '已对账', lastReconcileDate: '2026-10-19' },
  }));
}

/** GET /api/v1/integration/lab - LIS 集成配置 */
async function handleIntegrationLab(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  return json(ok({
    endpoint: 'http://lis.jlmedaios.com:8888/api',
    hl7Version: 'v2.5',
    messageTypes: ['ORM（医嘱下单）', 'OBR（检验结果）', 'ORU（结果更新）'],
    connectionStatus: '已连接',
    lastHeartbeat: '2026-10-20 10:00',
  }));
}

/* ==================== 三、数据上报 ==================== */

/** GET /api/v1/report/national - 国家上报数据 */
async function handleReportNational(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  return json(ok({
    medicalRecordHomepage: { submitted: 1250, passRate: 98.5 },
    drg: { groups: 328, enrollmentRate: 85.2 },
    dip: { diseaseTypes: 156, coverage: 82.6 },
    infectiousDisease: { timelyRate: 99.1 },
    deathCase: { timelyRate: 97.8 },
  }));
}

export const m215Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/system/users', handle: handleSystemUsers, auth: true },
  { method: 'GET', path: '/api/v1/system/roles', handle: handleSystemRoles, auth: true },
  { method: 'GET', path: '/api/v1/system/permissions', handle: handleSystemPermissions, auth: true },
  { method: 'GET', path: '/api/v1/system/audit', handle: handleSystemAudit, auth: true },
  { method: 'GET', path: '/api/v1/integration/wechat', handle: handleIntegrationWechat, auth: true },
  { method: 'GET', path: '/api/v1/integration/payment', handle: handleIntegrationPayment, auth: true },
  { method: 'GET', path: '/api/v1/integration/lab', handle: handleIntegrationLab, auth: true },
  { method: 'GET', path: '/api/v1/report/national', handle: handleReportNational, auth: true },
];
