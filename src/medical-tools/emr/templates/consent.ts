/**
 * 知情同意书系列 L0 国标模板（7 类）
 * 手术 / 麻醉 / 特殊检查治疗 / 输血 / 病重通知书 / 自费项目 / 自动出院
 *
 * 依据：卫医政发〔2010〕11号 第23-27条；第10条签字主体。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { national, type EmrSeedTemplate } from './types.js';

export const CONSENT_TEMPLATES: EmrSeedTemplate[] = [
  national({
    templateId: 'TPL-CN-001',
    name: '手术知情同意书模板',
    recordType: '手术知情同意书',
    content: `患者：[姓名]  性别：[性别]  年龄：[年龄]岁  病案号：[病案号]
术前诊断：[术前诊断]
拟施手术：[手术名称]
术中/术后可能并发症与风险：
  [风险1]
  [风险2]
  [风险3]
术者陈述：[经治医师+术者告知]
患者/法定代理人意见：[同意/拒绝]
患方签名：[签名]  与患者关系：[关系]  日期：[日期]
经治医师签名：[姓名]    术者签名：[姓名]`,
    fields: [
      { fieldName: 'consentType', fieldType: 'text', required: true, placeholder: '固定 operation' },
      { fieldName: 'preDx', fieldType: 'text', required: true, placeholder: '术前诊断' },
      { fieldName: 'plannedProc', fieldType: 'text', required: true, placeholder: '手术名称' },
      { fieldName: 'risks', fieldType: 'table', required: true, placeholder: '并发症与风险列表' },
      { fieldName: 'patientSignature', fieldType: 'text', required: true, placeholder: '患方签名' },
      { fieldName: 'guardianRelation', fieldType: 'text', required: false, placeholder: '监护人/关系' },
    ],
    dueRule: 'before_surgery',
    responsibleRole: '术者/经治医师',
    triggerEvent: 'pre_op_consent',
  }),

  national({
    templateId: 'TPL-CN-002',
    name: '麻醉知情同意书模板',
    recordType: '麻醉知情同意书',
    content: `患者：[姓名]  拟行手术：[术式]
术前诊断：[术前诊断]
拟行麻醉方式：[全麻/椎管内/神经阻滞/局麻]
基础疾病及麻醉影响：[合并症与影响]
拟行有创操作与监测：[动脉穿刺/深静脉/漂浮导管/TEE等]
麻醉风险与并发症意外：[风险列表]
患方签名：[签名]  日期：[日期]
麻醉医师签名：[姓名]`,
    fields: [
      { fieldName: 'plannedAnesthesia', fieldType: 'text', required: true, placeholder: '拟麻醉方式' },
      { fieldName: 'comorbidities', fieldType: 'text', required: false, placeholder: '基础疾病及麻醉影响' },
      { fieldName: 'invasiveMonitoring', fieldType: 'text', required: false, placeholder: '拟行有创操作与监测' },
      { fieldName: 'anesthesiaRisks', fieldType: 'table', required: true, placeholder: '麻醉风险与并发症' },
      { fieldName: 'patientSignature', fieldType: 'text', required: true, placeholder: '患方签名' },
    ],
    dueRule: 'before_anesthesia',
    responsibleRole: '麻醉医师',
    triggerEvent: 'pre_anesthesia_consent',
  }),

  national({
    templateId: 'TPL-CN-003',
    name: '特殊检查/特殊治疗知情同意书模板',
    recordType: '特殊检查治疗同意书',
    content: `患者：[姓名]  病案号：[病案号]
项目名称：[项目名称]
项目目的：[目的]
可能并发症及风险：[风险列表]
替代方案：[替代方案]
患方意见：[同意/拒绝]
患方签名：[签名]  日期：[日期]
医师签名：[姓名]`,
    fields: [
      { fieldName: 'examTreatItems', fieldType: 'table', required: true, placeholder: '项目名称' },
      { fieldName: 'purpose', fieldType: 'text', required: true, placeholder: '目的' },
      { fieldName: 'risks', fieldType: 'table', required: true, placeholder: '并发症及风险' },
      { fieldName: 'patientSignature', fieldType: 'text', required: true, placeholder: '患方签名' },
    ],
    dueRule: 'before_special_procedure',
    responsibleRole: '操作医师',
    triggerEvent: 'special_procedure_consent',
  }),

  national({
    templateId: 'TPL-CN-004',
    name: '输血治疗知情同意书模板',
    recordType: '输血知情同意书',
    content: `患者：[姓名]  诊断：[诊断]
输血指征：[指征]
拟输血成分：[红细胞/血浆/血小板/其他]
输血前检查结果：[血型、传染病筛查]
输血风险及不良后果：[溶血、过敏、感染等]
患方意见：[同意/拒绝]
患方签名：[签名]  日期：[日期]
医师签名：[姓名]`,
    fields: [
      { fieldName: 'transfusionIndication', fieldType: 'text', required: true, placeholder: '输血指征' },
      { fieldName: 'bloodComponent', fieldType: 'table', required: true, placeholder: '拟输血成分' },
      { fieldName: 'preTransfusionLab', fieldType: 'text', required: true, placeholder: '输血前检查结果' },
      { fieldName: 'transfusionRisks', fieldType: 'table', required: true, placeholder: '输血风险及不良后果' },
      { fieldName: 'patientSignature', fieldType: 'text', required: true, placeholder: '患方签名' },
    ],
    dueRule: 'before_transfusion',
    responsibleRole: '经治医师',
    triggerEvent: 'transfusion_consent',
  }),

  national({
    templateId: 'TPL-CN-005',
    name: '病重（病危）通知书模板',
    recordType: '病重病危通知书',
    content: `患者：[姓名]  性别：[性别]  年龄：[年龄]岁  科别：[科室]
目前诊断：[诊断]
病情危重情况：[病情说明与预后]
本通知书一式两份，医院与患方各执一份。
患方签名：[签名]  与患者关系：[关系]  日期时间：[日期时间]
医师签名：[姓名]`,
    fields: [
      { fieldName: 'currentDiagnosis', fieldType: 'text', required: true, placeholder: '目前诊断' },
      { fieldName: 'criticalNotice', fieldType: 'text', required: true, placeholder: '病情危重情况' },
      { fieldName: 'familySignature', fieldType: 'text', required: true, placeholder: '患方签名（一式两份）' },
    ],
    dueRule: 'when_critical',
    responsibleRole: '经治医师',
    triggerEvent: 'critical_notice',
  }),

  national({
    templateId: 'TPL-CN-006',
    name: '自费项目知情同意书模板',
    recordType: '自费项目同意书',
    content: `患者：[姓名]  病案号：[病案号]
自费/超医保项目明细：
  [项目名称]  金额：[金额]  医保属性：[自费/部分自付]
项目必要性说明：[说明]
患方确认知情并同意自费：[确认]
患方签名：[签名]  日期：[日期]
医师签名：[姓名]`,
    fields: [
      { fieldName: 'selfPayItems', fieldType: 'table', required: true, placeholder: '自费/超医保项目名称' },
      { fieldName: 'amount', fieldType: 'number', required: true, placeholder: '金额（元）' },
      { fieldName: 'patientSignature', fieldType: 'text', required: true, placeholder: '患方确认签名' },
    ],
    dueRule: 'before_self_pay_item',
    responsibleRole: '经治医师',
    triggerEvent: 'self_pay_consent',
  }),

  national({
    templateId: 'TPL-CN-007',
    name: '自动出院/自动转院知情同意书模板',
    recordType: '自动出院同意书',
    content: `患者：[姓名]  目前诊断：[诊断]
劝阻告知：[医院已充分告知继续住院的必要性及自动离院风险]
患方意见：经劝阻仍坚持自动离院，后果自负。
患方签名：[签名]  与患者关系：[关系]  日期时间：[日期时间]
医师签名：[姓名]`,
    fields: [
      { fieldName: 'amaDisposition', fieldType: 'select', required: true, options: ['自动出院', '自动转院'], placeholder: '自动离院类型' },
      { fieldName: 'counselingNote', fieldType: 'text', required: true, placeholder: '劝阻告知记录' },
      { fieldName: 'familySignature', fieldType: 'text', required: true, placeholder: '患方签名（后果自负声明）' },
    ],
    dueRule: 'before_ama_discharge',
    responsibleRole: '经治医师',
    triggerEvent: 'ama_discharge',
  }),
];
