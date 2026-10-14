/**
 * 健澜科技 jlmedaios - 合理用药实时审查聚合器（AI 第八剑客）
 *
 * 对在院（active）药品医嘱逐条跑确定性规则（M14-A amsRules）：
 *  - 配伍/联用禁忌组合：命中即 critical（如头孢曲松+含钙输液、碳青霉烯+丙戊酸钠）；
 *  - 抗菌药物越级使用：药品分级高于医师处方授权即 warning（非拦截，实时提醒）；
 *  - 重复用药：同药名在院重复开立即 info。
 *
 * 医疗安全定位：本模块为 CDS 实时提醒，不拦截医嘱、不替代药师最终点评；
 * 特殊使用级抗菌药的开方/审批仍走 ams:prescribe / ams:approve 闭环。
 *
 * 数据装载：orderRepo.listByVisit 取在院医嘱，amsRepo 目录/授权 best-effort 富化；
 * 任一 repo 查询失败或无结果一律安全降级（空表 / null 不判定），绝不抛错、不臆造数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import type { AuthView } from '../view/userView.js';
import * as orderRepo from '../../db/repositories/orderRepo.js';
import * as amsRepo from '../../db/repositories/amsRepo.js';
import {
  canPrescribe,
  prescriberMaxLevel,
  type AbxLevel,
} from '../../medical-tools/ams/amsRules.js';

export class DrugReviewError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'DrugReviewError';
  }
}

// ---------------------------------------------------------------------------
// 类型
// ---------------------------------------------------------------------------

export type IssueLevel = 'info' | 'warning' | 'critical';

/** 审查输入：一条在院药品医嘱（纯数据，无 I/O） */
export interface ReviewOrder {
  id: string;
  /** 药品名（通用名优先） */
  drugName: string;
  /** 抗菌药分级；非抗菌药或查不到为 null */
  abxLevel?: AbxLevel | null;
  /** 开单医师处方授权最高级别；查不到为 null */
  prescriberMaxLevel?: AbxLevel | null;
}

/** 审查问题项 */
export interface DrugReviewIssue {
  rule: string;
  level: IssueLevel;
  /** 药名（禁忌组合为 "A + B"） */
  drug: string;
  /** 类别：配伍禁忌 / 抗菌药物越级使用 / 重复用药 */
  category: string;
  /** 处置建议 */
  suggestion: string;
}

// ---------------------------------------------------------------------------
// 规则表
// ---------------------------------------------------------------------------

/** 抗菌药分级中文标签（越级提示用） */
const ABX_LEVEL_LABEL: Record<AbxLevel, string> = {
  unrestricted: '非限制使用级',
  restricted: '限制使用级',
  special: '特殊使用级',
};

interface IncompatRule {
  a: string;
  b: string;
  level: IssueLevel;
  reason: string;
  suggestion: string;
}

/**
 * 常见配伍/联用禁忌组合（药名子串匹配，依据国家处方审核规范与药品说明书）。
 * 命中组合双方均存在于在院医嘱时产出问题。
 */
const INCOMPAT_RULES: IncompatRule[] = [
  {
    a: '头孢曲松', b: '葡萄糖酸钙', level: 'critical',
    reason: '头孢曲松与含钙注射液可形成不溶性钙盐微粒，存在致严重不良事件风险',
    suggestion: '禁止同管路配伍；含钙输液须先冲管或更换抗菌药品种',
  },
  {
    a: '美罗培南', b: '丙戊酸钠', level: 'critical',
    reason: '碳青霉烯类显著降低丙戊酸血药浓度，存在诱发癫痫发作风险',
    suggestion: '避免联用；请神经内科会诊调整抗癫痫方案',
  },
  {
    a: '亚胺培南', b: '丙戊酸钠', level: 'critical',
    reason: '碳青霉烯类显著降低丙戊酸血药浓度，存在诱发癫痫发作风险',
    suggestion: '避免联用；请神经内科会诊调整抗癫痫方案',
  },
  {
    a: '左氧氟沙星', b: '硫酸亚铁', level: 'warning',
    reason: '喹诺酮类与二价金属离子螯合，显著降低口服吸收',
    suggestion: '两者给药间隔至少 2 小时，或改用其他抗菌药',
  },
  {
    a: '莫西沙星', b: '胺碘酮', level: 'warning',
    reason: '联用可延长 QT 间期，增加尖端扭转型室速风险',
    suggestion: '避免联用；必须使用时持续心电监护并复查血钾/血镁',
  },
];

// ---------------------------------------------------------------------------
// 纯函数规则引擎
// ---------------------------------------------------------------------------

/**
 * 对在院医嘱逐条审查：配伍禁忌组合 + 抗菌药越级 + 重复用药。
 * 纯函数、无 I/O、确定性；orders 为空/非法输入安全返回空数组。
 */
