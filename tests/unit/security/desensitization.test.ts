/**
 * 健澜科技数智医院智能体 - 数据脱敏引擎单元测试
 *
 * 版权所有 (c) 2026 健澜科技
 */

import { describe, expect, test } from 'bun:test';
import {
  DesensitizationEngine,
  maskString,
  maskName,
  maskEmail,
  maskAddress,
  generalizeAge,
  generalizeDate,
  hashDesensitize,
  detectSensitiveData,
  desensitizeText,
  desensitizeObject,
  SensitiveFieldType,
  DesensitizationScenario,
} from '../../../src/security';

describe('DesensitizationUtils - maskString', () => {
  test('手机号脱敏：保留前3后4', () => {
    expect(maskString('13812345678', 3, 4)).toBe('138****5678');
  });

  test('身份证脱敏：保留前6后4', () => {
    expect(maskString('110101199001011234', 6, 4)).toBe('110101********1234');
  });

  test('银行卡脱敏：保留前6后4', () => {
    expect(maskString('6222021234567890123', 6, 4)).toBe('622202*********0123');
  });

  test('空字符串返回空', () => {
    expect(maskString('', 3, 4)).toBe('');
  });

  test('保留长度超过字符串长度时全部掩码', () => {
    expect(maskString('abc', 5, 5)).toBe('***');
  });

  test('自定义掩码字符', () => {
    expect(maskString('13812345678', 3, 4, '#')).toBe('138####5678');
  });
});

describe('DesensitizationUtils - maskName', () => {
  test('2字姓名：张*', () => {
    expect(maskName('张三')).toBe('张*');
  });

  test('3字姓名：王*明', () => {
    expect(maskName('王小明')).toBe('王*明');
  });

  test('4字姓名（复姓）：欧**', () => {
    expect(maskName('欧阳峰')).toBe('欧**');
  });

  test('单字姓名返回原字', () => {
    expect(maskName('李')).toBe('李');
  });
});

describe('DesensitizationUtils - maskEmail', () => {
  test('邮箱脱敏：保留首字符', () => {
    expect(maskEmail('zhangsan@hospital.com')).toBe('z***@hospital.com');
  });

  test('单字符用户名', () => {
    expect(maskEmail('a@test.com')).toBe('a***@test.com');
  });

  test('无@符号返回原值', () => {
    expect(maskEmail('notanemail')).toBe('notanemail');
  });
});

describe('DesensitizationUtils - maskAddress', () => {
  test('完整地址脱敏', () => {
    const result = maskAddress('北京市海淀区中关村大街1号');
    expect(result).toContain('北京市海淀区');
    expect(result).toContain('***');
  });
});

describe('DesensitizationUtils - generalizeAge', () => {
  test('47岁泛化为45-49岁', () => {
    expect(generalizeAge(47)).toBe('45-49岁');
  });

  test('92岁泛化为≥90岁', () => {
    expect(generalizeAge(92)).toBe('≥90岁');
  });

  test('5岁泛化为5-9岁', () => {
    expect(generalizeAge(5)).toBe('5-9岁');
  });

  test('自定义区间大小', () => {
    expect(generalizeAge(47, 10)).toBe('40-49岁');
  });
});

describe('DesensitizationUtils - generalizeDate', () => {
  test('按年泛化', () => {
    expect(generalizeDate('1990-01-15', 'year')).toBe('1990年');
  });

  test('按月泛化', () => {
    expect(generalizeDate('1990-01-15', 'month')).toBe('1990年01月');
  });
});

describe('DesensitizationUtils - hashDesensitize', () => {
  test('相同输入产生相同哈希', () => {
    const h1 = hashDesensitize('test', 'salt');
    const h2 = hashDesensitize('test', 'salt');
    expect(h1).toBe(h2);
  });

  test('不同盐产生不同哈希', () => {
    const h1 = hashDesensitize('test', 'salt1');
    const h2 = hashDesensitize('test', 'salt2');
    expect(h1).not.toBe(h2);
  });

  test('SHA-512哈希长度为128', () => {
    const h = hashDesensitize('test', '', 'sha512');
    expect(h.length).toBe(128);
  });
});

describe('DesensitizationUtils - detectSensitiveData', () => {
  test('检测手机号', () => {
    const result = detectSensitiveData('联系电话13812345678');
    expect(result.some((d) => d.type === SensitiveFieldType.PHONE)).toBe(true);
  });

  test('检测身份证号', () => {
    const result = detectSensitiveData('身份证号110101199001011234');
    expect(result.some((d) => d.type === SensitiveFieldType.ID_CARD)).toBe(true);
  });

  test('检测邮箱', () => {
    const result = detectSensitiveData('邮箱test@example.com');
    expect(result.some((d) => d.type === SensitiveFieldType.EMAIL)).toBe(true);
  });

  test('空文本返回空数组', () => {
    expect(detectSensitiveData('')).toEqual([]);
  });
});

