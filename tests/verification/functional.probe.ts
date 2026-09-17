/**
 * 健澜科技数智医院智能体 - 端到端功能探针（非单元测试，供人工验证运行）
 *
 * 实跑关键功能并打印证据：
 *  1) CDS 引擎：药物相互作用 / 青霉素过敏 block / 危急值触发
 *  2) 脱敏引擎：身份证 / 手机号 / 姓名 / IP
 *  3) HL7 构建→解析 往返（ADT^A01）
 *  4) ToolRiskManager：low 自动 / medium 需确认 / high 二次确认
 *
 * 运行：bun tests/verification/functional.probe.ts
 */
import { CDSEngine } from '../../src/knowledge/cds/CDSEngine.js';
import { ALL_CDS_RULES } from '../../src/knowledge/cds/rules/ruleIndex.js';
import { DesensitizationEngine } from '../../src/security/desensitization/DesensitizationEngine.js';
import { SensitiveFieldType } from '../../src/security/types.js';
import { HL7Builder } from '../../src/integration/protocols/hl7/HL7Builder.js';
import { HL7Parser } from '../../src/integration/protocols/hl7/HL7Parser.js';
import { ToolRiskManager } from '../../src/core/tools/ToolRiskManager.js';
import { createRegistryWithFirstBatch } from '../../src/medical-tools/registry.js';

const out: Record<string, unknown> = {};

// ---- 1. CDS ----
const eng = new CDSEngine();
eng.registerRules(ALL_CDS_RULES);
const baseFacts = {
  patientId: 'P001', allergies: [], currentDrugs: [], newDrugs: [],
  diagnoses: [], symptoms: [], signs: [], labResults: [],
};
const r1 = eng.run(
  { ...baseFacts, currentDrugs: ['华法林钠片'], newDrugs: ['阿司匹林肠溶片'] },
  'prescription_create',
);
const r2 = eng.run(
  { ...baseFacts, allergies: ['青霉素'], newDrugs: ['阿莫西林胶囊'] },
  'prescription_create',
);
const r3 = eng.run(
  { ...baseFacts, labResults: [{ itemName: '血钾', value: 6.9, unit: 'mmol/L' }] },
  'lab_result_report',
);
out.cds = {
  registeredRules: eng.size,
  warfarinAspirin: { hit: !!r1.hits.find((h) => h.ruleId === 'DDI-001'), maxLevel: r1.maxLevel },
  penicillinAmoxicillin: { passed: r2.passed, blocked: r2.passed === false },
  potassium69: { criticalHit: r3.hits.some((h) => h.ruleId === 'CRIT-001'), maxLevel: r3.maxLevel },
};

// ---- 2. 脱敏 ----
const de = new DesensitizationEngine();
out.desensitization = {
  idCard: de.desensitize('110101199003077777', SensitiveFieldType.ID_CARD),
  phone: de.desensitize('13812345678', SensitiveFieldType.PHONE),
  name: de.desensitize('欧阳峰', SensitiveFieldType.NAME),
  ip: de.desensitize('192.168.1.100', SensitiveFieldType.IP_ADDRESS),
  licensePlate: de.desensitize('浙A12345', SensitiveFieldType.LICENSE_PLATE),
};

// ---- 3. HL7 往返 ----
import { createADTA01Builder } from '../../src/integration/protocols/hl7/HL7MessageTypes.js';
const builder = createADTA01Builder({ patientId: 'P001', patientName: '张三' });
const hl7msg = builder.build();
const hl7str = builder.buildString();
const parser = new HL7Parser();
const parsed = parser.parse(hl7str);
out.hl7 = {
  messageType: hl7msg.getMessageType() + '^' + hl7msg.getTriggerEvent(),
  segmentCount: hl7msg.getSegmentCount(),
  rawLength: hl7str.length,
  parsedMessageType: parsed.message.getMessageType() + '^' + parsed.message.getTriggerEvent(),
  parseSuccess: parsed.success,
  mllpFrame: builder.buildMLLP().length > 0,
};

// ---- 4. 风险分级 ----
const rm = new ToolRiskManager();
const reg = createRegistryWithFirstBatch();
type ConfirmTool = Parameters<ToolRiskManager['evaluateConfirmationRequirement']>[0];
const asBuilt = (n: string): ConfirmTool => reg.get(n) as unknown as ConfirmTool;
const low = asBuilt('query_patient');
const medium = asBuilt('prescription_audit');
const high = asBuilt('create_prescription');
out.risk = {
  lowAuto: rm.evaluateConfirmationRequirement(low, {}),
  mediumConfirm: rm.evaluateConfirmationRequirement(medium, {}),
  highDoubleConfirm: rm.evaluateConfirmationRequirement(high, {}),
};

console.log(JSON.stringify(out, null, 2));
