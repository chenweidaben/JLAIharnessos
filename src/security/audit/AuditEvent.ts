/**
 * 健澜科技数智医院智能体 - security/audit/AuditEvent.ts
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

/**
 * 健澜科技数智医院智能体 - 审计事件定义
 *
 * 版权所有 (c) 2026 健澜科技
 * 本文件定义所有审计事件类型，涵盖登录/登出、数据查询/修改、
 * 工具调用、权限变更、安全事件等。
 *
 * @module security/audit/AuditEvent
 */

import { AuditLogLevel, AuditLogType, RiskLevel } from '../types';

/**
 * 审计事件类型枚举
 * 定义系统中所有可审计的事件类型
 */
export enum AuditEventType {
  // ===== 认证相关事件 =====
  /** 用户登录成功 */
  LOGIN_SUCCESS = 'AUTH_LOGIN_SUCCESS',
  /** 用户登录失败 */
  LOGIN_FAILURE = 'AUTH_LOGIN_FAILURE',
  /** 用户登出 */
  LOGOUT = 'AUTH_LOGOUT',
  /** MFA验证 */
  MFA_VERIFY = 'AUTH_MFA_VERIFY',
  /** MFA验证失败 */
  MFA_FAILURE = 'AUTH_MFA_FAILURE',
  /** 会话创建 */
  SESSION_CREATE = 'AUTH_SESSION_CREATE',
  /** 会话销毁 */
  SESSION_DESTROY = 'AUTH_SESSION_DESTROY',
  /** 会话超时 */
  SESSION_TIMEOUT = 'AUTH_SESSION_TIMEOUT',
  /** 异常登录检测 */
  ABNORMAL_LOGIN = 'AUTH_ABNORMAL_LOGIN',
  /** 密码修改 */
  PASSWORD_CHANGE = 'AUTH_PASSWORD_CHANGE',
  /** 密码重置 */
  PASSWORD_RESET = 'AUTH_PASSWORD_RESET',

  // ===== 患者数据操作事件 =====
  /** 患者信息查询 */
  PATIENT_READ = 'OP_PATIENT_READ',
  /** 患者建档 */
  PATIENT_CREATE = 'OP_PATIENT_CREATE',
  /** 患者信息修改 */
  PATIENT_UPDATE = 'OP_PATIENT_UPDATE',
  /** 患者信息导出 */
  PATIENT_EXPORT = 'OP_PATIENT_EXPORT',
  /** 患者信息打印 */
  PATIENT_PRINT = 'OP_PATIENT_PRINT',
  /** 跨科室患者访问 */
  PATIENT_CROSS_DEPT_ACCESS = 'OP_PATIENT_CROSS_DEPT',

  // ===== 电子病历操作事件 =====
  /** 病历查阅 */
  EMR_READ = 'OP_EMR_READ',
  /** 病历书写 */
  EMR_WRITE = 'OP_EMR_WRITE',
  /** 病历修改 */
  EMR_EDIT = 'OP_EMR_EDIT',
  /** 病历删除 */
  EMR_DELETE = 'OP_EMR_DELETE',
  /** 病历签名 */
  EMR_SIGN = 'OP_EMR_SIGN',
  /** 病历打印 */
  EMR_PRINT = 'OP_EMR_PRINT',
  /** 病历归档 */
  EMR_ARCHIVE = 'OP_EMR_ARCHIVE',

  // ===== 医嘱操作事件 =====
  /** 医嘱开具 */
  ORDER_CREATE = 'OP_ORDER_CREATE',
  /** 医嘱取消 */
  ORDER_CANCEL = 'OP_ORDER_CANCEL',
  /** 医嘱执行 */
  ORDER_EXECUTE = 'OP_ORDER_EXECUTE',
  /** 医嘱审核 */
  ORDER_AUDIT = 'OP_ORDER_AUDIT',
  /** 医嘱查看 */
  ORDER_VIEW = 'OP_ORDER_VIEW',

  // ===== 处方操作事件 =====
  /** 处方开具 */
  PRESCRIPTION_CREATE = 'OP_PRESCRIPTION_CREATE',
  /** 处方审核 */
  PRESCRIPTION_AUDIT = 'OP_PRESCRIPTION_AUDIT',
  /** 处方调配 */
  PRESCRIPTION_DISPENSE = 'OP_PRESCRIPTION_DISPENSE',
  /** 处方查看 */
  PRESCRIPTION_VIEW = 'OP_PRESCRIPTION_VIEW',

  // ===== 检验检查事件 =====
  /** 检验申请 */
  LAB_ORDER = 'OP_LAB_ORDER',
  /** 检验结果查看 */
  LAB_RESULT_VIEW = 'OP_LAB_RESULT_VIEW',
  /** 危急值处理 */
  LAB_CRITICAL = 'OP_LAB_CRITICAL',
  /** 影像申请 */
  IMAGING_ORDER = 'OP_IMAGING_ORDER',
  /** 影像报告查看 */
  IMAGING_REPORT_VIEW = 'OP_IMAGING_REPORT_VIEW',
  /** 影像调阅 */
  IMAGING_VIEW = 'OP_IMAGING_VIEW',
  /** 影像AI分析 */
  IMAGING_AI_ANALYSIS = 'OP_IMAGING_AI',

