/**
 * 病程记录系列 L0 国标模板（11 类）
 * 首次病程 / 日常病程 / 主治首查 / 主任查房 / 交班 / 接班 / 转出 / 转入 / 阶段小结 / 抢救 / 有创操作
 *
 * 依据：卫医政发〔2010〕11号 第22条。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { national, type EmrSeedTemplate } from './types.js';

export const PROGRESS_TEMPLATES: EmrSeedTemplate[] = [
  national({
    templateId: 'TPL-PN-001',
    name: '首次病程记录模板',
    recordType: '首次病程记录',
    content: `[日期时间] 首次病程记录
病例特点：
1. 患者[姓名]，[性别]，[年龄]岁，[职业]。因"[主诉]"入院。
2. 病史要点：[归纳阳性病史与有鉴别意义的阴性史]
3. 体格检查：T [体温]℃，P [脉搏]次/分，R [呼吸]次/分，BP [血压]mmHg。[阳性体征]
4. 辅助检查：[重要检查结果]
拟诊讨论：
（一）初步诊断：[诊断（ICD-10）]
（二）诊断依据：1.[症状]；2.[体征]；3.[辅助检查]
（三）鉴别诊断：
  1.[疾病1]：[鉴别要点]
  2.[疾病2]：[鉴别要点]
诊疗计划：
1. [护理级别、饮食]
2. [完善检查项目]
3. [治疗方案：药物/手术/监护]
4. [病情监测要点]
5. [健康教育]
医师签名：[医师姓名]`,
    fields: [
      { fieldName: 'caseFeatures', fieldType: 'text', required: true, placeholder: '病例特点' },
      { fieldName: 'diagnosis', fieldType: 'text', required: true, placeholder: '初步诊断' },
      { fieldName: 'diagnosisBasis', fieldType: 'text', required: true, placeholder: '诊断依据' },
      { fieldName: 'differentialDx', fieldType: 'text', required: true, placeholder: '鉴别诊断（不得仅写诊断明确）' },
      { fieldName: 'plan', fieldType: 'text', required: true, placeholder: '诊疗计划（可执行）' },
    ],
    dueRule: 'admission_time + 8h',
    responsibleRole: '经治医师',
    triggerEvent: 'admission_created',
  }),

  national({
    templateId: 'TPL-PN-002',
    name: '日常病程记录模板',
    recordType: '日常病程记录',
    content: `[日期时间（病危到分钟）] 日常病程记录
病情分级：[病危/病重/稳定]
病情变化：[症状、体征变化]
重要辅检结果及临床意义：[检查结果与判读]
诊疗措施及效果：[已执行措施与疗效]
医嘱更改理由：[调整说明]
向患方告知重要事项：[告知内容]
医师签名：[医师姓名]`,
    fields: [
      { fieldName: 'noteTime', fieldType: 'date', required: true, placeholder: '记录时间（病危到分钟）' },
      { fieldName: 'severity', fieldType: 'select', required: true, options: ['病危', '病重', '稳定'], placeholder: '病情分级（决定下次应写时间）' },
      { fieldName: 'progressNote', fieldType: 'text', required: true, placeholder: '病情变化' },
      { fieldName: 'vitalTrend', fieldType: 'text', required: false, placeholder: '生命体征趋势' },
      { fieldName: 'doctorComment', fieldType: 'text', required: true, placeholder: '诊疗措施与告知' },
    ],
    dueRule: 'next_note_due_by_severity',
    responsibleRole: '经治医师',
    triggerEvent: 'daily_round',
  }),

  national({
    templateId: 'TPL-PN-003',
    name: '主治医师首次查房记录模板',
    recordType: '主治首次查房',
    content: `[日期时间] 主治医师首次查房记录
查房医师：[姓名]（[职称]）
补充病史与体征：[补充内容]
诊断依据与鉴别诊断分析：[分析]
诊疗计划：[护理、检查、治疗、监测调整]
医师签名：[查房医师] / [记录医师]`,
    fields: [
      { fieldName: 'attendingName', fieldType: 'text', required: true, placeholder: '查房医师姓名' },
      { fieldName: 'attendingTitle', fieldType: 'select', required: true, options: ['主治医师', '副主任医师', '主任医师'], placeholder: '上级职称（不得代签）' },
      { fieldName: 'historySupplement', fieldType: 'text', required: false, placeholder: '补充病史体征' },
      { fieldName: 'analysis', fieldType: 'text', required: true, placeholder: '诊断依据与鉴别分析' },
      { fieldName: 'plan', fieldType: 'text', required: true, placeholder: '诊疗计划' },
    ],
    dueRule: 'admission_time + 48h',
    responsibleRole: '主治医师',
    triggerEvent: 'attending_first_round',
  }),

  national({
    templateId: 'TPL-PN-004',
    name: '主任/副主任医师查房记录模板',
    recordType: '主任查房记录',
    content: `[日期时间] 科主任/副主任医师查房记录
查房医师：[姓名]（[职称]）
病情分析：[对病情演变、诊断、鉴别诊断的分析]
诊疗意见：[诊疗调整意见]
医师签名：[查房医师] / [记录医师]`,
    fields: [
      { fieldName: 'chiefDocName', fieldType: 'text', required: true, placeholder: '查房医师姓名' },
      { fieldName: 'chiefDocTitle', fieldType: 'select', required: true, options: ['副主任医师', '主任医师'], placeholder: '副高以上职称' },
      { fieldName: 'analysis', fieldType: 'text', required: true, placeholder: '病情分析' },
      { fieldName: 'opinion', fieldType: 'text', required: true, placeholder: '诊疗意见' },
    ],
    dueRule: 'round_time + 0h',
    responsibleRole: '科主任/副主任医师',
    triggerEvent: 'chief_round',
  }),

  national({
    templateId: 'TPL-PN-005',
    name: '交班前记录模板',
    recordType: '交班记录',
    content: `入院日期：[入院日期]  交班日期：[交班日期]
姓名：[姓名]  性别：[性别]  年龄：[年龄]岁
主诉：[主诉]
入院情况：[入院主要情况]
入院诊断：[入院诊断]
诊疗经过：[住院以来主要诊疗]
目前情况：[当前病情]
目前诊断：[目前诊断]
交班注意事项：[下一班需重点观察与处理事项]
交班医师签名：[姓名]`,
    fields: [
      { fieldName: 'admissionDate', fieldType: 'date', required: true, placeholder: '入院日期' },
      { fieldName: 'handoverDate', fieldType: 'date', required: true, placeholder: '交班日期' },
      { fieldName: 'currentDx', fieldType: 'text', required: true, placeholder: '目前诊断' },
      { fieldName: 'handoverNote', fieldType: 'text', required: true, placeholder: '交班注意事项' },
    ],
    dueRule: 'before_shift_handover',
    responsibleRole: '交班医师',
    triggerEvent: 'shift_handover',
  }),

  national({
    templateId: 'TPL-PN-006',
    name: '接班记录模板',
    recordType: '接班记录',
    content: `入院日期：[入院日期]  接班日期：[接班日期]
姓名：[姓名]  性别：[性别]  年龄：[年龄]岁
主诉：[主诉]
入院情况：[入院情况]
入院诊断：[入院诊断]
诊疗经过：[住院诊疗经过]
目前情况：[当前情况]
目前诊断：[目前诊断]
接班诊疗计划：[接班后诊疗计划]
接班医师签名：[姓名]`,
    fields: [
      { fieldName: 'takeoverDate', fieldType: 'date', required: true, placeholder: '接班日期' },
      { fieldName: 'currentDx', fieldType: 'text', required: true, placeholder: '目前诊断' },
      { fieldName: 'takeoverPlan', fieldType: 'text', required: true, placeholder: '接班诊疗计划' },
    ],
    dueRule: 'takeover_time + 24h',
    responsibleRole: '接班医师',
    triggerEvent: 'shift_takeover',
  }),

  national({
    templateId: 'TPL-PN-007',
    name: '转出记录模板',
    recordType: '转出记录',
    content: `入院日期：[入院日期]  转科日期：[转科日期]
转出科室：[本科室] → 转入科室：[转入科室]
主诉：[主诉]
入院情况：[入院情况]
入院诊断：[入院诊断]
诊疗经过：[本科室诊疗经过]
目前情况：[当前病情]
目前诊断：[目前诊断]
转科目的及注意事项：[转科原因与交接重点]
转出医师签名：[姓名]`,
    fields: [
      { fieldName: 'transferDate', fieldType: 'date', required: true, placeholder: '转科日期' },
      { fieldName: 'toDept', fieldType: 'text', required: true, placeholder: '转入科室' },
      { fieldName: 'currentDx', fieldType: 'text', required: true, placeholder: '目前诊断' },
      { fieldName: 'transferOutReason', fieldType: 'text', required: true, placeholder: '转科目的与注意事项' },
    ],
    dueRule: 'before_transfer_out',
    responsibleRole: '转出科室经治医师',
    triggerEvent: 'transfer_out',
  }),

  national({
    templateId: 'TPL-PN-008',
    name: '转入记录模板',
    recordType: '转入记录',
    content: `入院日期：[入院日期]  转入日期：[转入日期]
转出科室：[原科室] → 转入科室：[本科室]
主诉：[主诉]
入院情况：[入院情况]
入院诊断：[入院诊断]
诊疗经过：[转科前诊疗经过]
目前情况：[当前病情]
目前诊断：[目前诊断]
转入诊疗计划：[本科室诊疗计划]
转入医师签名：[姓名]`,
    fields: [
      { fieldName: 'transferInDate', fieldType: 'date', required: true, placeholder: '转入日期' },
      { fieldName: 'fromDept', fieldType: 'text', required: true, placeholder: '转出科室' },
      { fieldName: 'currentDx', fieldType: 'text', required: true, placeholder: '目前诊断' },
      { fieldName: 'transferInPlan', fieldType: 'text', required: true, placeholder: '转入诊疗计划' },
    ],
    dueRule: 'transfer_in_time + 24h',
    responsibleRole: '转入科室经治医师',
    triggerEvent: 'transfer_in',
  }),

  national({
    templateId: 'TPL-PN-009',
    name: '阶段小结模板',
    recordType: '阶段小结',
    content: `入院日期：[入院日期]  小结日期：[小结日期]
姓名：[姓名]  性别：[性别]  年龄：[年龄]岁
主诉：[主诉]
入院情况：[入院情况]
入院诊断：[入院诊断]
诊疗经过：[本阶段主要诊疗与病情演变]
目前情况：[当前情况]
目前诊断：[目前诊断]
诊疗计划：[下一阶段计划]
医师签名：[姓名]`,
    fields: [
      { fieldName: 'summaryDate', fieldType: 'date', required: true, placeholder: '小结日期（每月）' },
      { fieldName: 'monthlySummary', fieldType: 'text', required: true, placeholder: '本阶段诊疗经过' },
      { fieldName: 'currentDx', fieldType: 'text', required: true, placeholder: '目前诊断' },
      { fieldName: 'plan', fieldType: 'text', required: true, placeholder: '下一阶段计划' },
    ],
    dueRule: 'monthly',
    responsibleRole: '经治医师',
    triggerEvent: 'monthly_summary',
  }),

  national({
    templateId: 'TPL-PN-010',
    name: '抢救记录模板',
    recordType: '抢救记录',
    content: `[日期时间] 抢救记录
补记标识：[是否补记（抢救结束后6h内据实补记，注明实际抢救时间）]
病情变化情况：[病情骤变经过]
抢救开始时间：[开始时间（分钟）]  结束时间：[结束时间（分钟）]
抢救措施：[气道管理、循环支持、用药、除颤、起搏等]
参加抢救人员：[姓名（专业技术职称）]
患者转归：[恢复/死亡]
医师签名：[姓名]`,
    fields: [
      { fieldName: 'rescueStartTime', fieldType: 'date', required: true, placeholder: '抢救开始时间（分钟精度）' },
      { fieldName: 'rescueEndTime', fieldType: 'date', required: true, placeholder: '抢救结束时间' },
      { fieldName: 'isBackfill', fieldType: 'select', required: true, options: ['是', '否'], placeholder: '是否6h内补记' },
      { fieldName: 'measures', fieldType: 'text', required: true, placeholder: '抢救措施' },
      { fieldName: 'rescuersTitle', fieldType: 'text', required: true, placeholder: '参加人员（含职称）' },
    ],
    dueRule: 'rescue_end_time + 6h',
    responsibleRole: '参与抢救医师',
    triggerEvent: 'rescue_event',
  }),

  national({
    templateId: 'TPL-PN-011',
    name: '有创诊疗操作记录模板',
    recordType: '有创操作记录',
    content: `操作名称：[操作名称]
操作时间：[操作时间]
术前诊断：[诊断]
操作步骤：[步骤与过程]
患者一般情况：[术中生命体征]
过程是否顺利：[顺利/不顺利]
有无不良反应/并发症：[描述]
术后注意事项：[观察与处理]
是否已向患者说明：[是/否]
操作医师签名：[姓名]`,
    fields: [
      { fieldName: 'opName', fieldType: 'text', required: true, placeholder: '操作名称' },
      { fieldName: 'opTime', fieldType: 'date', required: true, placeholder: '操作时间（即刻书写）' },
      { fieldName: 'opStep', fieldType: 'text', required: true, placeholder: '操作步骤与结果' },
      { fieldName: 'complication', fieldType: 'text', required: false, placeholder: '不良反应/并发症' },
      { fieldName: 'postOpNote', fieldType: 'text', required: true, placeholder: '术后注意事项' },
    ],
    dueRule: 'op_end_time + 0h',
    responsibleRole: '操作医师',
    triggerEvent: 'invasive_op_done',
  }),
];
