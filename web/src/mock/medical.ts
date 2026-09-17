/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 医疗工具 Mock：36 个医疗工具统一返回
 */
import { uid, rand } from '@/mock/utils';

export interface ToolResult<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
}

/** 36 个医疗工具的 Mock 返回（按 toolName 索引） */
export const medicalToolResults: Record<string, ToolResult> = {
  query_patient: {
    success: true,
    message: '查询完成',
    data: [{ id: 'P100001', name: '王芳', department: '心内科' }],
  },
  get_patient_detail: {
    success: true,
    message: '已获取患者详情',
    data: { id: 'P100001', name: '王芳' },
  },
  get_patient_history: { success: true, message: '已获取就诊史', data: [] },
  get_medical_record: { success: true, message: '已获取病历', data: { content: '（病历摘要）' } },
  generate_medical_record: {
    success: true,
    message: '病历草稿已生成',
    data: { recordId: uid('R'), content: '（AI 生成草稿）' },
  },
  medical_record_qa: { success: true, message: '已回答', data: { answer: '考虑社区获得性肺炎。' } },
  get_medical_template: {
    success: true,
    message: '已获取模板',
    data: { content: '【主诉】【现病史】' },
  },
  get_order_list: { success: true, message: '已获取医嘱', data: [] },
  create_order: {
    success: true,
    message: '医嘱已开立，待审核',
    data: { orderId: uid('O'), status: 'pending' },
  },
  cancel_order: { success: true, message: '医嘱已停止', data: { status: 'cancelled' } },
  order_audit: { success: true, message: '医嘱审核通过', data: { status: 'approved' } },
  get_lab_result: { success: true, message: '已获取检验', data: [] },
  order_lab_test: { success: true, message: '检验已开', data: { sampleId: uid('S') } },
  get_image_report: { success: true, message: '已获取影像', data: [] },
  order_imaging_exam: { success: true, message: '检查已预约', data: { studyUid: uid('1.2.840') } },
  view_dicom: { success: true, message: 'DICOM 元数据', data: { frames: 320 } },
  create_prescription: { success: true, message: '处方已开具', data: { prescriptionId: uid('P') } },
  prescription_audit: { success: true, message: '处方审核通过', data: { status: 'confirmed' } },
  get_prescription_list: { success: true, message: '已获取处方', data: [] },
  get_drug_info: {
    success: true,
    message: '已获取药品',
    data: { name: '头孢呋辛', indications: '呼吸道感染', contraindications: '头孢过敏禁用' },
  },
  diagnosis_suggestion: {
    success: true,
    message: '诊断建议',
    data: { suggestions: ['社区获得性肺炎'], confidence: 0.86 },
  },
  treatment_plan_suggestion: {
    success: true,
    message: '治疗方案',
    data: { plan: '抗感染+化痰，疗程5-7天。' },
  },
  critical_value_alert: { success: true, message: '存在危急值', data: { hasCritical: true } },
  drug_interaction_check: { success: true, message: '无严重相互作用', data: { conflicts: [] } },
  medical_record_quality_check: {
    success: true,
    message: '质控完成',
    data: { score: 88, defects: [] },
  },
  medical_record_front_page_check: { success: true, message: '首页质控完成', data: { pass: true } },
  core_system_check: { success: true, message: '核心制度检查完成', data: { adherence: 0.94 } },
  appointment_registration: {
    success: true,
    message: '预约成功',
    data: { appointmentId: uid('A') },
  },
  visit_reminder: { success: true, message: '提醒已发送', data: { sent: 1 } },
  follow_up_management: { success: true, message: '随访计划已生成', data: { planId: uid('F') } },
  department_operation_analysis: {
    success: true,
    message: '运营分析完成',
    data: { revenue: rand(300, 2600), yoy: 6 },
  },
  medical_quality_indicators: { success: true, message: '质量指标', data: { gradeARate: 96.4 } },
  drg_dip_analysis: {
    success: true,
    message: 'DRG/DIP',
    data: { groupRate: 91.6, netBalance: 326 },
  },
  sync_to_his: { success: true, message: 'HIS 同步成功', data: { synced: true } },
  fetch_from_emr: { success: true, message: 'EMR 拉取成功', data: { records: 12 } },
  hl7_message_send: { success: true, message: 'HL7 已发送', data: { ack: 'AA' } },
};

/** 兜底结果 */
export function fallbackToolResult(toolName: string): ToolResult {
  return { success: true, message: `工具 ${toolName} 执行成功（Mock）`, data: { toolName } };
}