describe('DesensitizationUtils - desensitizeText', () => {
  test('文本中的手机号被脱敏', () => {
    const result = desensitizeText('患者电话13812345678，请联系');
    expect(result).toContain('138****5678');
    expect(result).not.toContain('13812345678');
  });

  test('无敏感数据的文本不变', () => {
    const text = '这是一段普通文本，没有敏感数据';
    expect(desensitizeText(text)).toBe(text);
  });
});

describe('DesensitizationUtils - desensitizeObject', () => {
  test('递归脱敏对象中的字符串', () => {
    const obj = {
      name: '张三',
      phone: '13812345678',
      age: 30,
      nested: {
        email: 'test@example.com',
      },
    };
    const result = desensitizeObject(obj);
    expect(result.phone).toContain('****');
    expect(result.age).toBe(30); // 数字不变
  });

  test('数组递归脱敏', () => {
    const arr = ['13812345678', '普通文本'];
    const result = desensitizeObject(arr);
    expect(result[0]).toContain('****');
    expect(result[1]).toBe('普通文本');
  });
});

describe('DesensitizationEngine', () => {
  const engine = new DesensitizationEngine();

  test('身份证号脱敏', () => {
    const result = engine.desensitize('110101199001011234', SensitiveFieldType.ID_CARD);
    expect(result).toBe('110101********1234');
  });

  test('手机号脱敏', () => {
    const result = engine.desensitize('13812345678', SensitiveFieldType.PHONE);
    expect(result).toBe('138****5678');
  });

  test('姓名脱敏', () => {
    const result = engine.desensitize('张三', SensitiveFieldType.NAME);
    expect(result).toBe('张*');
  });

  test('银行卡号脱敏', () => {
    const result = engine.desensitize('6222021234567890123', SensitiveFieldType.BANK_CARD);
    expect(result).toBe('622202*********0123');
  });

  test('邮箱脱敏', () => {
    const result = engine.desensitize('zhangsan@hospital.com', SensitiveFieldType.EMAIL);
    expect(result).toBe('z***@hospital.com');
  });

  test('脱敏与还原（授权场景）', () => {
    const engineWithRestore = new DesensitizationEngine();
    const original = '13812345678';
    const desensitized = engineWithRestore.desensitize(original, SensitiveFieldType.PHONE, true);
    expect(desensitized).toBe('138****5678');
    const restored = engineWithRestore.restore(desensitized, SensitiveFieldType.PHONE);
    expect(restored).toBe(original);
  });

  test('未启用还原时还原失败', () => {
    const engineNoRestore = new DesensitizationEngine();
    const desensitized = engineNoRestore.desensitize('13812345678', SensitiveFieldType.PHONE, false);
    expect(() => engineNoRestore.restore(desensitized, SensitiveFieldType.PHONE)).toThrow();
  });

  test('清除还原映射表', () => {
    const engineClear = new DesensitizationEngine();
    engineClear.desensitize('13812345678', SensitiveFieldType.PHONE, true);
    engineClear.clearRestoreMap();
    expect(() => engineClear.restore('138****5678', SensitiveFieldType.PHONE)).toThrow();
  });

  test('自定义脱敏规则', () => {
    const customEngine = new DesensitizationEngine();
    customEngine.registerRule(SensitiveFieldType.PHONE, {
      fieldType: SensitiveFieldType.PHONE,
      algorithm: 'mask' as never,
      keepPrefix: 4,
      keepSuffix: 2,
      maskChar: '#',
    });
    const result = customEngine.desensitize('13812345678', SensitiveFieldType.PHONE);
    expect(result).toBe('1381#####78');
  });

  test('获取脱敏场景', () => {
    const displayEngine = new DesensitizationEngine({ scenario: DesensitizationScenario.DISPLAY });
    expect(displayEngine.getScenario()).toBe(DesensitizationScenario.DISPLAY);
  });

  test('L3/L4数据需要脱敏', () => {
    expect(engine.shouldDesensitize('L3' as never)).toBe(true);
    expect(engine.shouldDesensitize('L4' as never)).toBe(true);
  });

  test('工厂函数创建引擎', () => {
    const e = new (require('../../../src/security').DesensitizationEngine)();
    expect(e).toBeDefined();
  });
});
