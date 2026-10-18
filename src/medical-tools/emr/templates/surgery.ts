/**
 * 手术系列 L0 国标模板
 * TPL-OP-101 术前小结 / TPL-OP-102 术前讨论 / TPL-SG-001 手术安全核查 /
 * TPL-SG-002 手术记录 / TPL-SG-003 术后首次病程 / TPL-SG-101 手术清点记录
 *
 * 依据：卫医政发〔2010〕11号 第22条十一~十八；卫办医政发〔2010〕41号三方核查。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { national, type EmrSeedTemplate } from './types.js';

export const SURGERY_TEMPLATES: EmrSeedTemplate[] = [
  national({
    templateId: 'TPL-OP-101',
    name: '术前小结模板',
    recordType: '术前小结',
    content: `简要病情：[病情摘要]
术前诊断：[术前诊断（ICD-10）]
手术指征：[手术指征]
拟施手术名称和方式：[手术名称（ICD-9-CM3）+ 方式]
拟施麻醉方式：[麻醉方式]
注意事项：[围术期注意]
手术者术前查看患者情况：[查看记录]
记录者：[经治医师]`,
    fields: [
      { fieldName: 'preopDx', fieldType: 'text', required: true, placeholder: '术前诊断（ICD-10）' },
      { fieldName: 'operationIndication', fieldType: 'text', required: true, placeholder: '手术指征' },
      { fieldName: 'plannedProc', fieldType: 'text', required: true, placeholder: '拟施手术名称方式（ICD-9-CM3）' },
      { fieldName: 'plannedAnesthesia', fieldType: 'text', required: true, placeholder: '拟施麻醉方式' },
      { fieldName: 'precautions', fieldType: 'text', required: false, placeholder: '注意事项' },
    ],
    dueRule: 'before_surgery',
    responsibleRole: '经治医师',
    triggerEvent: 'pre_op_24h',
  }),

  national({
    templateId: 'TPL-OP-102',
    name: '术前讨论记录模板',
    recordType: '术前讨论',
    content: `讨论日期：[讨论日期]
主持人：[姓名（职称）]
参加讨论者：[姓名（职称）]、[姓名（职称）]
术前准备情况：[评估、检查、知情同意、备血]
手术指征：[指征]
手术方案：[方案与备选方案]
可能出现的意外及防范措施：[风险与预案]
具体讨论意见：[各人意见]
主持人小结：[结论性意见]
记录者签名：[姓名]`,
    fields: [
      { fieldName: 'discussionDate', fieldType: 'date', required: true, placeholder: '讨论日期' },
      { fieldName: 'moderator', fieldType: 'text', required: true, placeholder: '主持人（上级医师）' },
      { fieldName: 'attendees', fieldType: 'table', required: true, placeholder: '参加人（姓名+职称）' },
      { fieldName: 'plan', fieldType: 'text', required: true, placeholder: '手术方案' },
      { fieldName: 'contingency', fieldType: 'text', required: true, placeholder: '意外防范措施' },
      { fieldName: 'moderatorSummary', fieldType: 'text', required: true, placeholder: '主持人小结' },
    ],
    dueRule: 'before_surgery',
    responsibleRole: '上级医师主持',
    triggerEvent: 'pre_op_discussion',
  }),

  national({
    templateId: 'TPL-SG-001',
    name: '手术安全核查记录模板（三方三时点）',
    recordType: '手术安全核查',
    content: `麻醉实施前核查（SignIn）：
  患者身份：[核对]  手术部位/标记：[左右侧标记]  手术方式：[核对]
  麻醉风险/麻醉设备：[核对]  过敏史：[核对]  术者签名：[签名]  麻醉医师签名：[签名]  巡回护士签名：[签名]
手术开始前核查（TimeOut）：
  预期手术/切口：[核对]  抗生素预防用药：[已用/未用]  影像学资料：[齐/缺]
  术者复述关键步骤与风险：[复述]  三方签名：[签名]
患者离室前核查（SignOut）：
  手术名称：[核对]  器械/敷料/缝针物清点：[准确/补充处理]
  标本核对：[核对]  留置引流：[有/无]  术后注意事项：[交接]
  输血者核对血型/用血量：[核对/不适用]
  三方签名：[签名]`,
    fields: [
      { fieldName: 'laterality', fieldType: 'select', required: true, options: ['左侧标记', '右侧标记', '双侧标记', '不涉及'], placeholder: '手术部位左右侧标记' },
      { fieldName: 'verifyBeforeAnesthesia', fieldType: 'table', required: true, placeholder: '麻醉前三方签名' },
      { fieldName: 'verifyBeforeIncision', fieldType: 'table', required: true, placeholder: '切皮前三方签名' },
      { fieldName: 'verifyBeforeExit', fieldType: 'table', required: true, placeholder: '离室前三方签名' },
      { fieldName: 'bloodCheck', fieldType: 'text', required: false, placeholder: '输血血型/用血量核对' },
    ],
    dueRule: 'at_three_checkpoints',
    responsibleRole: '手术医师+麻醉医师+巡回护士三方',
    triggerEvent: 'surgery_checkpoint',
  }),

  national({
    templateId: 'TPL-SG-002',
    name: '手术记录模板',
    recordType: '手术记录',
    content: `手术日期：[手术日期]
患者：[姓名]  性别：[性别]  科别：[科室]  病房：[病房]  床号：[床号]  病案号：[病案号]
术前诊断：[术前诊断（ICD-10）]
术中诊断：[术中诊断（ICD-10）]
手术名称：[手术名称（ICD-9-CM3）]
手术者：[术者]  助手：[助手1]、[助手2]
麻醉方法：[麻醉方式]
手术经过：[体位、消毒铺巾、切口、探查、主要操作步骤、术中意外与处理]
术中出血量：[出血量] ml    输血：[成分/量]
切除标本：[标本处理]
术后处理：[引流、标本、注意事项]
手术者签名：[签名]（第一助手代写须术者签名）`,
    fields: [
      { fieldName: 'surgeryDate', fieldType: 'date', required: true, placeholder: '手术日期' },
      { fieldName: 'preDxIcd10', fieldType: 'text', required: true, placeholder: '术前诊断 ICD-10' },
      { fieldName: 'intraopDxIcd10', fieldType: 'text', required: true, placeholder: '术中诊断 ICD-10' },
      { fieldName: 'procNameIcd9cm3', fieldType: 'text', required: true, placeholder: '手术名称 ICD-9-CM3' },
      { fieldName: 'surgeon', fieldType: 'text', required: true, placeholder: '术者' },
      { fieldName: 'assistants', fieldType: 'text', required: false, placeholder: '助手' },
      { fieldName: 'anesthesiaMethod', fieldType: 'text', required: true, placeholder: '麻醉方法' },
      { fieldName: 'procedureDetail', fieldType: 'text', required: true, placeholder: '手术经过' },
      { fieldName: 'bloodLoss', fieldType: 'number', required: false, placeholder: '出血量ml' },
    ],
    dueRule: 'surgery_end_time + 24h',
    responsibleRole: '手术者',
    triggerEvent: 'post_surgery',
  }),

  national({
    templateId: 'TPL-SG-003',
    name: '术后首次病程记录模板',
    recordType: '术后首次病程',
    content: `手术时间：[手术时间]
术中诊断：[术中诊断]
麻醉方式：[麻醉方式]
手术方式：[手术方式]
手术简要经过：[经过摘要]
术后处理措施：[监护、引流、用药、补液]
术后应特别注意观察事项：[重点观察]
参加手术医师签名：[姓名]`,
    fields: [
      { fieldName: 'surgeryTime', fieldType: 'date', required: true, placeholder: '手术时间（术后即时）' },
      { fieldName: 'intraopDx', fieldType: 'text', required: true, placeholder: '术中诊断' },
      { fieldName: 'anesthesiaType', fieldType: 'text', required: true, placeholder: '麻醉方式' },
      { fieldName: 'postopSummary', fieldType: 'text', required: true, placeholder: '手术简要经过与术后处理' },
    ],
    dueRule: 'surgery_end_time + 0h',
    responsibleRole: '参加手术医师',
    triggerEvent: 'post_surgery',
  }),

  national({
    templateId: 'TPL-SG-101',
    name: '手术清点记录模板',
    recordType: '手术清点记录',
    content: `手术名称：[手术名称]  手术日期：[日期]
患者：[姓名]  病案号：[病案号]
术前清点：器械[数]  敷料/纱布[数]  缝针[数]
关体腔前清点：器械[数]  敷料[数]  缝针[数]
关体腔后清点：器械[数]  敷料[数]  缝针[数]
血液使用：[自体/异体 成分与量]
异常情况处理：[清点不符时的处理]
器械护士签名：[姓名]    巡回护士签名：[姓名]`,
    fields: [
      { fieldName: 'instrumentCount', fieldType: 'table', required: true, placeholder: '器械三时点清点数' },
      { fieldName: 'spongeCount', fieldType: 'table', required: true, placeholder: '敷料/纱布三时点清点数' },
      { fieldName: 'bloodUsed', fieldType: 'text', required: false, placeholder: '血液使用量' },
    ],
    dueRule: 'surgery_end_time + 0h',
    responsibleRole: '器械护士+巡回护士',
    triggerEvent: 'post_surgery',
  }),
];
