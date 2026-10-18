/**
 * 入院记录系列 L0 国标模板
 * TPL-AD-001 入院记录 / TPL-AD-002 再次入院 / TPL-AD-003 24h入出院 / TPL-AD-004 24h入院死亡
 *
 * 依据：卫医政发〔2010〕11号 第17-21条。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { national, type EmrSeedTemplate } from './types.js';

export const ADMISSION_TEMPLATES: EmrSeedTemplate[] = [
  national({
    templateId: 'TPL-AD-001',
    name: '入院记录模板',
    recordType: '入院记录',
    content: `姓名：[姓名]  性别：[性别]  年龄：[年龄]岁  民族：[民族]  婚姻：[婚姻]
出生地：[出生地]  职业：[职业]  入院时间：[入院时间]  记录时间：[记录时间]
病史陈述者：[陈述者]
主诉：[主要症状/体征 + 持续时间]
现病史：
  起病情况：[起病时间、诱因、缓急]
  主要症状特点：[部位、性质、程度、持续时间、加重缓解因素]
  伴随症状：[伴随症状 + 有鉴别意义的阴性症状]
  诊治经过：[发病以来诊疗经过、用药与效果]
  一般情况：[饮食、睡眠、二便、体重、精神]
既往史：[既往健康、疾病、传染病、预防接种、手术外伤、输血、食物/药物过敏]
个人史：[出生地、居留地、职业毒物接触、烟酒]
婚育史/月经史：[婚姻、生育；女性：初潮[初潮] 周期[周期] 经期[经期] 末次月经[末次月经]]
家族史：[父母、兄弟姐妹健康，类似病、遗传病史]
体格检查：
  T [体温]℃  P [脉搏]次/分  R [呼吸]次/分  BP [血压]mmHg
  一般情况：[发育、营养、神志、精神、体位、查体合作]
  皮肤黏膜：[颜色、温度、弹性、皮疹、出血、蜘蛛痣]
  淋巴结：[全身浅表淋巴结]
  头部及其器官：[头颅、眼睑、结膜、瞳孔、耳鼻咽喉、口腔]
  颈部：[柔软/抵抗、颈静脉、气管、甲状腺]
  胸部：胸廓[对称/畸形]  肺[视触叩听]  心[心界、心率、心律、杂音]
  腹部：[视诊、压痛反跳痛、包块、肝脾、移动性浊音、肠鸣音]
  肛门直肠及外生殖器：[按需检查]
  脊柱四肢：[脊柱、四肢、关节、水肿]
  神经系统：[意识、颅神经、运动感觉、反射、病理征]
专科情况：[专科查体]
辅助检查：[入院前重要检查，注明机构与检查号]
初步诊断：
  [主要诊断（ICD-10）]
  [次要诊断]
诊断依据：[症状、体征、辅检]
鉴别诊断：[需鉴别疾病及要点]
诊疗计划：[护理级别、饮食、完善检查、治疗方案、病情监测]
记录者：[住院医师]    审签者：[上级医师]`,
    fields: [
      { fieldName: 'chiefComplaint', fieldType: 'text', required: true, placeholder: '主诉' },
      { fieldName: 'onsetTime', fieldType: 'date', required: true, placeholder: '起病时间' },
      { fieldName: 'presentIllness', fieldType: 'text', required: true, placeholder: '现病史（按时间顺序）' },
      { fieldName: 'pastHistory', fieldType: 'text', required: true, placeholder: '既往史' },
      { fieldName: 'allergyHistory', fieldType: 'text', required: true, placeholder: '过敏史（空值拦截）' },
      { fieldName: 'personalHistory', fieldType: 'text', required: false, placeholder: '个人史' },
      { fieldName: 'menstrualHistory', fieldType: 'text', required: false, placeholder: '月经史（女性）' },
      { fieldName: 'familyHistory', fieldType: 'text', required: false, placeholder: '家族史' },
      { fieldName: 'peTemp', fieldType: 'number', required: true, placeholder: '体温℃' },
      { fieldName: 'pePr', fieldType: 'number', required: true, placeholder: '脉搏' },
      { fieldName: 'peRr', fieldType: 'number', required: true, placeholder: '呼吸' },
      { fieldName: 'peBp', fieldType: 'text', required: true, placeholder: '血压' },
      { fieldName: 'auxiliaryExam', fieldType: 'text', required: true, placeholder: '辅助检查' },
      { fieldName: 'admissionDiagnoses', fieldType: 'table', required: true, placeholder: '初步诊断（ICD-10，主次排序）' },
    ],
    dueRule: 'admission_time + 24h',
    responsibleRole: '住院医师',
    triggerEvent: 'admission_created',
  }),

  national({
    templateId: 'TPL-AD-002',
    name: '再次（多次）入院记录模板',
    recordType: '再次入院记录',
    content: `姓名：[姓名]  性别：[性别]  年龄：[年龄]岁  入院时间：[入院时间]
主诉：[本次主要症状/体征 + 持续时间]
历次住院诊疗经过小结：
  [第1次入院时间/科室/主要诊断/治疗/转归]
  [第2次入院时间/科室/主要诊断/治疗/转归]
本次现病史：
  [本次起病情况、症状特点、伴随症状、诊疗经过、一般情况]
既往史：[既往史、过敏史]
体格检查：T [体温]℃  P [脉搏]次/分  R [呼吸]次/分  BP [血压]mmHg
  [系统查体 + 专科情况]
辅助检查：[入院前检查]
初步诊断：
  [主要诊断]
  [次要诊断]
诊疗计划：[护理、检查、治疗、监测]
记录者：[住院医师]`,
    fields: [
      { fieldName: 'chiefComplaint', fieldType: 'text', required: true, placeholder: '主诉' },
      { fieldName: 'lastAdmissionSummary', fieldType: 'text', required: true, placeholder: '历次住院诊疗经过小结' },
      { fieldName: 'presentIllness', fieldType: 'text', required: true, placeholder: '本次现病史' },
      { fieldName: 'peTemp', fieldType: 'number', required: true, placeholder: '体温℃' },
      { fieldName: 'peBp', fieldType: 'text', required: true, placeholder: '血压' },
      { fieldName: 'admissionDiagnoses', fieldType: 'table', required: true, placeholder: '初步诊断' },
      { fieldName: 'treatmentPlan', fieldType: 'text', required: true, placeholder: '诊疗计划' },
    ],
    dueRule: 'admission_time + 24h',
    responsibleRole: '住院医师',
    triggerEvent: 'readmission_created',
  }),

  national({
    templateId: 'TPL-AD-003',
    name: '24小时内入出院记录模板',
    recordType: '24h入出院记录',
    content: `姓名：[姓名]  性别：[性别]  年龄：[年龄]岁  职业：[职业]
入院时间：[入院时间]    出院时间：[出院时间]
主诉：[主诉]
入院情况：[入院时主要症状、体征、辅检]
入院诊断：[入院诊断]
诊疗经过：[住院期间主要诊疗措施与病情变化]
出院情况：[出院时症状、体征]
出院诊断：[出院诊断]
出院医嘱：[医嘱、随访]
医师签名：[医师姓名]`,
    fields: [
      { fieldName: 'admissionTime', fieldType: 'date', required: true, placeholder: '入院时间' },
      { fieldName: 'dischargeTime', fieldType: 'date', required: true, placeholder: '出院时间' },
      { fieldName: 'chiefComplaint', fieldType: 'text', required: true, placeholder: '主诉' },
      { fieldName: 'admissionCondition', fieldType: 'text', required: true, placeholder: '入院情况' },
      { fieldName: 'admissionDiagnosis', fieldType: 'text', required: true, placeholder: '入院诊断' },
      { fieldName: 'treatmentCourse', fieldType: 'text', required: true, placeholder: '诊疗经过' },
      { fieldName: 'dischargeCondition', fieldType: 'text', required: true, placeholder: '出院情况' },
      { fieldName: 'dischargeDiagnosis', fieldType: 'text', required: true, placeholder: '出院诊断' },
      { fieldName: 'dischargeOrders', fieldType: 'text', required: true, placeholder: '出院医嘱' },
    ],
    dueRule: 'discharge_time + 24h',
    responsibleRole: '住院医师',
    triggerEvent: 'discharged_within_24h',
  }),

  national({
    templateId: 'TPL-AD-004',
    name: '24小时内入院死亡记录模板',
    recordType: '24h入院死亡记录',
    content: `姓名：[姓名]  性别：[性别]  年龄：[年龄]岁
入院时间：[入院时间]    死亡时间：[死亡时间（精确到分钟）]
主诉：[主诉]
入院情况：[入院时主要症状、体征]
入院诊断：[入院诊断]
诊疗经过：
  [病情演变与抢救经过（抢救时间、措施、用药、参加人员）]
死亡原因：[直接死亡原因 + 根本死因]
死亡诊断：[死亡诊断（ICD-10）]
医师签名：[医师姓名]`,
    fields: [
      { fieldName: 'admissionTime', fieldType: 'date', required: true, placeholder: '入院时间' },
      { fieldName: 'deathTime', fieldType: 'date', required: true, placeholder: '死亡时间（分钟精度）' },
      { fieldName: 'chiefComplaint', fieldType: 'text', required: true, placeholder: '主诉' },
      { fieldName: 'treatmentCourse', fieldType: 'text', required: true, placeholder: '诊疗/抢救经过' },
      { fieldName: 'deathCause', fieldType: 'text', required: true, placeholder: '死亡原因' },
      { fieldName: 'deathDiagnosis', fieldType: 'text', required: true, placeholder: '死亡诊断（ICD-10）' },
    ],
    dueRule: 'death_time + 24h',
    responsibleRole: '住院医师',
    triggerEvent: 'death_within_24h',
  }),
];
