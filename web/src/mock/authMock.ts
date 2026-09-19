/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 认证 / RBAC / 审计 / 登录日志 Mock 数据（均为虚拟演示数据）
 * 说明：仅用于前端独立演示，不连接真实后端；不存储任何真实患者或职工信息。
 */
import dayjs from 'dayjs';

import type {
  AuditAction,
  AuditLog,
  AuthUser,
  Captcha,
  DataScope,
  LoginLog,
  LoginMethod,
  ManageUser,
  MenuItem,
  OperateResult,
  PermissionNode,
  QrCodeSession,
  Role,
  RoleCode,
  SsoProvider,
  UserStatus,
} from '@/types/auth';
import { delay } from './utils';

/* ================================================================== */
/* 权限树：10 大模块 × 50+ 权限点（菜单→功能→操作 三级）                */
/* ================================================================== */

let permSeq = 0;
const pid = () => `perm_${++permSeq}`;

interface PermLeaf {
  code: string;
  name: string;
  type: PermissionNode['type'];
  sort: number;
}

interface PermModule {
  code: string;
  name: string;
  icon: string;
  path?: string;
  sort?: number;
  items: PermLeaf[];
}

const MODULES: PermModule[] = [
  {
    code: 'dashboard',
    name: '工作台',
    icon: 'DashboardOutlined',
    path: '/dashboard',
    items: [
      { code: 'dashboard:view', name: '查看工作台', type: 'menu', sort: 1 },
      { code: 'dashboard:layout:edit', name: '自定义布局', type: 'button', sort: 2 },
    ],
  },
  {
    code: 'patient',
    name: '患者管理',
    icon: 'TeamOutlined',
    path: '/patients',
    items: [
      { code: 'patient:view', name: '查看患者列表', type: 'menu', sort: 1 },
      { code: 'patient:detail:view', name: '查看患者360', type: 'button', sort: 2 },
      { code: 'patient:create', name: '新建患者', type: 'button', sort: 3 },
      { code: 'patient:edit', name: '编辑患者', type: 'button', sort: 4 },
      { code: 'patient:export', name: '导出患者数据', type: 'data', sort: 5 },
      { code: 'patient:api:list', name: '患者列表API', type: 'api', sort: 6 },
    ],
  },
  {
    code: 'emr',
    name: '病历管理',
    icon: 'FileTextOutlined',
    path: '/emr',
    items: [
      { code: 'emr:view', name: '查看病历', type: 'menu', sort: 1 },
      { code: 'emr:write', name: '书写病历', type: 'button', sort: 2 },
      { code: 'emr:audit', name: '病历质控审核', type: 'button', sort: 3 },
      { code: 'emr:template:manage', name: '模板管理', type: 'button', sort: 4 },
      { code: 'emr:export', name: '病历导出', type: 'data', sort: 5 },
    ],
  },
  {
    code: 'order',
    name: '医嘱管理',
    icon: 'ScheduleOutlined',
    path: '/orders',
    items: [
      { code: 'order:view', name: '查看医嘱', type: 'menu', sort: 1 },
      { code: 'order:write', name: '开具医嘱', type: 'button', sort: 2 },
      { code: 'order:review', name: '医嘱审核', type: 'button', sort: 3 },
      { code: 'order:cancel', name: '作废医嘱', type: 'button', sort: 4 },
    ],
  },
  {
    code: 'prescription',
    name: '处方管理',
    icon: 'MedicineBoxOutlined',
    path: '/prescriptions',
    items: [
      { code: 'rx:view', name: '查看处方', type: 'menu', sort: 1 },
      { code: 'rx:write', name: '开具处方', type: 'button', sort: 2 },
      { code: 'rx:review', name: '处方审核', type: 'button', sort: 3 },
    ],
  },
  {
    code: 'quality',
    name: '质控管理',
    icon: 'SafetyCertificateOutlined',
    path: '/quality',
    items: [
      { code: 'qc:view', name: '查看质控', type: 'menu', sort: 1 },
      { code: 'qc:rule:manage', name: '规则配置', type: 'button', sort: 2 },
      { code: 'qc:report', name: '质控报表', type: 'data', sort: 3 },
    ],
  },
  {
    code: 'ai',
    name: '智能助手',
    icon: 'RobotOutlined',
    path: '/agent',
    items: [
      { code: 'ai:chat:use', name: 'AI 问诊对话', type: 'menu', sort: 1 },
      { code: 'ai:cds:use', name: '临床决策支持', type: 'button', sort: 2 },
    ],
  },
  {
    code: 'emergency',
    name: '急诊分诊',
    icon: 'AlertOutlined',
    path: '/emergency',
    items: [
      { code: 'emg:view', name: '查看分诊台', type: 'menu', sort: 1 },
      { code: 'emg:triage', name: '执行分诊', type: 'button', sort: 2 },
      { code: 'emg:greenchannel', name: '绿色通道', type: 'button', sort: 3 },
    ],
  },
  {
    code: 'deptops',
    name: '科室运营',
    icon: 'BarChartOutlined',
    path: '/dept-ops',
    items: [
      { code: 'ops:view', name: '查看运营看板', type: 'menu', sort: 1 },
      { code: 'ops:report', name: '运营报表导出', type: 'data', sort: 2 },
    ],
  },
  {
    code: 'system',
    name: '系统管理',
    icon: 'SettingOutlined',
    path: '/system',
    items: [
      { code: 'system:user:view', name: '用户查看', type: 'menu', sort: 1 },
      { code: 'system:user:manage', name: '用户管理', type: 'button', sort: 2 },
      { code: 'system:role:view', name: '角色查看', type: 'menu', sort: 3 },
      { code: 'system:role:manage', name: '角色管理', type: 'button', sort: 4 },
      { code: 'system:perm:manage', name: '权限管理', type: 'button', sort: 5 },
      { code: 'system:audit:view', name: '操作审计查看', type: 'menu', sort: 6 },
      { code: 'system:loginlog:view', name: '登录日志查看', type: 'menu', sort: 7 },
      { code: 'system:config', name: '系统参数配置', type: 'button', sort: 8 },
    ],
  },
];