  // ===== Agent操作事件 =====
  /** Agent工具调用 */
  AGENT_TOOL_CALL = 'AGENT_TOOL_CALL',
  /** Agent会话启动 */
  AGENT_SESSION_START = 'AGENT_SESSION_START',
  /** Agent会话结束 */
  AGENT_SESSION_END = 'AGENT_SESSION_END',
  /** Agent用户确认操作 */
  AGENT_USER_CONFIRM = 'AGENT_USER_CONFIRM',
  /** Agent用户拒绝操作 */
  AGENT_USER_REJECT = 'AGENT_USER_REJECT',
  /** Agent决策记录 */
  AGENT_DECISION = 'AGENT_DECISION',
  /** Agent异常行为 */
  AGENT_ABNORMAL = 'AGENT_ABNORMAL',

  // ===== 权限管理事件 =====
  /** 用户创建 */
  USER_CREATE = 'SYS_USER_CREATE',
  /** 用户删除 */
  USER_DELETE = 'SYS_USER_DELETE',
  /** 用户修改 */
  USER_UPDATE = 'SYS_USER_UPDATE',
  /** 角色创建 */
  ROLE_CREATE = 'SYS_ROLE_CREATE',
  /** 角色修改 */
  ROLE_UPDATE = 'SYS_ROLE_UPDATE',
  /** 角色删除 */
  ROLE_DELETE = 'SYS_ROLE_DELETE',
  /** 权限分配 */
  PERMISSION_ASSIGN = 'SYS_PERMISSION_ASSIGN',
  /** 权限变更 */
  PERMISSION_CHANGE = 'SYS_PERMISSION_CHANGE',
  /** 临时权限申请 */
  PERMISSION_REQUEST = 'SYS_PERMISSION_REQUEST',
  /** 临时权限审批 */
  PERMISSION_APPROVE = 'SYS_PERMISSION_APPROVE',

  // ===== 系统管理事件 =====
  /** 系统启动 */
  SYSTEM_START = 'SYS_START',
  /** 系统停止 */
  SYSTEM_STOP = 'SYS_STOP',
  /** 配置变更 */
  CONFIG_CHANGE = 'SYS_CONFIG_CHANGE',
  /** 集成接口配置变更 */
  INTEGRATION_CONFIG_CHANGE = 'SYS_INTEGRATION_CHANGE',
  /** 数据备份 */
  DATA_BACKUP = 'SYS_DATA_BACKUP',
  /** 数据恢复 */
  DATA_RESTORE = 'SYS_DATA_RESTORE',

  // ===== 安全事件 =====
  /** 越权访问尝试 */
  UNAUTHORIZED_ACCESS = 'SEC_UNAUTHORIZED_ACCESS',
  /** SQL注入检测 */
  SQL_INJECTION_DETECTED = 'SEC_SQL_INJECTION',
  /** 命令注入检测 */
  COMMAND_INJECTION_DETECTED = 'SEC_COMMAND_INJECTION',
  /** XSS攻击检测 */
  XSS_DETECTED = 'SEC_XSS',
  /** Prompt注入检测 */
  PROMPT_INJECTION_DETECTED = 'SEC_PROMPT_INJECTION',
  /** 暴力破解检测 */
  BRUTE_FORCE_DETECTED = 'SEC_BRUTE_FORCE',
  /** 批量数据导出告警 */
  BULK_EXPORT_ALERT = 'SEC_BULK_EXPORT',
  /** 敏感数据访问告警 */
  SENSITIVE_DATA_ACCESS = 'SEC_SENSITIVE_DATA_ACCESS',
  /** 日志篡改检测 */
  LOG_TAMPERING_DETECTED = 'SEC_LOG_TAMPERING',
  /** 数据泄露检测 */
  DATA_LEAK_DETECTED = 'SEC_DATA_LEAK',
  /** 异常登录告警 */
  ABNORMAL_LOGIN_ALERT = 'SEC_ABNORMAL_LOGIN',
  /** 会话劫持检测 */
  SESSION_HIJACKING = 'SEC_SESSION_HIJACKING',
}

/**
 * 审计事件元数据
 * 每个事件类型对应的默认配置
 */
export interface AuditEventMetadata {
  eventType: AuditEventType;
  logType: AuditLogType;
  defaultLevel: AuditLogLevel;
  defaultRiskLevel: RiskLevel;
  /** 是否需要记录参数 */
  recordParameters: boolean;
  /** 是否需要脱敏参数 */
  desensitizeParameters: boolean;
  /** 事件描述 */
  description: string;
}

