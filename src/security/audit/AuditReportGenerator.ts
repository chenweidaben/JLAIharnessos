/**
 * 健澜科技数智医院智能体 - security/audit/AuditReportGenerator.ts
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

/**
 * 健澜科技数智医院智能体 - 审计报告生成器
 *
 * 版权所有 (c) 2026 健澜科技
 * 本文件基于审计日志生成合规所需的各类报告：
 * 等保合规审计报告、电子病历评级审计报告、操作审计报告（按用户/科室/时间）、
 * 异常行为检测报告。支持导出为 Markdown / HTML / JSON。
 *
 * @module security/audit/AuditReportGenerator
 */

import {
  type AuditLogEntry,
  type AuditLogLevel,
  type AuditLogType,
  AuditResult,
  RiskLevel,
} from '../types';

/**
 * 操作审计报告维度
 */
export interface OperationReportOptions {
  /** 起始时间（ISO） */
  startTime?: string;
  /** 结束时间（ISO） */
  endTime?: string;
  /** 按用户聚合 */
  userId?: string;
  /** 按科室聚合 */
  department?: string;
}

/**
 * 用户操作统计
 */
export interface UserOperationStat {
  userId: string;
  userName: string;
  department: string;
  totalOperations: number;
  highRiskOperations: number;
  deniedOperations: number;
  lastOperationAt?: string;
}

/**
 * 异常行为检测结果
 */
export interface AnomalyDetectionResult {
  /** 异常类型 */
  type: string;
  /** 涉及用户 */
  userId: string;
  /** 描述 */
  description: string;
  /** 严重程度 */
  severity: RiskLevel;
  /** 涉及日志数 */
  count: number;
}

/**
 * 审计报告生成器
 *
 * 输入审计日志条目（通常来自 LogStorage.read），输出结构化报告。
 *
 * @example
 * const gen = new AuditReportGenerator(entries);
 * const report = gen.generateOperationReport({ department: '心内科' });
 */
export class AuditReportGenerator {
  private readonly entries: AuditLogEntry[];

  /**
   * 构造审计报告生成器
   *
   * @param entries - 审计日志条目
   */
  constructor(entries: AuditLogEntry[]) {
    this.entries = entries;
  }

  /**
   * 生成操作审计报告（按用户/科室/时间聚合）
   *
   * @param options - 过滤与聚合选项
   * @returns 用户操作统计列表
   */
  public generateOperationReport(options: OperationReportOptions = {}): UserOperationStat[] {
    let filtered = this.entries;
    if (options.startTime) {
      filtered = filtered.filter((e) => e.timestamp >= options.startTime!);
    }
    if (options.endTime) {
      filtered = filtered.filter((e) => e.timestamp <= options.endTime!);
    }
    if (options.userId) {
      filtered = filtered.filter((e) => e.userId === options.userId);
    }
    if (options.department) {
      filtered = filtered.filter((e) => e.userDepartment === options.department);
    }

    const byUser = new Map<string, UserOperationStat>();
    for (const e of filtered) {
      let stat = byUser.get(e.userId);
      if (!stat) {
        stat = {
          userId: e.userId,
          userName: e.userName,
          department: e.userDepartment,
          totalOperations: 0,
          highRiskOperations: 0,
          deniedOperations: 0,
        };
        byUser.set(e.userId, stat);
      }
      stat.totalOperations++;
      if (e.riskLevel === RiskLevel.HIGH || e.riskLevel === RiskLevel.CRITICAL) {
        stat.highRiskOperations++;
      }
      if (e.result === AuditResult.DENIED) {
        stat.deniedOperations++;
      }
      if (!stat.lastOperationAt || e.timestamp > stat.lastOperationAt) {
        stat.lastOperationAt = e.timestamp;
      }
    }
    return Array.from(byUser.values()).sort((a, b) => b.totalOperations - a.totalOperations);
  }

  /**
   * 生成电子病历评级审计报告
   * 覆盖病历读写、签名、删除、审计等关键操作，支撑电子病历五级评审。
   *
   * @returns 报告对象
   */
  public generateEmrRatingReport(): {
    totalEmrOps: number;
    readOps: number;
    writeOps: number;
    deleteOps: number;
    signedOps: number;
    operationsByUser: UserOperationStat[];
  } {
    const emrOps = this.entries.filter(
      (e) => e.operationModule.includes('emr') || e.operationAction.startsWith('EMR_'),
    );
    return {
      totalEmrOps: emrOps.length,
      readOps: emrOps.filter((e) => e.operationAction.includes('READ')).length,
      writeOps: emrOps.filter(
        (e) => e.operationAction.includes('WRITE') || e.operationAction.includes('EDIT'),
      ).length,
      deleteOps: emrOps.filter((e) => e.operationAction.includes('DELETE')).length,
      signedOps: emrOps.filter((e) => e.operationAction.includes('SIGN')).length,
      operationsByUser: this.generateOperationReport(),
    };
  }