/** 构建权限树（模块=一级，功能=二级，操作=三级叶子） */
export const permissionTree: PermissionNode[] = MODULES.map((m) => ({
  id: pid(),
  code: m.code,
  name: m.name,
  type: 'menu',
  module: m.code,
  path: m.path,
  icon: m.icon,
  sort: m.sort ?? 0,
  visible: true,
  status: 'enabled',
  parentId: null,
  children: m.items.map((it) => ({
    id: pid(),
    code: it.code,
    name: it.name,
    type: it.type,
    module: m.code,
    sort: it.sort,
    visible: it.type === 'menu',
    status: 'enabled',
    parentId: null,
  })),
}));

/** 扁平权限列表（供表格 / 矩阵使用） */
export const flatPermissions: PermissionNode[] = permissionTree.flatMap((mod) => {
  const leaves = (mod.children ?? []).map((c) => ({ ...c, parentId: mod.id }));
  return [mod, ...leaves];
});

/** 全部权限编码 */
export const allPermissionCodes: string[] = flatPermissions.map((p) => p.code);

/* ================================================================== */
/* 12 种预设角色（符合医院实际组织架构）                                 */
/* ================================================================== */

function permsFor(...mods: string[]): string[] {
  const set = new Set<string>();
  for (const mod of mods) {
    flatPermissions.filter((p) => p.module === mod).forEach((p) => set.add(p.code));
  }
  return [...set];
}

function sysAdminPerms(): string[] {
  return ['*', ...allPermissionCodes];
}

