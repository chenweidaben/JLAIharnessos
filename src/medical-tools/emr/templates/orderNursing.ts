/**
 * 医嘱单与护理记录 L0 国标模板
 * TPL-OR-001 长期/临时医嘱单 / TPL-NU-001 病重（病危）护理记录
 *
 * 依据：卫医政发〔2010〕11号 第28条医嘱、第22条二十三护理记录、第30条体温单。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { national, type EmrSeedTemplate } from './types.js';

export const ORDER_NURSING_TEMPLATES: EmrSeedTemplate[] = [
  national({
    templateId: 'TPL-OR-001',
    name: '长期/临时医嘱单模板',
    recordType: '医嘱单',
    content: `长期医嘱：
  [开始时间]  [医嘱内容（每项只含一个内容）]  医师签名：[医师]  执行护士：[护士]
  [停止时间]  停止上述医嘱
临时医嘱：
  [下达时间（精确到分钟）]  [医嘱内容]  医师签名：[医师]  执行时间：[时间]  执行护士：[护士]
抢救口头医嘱补记：[抢救时口头医嘱，护士复诵后执行，抢救结束即刻据实补记]
取消医嘱：[红笔标注取消，留痕]
医师签名：[姓名]    护士签名：[姓名]`,
    fields: [
      { fieldName: 'orderType', fieldType: 'select', required: true, options: ['长期医嘱', '临时医嘱'], placeholder: '医嘱类型' },
      { fieldName: 'orderContent', fieldType: 'text', required: true, placeholder: '医嘱内容（每项一个）' },
      { fieldName: 'startTime', fieldType: 'date', required: true, placeholder: '开始/下达时间（分钟精度）' },
      { fieldName: 'stopTime', fieldType: 'date', required: false, placeholder: '停止时间（长期医嘱）' },
      { fieldName: 'isVerbalBackfill', fieldType: 'select', required: false, options: ['是', '否'], placeholder: '是否抢救口头医嘱补记' },
    ],
    dueRule: 'order_time + 0h',
    responsibleRole: '医嘱医师/执行护士',
    triggerEvent: 'order_written',
  }),

  national({
    templateId: 'TPL-NU-001',
    name: '病重（病危）患者护理记录模板',
    recordType: '病重护理记录',
    content: `日期时间（精确到分钟）：[日期时间]
生命体征：T [体温]℃  P [脉搏]次/分  R [呼吸]次/分  BP [血压]mmHg  SpO₂ [血氧]%
出入量：入量[入量]ml（[途径/内容]）  出量[出量]ml（尿/便/引流量）
病情观察：[神志、瞳孔、症状变化]
护理措施及效果：[措施与效果]
护士签名：[姓名]`,
    fields: [
      { fieldName: 'recordTime', fieldType: 'date', required: true, placeholder: '记录时间（分钟精度）' },
      { fieldName: 'vitalsTemp', fieldType: 'number', required: true, placeholder: '体温℃' },
      { fieldName: 'vitalsHr', fieldType: 'number', required: true, placeholder: '脉搏' },
      { fieldName: 'vitalsRr', fieldType: 'number', required: true, placeholder: '呼吸' },
      { fieldName: 'vitalsBp', fieldType: 'text', required: true, placeholder: '血压' },
      { fieldName: 'intakeOutput', fieldType: 'table', required: true, placeholder: '出入量记录' },
      { fieldName: 'nursingAction', fieldType: 'text', required: true, placeholder: '病情观察与护理措施效果' },
    ],
    dueRule: 'per_nursing_shift',
    responsibleRole: '责任护士',
    triggerEvent: 'critical_nursing',
  }),
];
