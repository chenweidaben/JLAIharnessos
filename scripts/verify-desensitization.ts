/**
 * 数据脱敏 16 种规则验证脚本
 */
import { DesensitizationEngine } from '../src/security/desensitization/DesensitizationEngine';
import { SensitiveFieldType } from '../src/security/types';

const engine = new DesensitizationEngine();

const cases: { type: SensitiveFieldType; input: string; expectContains?: string }[] = [
  { type: SensitiveFieldType.NAME, input: '张三丰', expectContains: '张' },
  { type: SensitiveFieldType.ID_CARD, input: '110101199001011234' },
  { type: SensitiveFieldType.PHONE, input: '13812345678', expectContains: '138' },
  { type: SensitiveFieldType.ADDRESS, input: '北京市海淀区中关村大街1号' },
  { type: SensitiveFieldType.BANK_CARD, input: '6222021234567890123' },
  { type: SensitiveFieldType.EMAIL, input: 'zhangsan@hospital.com' },
  { type: SensitiveFieldType.EMERGENCY_CONTACT, input: '紧急联系人：李四 13912345678' },
  { type: SensitiveFieldType.MEDICAL_RECORD_NO, input: 'BL20260914001' },
  { type: SensitiveFieldType.DATE_OF_BIRTH, input: '1990-01-15' },
  { type: SensitiveFieldType.AGE, input: '47岁' },
  { type: SensitiveFieldType.INPATIENT_NO, input: 'ZY20260914001' },
  { type: SensitiveFieldType.OUTPATIENT_NO, input: 'MZ20260914001' },
  { type: SensitiveFieldType.INSURANCE_CARD, input: '医保卡：1234567890123456' },
  { type: SensitiveFieldType.LICENSE_PLATE, input: '京A12345' },
  { type: SensitiveFieldType.IP_ADDRESS, input: '192.168.1.100' },
  { type: SensitiveFieldType.MAC_ADDRESS, input: '00:1A:2B:3C:4D:5E' },
];

console.log('=== 16 种脱敏规则验证 ===');
let pass = 0;
for (const c of cases) {
  try {
    const out = engine.desensitize(c.input, c.type);
    const masked = out !== c.input;
    const expectOk = !c.expectContains || out.includes(c.expectContains);
    const ok = masked && expectOk;
    if (ok) pass++;
    console.log(`${ok ? 'OK ' : 'FAIL'} [${c.type}] "${c.input}" -> "${out}"`);
  } catch (e) {
    console.log(`ERR [${c.type}] "${c.input}": ${e instanceof Error ? e.message : e}`);
  }
}
console.log(`\n通过: ${pass}/${cases.length}`);

// 自动检测验证
console.log('\n=== 文本自动敏感数据检测 ===');
const text = '患者张三，身份证110101199001011234，手机13812345678，邮箱test@hospital.com';
const detected = engine.desensitizeText ? engine.desensitizeText(text) : text;
console.log(`原文: ${text}`);
console.log(`脱敏: ${detected}`);