export const roles: Role[] = [
  {
    id: 'role_admin',
    code: 'system_admin',
    name: '系统管理员',
    description: '信息科运维，拥有系统全部权限',
    level: 'system',
    dataScope: 'all',
    status: 'enabled',
    userCount: 2,
    permissionCount: sysAdminPerms().length,
    permissionCodes: sysAdminPerms(),
    createdAt: '2024-01-01 09:00',
    createdBy: 'system',
  },
  {
    id: 'role_director',
    code: 'dept_director',
    name: '科主任',
    description: '科室负责人，本科室全量数据管理',
    level: 'dept',
    dataScope: 'dept',
    status: 'enabled',
    userCount: 6,
    permissionCount: 0,
    permissionCodes: permsFor(
      'dashboard',
      'patient',
      'emr',
      'order',
      'prescription',
      'quality',
      'ai',
      'emergency',
      'deptops',
    ),
    createdAt: '2024-01-01 09:00',
    createdBy: 'system',
  },
  {
    id: 'role_chief',
    code: 'chief_physician',
    name: '主任医师',
    description: '高级职称，三级查房与疑难病例',
    level: 'dept',
    dataScope: 'dept',
    status: 'enabled',
    userCount: 8,
    permissionCount: 0,
    permissionCodes: permsFor(
      'dashboard',
      'patient',
      'emr',
      'order',
      'prescription',
      'quality',
      'ai',
    ),
    inherits: ['attending'],
    createdAt: '2024-01-01 09:00',
    createdBy: 'system',
  },
  {
    id: 'role_assoc',
    code: 'associate_chief',
    name: '副主任医师',
    description: '副高级职称，协助主任管理',
    level: 'dept',
    dataScope: 'dept',
    status: 'enabled',
    userCount: 12,
    permissionCount: 0,
    permissionCodes: permsFor('dashboard', 'patient', 'emr', 'order', 'prescription', 'ai'),
    inherits: ['attending'],
    createdAt: '2024-01-01 09:00',
    createdBy: 'system',
  },
  {
    id: 'role_attending',
    code: 'attending',
    name: '主治医师',
    description: '主治职称，管床与门诊',
    level: 'personal',
    dataScope: 'self',
    status: 'enabled',
    userCount: 18,
    permissionCount: 0,
    permissionCodes: permsFor('dashboard', 'patient', 'emr', 'order', 'prescription', 'ai'),
    inherits: ['resident'],
    createdAt: '2024-01-01 09:00',
    createdBy: 'system',
  },
  {
    id: 'role_resident',
    code: 'resident',
    name: '住院医师',
    description: '管床医师，书写病历',
    level: 'personal',
    dataScope: 'self',
    status: 'enabled',
    userCount: 24,
    permissionCount: 0,
    permissionCodes: permsFor('dashboard', 'patient', 'emr', 'order', 'ai'),
    inherits: ['fellow'],
    createdAt: '2024-01-01 09:00',
    createdBy: 'system',
  },
  {
    id: 'role_fellow',
    code: 'fellow',
    name: '进修医师',
    description: '进修学习，受限数据范围',
    level: 'personal',
    dataScope: 'self',
    status: 'enabled',
    userCount: 5,
    permissionCount: 0,
    permissionCodes: permsFor('dashboard', 'patient', 'emr'),
    createdAt: '2024-01-01 09:00',
    createdBy: 'system',
  },
  {
    id: 'role_nurse',
    code: 'nurse',
    name: '护士',
    description: '护理执行与体征录入',
    level: 'personal',
    dataScope: 'self',
    status: 'enabled',
    userCount: 32,
    permissionCount: 0,
    permissionCodes: permsFor('dashboard', 'patient', 'emergency'),
    createdAt: '2024-01-01 09:00',
    createdBy: 'system',
  },
  {
    id: 'role_pharmacist',
    code: 'pharmacist',
    name: '药师',
    description: '处方审核与用药指导',
    level: 'dept',
    dataScope: 'dept',
    status: 'enabled',
    userCount: 7,
    permissionCount: 0,
    permissionCodes: permsFor('dashboard', 'patient', 'prescription'),
    createdAt: '2024-01-01 09:00',
    createdBy: 'system',
  },
  {
    id: 'role_tech',
    code: 'technician',
    name: '技师',
    description: '检验检查报告录入',
    level: 'personal',
    dataScope: 'self',
    status: 'enabled',
    userCount: 9,
    permissionCount: 0,
    permissionCodes: permsFor('dashboard', 'patient'),
    createdAt: '2024-01-01 09:00',
    createdBy: 'system',
  },
  {
    id: 'role_patient',
    code: 'patient',
    name: '患者',
    description: '患者门户，仅查看本人数据',
    level: 'personal',
    dataScope: 'self',
    status: 'enabled',
    userCount: 0,
    permissionCount: 0,
    permissionCodes: permsFor('dashboard'),
    createdAt: '2024-01-01 09:00',
    createdBy: 'system',
  },
  {
    id: 'role_visitor',
    code: 'visitor',
    name: '访客',
    description: '临时访客，只读受限',
    level: 'personal',
    dataScope: 'self',
    status: 'disabled',
    userCount: 0,
    permissionCount: 0,
    permissionCodes: [],
    createdAt: '2024-01-01 09:00',
    createdBy: 'system',
  },
];

/* ================================================================== */
/* 用户数据（36 个，覆盖各科室与角色）                                   */
/* ================================================================== */