/**
 * 审计事件元数据表
 * 定义所有事件类型的默认元数据
 */
export const AUDIT_EVENT_METADATA: Record<AuditEventType, AuditEventMetadata> = {
  // 认证事件
  [AuditEventType.LOGIN_SUCCESS]: {
    eventType: AuditEventType.LOGIN_SUCCESS,
    logType: AuditLogType.AUTH,
    defaultLevel: AuditLogLevel.INFO,
    defaultRiskLevel: RiskLevel.LOW,
    recordParameters: false,
    desensitizeParameters: false,
    description: '用户登录成功',
  },
  [AuditEventType.LOGIN_FAILURE]: {
    eventType: AuditEventType.LOGIN_FAILURE,
    logType: AuditLogType.AUTH,
    defaultLevel: AuditLogLevel.WARN,
    defaultRiskLevel: RiskLevel.MEDIUM,
    recordParameters: true,
    desensitizeParameters: false,
    description: '用户登录失败',
  },
  [AuditEventType.LOGOUT]: {
    eventType: AuditEventType.LOGOUT,
    logType: AuditLogType.AUTH,
    defaultLevel: AuditLogLevel.INFO,
    defaultRiskLevel: RiskLevel.LOW,
    recordParameters: false,
    desensitizeParameters: false,
    description: '用户登出',
  },
  [AuditEventType.MFA_VERIFY]: {
    eventType: AuditEventType.MFA_VERIFY,
    logType: AuditLogType.AUTH,
    defaultLevel: AuditLogLevel.INFO,
    defaultRiskLevel: RiskLevel.LOW,
    recordParameters: false,
    desensitizeParameters: false,
    description: 'MFA验证',
  },
  [AuditEventType.MFA_FAILURE]: {
    eventType: AuditEventType.MFA_FAILURE,
    logType: AuditLogType.AUTH,
    defaultLevel: AuditLogLevel.WARN,
    defaultRiskLevel: RiskLevel.MEDIUM,
    recordParameters: false,
    desensitizeParameters: false,
    description: 'MFA验证失败',
  },
  [AuditEventType.SESSION_CREATE]: {
    eventType: AuditEventType.SESSION_CREATE,
    logType: AuditLogType.AUTH,
    defaultLevel: AuditLogLevel.INFO,
    defaultRiskLevel: RiskLevel.LOW,
    recordParameters: false,
    desensitizeParameters: false,
    description: '会话创建',
  },
  [AuditEventType.SESSION_DESTROY]: {
    eventType: AuditEventType.SESSION_DESTROY,
    logType: AuditLogType.AUTH,
    defaultLevel: AuditLogLevel.INFO,
    defaultRiskLevel: RiskLevel.LOW,
    recordParameters: false,
    desensitizeParameters: false,
    description: '会话销毁',
  },
  [AuditEventType.SESSION_TIMEOUT]: {
    eventType: AuditEventType.SESSION_TIMEOUT,
    logType: AuditLogType.AUTH,
    defaultLevel: AuditLogLevel.WARN,
    defaultRiskLevel: RiskLevel.LOW,
    recordParameters: false,
    desensitizeParameters: false,
    description: '会话超时',
  },
  [AuditEventType.ABNORMAL_LOGIN]: {
    eventType: AuditEventType.ABNORMAL_LOGIN,
    logType: AuditLogType.AUTH,
    defaultLevel: AuditLogLevel.WARN,
    defaultRiskLevel: RiskLevel.MEDIUM,
    recordParameters: true,
    desensitizeParameters: false,
    description: '异常登录检测',
  },
  [AuditEventType.PASSWORD_CHANGE]: {
    eventType: AuditEventType.PASSWORD_CHANGE,
    logType: AuditLogType.AUTH,
    defaultLevel: AuditLogLevel.INFO,
    defaultRiskLevel: RiskLevel.LOW,
    recordParameters: false,
    desensitizeParameters: false,
    description: '密码修改',
  },
  [AuditEventType.PASSWORD_RESET]: {
    eventType: AuditEventType.PASSWORD_RESET,
    logType: AuditLogType.AUTH,
    defaultLevel: AuditLogLevel.WARN,
    defaultRiskLevel: RiskLevel.MEDIUM,
    recordParameters: false,
    desensitizeParameters: false,
    description: '密码重置',
  },

  // 患者数据操作
  [AuditEventType.PATIENT_READ]: {
    eventType: AuditEventType.PATIENT_READ,
    logType: AuditLogType.DATA_ACCESS,
    defaultLevel: AuditLogLevel.INFO,
    defaultRiskLevel: RiskLevel.LOW,
    recordParameters: true,
    desensitizeParameters: true,
    description: '患者信息查询',
  },
  [AuditEventType.PATIENT_CREATE]: {
    eventType: AuditEventType.PATIENT_CREATE,
    logType: AuditLogType.OPERATION,
    defaultLevel: AuditLogLevel.INFO,
    defaultRiskLevel: RiskLevel.LOW,
    recordParameters: true,
    desensitizeParameters: true,
    description: '患者建档',
  },
  [AuditEventType.PATIENT_UPDATE]: {
    eventType: AuditEventType.PATIENT_UPDATE,
    logType: AuditLogType.OPERATION,
    defaultLevel: AuditLogLevel.INFO,
    defaultRiskLevel: RiskLevel.LOW,
    recordParameters: true,
    desensitizeParameters: true,
    description: '患者信息修改',
  },
  [AuditEventType.PATIENT_EXPORT]: {
    eventType: AuditEventType.PATIENT_EXPORT,
    logType: AuditLogType.DATA_ACCESS,
    defaultLevel: AuditLogLevel.WARN,
    defaultRiskLevel: RiskLevel.HIGH,
    recordParameters: true,
    desensitizeParameters: true,
    description: '患者信息导出',
  },
  [AuditEventType.PATIENT_PRINT]: {
    eventType: AuditEventType.PATIENT_PRINT,
    logType: AuditLogType.DATA_ACCESS,
    defaultLevel: AuditLogLevel.INFO,
    defaultRiskLevel: RiskLevel.LOW,
    recordParameters: true,
    desensitizeParameters: true,
    description: '患者信息打印',
  },
  [AuditEventType.PATIENT_CROSS_DEPT_ACCESS]: {
    eventType: AuditEventType.PATIENT_CROSS_DEPT_ACCESS,
    logType: AuditLogType.DATA_ACCESS,
    defaultLevel: AuditLogLevel.WARN,
    defaultRiskLevel: RiskLevel.MEDIUM,
    recordParameters: true,
    desensitizeParameters: true,
    description: '跨科室患者访问',
  },

  // 电子病历操作
  [AuditEventType.EMR_READ]: {
    eventType: AuditEventType.EMR_READ,
    logType: AuditLogType.DATA_ACCESS,
    defaultLevel: AuditLogLevel.INFO,
    defaultRiskLevel: RiskLevel.LOW,
    recordParameters: true,
    desensitizeParameters: true,
    description: '病历查阅',
  },
  [AuditEventType.EMR_WRITE]: {
    eventType: AuditEventType.EMR_WRITE,
    logType: AuditLogType.OPERATION,
    defaultLevel: AuditLogLevel.INFO,
    defaultRiskLevel: RiskLevel.LOW,
    recordParameters: true,
    desensitizeParameters: true,
    description: '病历书写',
  },
  [AuditEventType.EMR_EDIT]: {
    eventType: AuditEventType.EMR_EDIT,
    logType: AuditLogType.OPERATION,
    defaultLevel: AuditLogLevel.WARN,
    defaultRiskLevel: RiskLevel.MEDIUM,
    recordParameters: true,
    desensitizeParameters: true,
    description: '病历修改',
  },
  [AuditEventType.EMR_DELETE]: {
    eventType: AuditEventType.EMR_DELETE,
    logType: AuditLogType.OPERATION,
    defaultLevel: AuditLogLevel.CRITICAL,
    defaultRiskLevel: RiskLevel.HIGH,
    recordParameters: true,
    desensitizeParameters: true,
    description: '病历删除',
  },
  [AuditEventType.EMR_SIGN]: {
    eventType: AuditEventType.EMR_SIGN,
    logType: AuditLogType.OPERATION,
    defaultLevel: AuditLogLevel.INFO,
    defaultRiskLevel: RiskLevel.LOW,
    recordParameters: false,
    desensitizeParameters: false,
    description: '病历签名',
  },
  [AuditEventType.EMR_PRINT]: {
    eventType: AuditEventType.EMR_PRINT,
    logType: AuditLogType.DATA_ACCESS,
    defaultLevel: AuditLogLevel.INFO,
    defaultRiskLevel: RiskLevel.LOW,
    recordParameters: true,
    desensitizeParameters: true,
    description: '病历打印',
  },
  [AuditEventType.EMR_ARCHIVE]: {
    eventType: AuditEventType.EMR_ARCHIVE,
    logType: AuditLogType.OPERATION,
    defaultLevel: AuditLogLevel.INFO,
    defaultRiskLevel: RiskLevel.LOW,
    recordParameters: false,
    desensitizeParameters: false,
    description: '病历归档',
  },

  // 医嘱操作
  [AuditEventType.ORDER_CREATE]: {
    eventType: AuditEventType.ORDER_CREATE,
    logType: AuditLogType.OPERATION,
    defaultLevel: AuditLogLevel.INFO,
    defaultRiskLevel: RiskLevel.MEDIUM,
    recordParameters: true,
    desensitizeParameters: true,
    description: '医嘱开具',
  },
  [AuditEventType.ORDER_CANCEL]: {
    eventType: AuditEventType.ORDER_CANCEL,
    logType: AuditLogType.OPERATION,
    defaultLevel: AuditLogLevel.WARN,
    defaultRiskLevel: RiskLevel.MEDIUM,
    recordParameters: true,
    desensitizeParameters: true,
    description: '医嘱取消',
  },
  [AuditEventType.ORDER_EXECUTE]: {
    eventType: AuditEventType.ORDER_EXECUTE,
    logType: AuditLogType.OPERATION,
    defaultLevel: AuditLogLevel.INFO,
    defaultRiskLevel: RiskLevel.LOW,
    recordParameters: true,
    desensitizeParameters: true,
    description: '医嘱执行',
  },
  [AuditEventType.ORDER_AUDIT]: {
    eventType: AuditEventType.ORDER_AUDIT,
    logType: AuditLogType.OPERATION,
    defaultLevel: AuditLogLevel.INFO,
    defaultRiskLevel: RiskLevel.LOW,
    recordParameters: true,
    desensitizeParameters: true,
    description: '医嘱审核',
  },
  [AuditEventType.ORDER_VIEW]: {
    eventType: AuditEventType.ORDER_VIEW,
    logType: AuditLogType.DATA_ACCESS,
    defaultLevel: AuditLogLevel.INFO,
    defaultRiskLevel: RiskLevel.LOW,
    recordParameters: true,
    desensitizeParameters: true,
    description: '医嘱查看',
  },

  // 处方操作
  [AuditEventType.PRESCRIPTION_CREATE]: {
    eventType: AuditEventType.PRESCRIPTION_CREATE,
    logType: AuditLogType.OPERATION,
    defaultLevel: AuditLogLevel.INFO,
    defaultRiskLevel: RiskLevel.HIGH,
    recordParameters: true,
    desensitizeParameters: true,
    description: '处方开具',
  },
  [AuditEventType.PRESCRIPTION_AUDIT]: {
    eventType: AuditEventType.PRESCRIPTION_AUDIT,
    logType: AuditLogType.OPERATION,
    defaultLevel: AuditLogLevel.INFO,
    defaultRiskLevel: RiskLevel.MEDIUM,
    recordParameters: true,
    desensitizeParameters: true,
    description: '处方审核',
  },
  [AuditEventType.PRESCRIPTION_DISPENSE]: {
    eventType: AuditEventType.PRESCRIPTION_DISPENSE,
    logType: AuditLogType.OPERATION,
    defaultLevel: AuditLogLevel.INFO,
    defaultRiskLevel: RiskLevel.LOW,
    recordParameters: true,
    desensitizeParameters: true,
    description: '处方调配',
  },
  [AuditEventType.PRESCRIPTION_VIEW]: {
    eventType: AuditEventType.PRESCRIPTION_VIEW,
    logType: AuditLogType.DATA_ACCESS,
    defaultLevel: AuditLogLevel.INFO,
    defaultRiskLevel: RiskLevel.LOW,
    recordParameters: true,
    desensitizeParameters: true,
    description: '处方查看',
  },

  // 检验检查
  [AuditEventType.LAB_ORDER]: {
    eventType: AuditEventType.LAB_ORDER,
    logType: AuditLogType.OPERATION,
    defaultLevel: AuditLogLevel.INFO,
    defaultRiskLevel: RiskLevel.LOW,
    recordParameters: true,
    desensitizeParameters: true,
    description: '检验申请',
  },
  [AuditEventType.LAB_RESULT_VIEW]: {
    eventType: AuditEventType.LAB_RESULT_VIEW,
    logType: AuditLogType.DATA_ACCESS,
    defaultLevel: AuditLogLevel.INFO,
    defaultRiskLevel: RiskLevel.LOW,
    recordParameters: true,
    desensitizeParameters: true,
    description: '检验结果查看',
  },
  [AuditEventType.LAB_CRITICAL]: {
    eventType: AuditEventType.LAB_CRITICAL,
    logType: AuditLogType.OPERATION,
    defaultLevel: AuditLogLevel.WARN,
    defaultRiskLevel: RiskLevel.HIGH,
    recordParameters: true,
    desensitizeParameters: true,
    description: '危急值处理',
  },
  [AuditEventType.IMAGING_ORDER]: {
    eventType: AuditEventType.IMAGING_ORDER,
    logType: AuditLogType.OPERATION,
    defaultLevel: AuditLogLevel.INFO,
    defaultRiskLevel: RiskLevel.LOW,
    recordParameters: true,
    desensitizeParameters: true,
    description: '影像申请',
  },
  [AuditEventType.IMAGING_REPORT_VIEW]: {
    eventType: AuditEventType.IMAGING_REPORT_VIEW,
    logType: AuditLogType.DATA_ACCESS,
    defaultLevel: AuditLogLevel.INFO,
    defaultRiskLevel: RiskLevel.LOW,
    recordParameters: true,
    desensitizeParameters: true,
    description: '影像报告查看',
  },
  [AuditEventType.IMAGING_VIEW]: {
    eventType: AuditEventType.IMAGING_VIEW,
    logType: AuditLogType.DATA_ACCESS,
    defaultLevel: AuditLogLevel.INFO,
    defaultRiskLevel: RiskLevel.LOW,
    recordParameters: true,
    desensitizeParameters: true,
    description: '影像调阅',
  },
  [AuditEventType.IMAGING_AI_ANALYSIS]: {
    eventType: AuditEventType.IMAGING_AI_ANALYSIS,
    logType: AuditLogType.AGENT,
    defaultLevel: AuditLogLevel.INFO,
    defaultRiskLevel: RiskLevel.LOW,
    recordParameters: true,
    desensitizeParameters: true,
    description: '影像AI分析',
  },

  // Agent操作
  [AuditEventType.AGENT_TOOL_CALL]: {
    eventType: AuditEventType.AGENT_TOOL_CALL,
    logType: AuditLogType.AGENT,
    defaultLevel: AuditLogLevel.INFO,
    defaultRiskLevel: RiskLevel.MEDIUM,
    recordParameters: true,
    desensitizeParameters: true,
    description: 'Agent工具调用',
  },
  [AuditEventType.AGENT_SESSION_START]: {
    eventType: AuditEventType.AGENT_SESSION_START,
    logType: AuditLogType.AGENT,
    defaultLevel: AuditLogLevel.INFO,
    defaultRiskLevel: RiskLevel.LOW,
    recordParameters: false,
    desensitizeParameters: false,
    description: 'Agent会话启动',
  },
  [AuditEventType.AGENT_SESSION_END]: {
    eventType: AuditEventType.AGENT_SESSION_END,
    logType: AuditLogType.AGENT,
    defaultLevel: AuditLogLevel.INFO,
    defaultRiskLevel: RiskLevel.LOW,
    recordParameters: false,
    desensitizeParameters: false,
    description: 'Agent会话结束',
  },
  [AuditEventType.AGENT_USER_CONFIRM]: {
    eventType: AuditEventType.AGENT_USER_CONFIRM,
    logType: AuditLogType.AGENT,
    defaultLevel: AuditLogLevel.INFO,
    defaultRiskLevel: RiskLevel.LOW,
    recordParameters: true,
    desensitizeParameters: true,
    description: 'Agent用户确认操作',
  },
  [AuditEventType.AGENT_USER_REJECT]: {
    eventType: AuditEventType.AGENT_USER_REJECT,
    logType: AuditLogType.AGENT,
    defaultLevel: AuditLogLevel.INFO,
    defaultRiskLevel: RiskLevel.LOW,
    recordParameters: true,
    desensitizeParameters: true,
    description: 'Agent用户拒绝操作',
  },
  [AuditEventType.AGENT_DECISION]: {
    eventType: AuditEventType.AGENT_DECISION,
    logType: AuditLogType.AGENT,
    defaultLevel: AuditLogLevel.INFO,
    defaultRiskLevel: RiskLevel.LOW,
    recordParameters: true,
    desensitizeParameters: true,
    description: 'Agent决策记录',
  },
  [AuditEventType.AGENT_ABNORMAL]: {
    eventType: AuditEventType.AGENT_ABNORMAL,
    logType: AuditLogType.AGENT,
    defaultLevel: AuditLogLevel.ERROR,
    defaultRiskLevel: RiskLevel.HIGH,
    recordParameters: true,
    desensitizeParameters: true,
    description: 'Agent异常行为',
  },

  // 权限管理
  [AuditEventType.USER_CREATE]: {
    eventType: AuditEventType.USER_CREATE,
    logType: AuditLogType.SYSTEM,
    defaultLevel: AuditLogLevel.WARN,
    defaultRiskLevel: RiskLevel.MEDIUM,
    recordParameters: true,
    desensitizeParameters: true,
    description: '用户创建',
  },
  [AuditEventType.USER_DELETE]: {
    eventType: AuditEventType.USER_DELETE,
    logType: AuditLogType.SYSTEM,
    defaultLevel: AuditLogLevel.CRITICAL,
    defaultRiskLevel: RiskLevel.HIGH,
    recordParameters: true,
    desensitizeParameters: true,
    description: '用户删除',
  },
  [AuditEventType.USER_UPDATE]: {
    eventType: AuditEventType.USER_UPDATE,
    logType: AuditLogType.SYSTEM,
    defaultLevel: AuditLogLevel.WARN,
    defaultRiskLevel: RiskLevel.MEDIUM,
    recordParameters: true,
    desensitizeParameters: true,
    description: '用户修改',
  },
  [AuditEventType.ROLE_CREATE]: {
    eventType: AuditEventType.ROLE_CREATE,
    logType: AuditLogType.SYSTEM,
    defaultLevel: AuditLogLevel.WARN,
    defaultRiskLevel: RiskLevel.MEDIUM,
    recordParameters: true,
    desensitizeParameters: false,
    description: '角色创建',
  },
  [AuditEventType.ROLE_UPDATE]: {
    eventType: AuditEventType.ROLE_UPDATE,
    logType: AuditLogType.SYSTEM,
    defaultLevel: AuditLogLevel.WARN,
    defaultRiskLevel: RiskLevel.MEDIUM,
    recordParameters: true,
    desensitizeParameters: false,
    description: '角色修改',
  },
  [AuditEventType.ROLE_DELETE]: {
    eventType: AuditEventType.ROLE_DELETE,
    logType: AuditLogType.SYSTEM,
    defaultLevel: AuditLogLevel.CRITICAL,
    defaultRiskLevel: RiskLevel.HIGH,
    recordParameters: true,
    desensitizeParameters: false,
    description: '角色删除',
  },
  [AuditEventType.PERMISSION_ASSIGN]: {
    eventType: AuditEventType.PERMISSION_ASSIGN,
    logType: AuditLogType.SYSTEM,
    defaultLevel: AuditLogLevel.WARN,
    defaultRiskLevel: RiskLevel.MEDIUM,
    recordParameters: true,
    desensitizeParameters: false,
    description: '权限分配',
  },
  [AuditEventType.PERMISSION_CHANGE]: {
    eventType: AuditEventType.PERMISSION_CHANGE,
    logType: AuditLogType.SYSTEM,
    defaultLevel: AuditLogLevel.WARN,
    defaultRiskLevel: RiskLevel.MEDIUM,
    recordParameters: true,
    desensitizeParameters: false,
    description: '权限变更',
  },
  [AuditEventType.PERMISSION_REQUEST]: {
    eventType: AuditEventType.PERMISSION_REQUEST,
    logType: AuditLogType.SYSTEM,
    defaultLevel: AuditLogLevel.INFO,
    defaultRiskLevel: RiskLevel.LOW,
    recordParameters: true,
    desensitizeParameters: false,
    description: '临时权限申请',
  },
  [AuditEventType.PERMISSION_APPROVE]: {
    eventType: AuditEventType.PERMISSION_APPROVE,
    logType: AuditLogType.SYSTEM,
    defaultLevel: AuditLogLevel.WARN,
    defaultRiskLevel: RiskLevel.MEDIUM,
    recordParameters: true,
    desensitizeParameters: false,
    description: '临时权限审批',
  },

  // 系统管理
  [AuditEventType.SYSTEM_START]: {
    eventType: AuditEventType.SYSTEM_START,
    logType: AuditLogType.SYSTEM,
    defaultLevel: AuditLogLevel.INFO,
    defaultRiskLevel: RiskLevel.LOW,
    recordParameters: false,
    desensitizeParameters: false,
    description: '系统启动',
  },
  [AuditEventType.SYSTEM_STOP]: {
    eventType: AuditEventType.SYSTEM_STOP,
    logType: AuditLogType.SYSTEM,
    defaultLevel: AuditLogLevel.WARN,
    defaultRiskLevel: RiskLevel.MEDIUM,
    recordParameters: false,
    desensitizeParameters: false,
    description: '系统停止',
  },
  [AuditEventType.CONFIG_CHANGE]: {
    eventType: AuditEventType.CONFIG_CHANGE,
    logType: AuditLogType.SYSTEM,
    defaultLevel: AuditLogLevel.WARN,
    defaultRiskLevel: RiskLevel.MEDIUM,
    recordParameters: true,
    desensitizeParameters: false,
    description: '配置变更',
  },
  [AuditEventType.INTEGRATION_CONFIG_CHANGE]: {
    eventType: AuditEventType.INTEGRATION_CONFIG_CHANGE,
    logType: AuditLogType.SYSTEM,
    defaultLevel: AuditLogLevel.WARN,
    defaultRiskLevel: RiskLevel.MEDIUM,
    recordParameters: true,
    desensitizeParameters: false,
    description: '集成接口配置变更',
  },
  [AuditEventType.DATA_BACKUP]: {
    eventType: AuditEventType.DATA_BACKUP,
    logType: AuditLogType.SYSTEM,
    defaultLevel: AuditLogLevel.INFO,
    defaultRiskLevel: RiskLevel.LOW,
    recordParameters: true,
    desensitizeParameters: false,
    description: '数据备份',
  },
  [AuditEventType.DATA_RESTORE]: {
    eventType: AuditEventType.DATA_RESTORE,
    logType: AuditLogType.SYSTEM,
    defaultLevel: AuditLogLevel.CRITICAL,
    defaultRiskLevel: RiskLevel.HIGH,
    recordParameters: true,
    desensitizeParameters: false,
    description: '数据恢复',
  },

  // 安全事件
  [AuditEventType.UNAUTHORIZED_ACCESS]: {
    eventType: AuditEventType.UNAUTHORIZED_ACCESS,
    logType: AuditLogType.SECURITY,
    defaultLevel: AuditLogLevel.ERROR,
    defaultRiskLevel: RiskLevel.HIGH,
    recordParameters: true,
    desensitizeParameters: true,
    description: '越权访问尝试',
  },
  [AuditEventType.SQL_INJECTION_DETECTED]: {
    eventType: AuditEventType.SQL_INJECTION_DETECTED,
    logType: AuditLogType.SECURITY,
    defaultLevel: AuditLogLevel.CRITICAL,
    defaultRiskLevel: RiskLevel.CRITICAL,
    recordParameters: true,
    desensitizeParameters: false,
    description: 'SQL注入检测',
  },
  [AuditEventType.COMMAND_INJECTION_DETECTED]: {
    eventType: AuditEventType.COMMAND_INJECTION_DETECTED,
    logType: AuditLogType.SECURITY,
    defaultLevel: AuditLogLevel.CRITICAL,
    defaultRiskLevel: RiskLevel.CRITICAL,
    recordParameters: true,
    desensitizeParameters: false,
    description: '命令注入检测',
  },
  [AuditEventType.XSS_DETECTED]: {
    eventType: AuditEventType.XSS_DETECTED,
    logType: AuditLogType.SECURITY,
    defaultLevel: AuditLogLevel.ERROR,
    defaultRiskLevel: RiskLevel.HIGH,
    recordParameters: true,
    desensitizeParameters: false,
    description: 'XSS攻击检测',
  },
  [AuditEventType.PROMPT_INJECTION_DETECTED]: {
    eventType: AuditEventType.PROMPT_INJECTION_DETECTED,
    logType: AuditLogType.SECURITY,
    defaultLevel: AuditLogLevel.ERROR,
    defaultRiskLevel: RiskLevel.HIGH,
    recordParameters: true,
    desensitizeParameters: false,
    description: 'Prompt注入检测',
  },
  [AuditEventType.BRUTE_FORCE_DETECTED]: {
    eventType: AuditEventType.BRUTE_FORCE_DETECTED,
    logType: AuditLogType.SECURITY,
    defaultLevel: AuditLogLevel.CRITICAL,
    defaultRiskLevel: RiskLevel.CRITICAL,
    recordParameters: true,
    desensitizeParameters: false,
    description: '暴力破解检测',
  },
  [AuditEventType.BULK_EXPORT_ALERT]: {
    eventType: AuditEventType.BULK_EXPORT_ALERT,
    logType: AuditLogType.SECURITY,
    defaultLevel: AuditLogLevel.CRITICAL,
    defaultRiskLevel: RiskLevel.HIGH,
    recordParameters: true,
    desensitizeParameters: true,
    description: '批量数据导出告警',
  },
  [AuditEventType.SENSITIVE_DATA_ACCESS]: {
    eventType: AuditEventType.SENSITIVE_DATA_ACCESS,
    logType: AuditLogType.SECURITY,
    defaultLevel: AuditLogLevel.ERROR,
    defaultRiskLevel: RiskLevel.HIGH,
    recordParameters: true,
    desensitizeParameters: true,
    description: '敏感数据访问告警',
  },
  [AuditEventType.LOG_TAMPERING_DETECTED]: {
    eventType: AuditEventType.LOG_TAMPERING_DETECTED,
    logType: AuditLogType.SECURITY,
    defaultLevel: AuditLogLevel.CRITICAL,
    defaultRiskLevel: RiskLevel.CRITICAL,
    recordParameters: true,
    desensitizeParameters: false,
    description: '日志篡改检测',
  },
  [AuditEventType.DATA_LEAK_DETECTED]: {
    eventType: AuditEventType.DATA_LEAK_DETECTED,
    logType: AuditLogType.SECURITY,
    defaultLevel: AuditLogLevel.CRITICAL,
    defaultRiskLevel: RiskLevel.CRITICAL,
    recordParameters: true,
    desensitizeParameters: true,
    description: '数据泄露检测',
  },
  [AuditEventType.ABNORMAL_LOGIN_ALERT]: {
    eventType: AuditEventType.ABNORMAL_LOGIN_ALERT,
    logType: AuditLogType.SECURITY,
    defaultLevel: AuditLogLevel.ERROR,
    defaultRiskLevel: RiskLevel.HIGH,
    recordParameters: true,
    desensitizeParameters: false,
    description: '异常登录告警',
  },
  [AuditEventType.SESSION_HIJACKING]: {
    eventType: AuditEventType.SESSION_HIJACKING,
    logType: AuditLogType.SECURITY,
    defaultLevel: AuditLogLevel.CRITICAL,
    defaultRiskLevel: RiskLevel.CRITICAL,
    recordParameters: true,
    desensitizeParameters: false,
    description: '会话劫持检测',
  },
};

/**
 * 获取审计事件元数据
 *
 * @param eventType - 事件类型
 * @returns 事件元数据
 */
export function getAuditEventMetadata(eventType: AuditEventType): AuditEventMetadata {
  return AUDIT_EVENT_METADATA[eventType];
}
