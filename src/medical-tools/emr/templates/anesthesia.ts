/**
 * 麻醉系列 L0 国标模板
 * TPL-AN-001 麻醉术前访视 / TPL-AN-002 麻醉记录 / TPL-AN-003 麻醉术后访视
 *
 * 依据：卫医政发〔2010〕11号 第22条十三~十四、十九。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { national, type EmrSeedTemplate } from './types.js';

export const ANESTHESIA_TEMPLATES: EmrSeedTemplate[] = [
  national({
    templateId: 'TPL-AN-001',
    name: '麻醉术前访视记录模板',
    recordType: '麻醉术前访视',
    content: `患者：[姓名]  性别：[性别]  年龄：[年龄]岁  科别：[科室]  病案号：[病案号]
一般情况：[发育、营养]
简要病史：[现病史、既往麻醉/手术史、过敏史]
麻醉相关辅检：[ECG、胸片、血常规、凝血、肝肾功等]
拟行手术方式：[术式]
拟行麻醉方式：[全麻/椎管内/神经阻滞/局麻]
ASA分级：[Ⅰ/Ⅱ/Ⅲ/Ⅳ/Ⅴ/Ⅵ级]
麻醉适应证及术中注意问题：[评估与预案]
禁食禁饮时间：[fasting_hours] 小时
术前麻醉医嘱：[医嘱]
麻醉医师签字：[姓名]  日期：[日期]`,
    fields: [
      { fieldName: 'asaGrade', fieldType: 'select', required: true, options: ['Ⅰ级', 'Ⅱ级', 'Ⅲ级', 'Ⅳ级', 'Ⅴ级', 'Ⅵ级'], placeholder: 'ASA 分级（必填）' },
      { fieldName: 'anesthesiaPlan', fieldType: 'select', required: true, options: ['全身麻醉', '椎管内麻醉', '神经阻滞', '局部麻醉'], placeholder: '拟行麻醉方式' },
      { fieldName: 'preOpRisk', fieldType: 'text', required: true, placeholder: '麻醉适应证与风险评估' },
      { fieldName: 'fastingHours', fieldType: 'number', required: true, placeholder: '禁食禁饮时间（小时）' },
    ],
    dueRule: 'before_anesthesia',
    responsibleRole: '麻醉医师',
    triggerEvent: 'pre_anesthesia',
  }),

  national({
    templateId: 'TPL-AN-002',
    name: '麻醉记录模板',
    recordType: '麻醉记录',
    content: `术前诊断：[术前诊断]    术中诊断：[术中诊断]
手术方式及日期：[术式 日期]
麻醉方式：[全麻/椎管内/神经阻滞/局麻]
麻醉前用药：[药物+剂量]
麻醉诱导及各项操作起止时间：
  诱导开始：[时间]  插管：[时间/方式]  切皮：[时间]  手术结束：[时间]  拔管：[时间]
麻醉期间用药：[药名/途径/剂量/时间]
麻醉期间突发情况及处理：[描述]
手术起止时间：[开始] ~ [结束]
生命体征（每5min）：[BP/HR/RR/SpO₂ 表格]
麻醉医师签名：[姓名]`,
    fields: [
      { fieldName: 'anesthesiaType', fieldType: 'select', required: true, options: ['全身麻醉', '椎管内麻醉', '神经阻滞', '局部麻醉'], placeholder: '麻醉方式' },
      { fieldName: 'asaGrade', fieldType: 'select', required: true, options: ['Ⅰ级', 'Ⅱ级', 'Ⅲ级', 'Ⅳ级', 'Ⅴ级', 'Ⅵ级'], placeholder: 'ASA 分级' },
      { fieldName: 'inductionTime', fieldType: 'date', required: true, placeholder: '诱导开始时间' },
      { fieldName: 'intubation', fieldType: 'text', required: false, placeholder: '插管方式' },
      { fieldName: 'maintenanceAgents', fieldType: 'table', required: true, placeholder: '麻醉维持用药（药名/途径/剂量/时间）' },
    ],
    dueRule: 'intra_anesthesia_realtime',
    responsibleRole: '麻醉医师',
    triggerEvent: 'anesthesia_started',
  }),

  national({
    templateId: 'TPL-AN-003',
    name: '麻醉术后访视记录模板',
    recordType: '麻醉术后访视',
    content: `一般情况：[神志、精神]
麻醉恢复情况：[恢复过程]
清醒时间：[awaken_time]
是否拔除气管插管：[是/否]
术后医嘱：[医嘱]
PACU出室评分（Aldrete/Steward）：[评分]
特殊情况：[并发症、疼痛、恶心呕吐等]
麻醉医师签字：[姓名]  日期：[日期]`,
    fields: [
      { fieldName: 'awakenTime', fieldType: 'date', required: true, placeholder: '清醒时间' },
      { fieldName: 'extubated', fieldType: 'select', required: true, options: ['是', '否'], placeholder: '是否拔管（必填）' },
      { fieldName: 'pacuDischargeScore', fieldType: 'number', required: true, placeholder: 'Aldrete/Steward 评分' },
    ],
    dueRule: 'post_anesthesia_24h',
    responsibleRole: '麻醉医师',
    triggerEvent: 'post_anesthesia',
  }),
];