export function scanOrders(orders: ReviewOrder[]): DrugReviewIssue[] {
  const issues: DrugReviewIssue[] = [];
  const list = (Array.isArray(orders) ? orders : []).filter(
    (o) => o && typeof o.drugName === 'string' && o.drugName.trim().length > 0,
  );

  // 1. 配伍/联用禁忌组合：组合双方均在在院医嘱中出现即命中
  for (const rule of INCOMPAT_RULES) {
    const hitA = list.filter((o) => o.drugName.includes(rule.a));
    const hitB = list.filter((o) => o.drugName.includes(rule.b));
    if (hitA.length > 0 && hitB.length > 0) {
      issues.push({
        rule: `incompat.${rule.a}_${rule.b}`,
        level: rule.level,
        drug: `${rule.a} + ${rule.b}`,
        category: '配伍禁忌',
        suggestion: `${rule.reason}；${rule.suggestion}`,
      });
    }
  }

  // 2. 抗菌药物越级使用：药品分级高于医师授权即 warning（提醒，不拦截）
  for (const o of list) {
    if (!o.abxLevel || !o.prescriberMaxLevel) continue;
    if (!canPrescribe(o.prescriberMaxLevel, o.abxLevel)) {
      issues.push({
        rule: 'abx.escalation',
        level: 'warning',
        drug: o.drugName,
        category: '抗菌药物越级使用',
        suggestion: `该药为${ABX_LEVEL_LABEL[o.abxLevel]}，处方授权为${ABX_LEVEL_LABEL[o.prescriberMaxLevel]}，越级使用；请上级医师复核，特殊使用级须先经会诊审批`,
      });
    }
  }

  // 3. 重复用药：同药名在院重复开立（info 提醒核对）
  const countByName = new Map<string, number>();
  for (const o of list) {
    const name = o.drugName;
    countByName.set(name, (countByName.get(name) ?? 0) + 1);
  }
  for (const [name, count] of countByName) {
    if (count >= 2) {
      issues.push({
        rule: 'order.duplicate_drug',
        level: 'info',
        drug: name,
        category: '重复用药',
        suggestion: `在院同药品开立 ${count} 条，请核对是否重复医嘱并停用其一`,
      });
    }
  }

  return issues;
}

// ---------------------------------------------------------------------------
// 真实数据装载（安全降级）
// ---------------------------------------------------------------------------

/** 从医嘱文本提取药品名：优先括号内通用名，否则取整段内容 */
function extractDrugName(content: string): string {
  const m = /（([^）]{2,30})）/.exec(content ?? '');
  if (m && m[1].trim()) return m[1].trim();
  return (content ?? '').trim();
}

/**
 * 装载当前在院（active）药品医嘱并 best-effort 富化分级/授权。
 *  - orderRepo 查不到/失败：安全降级返回空表；
 *  - amsRepo 目录/授权查不到：对应字段置 null（该条不判越级），不抛错。
 */
export async function loadActiveOrders(_view: AuthView, visitId: string): Promise<ReviewOrder[]> {
  let raw: orderRepo.Order[] = [];
  try {
    raw = await orderRepo.listByVisit(visitId);
  } catch {
    return []; // 医嘱查询失败：按空表降级
  }
  const active = raw.filter((o) => o.status === 'active' && o.orderType === 'drug');
  if (active.length === 0) return [];

  // 抗菌药目录：通用名 -> 分级（目录缺失则全部按非抗菌药处理）
  const nameToLevel = new Map<string, AbxLevel>();
  try {
    const catalog = await amsRepo.listCatalog();
    for (const c of catalog) {
      if (c.genericName) nameToLevel.set(c.genericName, c.atcLevel);
    }
  } catch { /* 抗菌药目录缺失：分级不判定 */ }

  const result: ReviewOrder[] = [];
  for (const o of active) {
    const drugName = extractDrugName(o.content);
    let abxLevel: AbxLevel | null = null;
    for (const [name, level] of nameToLevel) {
      if (o.content.includes(name)) { abxLevel = level; break; }
    }
    let maxLevel: AbxLevel | null = null;
    if (abxLevel) {
      try {
        const grant = await amsRepo.getGrantByPrescriber(o.orderedBy);
        maxLevel = prescriberMaxLevel(grant?.maxLevel ?? null, grant?.prescriberTitle ?? '');
      } catch {
        maxLevel = null; // 授权查不到：不判越级
      }
    }
    result.push({ id: o.id, drugName, abxLevel, prescriberMaxLevel: maxLevel });
  }
  return result;
}

// ---------------------------------------------------------------------------
// 视图入口（权限 drug_review:view）
// ---------------------------------------------------------------------------

async function runReview(view: AuthView, visitId: string) {
  if (!view.permissions.includes('drug_review:view')) throw new DrugReviewError(403, '无权限');
  if (!visitId || !visitId.trim()) throw new DrugReviewError(400, 'visitId 必填');
  const orders = await loadActiveOrders(view, visitId.trim());
  const issues = scanOrders(orders);
  return {
    visitId: visitId.trim(),
    scannedAt: new Date().toISOString(),
    orderCount: orders.length,
    issueCount: issues.length,
    hasEscalation: issues.some((i) => i.category === '抗菌药物越级使用'),
    issues,
  };
}

/** 触发一次实时审查（POST /scan） */
export function scanView(view: AuthView, visitId: string) {
  return runReview(view, visitId);
}

/** 实时读取当前在院医嘱审查结果（GET，与 scan 同口径，不落库） */
export function reviewView(view: AuthView, visitId: string) {
  return runReview(view, visitId);
}
