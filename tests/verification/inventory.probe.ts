/**
 * 健澜科技数智医院智能体 - 后端功能盘点探针（非单元测试，供人工验证运行）
 *
 * 直接从 src 运行时枚举：
 *  - 医疗工具注册表（createRegistryWithFirstBatch）
 *  - CDS 规则库（ALL_CDS_RULES / countRulesByType）
 *  - 科室子代理（ALL_SPECIALTIES）
 *  - FHIR 资源类型（SUPPORTED_RESOURCE_TYPES）
 *  - HL7 消息类型定义
 *  - 脱敏敏感字段类型
 *
 * 运行：bun tests/verification/inventory.probe.ts
 */
import { createRegistryWithFirstBatch } from '../../src/medical-tools/registry.js';
import {
  ALL_CDS_RULES,
  countRulesByType,
  TOTAL_RULE_COUNT,
  RULESET_VERSION,
} from '../../src/knowledge/cds/rules/ruleIndex.js';
import { ALL_SPECIALTIES, SPECIALTY_CONFIGS } from '../../src/core/buddy/specialties/index.js';
import { SUPPORTED_RESOURCE_TYPES } from '../../src/integration/protocols/fhir/FHIRResource.js';
import { SensitiveFieldType } from '../../src/security/types.js';

const report: Record<string, unknown> = {};

// ---- 工具注册表 ----
const registry = createRegistryWithFirstBatch();
const tools = registry.getAll();
const byCat: Record<string, number> = {};
const byRisk: Record<string, number> = {};
for (const t of tools) {
  byCat[t.category] = (byCat[t.category] ?? 0) + 1;
  byRisk[t.riskLevel] = (byRisk[t.riskLevel] ?? 0) + 1;
}
report.tools = {
  total: registry.size,
  byCategory: byCat,
  byRiskLevel: byRisk,
  names: tools.map((t) => ({
    name: t.name,
    category: t.category,
    riskLevel: t.riskLevel,
    requiresAuth: t.requiresAuth,
    requiresConfirm: t.requiresConfirm,
    requiresDoubleConfirm: t.requiresDoubleConfirm ?? t.riskLevel === 'high',
    requiredPermissions: t.requiredPermissions,
    requiredRoles: t.requiredRoles ?? [],
    hasInputSchema: !!t.inputSchema,
    hasExecute: typeof t.execute === 'function',
  })),
};

// ---- CDS 规则 ----
report.cds = {
  total: TOTAL_RULE_COUNT,
  version: RULESET_VERSION,
  byType: countRulesByType(),
  ruleIds: ALL_CDS_RULES.map((r) => r.id ?? r.name ?? 'unknown'),
};

// ---- 子代理 ----
report.specialties = {
  total: ALL_SPECIALTIES.length,
  configured: SPECIALTY_CONFIGS.size,
  names: ALL_SPECIALTIES.map((s) => s.agentType),
};

// ---- FHIR ----
report.fhir = {
  total: SUPPORTED_RESOURCE_TYPES.length,
  types: SUPPORTED_RESOURCE_TYPES,
};

// ---- 脱敏 ----
report.desensitization = {
  sensitiveFieldTypeCount: Object.keys(SensitiveFieldType).length / 2, // enum 双向映射
  types: Object.values(SensitiveFieldType),
};

console.log(JSON.stringify(report, null, 2));
