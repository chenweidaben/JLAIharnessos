/**
 * 健澜科技 jlmedaios - 门诊医生工作站前端类型
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** ICD 诊断条目 */
export interface IcdDiagnosis {
  icdCode: string;
  name: string;
  pyCode: string;
}

/** 病历模板（快捷调用） */
export interface EmrTemplate {
  templateId: string;
  name: string;
  category: string;
  snippet: string;
}

/** 处方内药品明细行 */
export interface PrescriptionDrugItem {
  drugName: string;
  spec: string;
  dosage: string;
  frequency: string;
  days: number;
}

/** 处方历史行 */
export interface PrescriptionRecord {
  prescriptionId: string;
  patientName: string;
  dept: string;
  doctor: string;
  issuedAt: string;
  drugs: PrescriptionDrugItem[];
  totalAmount: number;
  status: '已完成' | '已发药' | '已退回';
}

/** 检查检验目录条目 */
export interface ExamCatalogItem {
  itemId: string;
  category: '检查' | '检验' | '处置';
  name: string;
  itemCode: string;
  price: number;
  eta: string;
}

/** GET /api/v1/opd/workstation 返回体 */
export interface OpdWorkstationView {
  demo: boolean;
  updatedAt: string;
  templates: EmrTemplate[];
  prescriptions: PrescriptionRecord[];
  diagnoses: IcdDiagnosis[];
  catalog: ExamCatalogItem[];
}

/** 检查检验类别配色 */
export const EXAM_CATEGORY_COLOR: Record<ExamCatalogItem['category'], string> = {
  检查: '#1677ff',
  检验: '#52c41a',
  处置: '#fa8c16',
};