const DEPTS = [
  { code: 'internal', name: '呼吸内科' },
  { code: 'cardio', name: '心血管内科' },
  { code: 'surgery', name: '普外科' },
  { code: 'obgyn', name: '妇产科' },
  { code: 'pediatrics', name: '儿科' },
  { code: 'emergency', name: '急诊科' },
  { code: 'icu', name: '重症医学科' },
  { code: 'pharmacy', name: '药剂科' },
  { code: 'lab', name: '检验科' },
  { code: 'admin', name: '信息科' },
];

const SURNAMES = '陈李王张刘杨黄赵周吴徐孙马朱胡郭何林高罗'.split('');
const GIVEN = '维华芳敏静磊军洋勇艳杰娟涛明超霞平刚桂英兰玉萍红'.split('');

function randName(i: number): string {
  return (
    SURNAMES[i % SURNAMES.length] +
    GIVEN[(i * 7) % GIVEN.length] +
    GIVEN[(i * 13 + 3) % GIVEN.length]
  );
}

function roleOf(i: number): { code: RoleCode; name: string; title: string } {
  const table: Array<[RoleCode, string, string]> = [
    ['chief_physician', '主任医师', '主任医师'],
    ['attending', '主治医师', '主治医师'],
    ['resident', '住院医师', '住院医师'],
    ['nurse', '护士', '主管护师'],
    ['pharmacist', '药师', '主管药师'],
    ['technician', '技师', '主管技师'],
  ];
  const [code, name, title] = table[i % table.length];
  return { code, name, title };
}

export const manageUsers: ManageUser[] = DEPTS.flatMap((dept, di) => {
  const count = dept.code === 'admin' ? 2 : 4;
  return Array.from({ length: count }, (_, k) => {
    const idx = di * count + k;
    const r = roleOf(idx);
    const statusPool: UserStatus[] = ['active', 'active', 'active', 'leave', 'disabled'];
    const status = di === 0 && k === 0 ? 'active' : statusPool[(idx + di) % statusPool.length];
    return {
      id: `user_${idx + 1}`,
      username: `${r.code.split('_')[0]}_${1000 + idx}`,
      realName: randName(idx),
      employeeNo: `D${2020 + (idx % 6)}${String(100 + idx).padStart(4, '0')}`,
      gender: idx % 2 === 0 ? 'male' : 'female',
      age: 26 + (idx % 28),
      deptCode: dept.code,
      deptName: dept.name,
      title: r.title,
      position: r.code === 'chief_physician' ? '科主任' : undefined,
      phone: `138${String(10000000 + idx * 137).slice(0, 8)}`,
      email: `user${idx}@jianlan.hospital`,
      status,
      roleCodes: [r.code],
      roleNames: [r.name],
      dataScope: (r.code === 'chief_physician' ? 'dept' : 'self') as DataScope,
      lastLoginAt: dayjs().subtract(idx, 'hour').format('YYYY-MM-DD HH:mm:ss'),
      createdAt: dayjs()
        .subtract(120 + idx * 7, 'day')
        .format('YYYY-MM-DD HH:mm:ss'),
    };
  });
});

// 追加 2 个系统管理员
manageUsers.unshift(
  {
    id: 'user_admin1',
    username: 'admin',
    realName: '陈维',
    employeeNo: 'A0001',
    gender: 'male',
    age: 48,
    deptCode: 'admin',
    deptName: '信息科',
    title: '系统工程师',
    position: '信息科主任',
    phone: '13800000001',
    email: 'chenwei@jianlan.tech',
    status: 'active',
    roleCodes: ['system_admin'],
    roleNames: ['系统管理员'],
    dataScope: 'all',
    lastLoginAt: dayjs().subtract(12, 'minute').format('YYYY-MM-DD HH:mm:ss'),
    createdAt: '2024-01-01 09:00:00',
  },
  {
    id: 'user_admin2',
    username: 'ops_zhang',
    realName: '张运维',
    employeeNo: 'A0002',
    gender: 'male',
    age: 36,
    deptCode: 'admin',
    deptName: '信息科',
    title: '运维工程师',
    phone: '13800000002',
    email: 'zhangyw@jianlan.tech',
    status: 'active',
    roleCodes: ['system_admin'],
    roleNames: ['系统管理员'],
    dataScope: 'all',
    lastLoginAt: dayjs().subtract(2, 'day').format('YYYY-MM-DD HH:mm:ss'),
    createdAt: '2024-02-01 09:00:00',
  },
);

