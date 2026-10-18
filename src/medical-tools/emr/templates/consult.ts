/**
 * 会诊记录 L0 国标模板
 * TPL-CS-001 会诊申请 / TPL-CS-002 会诊意见 / TPL-CS-003 急会诊
 *
 * 依据：卫医政发〔2010〕11号 第22条十（常规48h、急会诊10min到场）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { national, type EmrSeedTemplate } from './types.js';

export const CONSULT_TEMPLATES: EmrSeedTemplate[] = [
  national({
    templateId: 'TPL-CS-001',
    name: '会诊申请记录模板',
    recordType: '会诊申请',
    content: `申请时间：[申请时间]
申请科室：[本科室]    受邀科室：[受邀科室]
患者：[姓名]  性别：[性别]  年龄：[年龄]岁
病情诊疗情况：[摘要病情与已做处理]
会诊理由：[申请理由]
会诊目的：[希望解决的问题]
申请医师签名：[姓名]（[职称]）`,
    fields: [
      { fieldName: 'applyTime', fieldType: 'date', required: true, placeholder: '申请时间' },
      { fieldName: 'consultantDept', fieldType: 'text', required: true, placeholder: '受邀科室' },
      { fieldName: 'consultReason', fieldType: 'text', required: true, placeholder: '会诊理由' },
      { fieldName: 'consultPurpose', fieldType: 'text', required: true, placeholder: '会诊目的' },
    ],
    dueRule: 'consult_apply_time + 48h',
    responsibleRole: '经治医师',
    triggerEvent: 'consult_requested',
  }),

  national({
    templateId: 'TPL-CS-002',
    name: '会诊意见记录模板',
    recordType: '会诊意见',
    content: `会诊时间：[会诊时间]
会诊医师：[姓名]  所在科室/机构：[科室/机构]
病情摘要：[摘要]
会诊意见：[诊断分析与诊疗建议]
申请医师执行记录：[意见执行情况]
会诊医师签名：[姓名]`,
    fields: [
      { fieldName: 'consultTime', fieldType: 'date', required: true, placeholder: '会诊时间（48h内完成）' },
      { fieldName: 'consultantDept', fieldType: 'text', required: true, placeholder: '会诊科室/机构' },
      { fieldName: 'consultOpinion', fieldType: 'text', required: true, placeholder: '会诊意见' },
      { fieldName: 'executionRecord', fieldType: 'text', required: true, placeholder: '意见执行情况（病程中记录）' },
    ],
    dueRule: 'consult_apply_time + 48h',
    responsibleRole: '会诊医师',
    triggerEvent: 'consult_completed',
  }),

  national({
    templateId: 'TPL-CS-003',
    name: '急会诊记录模板',
    recordType: '急会诊',
    content: `申请时间：[申请时间]
到场时间：[到场时间（申请后10min内到场）]
响应耗时：[response_time_min] 分钟
病情摘要：[危急情况]
急会诊意见：[紧急处理意见]
执行记录：[已执行措施]
会诊医师签名：[姓名]`,
    fields: [
      { fieldName: 'applyTime', fieldType: 'date', required: true, placeholder: '申请时间' },
      { fieldName: 'arriveTime', fieldType: 'date', required: true, placeholder: '到场时间（10min内）' },
      { fieldName: 'responseTimeMin', fieldType: 'number', required: true, placeholder: '响应耗时（分钟，自动考核）' },
      { fieldName: 'urgentOpinion', fieldType: 'text', required: true, placeholder: '急会诊意见（结束即刻记录）' },
    ],
    dueRule: 'consult_apply_time + 10min',
    responsibleRole: '急会诊医师',
    triggerEvent: 'urgent_consult',
  }),
];
