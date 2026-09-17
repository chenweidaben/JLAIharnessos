/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 */

import type { EncounterSummary, LabResult, Order, PatientSummary } from '@/types';

import { estimateTokens } from './TokenBudgetTracker';

/**
 * 医疗上下文数据快照
 *
 * 由上层（集成层/集成总线）从各系统拉取后注入，
 * MedicalContextBuilder 负责将其渲染为模型可读的文本片段。
 */
export interface MedicalContextData {
  /** 当前患者摘要 */
  patient?: PatientSummary;
  /** 当前就诊摘要 */
  encounter?: EncounterSummary;
  /** 活跃医嘱列表 */
  activeOrders?: readonly Order[];
  /** 近期检验报告（按时间倒序） */
  recentLabs?: readonly LabResult[];
}

/**
 * 各片段文本及其 Token 估算
 */
export interface ContextSegment {
  /** 片段标题 */
  title: string;
  /** 片段文本 */
  text: string;
  /** 估算 Token 数 */
  tokens: number;
}

/**
 * 医疗上下文构建结果
 */
export interface BuiltMedicalContext {
  /** 拼接后的完整上下文文本 */
  text: string;
  /** 各片段明细（用于 Token 预算分配与展示） */
  segments: readonly ContextSegment[];
  /** 各片段 Token 数（供 TokenBudgetTracker.setComponent 使用） */
  tokens: {
    patientSummary: number;
    encounterSummary: number;
    activeOrders: number;
    recentLabs: number;
  };
}

/**
 * 医疗上下文构建器
 *
 * 将患者摘要、就诊摘要、活跃医嘱、近期检验渲染为结构化文本，
 * 按"患者30% + 就诊30% + 医嘱/检验"的预算策略组织，
 * 异常检验值高亮（标注↑↓/危急），帮助模型快速抓重点。
 */
export class MedicalContextBuilder {
  /**
   * 构建完整医疗上下文
   *
   * @param data - 医疗上下文数据
   * @returns 构建结果
   */
  public build(data: MedicalContextData): BuiltMedicalContext {
    const segments: ContextSegment[] = [];

    const patientSeg = this.buildPatientSegment(data.patient);
    if (patientSeg) segments.push(patientSeg);

    const encounterSeg = this.buildEncounterSegment(data.encounter);
    if (encounterSeg) segments.push(encounterSeg);

    const ordersSeg = this.buildOrdersSegment(data.activeOrders);
    if (ordersSeg) segments.push(ordersSeg);

    const labsSeg = this.buildLabsSegment(data.recentLabs);
    if (labsSeg) segments.push(labsSeg);

    const text = segments.map((s) => s.text).join('\n\n');

    return {
      text,
      segments,
      tokens: {
        patientSummary: patientSeg?.tokens ?? 0,
        encounterSummary: encounterSeg?.tokens ?? 0,
        activeOrders: ordersSeg?.tokens ?? 0,
        recentLabs: labsSeg?.tokens ?? 0,
      },
    };
  }

  /**
   * 患者摘要片段
   */
  private buildPatientSegment(patient?: PatientSummary): ContextSegment | null {
    if (!patient) return null;
    const lines = [
      `【患者摘要】`,
      `- 姓名：${patient.name}，性别：${patient.gender}，年龄：${patient.age ?? '未知'}`,
      `- 病案号：${patient.medicalRecordNo ?? '未知'}，当前状态：${patient.status}`,
      `- 当前诊断：${patient.currentDiagnosis ?? '暂无'}`,
      `- 过敏史：${patient.allergySummary ?? '无记录'}`,
    ];
    const text = lines.join('\n');
    return { title: '患者摘要', text, tokens: estimateTokens(text) };
  }

  /**
   * 就诊摘要片段
   */
  private buildEncounterSegment(encounter?: EncounterSummary): ContextSegment | null {
    if (!encounter) return null;
    const lines = [
      `【就诊摘要】`,
      `- 就诊类型：${encounter.visitType}，科室：${encounter.department}，状态：${encounter.status}`,
      `- 主诉：${encounter.chiefComplaint ?? '暂无'}`,
      `- 初步诊断：${encounter.preliminaryDiagnosis ?? '暂无'}`,
    ];
    if (encounter.bedNo) lines.push(`- 床号：${encounter.bedNo}`);
    const text = lines.join('\n');
    return { title: '就诊摘要', text, tokens: estimateTokens(text) };
  }

  /**
   * 活跃医嘱片段
   */
  private buildOrdersSegment(orders?: readonly Order[]): ContextSegment | null {
    if (!orders || orders.length === 0) return null;
    const active = orders.filter(
      (o) => o.status === 'ordered' || o.status === 'in_progress' || o.status === 'verified',
    );
    if (active.length === 0) return null;

    const lines = [
      `【活跃医嘱】（共 ${active.length} 条）`,
      ...active
        .slice(0, 20)
        .map(
          (o) =>
            `- [${o.orderType}] ${o.content}（${o.frequency ?? '不限频次'}，状态：${o.status}）`,
        ),
    ];
    const text = lines.join('\n');
    return { title: '活跃医嘱', text, tokens: estimateTokens(text) };
  }

  /**
   * 近期检验片段（异常值高亮）
   */
  private buildLabsSegment(labs?: readonly LabResult[]): ContextSegment | null {
    if (!labs || labs.length === 0) return null;

    const lines: string[] = [`【近期检验结果（异常/危急高亮）】`];
    let abnormalCount = 0;

    for (const lab of labs.slice(0, 5)) {
      lines.push(`- ${lab.category}（${lab.reportedAt}）：`);
      for (const item of lab.items) {
        const flag = this.flagSymbol(item.abnormalFlag, item.isCritical);
        if (item.abnormalFlag === 'normal' && !item.isCritical) continue;
        abnormalCount++;
        lines.push(
          `  · ${item.testName}=${item.value}${item.unit ? ' ' + item.unit : ''}${flag}（参考：${item.referenceRange ?? '未知'}）`,
        );
      }
    }

    if (abnormalCount === 0) {
      lines.push('- 近期检验未见明显异常值。');
    }

    const text = lines.join('\n');
    return { title: '近期检验', text, tokens: estimateTokens(text) };
  }

  /**
   * 异常标识符号
   */
  private flagSymbol(flag: string, isCritical: boolean): string {
    if (isCritical) return '【危急！】';
    switch (flag) {
      case 'high':
        return '↑';
      case 'low':
        return '↓';
      case 'critical_high':
        return '【危急高】';
      case 'critical_low':
        return '【危急低】';
      case 'positive':
        return '（+）';
      default:
        return '';
    }
  }
}
