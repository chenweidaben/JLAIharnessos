/**
 * 健澜科技 jlmedaios - 字典映射 API（M656，配套 M583）
 *
 * 对接 BFF：GET /api/v1/dictionary/mappings
 *   （未注册则 DEMO 兜底，打标 demo:true）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type MappingType = 'icd10' | 'icd9cm' | 'loinc' | 'snomed' | 'atc';

export interface DictMapping {
  id: string;
  localCode: string;
  localName: string;
  standardCode: string;
  standardName: string;
  mappingType: MappingType;
  confidence: number;
}

export const MAPPING_TYPE_META: Record<MappingType, { label: string; color: string }> = {
  icd10: { label: 'ICD-10', color: 'blue' },
  icd9cm: { label: 'ICD-9-CM', color: 'cyan' },
  loinc: { label: 'LOINC', color: 'purple' },
  snomed: { label: 'SNOMED CT', color: 'orange' },
  atc: { label: 'ATC 药品', color: 'green' },
};

const DEMO_MAPPINGS: DictMapping[] = [
  { id: 'DM-001', localCode: 'J18.900', localName: '肺炎（未特指）', standardCode: 'J18.9', standardName: 'Pneumonia, unspecified organism', mappingType: 'icd10', confidence: 1.0 },
  { id: 'DM-002', localCode: 'LAB-CBC', localName: '血常规', standardCode: '58410-2', standardName: 'Complete blood count panel - Blood by Automated count', mappingType: 'loinc', confidence: 0.95 },
  { id: 'DM-003', localCode: 'OP-LAPCHOLE', localName: '腹腔镜胆囊切除术', standardCode: '51.23', standardName: 'Laparoscopic cholecystectomy', mappingType: 'icd9cm', confidence: 1.0 },
  { id: 'DM-004', localCode: 'DRUG-AMOX', localName: '阿莫西林胶囊', standardCode: 'J01CA04', standardName: 'Amoxicillin', mappingType: 'atc', confidence: 0.98 },
];

export interface MappingListResult {
  items: DictMapping[];
  totalCount: number;
  demo: boolean;
}

export async function fetchDictMappings(): Promise<MappingListResult> {
  try {
    const res = await get<{ items: DictMapping[]; totalCount: number }>('/dictionary/mappings');
    return { items: res.items, totalCount: res.totalCount, demo: false };
  } catch {
    return { items: DEMO_MAPPINGS, totalCount: DEMO_MAPPINGS.length, demo: true };
  }
}
