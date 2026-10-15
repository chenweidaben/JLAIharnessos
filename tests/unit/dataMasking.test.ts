/**
 * 健澜科技 jlmedaios - M123-B 脱敏聚合器单测
 *
 * 覆盖：
 *  - 基础脱敏函数（name / idCard / phone / address）规则与边界；
 *  - maskSensitiveData 的角色差异（admin 全量 / doctor 脱敏 / patient 脱敏）；
 *  - 嵌套对象、数组、大小写不敏感字段名、入参不被修改。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';

import {
  maskAddress,
  maskIdCard,
  maskName,
  maskPhone,
  maskSensitiveData,
  DEFAULT_MASK_RULES,
} from '../../src/bff/aggregators/dataMaskingAggregator';

/* ------------------------------------------------------------------ */
/* maskName                                                            */
/* ------------------------------------------------------------------ */

describe('maskName', () => {
  it('三字姓名保留首末字，中间 *', () => {
    expect(maskName('张建国')).toBe('张*国');
  });
  it('两字姓名保留首字 + *', () => {
    expect(maskName('张三')).toBe('张*');
  });
  it('四字及以上姓名仅遮罩中间', () => {
    expect(maskName('欧阳娜娜')).toBe('欧**娜');
    expect(maskName('司马迁')).toBe('司*迁');
  });
  it('空值 / 非字符串兜底', () => {
    expect(maskName('')).toBe('');
    expect(maskName(null)).toBe('');
    expect(maskName(undefined)).toBe('');
  });
  it('单字姓名原样返回', () => {
    expect(maskName('李')).toBe('李');
  });
});

/* ------------------------------------------------------------------ */
/* maskIdCard                                                          */
/* ------------------------------------------------------------------ */

describe('maskIdCard', () => {
  it('18 位身份证保留前 4 后 4，中间 10 位 *', () => {
    expect(maskIdCard('330106199001011234')).toBe('3301**********1234');
  });
  it('空值 / 非字符串兜底', () => {
    expect(maskIdCard('')).toBe('');
    expect(maskIdCard(null)).toBe('');
    expect(maskIdCard(undefined)).toBe('');
  });
  it('短于 8 位的输入整体掩码', () => {
    expect(maskIdCard('12345')).toBe('*****');
  });
});

/* ------------------------------------------------------------------ */
/* maskPhone                                                           */
/* ------------------------------------------------------------------ */

describe('maskPhone', () => {
  it('11 位手机号保留前 3 后 4，中间 4 位 *', () => {
    expect(maskPhone('13812345678')).toBe('138****5678');
  });
  it('空值 / 非字符串兜底', () => {
    expect(maskPhone('')).toBe('');
    expect(maskPhone(null)).toBe('');
    expect(maskPhone(undefined)).toBe('');
  });
  it('短于 7 位的输入整体掩码', () => {
    expect(maskPhone('123456')).toBe('******');
  });
});

/* ------------------------------------------------------------------ */
/* maskAddress                                                         */
/* ------------------------------------------------------------------ */

describe('maskAddress', () => {
  it('截断到区级，其后详细地址以 * 代替', () => {
    expect(maskAddress('杭州市西湖区文三路123号')).toBe('杭州市西湖区****');
  });
  it('截断到街道级', () => {
    const out = maskAddress('宁波市海曙区鼓楼街道沿江西路8号');
    expect(out.startsWith('宁波市海曙区鼓楼街道')).toBe(true);
    expect(out.endsWith('****')).toBe(true);
  });
  it('无区/街道时回退到市级', () => {
    const out = maskAddress('南京市长江路99号');
    expect(out.startsWith('南京市')).toBe(true);
  });
  it('空值 / 非字符串兜底', () => {
    expect(maskAddress('')).toBe('');
    expect(maskAddress(null)).toBe('');
    expect(maskAddress(undefined)).toBe('');
  });
});

/* ------------------------------------------------------------------ */
/* maskSensitiveData - 角色差异                                          */
/* ------------------------------------------------------------------ */

const SAMPLE = {
  patientName: '张建国',
  idCard: '330106199001011234',
  phone: '13812345678',
  homeAddress: '杭州市西湖区文三路123号',
  dept: '消化内科',
};

describe('maskSensitiveData', () => {
  it('admin 角色：全量可见，仅做深拷贝', () => {
    const out = maskSensitiveData(SAMPLE, DEFAULT_MASK_RULES, 'admin') as typeof SAMPLE;
    expect(out.patientName).toBe('张建国');
    expect(out.phone).toBe('13812345678');
    expect(out.dept).toBe('消化内科');
  });

  it('doctor 角色：命中规则的字段脱敏，非敏感字段保留', () => {
    const out = maskSensitiveData(SAMPLE, DEFAULT_MASK_RULES, 'doctor') as typeof SAMPLE;
    expect(out.patientName).toBe('张*国');
    expect(out.idCard).toBe('3301**********1234');
    expect(out.phone).toBe('138****5678');
    expect(out.homeAddress.startsWith('杭州市西湖区')).toBe(true);
    expect(out.dept).toBe('消化内科');
  });

  it('nurse / patient 角色同样脱敏', () => {
    const nurse = maskSensitiveData(SAMPLE, DEFAULT_MASK_RULES, 'nurse') as typeof SAMPLE;
    expect(nurse.patientName).toBe('张*国');
    const patient = maskSensitiveData(SAMPLE, DEFAULT_MASK_RULES, 'patient') as typeof SAMPLE;
    expect(patient.phone).toBe('138****5678');
  });

  it('大小写不敏感匹配字段名', () => {
    const input = { PatientName: '张三', PHONE: '13812345678' };
    const out = maskSensitiveData(input, DEFAULT_MASK_RULES, 'doctor') as typeof input;
    expect(out.PatientName).toBe('张*');
    expect(out.PHONE).toBe('138****5678');
  });

  it('嵌套对象与数组递归脱敏', () => {
    const input = {
      list: [
        { patientName: '张建国', phone: '13812345678' },
        { patientName: '李四', phone: '13987654321' },
      ],
      meta: { hospital: '健澜医院' },
    };
    const out = maskSensitiveData(input, DEFAULT_MASK_RULES, 'doctor') as typeof input;
    expect(out.list[0].patientName).toBe('张*国');
    expect(out.list[0].phone).toBe('138****5678');
    expect(out.list[1].patientName).toBe('李*');
    expect(out.meta.hospital).toBe('健澜医院');
  });

  it('不修改入参（纯函数）', () => {
    const snapshot = JSON.stringify(SAMPLE);
    maskSensitiveData(SAMPLE, DEFAULT_MASK_RULES, 'doctor');
    expect(JSON.stringify(SAMPLE)).toBe(snapshot);
  });
});