  /**
   * 异常行为检测
   * 检测：高频登录失败、批量导出、越权访问、非工作时间访问等。
   *
   * @param thresholds - 阈值配置
   * @returns 异常行为列表
   */
  public detectAnomalies(
    thresholds: {
      failedLoginPerUser?: number;
      bulkExportPerUser?: number;
      offWorkHourStart?: number;
      offWorkHourEnd?: number;
    } = {},
  ): AnomalyDetectionResult[] {
    const {
      failedLoginPerUser = 5,
      bulkExportPerUser = 10,
      offWorkHourStart = 20,
      offWorkHourEnd = 6,
    } = thresholds;

    const anomalies: AnomalyDetectionResult[] = [];

    // 1. 高频登录失败
    const failedLogins = new Map<string, number>();
    for (const e of this.entries) {
      if (e.operationAction === 'AUTH_LOGIN_FAILURE') {
        failedLogins.set(e.userId, (failedLogins.get(e.userId) ?? 0) + 1);
      }
    }
    for (const [userId, count] of failedLogins) {
      if (count >= failedLoginPerUser) {
        anomalies.push({
          type: '高频登录失败',
          userId,
          description: `用户 ${userId} 发生 ${count} 次登录失败，疑似暴力破解`,
          severity: RiskLevel.CRITICAL,
          count,
        });
      }
    }

    // 2. 批量数据导出
    const exports = new Map<string, number>();
    for (const e of this.entries) {
      if (e.operationAction === 'OP_PATIENT_EXPORT' || e.operationAction === 'SEC_BULK_EXPORT') {
        exports.set(e.userId, (exports.get(e.userId) ?? 0) + 1);
      }
    }
    for (const [userId, count] of exports) {
      if (count >= bulkExportPerUser) {
        anomalies.push({
          type: '批量数据导出',
          userId,
          description: `用户 ${userId} 在统计窗口内导出 ${count} 次，疑似数据外泄`,
          severity: RiskLevel.HIGH,
          count,
        });
      }
    }

    // 3. 越权/拒绝访问
    const denied = new Map<string, number>();
    for (const e of this.entries) {
      if (e.result === AuditResult.DENIED || e.operationAction === 'SEC_UNAUTHORIZED_ACCESS') {
        denied.set(e.userId, (denied.get(e.userId) ?? 0) + 1);
      }
    }
    for (const [userId, count] of denied) {
      anomalies.push({
        type: '越权访问尝试',
        userId,
        description: `用户 ${userId} 被拒绝 ${count} 次，疑似越权访问`,
        severity: RiskLevel.HIGH,
        count,
      });
    }

    // 4. 非工作时间访问
    let offWorkCount = 0;
    for (const e of this.entries) {
      const hour = new Date(e.timestamp).getHours();
      if (hour >= offWorkHourStart || hour < offWorkHourEnd) {
        offWorkCount++;
      }
    }
    if (offWorkCount > 0) {
      anomalies.push({
        type: '非工作时间访问',
        userId: 'ALL',
        description: `统计窗口内有 ${offWorkCount} 次操作发生在非工作时段`,
        severity: RiskLevel.MEDIUM,
        count: offWorkCount,
      });
    }

    return anomalies;
  }

  /**
   * 生成等保合规审计报告（Markdown）
   *
   * @returns Markdown 文本
   */
  public generateComplianceReport(): string {
    const total = this.entries.length;
    const byType = new Map<AuditLogType, number>();
    const byLevel = new Map<AuditLogLevel, number>();
    let tamperChecks = 0;

    for (const e of this.entries) {
      byType.set(e.logType, (byType.get(e.logType) ?? 0) + 1);
      byLevel.set(e.level, (byLevel.get(e.level) ?? 0) + 1);
      if (e.logHash && e.prevLogHash) tamperChecks++;
    }

    const lines: string[] = [];
    lines.push('# 等保三级审计日志合规报告');
    lines.push('');
    lines.push(`- 日志总数：${total}`);
    lines.push(
      `- 含哈希链完整性字段：${tamperChecks}（覆盖率 ${total > 0 ? Math.round((tamperChecks / total) * 100) : 0}%）`,
    );
    lines.push('');
    lines.push('## 日志类型分布');
    for (const [type, count] of byType) {
      lines.push(`- ${type}：${count}`);
    }
    lines.push('');
    lines.push('## 日志级别分布');
    for (const [level, count] of byLevel) {
      lines.push(`- ${level}：${count}`);
    }
    lines.push('');
    lines.push('## 异常行为');
    const anomalies = this.detectAnomalies();
    if (anomalies.length === 0) {
      lines.push('未发现异常行为。');
    } else {
      for (const a of anomalies) {
        lines.push(`- [${a.severity}] ${a.type}：${a.description}`);
      }
    }
    return lines.join('\n');
  }

  /**
   * 导出为 JSON
   *
   * @returns JSON 字符串
   */
  public toJson(): string {
    return JSON.stringify(
      {
        total: this.entries.length,
        operationReport: this.generateOperationReport(),
        emrRating: this.generateEmrRatingReport(),
        anomalies: this.detectAnomalies(),
      },
      null,
      2,
    );
  }
}
