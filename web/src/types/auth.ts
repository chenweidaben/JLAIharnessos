/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 认证与权限（RBAC）类型定义：用户 / 角色 / 权限 / 菜单 / 审计日志 / 登录日志
 * 符合医疗行业数据安全规范：权限最小化、操作可审计、敏感信息不明文落盘。
 */

/* ------------------------------------------------------------------ */
/* 基础枚举                                                            */
/* ------------------------------------------------------------------ */

/** 账号在职状态 */
export type UserStatus = 'active' | 'off' | 'leave' | 'disabled';

/** 性别 */
export type Gender = 'male' | 'female' | 'unknown';

/** 权限类型：菜单 / 按钮 / 数据 / API */
export type PermissionType = 'menu' | 'button' | 'data' | 'api';

/** 角色等级：系统级 / 科室级 / 个人级 */
export type RoleLevel = 'system' | 'dept' | 'personal';

/** 数据范围：全部 / 本科室 / 本组 / 本人 */
export type DataScope = 'all' | 'dept' | 'group' | 'self';

/** 登录方式 */
export type LoginMethod = 'password' | 'sso' | 'qrcode';

/** 操作审计类型 */
export type AuditAction =
  | 'login'
  | 'logout'
  | 'create'
  | 'update'
  | 'delete'
  | 'query'
  | 'export'
  | 'approve'
  | 'config'
  | 'other';

/** 操作结果 */
export type OperateResult = 'success' | 'failure';

/** 角色编码（12 种预设医院角色） */
export type RoleCode =
  | 'system_admin'
  | 'dept_director'
  | 'chief_physician'
  | 'associate_chief'
  | 'attending'
  | 'resident'
  | 'fellow'
  | 'nurse'
  | 'pharmacist'
  | 'technician'
  | 'patient'
  | 'visitor';

/* ------------------------------------------------------------------ */
/* 用户                                                                 */
/* ------------------------------------------------------------------ */

/** 当前登录用户信息 */
export interface AuthUser {
  id: string;
  username: string;
  realName: string;
  avatar?: string;
  employeeNo: string;
  gender: Gender;
  age?: number;
  deptCode: string;
  deptName: string;
  title: string;
  position?: string;
  phone: string;
  email: string;
  entryDate?: string;
  status: UserStatus;
  roles: Role[];
  roleCodes: RoleCode[];
  permissions: string[];
  dataScope: DataScope;
  lastLoginAt?: string;
  createdAt?: string;
}

/** 用户管理列表项（管理后台视角） */
export interface ManageUser {
  id: string;
  username: string;
  realName: string;
  avatar?: string;
  employeeNo: string;
  gender: Gender;
  age?: number;
  deptCode: string;
  deptName: string;
  title: string;
  position?: string;
  phone: string;
  email: string;
  status: UserStatus;
  roleCodes: RoleCode[];
  roleNames: string[];
  dataScope: DataScope;
  lastLoginAt?: string;
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/* Token / 登录                                                         */
/* ------------------------------------------------------------------ */

export interface AccessToken {
  token: string;
  expiresAt: number;
}

export interface RefreshToken {
  token: string;
  expiresAt: number;
}

/**
 * 持久化到本地的身份快照。
 * 医疗合规：刷新页面必须恢复“登录者本人”的角色与权限，严禁回退为内置超管，
 * 否则任何低权限账号刷新后即越权。故随 Token 一并持久化身份快照，恢复时以其为准。
 */
export interface PersistedIdentity {
  user: AuthUser;
  roles: string[];
  permissions: string[];
}

/** 持久化到本地的加密载荷 */
export interface PersistedAuthPayload {
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: number;
  refreshExpiresAt: number;
  rememberMe: boolean;
  /** 登录者身份快照；缺失时视为不可信旧会话，恢复流程应要求重新登录（不得回退超管） */
  identity?: PersistedIdentity;
}

export interface LoginRequest {
  username: string;
  password: string;
  captcha: string;
  /** 图形验证码会话 ID（与图形验证码配对，服务端据此校验内容） */
  captchaId?: string;
  /** 记住我：缺省为 false（仅会话期有效） */
  rememberMe?: boolean;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: number;
  refreshExpiresAt: number;
  user: AuthUser;
  permissions: string[];
  menus: MenuItem[];
}

/** 图形验证码 */
export interface Captcha {
  captchaId: string;
  image: string;
}

/** 二维码登录状态机 */
export type QrCodeStatus = 'waiting' | 'scanned' | 'confirmed' | 'expired';

export interface QrCodeSession {
  ticket: string;
  image: string;
  status: QrCodeStatus;
  expiresAt: number;
}

/** SSO 提供商配置 */
export interface SsoProvider {
  id: string;
  name: string;
  protocol: 'OAuth2' | 'SAML' | 'CAS';
  icon: string;
  authorizeUrl: string;
}

/* ------------------------------------------------------------------ */
/* 角色 / 权限 / 菜单                                                    */
/* ------------------------------------------------------------------ */

export interface Role {
  id: string;
  code: RoleCode;
  name: string;
  description?: string;
  level: RoleLevel;
  dataScope: DataScope;
  status: 'enabled' | 'disabled';
  userCount: number;
  permissionCount: number;
  permissionCodes: string[];
  inherits?: RoleCode[];
  createdAt: string;
  createdBy: string;
}

export interface PermissionNode {
  id: string;
  code: string;
  name: string;
  type: PermissionType;
  module: string;
  path?: string;
  component?: string;
  icon?: string;
  sort: number;
  visible: boolean;
  status: 'enabled' | 'disabled';
  parentId: string | null;
  children?: PermissionNode[];
}

export interface MenuItem {
  key: string;
  path: string;
  label: string;
  icon?: string;
  sort: number;
  visible: boolean;
  children?: MenuItem[];
}

/* ------------------------------------------------------------------ */
/* 审计 / 登录日志                                                       */
/* ------------------------------------------------------------------ */

export interface AuditLog {
  id: string;
  action: AuditAction;
  module: string;
  content: string;
  operatorId: string;
  operatorName: string;
  operatorNo: string;
  operatorDept: string;
  ip: string;
  location: string;
  device: string;
  result: OperateResult;
  detail?: string;
  requestParams?: string;
  responseData?: string;
  userAgent?: string;
  duration?: number;
  riskLevel: 'low' | 'medium' | 'high';
  createdAt: string;
}

export type LoginResult = 'success' | 'failure';

export interface LoginLog {
  id: string;
  username: string;
  realName: string;
  method: LoginMethod;
  ip: string;
  location: string;
  browser: string;
  os: string;
  deviceType: 'pc' | 'mobile' | 'tablet';
  result: LoginResult;
  failReason?: string;
  isAbnormal: boolean;
  abnormalTypes: string[];
  loginAt: string;
  logoutAt?: string;
  onlineDuration?: number;
}

/* ------------------------------------------------------------------ */
/* 个人中心相关                                                         */
/* ------------------------------------------------------------------ */

export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: 'zh-CN' | 'en-US';
  homePage: 'dashboard' | 'chat' | 'patients';
  fontSize: 'small' | 'middle' | 'large';
  tableSize: 'small' | 'middle' | 'large';
  notifyCritical: boolean;
  notifyMessage: boolean;
  notifyEmail: boolean;
}

export interface LoginDevice {
  id: string;
  name: string;
  browser: string;
  os: string;
  ip: string;
  location: string;
  current: boolean;
  lastActiveAt: string;
}

export interface WorkloadStat {
  outpatientVisits: number;
  discharges: number;
  surgeries: number;
  medicalRecords: number;
  recordPassRate: number;
  qualityScore: number;
}