/* ================================================================== */
/* 当前登录用户 + 菜单                                                  */
/* ================================================================== */

export const currentUser: AuthUser = {
  id: 'user_admin1',
  username: 'admin',
  realName: '陈维',
  avatar: '',
  employeeNo: 'A0001',
  gender: 'male',
  age: 48,
  deptCode: 'admin',
  deptName: '信息科',
  title: '系统工程师',
  position: '信息科主任',
  phone: '13800000001',
  email: 'chenwei@jianlan.tech',
  entryDate: '2015-03-01',
  status: 'active',
  roles: roles.filter((r) => r.code === 'system_admin'),
  roleCodes: ['system_admin'],
  permissions: sysAdminPerms(),
  dataScope: 'all',
  lastLoginAt: dayjs().subtract(12, 'minute').format('YYYY-MM-DD HH:mm:ss'),
  createdAt: '2024-01-01 09:00:00',
};

export const currentMenus: MenuItem[] = [
  {
    key: 'dashboard',
    path: '/dashboard',
    label: '工作台',
    icon: 'DashboardOutlined',
    sort: 1,
    visible: true,
  },
  {
    key: 'patients',
    path: '/patients',
    label: '患者管理',
    icon: 'TeamOutlined',
    sort: 2,
    visible: true,
  },
  { key: 'agent', path: '/agent', label: 'AI 问诊', icon: 'RobotOutlined', sort: 3, visible: true },
  {
    key: 'system',
    path: '/system',
    label: '系统管理',
    icon: 'SettingOutlined',
    sort: 90,
    visible: true,
    children: [
      { key: 'users', path: '/system/users', label: '用户管理', sort: 1, visible: true },
      { key: 'roles', path: '/system/roles', label: '角色管理', sort: 2, visible: true },
      {
        key: 'permissions',
        path: '/system/permissions',
        label: '权限管理',
        sort: 3,
        visible: true,
      },
      { key: 'audit-logs', path: '/system/audit-logs', label: '操作审计', sort: 4, visible: true },
      { key: 'login-logs', path: '/system/login-logs', label: '登录日志', sort: 5, visible: true },
    ],
  },
  {
    key: 'profile',
    path: '/profile',
    label: '个人中心',
    icon: 'UserOutlined',
    sort: 99,
    visible: false,
  },
];

/* ================================================================== */
/* 操作审计日志（120 条）                                               */
/* ================================================================== */

const AUDIT_ACTIONS: AuditAction[] = [
  'login',
  'logout',
  'create',
  'update',
  'delete',
  'query',
  'export',
  'approve',
  'config',
];
const AUDIT_MODULES = [
  '系统管理',
  '患者管理',
  '医嘱管理',
  '处方管理',
  '病历管理',
  '质控管理',
  '急诊科',
  '药剂科',
];
const OPERATOR_POOL = manageUsers.slice(0, 12);

function pickAudit(i: number): AuditLog {
  const action = AUDIT_ACTIONS[i % AUDIT_ACTIONS.length];
  const mod = AUDIT_MODULES[i % AUDIT_MODULES.length];
  const op = OPERATOR_POOL[i % OPERATOR_POOL.length];
  const fail = action === 'login' && i % 17 === 0;
  const risk =
    action === 'delete' || action === 'export' || action === 'config'
      ? 'high'
      : action === 'approve'
        ? 'medium'
        : 'low';
  const contentMap: Record<AuditAction, string> = {
    login: '用户登录系统',
    logout: '用户退出系统',
    create: `在${mod}新增记录`,
    update: `在${mod}修改配置`,
    delete: `在${mod}删除敏感记录`,
    query: `查询${mod}数据`,
    export: `导出${mod}报表`,
    approve: `审核${mod}业务单据`,
    config: '修改系统参数',
    other: '其他操作',
  };
  return {
    id: `audit_${i}`,
    action,
    module: mod,
    content: contentMap[action],
    operatorId: op.id,
    operatorName: op.realName,
    operatorNo: op.employeeNo,
    operatorDept: op.deptName,
    ip: `10.20.${(i % 8) + 1}.${(i * 7) % 254}`,
    location: i % 5 === 0 ? '杭州-异地VPN' : '杭州-院内',
    device: i % 3 === 0 ? 'Windows / Chrome' : 'Windows / Edge',
    result: fail ? 'failure' : 'success',
    detail: fail ? '账号密码错误，连续失败 3 次' : undefined,
    requestParams: fail ? '{"username":"' + op.username + '"}' : '{"page":1,"size":20}',
    responseData: fail ? '{"code":401,"msg":"invalid credential"}' : '{"code":0}',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    duration: 30 + ((i * 13) % 400),
    riskLevel: risk,
    createdAt: dayjs()
      .subtract(i * 37, 'minute')
      .subtract(i % 7, 'second')
      .format('YYYY-MM-DD HH:mm:ss'),
  };
}

