/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 *
 * CDS 动作执行器
 * ---------------------------------------------------------------------------
 * 规则命中后，把规则定义的动作（提醒/警告/拦截/建议/记录）落地为
 * 可直接展示给医生的 RuleHit：完成模板变量替换、确定级别与 override 要求。
 */

import type { CdsFacts, CdsRule, RuleHit } from './Rule.js';

/**
 * 动作执行器：把命中规则转换为结构化提醒。
 */
export class ActionExecutor {
  /**
   * 执行命中规则的动作。
   *
   * @param rule 命中的规则
   * @param facts 患者事实上下文（用于模板变量替换）
   * @returns 结构化规则命中结果
   */
  execute(rule: CdsRule, facts: CdsFacts): RuleHit {
    const message = this.interpolate(rule.action.message, facts);

    return {
      ruleId: rule.id,
      ruleName: rule.name,
      ruleType: rule.ruleType,
      priority: rule.priority,
      actionType: rule.action.actionType,
      level: rule.action.level,
      title: rule.action.title,
      message,
      suggestions: rule.action.suggestions,
      requireOverride: rule.action.requireOverride || rule.action.actionType === 'block',
      overrideReasons: rule.action.overrideReasons ?? [],
      evidence: rule.action.evidence,
      triggeredAt: new Date().toISOString(),
    };
  }

  /**
   * 模板变量替换：把 {{field}} 替换为事实上下文中的值。
   * 列表字段用顿号连接；未命中字段保留为空字符串。
   */
  private interpolate(template: string, facts: CdsFacts): string {
    return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_match, key: string) => {
      return this.lookup(key, facts);
    });
  }

  /** 按字段名查找事实值 */
  private lookup(key: string, facts: CdsFacts): string {
    switch (key) {
      case 'patientId':
        return facts.patientId;
      case 'age':
        return facts.age !== undefined ? String(facts.age) : '';
      case 'gender':
        return facts.gender === 'female' ? '女' : facts.gender === 'male' ? '男' : '';
      case 'weightKg':
        return facts.weightKg !== undefined ? String(facts.weightKg) : '';
      case 'allergies':
        return facts.allergies.join('、');
      case 'currentDrugs':
        return facts.currentDrugs.join('、');
      case 'newDrugs':
        return facts.newDrugs.join('、');
      case 'diagnoses':
        return facts.diagnoses.join('、');
      case 'symptoms':
        return facts.symptoms.join('、');
      case 'signs':
        return facts.signs.join('、');
      default:
        // 支持 lab.<项目名>
        if (key.startsWith('lab.')) {
          const itemName = key.slice('lab.'.length);
          const lab = facts.labResults.find(
            (l) => l.itemName.includes(itemName) || itemName.includes(l.itemName),
          );
          return lab ? `${lab.value}${lab.unit ?? ''}` : '';
        }
        return '';
    }
  }
}
