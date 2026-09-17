/**
 * 健澜科技数智医院智能体 - security/compliance/ComplianceReportGenerator.ts
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

/**
 * 健澜科技数智医院智能体 - 等保合规报告生成器
 *
 * 版权所有 (c) 2026 健澜科技
 * 本文件基于合规检查结果生成等保三级测评报告、差距分析报告与整改计划，
 * 支持导出为 Markdown / JSON 格式（HTML 结构字符串供 Web 渲染）。
 *
 * @module security/compliance/ComplianceReportGenerator
 */

import type { ComplianceCheckResult, ComplianceReport } from './ComplianceChecker';

/**
 * 合规报告生成器
 *
 * @example
 * const generator = new ComplianceReportGenerator();
 * const md = generator.toMarkdown(report);
 */
export class ComplianceReportGenerator {
  /**
   * 生成等保三级测评报告（Markdown）
   *
   * @param report - 合规检查报告
   * @returns Markdown 文本
   */
  public toMarkdown(report: ComplianceReport): string {
    const lines: string[] = [];
    lines.push(`# 网络安全等级保护三级测评报告`);
    lines.push('');
    lines.push(`- 系统名称：${report.systemName}`);
    lines.push(`- 报告时间：${report.generatedAt}`);
    lines.push(
      `- 总体结论：${report.summary.compliant ? '**符合等保三级要求**' : '**暂不符合等保三级要求**'}`,
    );
    lines.push('');

    lines.push('## 一、总体情况');
    lines.push('');
    lines.push(`| 指标 | 数值 |`);
    lines.push(`| --- | --- |`);
    lines.push(`| 检查项总数 | ${report.summary.total} |`);
    lines.push(`| 通过 | ${report.summary.pass} |`);
    lines.push(`| 部分通过 | ${report.summary.partial} |`);
    lines.push(`| 不通过 | ${report.summary.fail} |`);
    lines.push(`| 不适用 | ${report.summary.notApplicable} |`);
    lines.push(`| 综合通过率 | ${report.summary.passRate}% |`);
    lines.push('');

    lines.push('## 二、各控制域达标情况');
    lines.push('');
    lines.push(`| 控制域 | 总数 | 通过 | 不通过 | 通过率 |`);
    lines.push(`| --- | --- | --- | --- | --- |`);
    for (const f of report.familyBreakdown) {
      lines.push(`| ${f.family} | ${f.total} | ${f.pass} | ${f.fail} | ${f.passRate}% |`);
    }
    lines.push('');

    lines.push('## 三、不合规项与整改建议');
    lines.push('');
    if (report.nonCompliantItems.length === 0) {
      lines.push('无不合规项。');
    } else {
      for (const item of report.nonCompliantItems) {
        lines.push(`### ${item.item.id} ${item.item.name}（${item.item.family}）`);
        lines.push(`- 状态：${this.statusText(item.status)}`);
        lines.push(`- 等保要求：${item.item.requirement}`);
        if (item.evidence) lines.push(`- 当前情况：${item.evidence}`);
        if (item.remediation) lines.push(`- 整改建议：${item.remediation}`);
        lines.push('');
      }
    }

    return lines.join('\n');
  }

  /**
   * 生成差距分析报告（Markdown）
   * 聚焦现状与等保三级要求之间的差距
   *
   * @param report - 合规检查报告
   * @returns Markdown 文本
   */
  public gapAnalysis(report: ComplianceReport): string {
    const lines: string[] = [];
    lines.push(`# 等保三级差距分析报告`);
    lines.push('');
    lines.push(
      `现状通过率：**${report.summary.passRate}%**，距 80% 合格线差距：${Math.max(0, 80 - report.summary.passRate)}个百分点。`,
    );
    lines.push('');
    lines.push('## 关键差距（关键项未达标）');
    lines.push('');
    const criticalGaps = report.nonCompliantItems.filter((r) => r.item.critical);
    if (criticalGaps.length === 0) {
      lines.push('关键控制项全部达标。');
    } else {
      for (const g of criticalGaps) {
        lines.push(`- **[关键] ${g.item.id} ${g.item.name}**：${g.item.requirement}`);
      }
    }
    lines.push('');
    lines.push('## 一般差距');
    lines.push('');
    const normalGaps = report.nonCompliantItems.filter((r) => !r.item.critical);
    for (const g of normalGaps) {
      lines.push(`- ${g.item.id} ${g.item.name}`);
    }
    return lines.join('\n');
  }

  /**
   * 生成整改计划（按优先级排序）
   *
   * @param report - 合规检查报告
   * @returns 整改任务列表
   */
  public remediationPlan(report: ComplianceReport): {
    priority: 'P0' | 'P1' | 'P2';
    itemId: string;
    name: string;
    action: string;
  }[] {
    type Priority = 'P0' | 'P1' | 'P2';
    return report.nonCompliantItems
      .map((r: ComplianceCheckResult) => {
        const priority: Priority = r.item.critical ? 'P0' : r.status === 'fail' ? 'P1' : 'P2';
        return {
          priority,
          itemId: r.item.id,
          name: r.item.name,
          action: r.remediation ?? `补全 ${r.item.name} 控制措施`,
        };
      })
      .sort((a, b) => {
        const order: Record<Priority, number> = { P0: 0, P1: 1, P2: 2 };
        return order[a.priority] - order[b.priority];
      });
  }

  /**
   * 导出为 JSON
   *
   * @param report - 合规检查报告
   * @returns JSON 字符串
   */
  public toJson(report: ComplianceReport): string {
    return JSON.stringify(report, null, 2);
  }

  /**
   * 导出为 HTML（供 Web 渲染）
   *
   * @param report - 合规检查报告
   * @returns HTML 字符串
   */
  public toHtml(report: ComplianceReport): string {
    const rows = report.familyBreakdown
      .map(
        (f) =>
          `<tr><td>${f.family}</td><td>${f.total}</td><td>${f.pass}</td><td>${f.fail}</td><td>${f.passRate}%</td></tr>`,
      )
      .join('');

    return `<h1>等保三级测评报告</h1>
<p>系统：${report.systemName}&emsp;结论：${report.summary.compliant ? '符合' : '不符合'}（${report.summary.passRate}%）</p>
<table border="1" cellspacing="0" cellpadding="6">
<thead><tr><th>控制域</th><th>总数</th><th>通过</th><th>不通过</th><th>通过率</th></tr></thead>
<tbody>${rows}</tbody></table>`;
  }

  /**
   * 状态文本
   */
  private statusText(status: string): string {
    switch (status) {
      case 'pass':
        return '符合';
      case 'partial':
        return '部分符合';
      case 'fail':
        return '不符合';
      case 'not_applicable':
        return '不适用';
      default:
        return status;
    }
  }
}