export const auditLogs: AuditLog[] = Array.from({ length: 120 }, (_, i) => pickAudit(i + 1));

/* ================================================================== */
/* 登录日志（120 条）                                                   */
/* ================================================================== */

const METHODS: LoginMethod[] = ['password', 'password', 'password', 'sso', 'qrcode'];
const FAIL_REASONS = ['密码错误', '账号已锁定', '验证码错误', '账号不存在'];

function pickLogin(i: number): LoginLog {
  const u = OPERATOR_POOL[i % OPERATOR_POOL.length];
  const method = METHODS[i % METHODS.length];
  const fail = i % 11 === 0;
  const abnormal: string[] = [];
  if (i % 13 === 0) abnormal.push('异地登录');
  if (i % 19 === 0) abnormal.push('深夜登录');
  if (fail && i % 22 === 0) abnormal.push('暴力破解尝试');
  if (i % 29 === 0) abnormal.push('新设备登录');
  return {
    id: `login_${i}`,
    username: u.username,
    realName: u.realName,
    method,
    ip: abnormal.includes('异地登录')
      ? `202.${(i % 200) + 1}.${i % 254}.${i % 254}`
      : `10.20.3.${(i % 200) + 1}`,
    location: abnormal.includes('异地登录')
      ? `异地-${['上海', '北京', '广州'][i % 3]}`
      : '杭州-院内',
    browser: ['Chrome', 'Edge', 'Firefox'][i % 3],
    os: ['Windows 10', 'Windows 11', 'macOS'][i % 3],
    deviceType: i % 5 === 0 ? 'mobile' : 'pc',
    result: fail ? 'failure' : 'success',
    failReason: fail ? FAIL_REASONS[i % FAIL_REASONS.length] : undefined,
    isAbnormal: abnormal.length > 0,
    abnormalTypes: abnormal,
    loginAt: dayjs()
      .subtract(i * 49, 'minute')
      .format('YYYY-MM-DD HH:mm:ss'),
    logoutAt: fail
      ? undefined
      : dayjs()
          .subtract(i * 49, 'minute')
          .add((i % 6) + 1, 'hour')
          .format('YYYY-MM-DD HH:mm:ss'),
    onlineDuration: fail ? undefined : ((i % 6) + 1) * 3600 + (i % 60) * 60,
  };
}

export const loginLogs: LoginLog[] = Array.from({ length: 120 }, (_, i) => pickLogin(i + 1));

/* ================================================================== */
/* 验证码 / SSO / 二维码 Mock                                           */
/* ================================================================== */

export const ssoProviders: SsoProvider[] = [
  {
    id: 'hospital-idp',
    name: '医院统一身份认证',
    protocol: 'OAuth2',
    icon: 'SafetyCertificateOutlined',
    authorizeUrl: '/sso/oauth2/authorize',
  },
  {
    id: 'cas-hospital',
    name: 'CAS 单点登录',
    protocol: 'CAS',
    icon: 'SafetyOutlined',
    authorizeUrl: '/cas/login',
  },
  {
    id: 'saml-idp',
    name: '医保 SAML 认证',
    protocol: 'SAML',
    icon: 'GlobalOutlined',
    authorizeUrl: '/saml/sso',
  },
];

/**
 * 图形验证码会话存储：captchaId -> 验证码明文。
 * 演示环境同样做真实校验（一次性、大小写不敏感），避免验证码沦为摆设；
 * 生产环境由后端签发并在服务端校验，此 Map 仅用于本地 Mock。
 */
const captchaStore = new Map<string, string>();

