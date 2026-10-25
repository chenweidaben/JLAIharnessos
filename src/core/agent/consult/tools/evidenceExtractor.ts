/**
 * 证据抽取与分类（契约 §6 evidenceExtractor.ts）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 *
 * 按工具规范名把工具返回映射到证据分类；空结果返回空数组，不产生虚构证据。
 */

import type { EvidenceItem } from '../types';

/** 工具规范名到证据分类的确定性映射表 */
const TOOL_KIND_MAP: Readonly<Record<string, EvidenceItem['kind']>> = {
  searchKnowledgeBase: 'knowledge',
  lookupDrug: 'drug',
  checkAllergy: 'allergy',
  checkInteraction: 'interaction',
  retrievePatientHistory: 'history',
};

/** 工具返回的原始证据条目（轻量结构，由各内置工具构造） */
export interface RawEvidenceEntry {
  label: string;
  snippet: string;
  source?: string;
}

/** 按工具规范名判定证据分类；未登记工具默认归入 knowledge */
export function classifyKind(toolName: string): EvidenceItem['kind'] {
  return TOOL_KIND_MAP[toolName] ?? 'knowledge';
}

/**
 * 从工具返回抽取标准化证据条目
 *
 * @param toolName 工具规范驼峰名
 * @param entries 工具返回的原始证据条目；空数组返回空数组
 * @param defaultSource 缺省来源标注
 */
export function extractEvidence(
  toolName: string,
  entries: RawEvidenceEntry[],
  defaultSource = toolName,
): EvidenceItem[] {
  if (!entries || entries.length === 0) {
    return [];
  }
  const kind = classifyKind(toolName);
  return entries.map((entry) => ({
    kind,
    label: entry.label,
    source: entry.source ?? defaultSource,
    snippet: entry.snippet,
  }));
}
