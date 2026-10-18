/**
 * 门（急）诊文书 L0 国标模板
 * TPL-OP-001 门诊初诊 / TPL-OP-002 门诊复诊 / TPL-ER-001 急诊病历（含留观与抢救）
 *
 * 依据：卫医政发〔2010〕11号 第12-15条；WS/T 500.2 门急诊病历。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { national, type EmrSeedTemplate } from './types.js';

export const OUTPATIENT_TEMPLATES: EmrSeedTemplate[] = [
  national({
    templateId: 'TPL-OP-001',
    name: '门诊初诊病历模板',
    recordType: '门诊初诊病历',
    content: `就诊时间：[就诊时间]    科别：[科别]    就诊类型：初诊
姓名：[姓名]  性别：[性别]  年龄：[年龄]岁  民族：[民族]  婚姻：[婚姻]
职业：[职业]  工作单位：[工作单位]  住址：[住址]  药物过敏史：[药物过敏史]
主诉：[主诉（主要症状/体征 + 持续时间）]
现病史：[起病时间、诱因、主要症状特点、伴随症状、阴性症状、诊疗经过、一般情况]
既往史：[既往疾病、手术外伤、输血、传染病、预防接种、食物/药物过敏]
体格检查：T [体温]℃  P [脉搏]次/分  R [呼吸]次/分  BP [血压]mmHg
[阳性体征及必要的阴性体征]
辅助检查：[外院/本院近期检查结果，注明机构与日期]
初步诊断：[诊断1（ICD-10）]；[诊断2]
处理意见：
1. [处方/治疗]
2. [检查/检验申请]
3. [随访与健康宣教]
医师签名：[医师姓名]（[职称]）`,
    fields: [
      { fieldName: 'visitDateTime', fieldType: 'date', required: true, placeholder: '就诊时间' },
      { fieldName: 'deptCode', fieldType: 'text', required: true, placeholder: '科别' },
      { fieldName: 'chiefComplaint', fieldType: 'text', required: true, placeholder: '主诉' },
      { fieldName: 'presentIllness', fieldType: 'text', required: true, placeholder: '现病史' },
      { fieldName: 'pastHistory', fieldType: 'text', required: false, placeholder: '既往史' },
      { fieldName: 'allergyHistory', fieldType: 'text', required: true, placeholder: '药物过敏史（未询问=缺陷）' },
      { fieldName: 'physicalSigns', fieldType: 'text', required: true, placeholder: '阳性体征' },
      { fieldName: 'auxiliaryExam', fieldType: 'text', required: false, placeholder: '辅助检查' },
      { fieldName: 'diagnosisIcd10', fieldType: 'text', required: true, placeholder: '诊断（ICD-10）' },
      { fieldName: 'disposition', fieldType: 'text', required: true, placeholder: '处置意见' },
    ],
    dueRule: 'visit_arrival_time + 0h',
    responsibleRole: '接诊医师',
    triggerEvent: 'outpatient_arrived',
  }),

  national({
    templateId: 'TPL-OP-002',
    name: '门诊复诊病历模板',
    recordType: '门诊复诊病历',
    content: `就诊时间：[就诊时间]    科别：[科别]    就诊类型：复诊
前次诊断：[前次诊断]    前次就诊：[前次日期]
主诉：[主诉（本次就诊主要原因）]
病史：[本次病情变化、用药后反应、前次治疗效果]
体格检查：T [体温]℃  P [脉搏]次/分  R [呼吸]次/分  BP [血压]mmHg
[必要的体格检查与阳性体征]
辅助检查：[本次复查结果]
诊断：[诊断（ICD-10）]
处理意见：
1. [处方调整]
2. [检查/检验]
3. [复诊安排]
医师签名：[医师姓名]（[职称]）`,
    fields: [
      { fieldName: 'visitDateTime', fieldType: 'date', required: true, placeholder: '就诊时间' },
      { fieldName: 'deptCode', fieldType: 'text', required: true, placeholder: '科别' },
      { fieldName: 'chiefComplaint', fieldType: 'text', required: true, placeholder: '主诉' },
      { fieldName: 'history', fieldType: 'text', required: true, placeholder: '病情变化与治疗反应' },
      { fieldName: 'physicalSigns', fieldType: 'text', required: true, placeholder: '必要体检' },
      { fieldName: 'diagnosisIcd10', fieldType: 'text', required: true, placeholder: '诊断（ICD-10）' },
      { fieldName: 'disposition', fieldType: 'text', required: true, placeholder: '处理意见' },
    ],
    dueRule: 'visit_arrival_time + 0h',
    responsibleRole: '接诊医师',
    triggerEvent: 'outpatient_arrived',
  }),

  national({
    templateId: 'TPL-ER-001',
    name: '急诊病历/留观/抢救记录模板',
    recordType: '急诊病历',
    content: `到达时间：[到达时间（精确到分钟）]    分诊分级：[Ⅰ/Ⅱ/Ⅲ/Ⅳ级]    科别：急诊
姓名：[姓名]  性别：[性别]  年龄：[年龄]岁  联系人：[联系人及电话]
主诉：[主诉]
现病史：[发病时间、诱因、主要症状演变、院前处置]
生命体征：T [体温]℃  P [脉搏]次/分  R [呼吸]次/分  BP [血压]mmHg  SpO₂ [血氧]%
处置时间线：
  [时间] [措施（给药/监护/会诊/手术）]
  [时间] [措施]
抢救记录（如抢救）：
  抢救开始：[开始时间]  结束：[结束时间]
  病情变化：[病情演变]
  抢救措施：[气道/循环/用药/除颤等]
  参加人员：[姓名（职称）]
  补记标识：[是否补记（抢救结束后6h内据实补记）]
辅助检查：[急查结果]
初步诊断：[诊断]
去向：[离院/留观/收住院/转EICU/转院/死亡]
医师签名：[医师姓名]`,
    fields: [
      { fieldName: 'arrivalTime', fieldType: 'date', required: true, placeholder: '到达时间（分钟精度）' },
      { fieldName: 'triageLevel', fieldType: 'select', required: true, options: ['Ⅰ级', 'Ⅱ级', 'Ⅲ级', 'Ⅳ级'], placeholder: '分诊分级' },
      { fieldName: 'chiefComplaint', fieldType: 'text', required: true, placeholder: '主诉' },
      { fieldName: 'vitalsTemp', fieldType: 'number', required: true, placeholder: '体温℃' },
      { fieldName: 'vitalsHr', fieldType: 'number', required: true, placeholder: '心率/脉搏' },
      { fieldName: 'vitalsRr', fieldType: 'number', required: true, placeholder: '呼吸' },
      { fieldName: 'vitalsBp', fieldType: 'text', required: true, placeholder: '血压' },
      { fieldName: 'spo2', fieldType: 'number', required: false, placeholder: 'SpO₂%' },
      { fieldName: 'rescueStartTime', fieldType: 'date', required: false, placeholder: '抢救开始时间' },
      { fieldName: 'rescueEndTime', fieldType: 'date', required: false, placeholder: '抢救结束时间' },
      { fieldName: 'rescuers', fieldType: 'text', required: false, placeholder: '参加抢救人员（职称）' },
      { fieldName: 'dispositionDest', fieldType: 'select', required: true, options: ['离院', '留观', '收住院', '转EICU', '转院', '死亡'], placeholder: '患者去向' },
    ],
    dueRule: 'rescue_end_time + 6h',
    responsibleRole: '急诊接诊医师',
    triggerEvent: 'er_arrived',
  }),
];