export async function fetchCaptcha(): Promise<Captcha> {
  await delay(120, 260);
  const chars = Math.random().toString(36).slice(2, 6).toUpperCase();
  const captchaId = `cap_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  captchaStore.set(captchaId, chars);
  // 仅保留最近 20 个验证码，防止内存无限增长
  if (captchaStore.size > 20) {
    const oldest = captchaStore.keys().next().value;
    if (oldest) captchaStore.delete(oldest);
  }
  // 用 data URI 模拟图形验证码（彩色噪点文字）
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='120' height='44'><rect width='120' height='44' fill='#eef4fb'/><text x='18' y='30' font-family='monospace' font-size='24' fill='#0A4D8C' letter-spacing='6'>${chars}</text></svg>`;
  return {
    captchaId,
    image: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`,
  };
}

export async function fetchQrCode(): Promise<QrCodeSession> {
  await delay(200, 400);
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><rect width='180' height='180' fill='white'/><g fill='#0A4D8C'>${Array.from({ length: 40 }, (_, i) => `<rect x='${(i % 8) * 22 + 6}' y='${Math.floor(i / 8) * 22 + 6}' width='14' height='14' opacity='${(i % 3) / 3 + 0.3}'/>`).join('')}</g><rect x='6' y='6' width='40' height='40' fill='none' stroke='#0A4D8C' stroke-width='4'/><rect x='134' y='6' width='40' height='40' fill='none' stroke='#0A4D8C' stroke-width='4'/><rect x='6' y='134' width='40' height='40' fill='none' stroke='#0A4D8C' stroke-width='4'/></svg>`;
  return {
    ticket: `qr_${Date.now()}`,
    image: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`,
    status: 'waiting',
    expiresAt: Date.now() + 120_000,
  };
}

/* ================================================================== */
/* 登录 / 重置密码 Mock 服务                                            */
/* ================================================================== */

export class LoginError extends Error {
  code: 'BAD_CREDENTIALS' | 'CAPTCHA' | 'LOCKED' | 'NOT_FOUND';
  constructor(code: LoginError['code'], message: string) {
    super(message);
    this.code = code;
  }
}

/** SSO / 扫码等内部模拟登录使用的直通令牌，不走图形验证码校验 */
const CAPTCHA_BYPASS_TOKENS = new Set(['SSOOK', 'QROK']);

/**
 * 账号密码登录：admin / any 6+ 位密码可成功；其余账号需命中列表。
 * 图形验证码：携带 captchaId 时与签发的验证码严格比对（一次性、大小写不敏感）。
 */
export async function mockAccountLogin(
  username: string,
  _password: string,
  captcha: string,
  captchaId?: string,
): Promise<{ user: AuthUser; permissions: string[]; menus: MenuItem[] }> {
  await delay(400, 800);
  const code = (captcha || '').trim().toUpperCase();
  if (!CAPTCHA_BYPASS_TOKENS.has(code)) {
    if (code.length < 4) {
      throw new LoginError('CAPTCHA', '验证码错误，请重新输入');
    }
    if (captchaId) {
      // 一次性校验：无论对错，取出后立即删除，防止验证码重放
      const expected = captchaStore.get(captchaId);
      captchaStore.delete(captchaId);
      if (!expected || expected !== code) {
        throw new LoginError('CAPTCHA', '验证码错误，请重新输入');
      }
    }
  }
  if (username === 'admin') {
    return { user: currentUser, permissions: currentUser.permissions, menus: currentMenus };
  }
  const m = manageUsers.find((u) => u.username === username);
  if (!m) throw new LoginError('NOT_FOUND', '账号不存在，请联系信息科');
  if (m.status === 'disabled') throw new LoginError('LOCKED', '账号已被禁用，请联系管理员');
  const u: AuthUser = {
    ...currentUser,
    id: m.id,
    username: m.username,
    realName: m.realName,
    employeeNo: m.employeeNo,
    deptCode: m.deptCode,
    deptName: m.deptName,
    title: m.title,
    roleCodes: m.roleCodes,
    roles: roles.filter((r) => m.roleCodes.includes(r.code)),
    permissions: roles.find((r) => r.code === m.roleCodes[0])?.permissionCodes ?? [],
    dataScope: m.dataScope,
  };
  return { user: u, permissions: u.permissions, menus: currentMenus };
}

export async function mockSendSms(_target: string): Promise<{ sent: boolean }> {
  await delay(300);
  return { sent: true };
}

export async function mockResetPassword(
  _username: string,
  _code: string,
  _newPwd: string,
): Promise<void> {
  await delay(500);
}

export async function mockSsoLogin(_providerId: string): Promise<{ url: string }> {
  await delay(200);
  const p = ssoProviders[0];
  return { url: `${p.authorizeUrl}?service=${encodeURIComponent(window.location.origin)}` };
}

export type { OperateResult };
