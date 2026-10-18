/**
 * 出/院与死亡系列 L0 国标模板
 * TPL-DC-001 出院记录 / TPL-DC-002 死亡记录 / TPL-DC-003 死亡病例讨论
 *
 * 依据：卫医政发〔2010〕11号 第22条二十~二十二；WS/T 500.49 出院记录。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { national, type EmrSeedTemplate } from './types.js';

export const DISCHARGE_TEMPLATES: EmrSeedTemplate[] = [
  national({
    templateId: 'TPL-DC-001',
    name: '出院记录（出院小结）模板',
    recordType: '出院记录',
    content: `入院日期：[入院日期]    出院日期：[出院日期]    住院天数：[天数]天
入院情况：[入院时主要症状、体征、辅检]
入院诊断：[入院诊断]
诊疗经过：[住院期间主要检查、治疗、手术情况、病情变化]
出院诊断：
  主要诊断：[主要诊断（与病案首页一致，ICD-10）]
  其他诊断：[其他诊断]
出院情况：[出院时症状、体征、重要检查结果]
出院医嘱：
1. 休息与活动：[建议]
2. 饮食：[饮食建议]
3. 带药：[药品、剂量、用法、疗程]
4. 复诊：[复诊时间、科室]
5. 其他：[健康宣教]
随访计划：[随访时间与方式]
主管医师：[姓名]    主任医师：[姓名]`,
    fields: [
      { fieldName: 'admissionTime', fieldType: 'date', required: true, placeholder: '入院日期' },
      { fieldName: 'dischargeTime', fieldType: 'date', required: true, placeholder: '出院日期' },
      { fieldName: 'admissionDiagnosis', fieldType: 'text', required: true, placeholder: '入院诊断' },
      { fieldName: 'treatmentCourse', fieldType: 'text', required: true, placeholder: '诊疗经过' },
      { fieldName: 'dischargeDiagnoses', fieldType: 'table', required: true, placeholder: '出院诊断（与首页主诊一致）' },
      { fieldName: 'dischargeCondition', fieldType: 'text', required: true, placeholder: '出院情况' },
      { fieldName: 'followUpPlan', fieldType: 'text', required: true, placeholder: '随访/复诊计划' },
      { fieldName: 'dischargeMeds', fieldType: 'table', required: false, placeholder: '出院带药' },
    ],
    dueRule: 'discharge_time + 24h',
    responsibleRole: '主管医师',
    triggerEvent: 'discharged',
  }),

  national({
    templateId: 'TPL-DC-002',
    name: '死亡记录模板',
    recordType: '死亡记录',
    content: `入院日期：[入院日期]    死亡时间：[死亡时间（精确到分钟）]
入院情况：[入院时情况]
入院诊断：[入院诊断]
诊疗经过：
  [病情演变]
  [抢救经过：时间、措施、用药、参加人员]
死亡原因：[直接死因 + 根本死因]
死亡诊断：[死亡诊断（ICD-10）]
医师签名：[姓名]`,
    fields: [
      { fieldName: 'deathTime', fieldType: 'date', required: true, placeholder: '死亡时间（分钟精度）' },
      { fieldName: 'treatmentCourse', fieldType: 'text', required: true, placeholder: '病情演变与抢救经过' },
      { fieldName: 'deathCause', fieldType: 'text', required: true, placeholder: '死亡原因' },
      { fieldName: 'deathDx', fieldType: 'text', required: true, placeholder: '死亡诊断（ICD-10）' },
    ],
    dueRule: 'death_time + 24h',
    responsibleRole: '主管医师',
    triggerEvent: 'patient_death',
  }),

  national({
    templateId: 'TPL-DC-003',
    name: '死亡病例讨论记录模板',
    recordType: '死亡病例讨论',
    content: `讨论日期：[讨论日期（死亡后一周内）]
主持人：[姓名（科主任/副主任医师以上）]
参加人员：[姓名（职称）]、[姓名（职称）]
病情摘要与死亡情况：[摘要]
讨论意见：
  [诊断、治疗、抢救是否合理充分的分析]
主持人小结：[结论性意见与改进]
记录者签名：[姓名]`,
    fields: [
      { fieldName: 'discussDate', fieldType: 'date', required: true, placeholder: '讨论日期（死亡后7d内）' },
      { fieldName: 'moderator', fieldType: 'text', required: true, placeholder: '主持人（副高以上）' },
      { fieldName: 'attendees', fieldType: 'table', required: true, placeholder: '参加人（姓名+职称）' },
      { fieldName: 'discussSummary', fieldType: 'text', required: true, placeholder: '讨论意见与主持人小结' },
    ],
    dueRule: 'death_time + 7d',
    responsibleRole: '科主任/副主任医师主持',
    triggerEvent: 'death_discussion_due',
  }),
];
