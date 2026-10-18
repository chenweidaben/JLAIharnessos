/**
 * 住院病案首页 L0 国标模板
 * TPL-FP-001 住院病案首页
 *
 * 依据：卫医政发〔2010〕11号 第34条；国卫办医发〔2016〕24号；WS/T 500.32。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { national, type EmrSeedTemplate } from './types.js';

export const FRONT_PAGE_TEMPLATES: EmrSeedTemplate[] = [
  national({
    templateId: 'TPL-FP-001',
    name: '住院病案首页模板',
    recordType: '住院病案首页',
    content: `病案号：[病案号]    姓名：[姓名]    性别：[性别]    出生日期：[出生日期]
身份证件号：[证件号]  婚姻：[婚姻]  职业：[职业]  民族：[民族]  籍贯：[籍贯]
入院时间：[入院时间]    出院时间：[出院时间]    科室：[科室]    床号：[床号]
入院途径：[急诊/门诊/其他医疗机构转入/其他]    住院天数：[天数]
入院诊断：[入院诊断]
出院诊断：
  主要诊断：[主要诊断（ICD-10）]（本次住院危害最大/资源消耗最多/住院最长）
  其他诊断：[其他诊断1]；[其他诊断2]
  中毒外部原因：[外部原因编码]
手术及操作：
  主要手术操作：[手术名称（ICD-9-CM3）]  日期：[日期]  术者：[术者]  切口愈合：[甲/乙/丙]
  其他手术操作：[其他操作]
离院方式：[医嘱离院/医嘱转院/非医嘱离院/死亡/其他]    是否出院：[是/否]
费用信息（元）：综合医疗 [综合]  诊断 [诊断]  治疗 [治疗]  康复 [康复]  中医 [中医]  西药 [西药]  中药 [中药]  血液制品 [血液]  耗材 [耗材]  合计 [合计]
编码员：[编码员]    编码日期：[日期]    质控医师：[质控医师]`,
    fields: [
      { fieldName: 'patientIdCard', fieldType: 'text', required: true, placeholder: '身份证件号' },
      { fieldName: 'admissionTime', fieldType: 'date', required: true, placeholder: '入院时间' },
      { fieldName: 'dischargeTime', fieldType: 'date', required: true, placeholder: '出院时间' },
      { fieldName: 'mainDiagnosisName', fieldType: 'text', required: true, placeholder: '主要诊断名称' },
      { fieldName: 'mainDiagnosisIcd10', fieldType: 'text', required: true, placeholder: '主要诊断 ICD-10' },
      { fieldName: 'otherDiagnoses', fieldType: 'table', required: false, placeholder: '其他诊断列表' },
      { fieldName: 'mainProcName', fieldType: 'text', required: false, placeholder: '主要手术操作名称' },
      { fieldName: 'mainProcIcd9cm3', fieldType: 'text', required: false, placeholder: '主要手术 ICD-9-CM3' },
      { fieldName: 'incisionHealingGrade', fieldType: 'select', required: false, options: ['甲', '乙', '丙', '未做手术'], placeholder: '切口愈合分级' },
      { fieldName: 'dischargeDisposition', fieldType: 'select', required: true, options: ['医嘱离院', '医嘱转院', '非医嘱离院', '死亡', '其他'], placeholder: '离院方式' },
      { fieldName: 'totalCost', fieldType: 'number', required: true, placeholder: '费用合计（须=各分项之和）' },
    ],
    dueRule: 'discharge_time + 0h',
    responsibleRole: '编码员/病案管理员',
    triggerEvent: 'discharged',
  }),
];
