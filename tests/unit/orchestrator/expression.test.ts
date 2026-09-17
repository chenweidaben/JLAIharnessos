/**
 * 健澜科技杠OS - 安全表达式引擎单元测试
 *
 * 重点验证：
 *   1. 正常表达式（算术/比较/逻辑/成员/容器/三目/白名单函数/模板）；
 *   2. 安全红线：任意函数调用、原型链、危险全局、方法调用注入一律拒绝。
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import { describe, it, expect } from 'bun:test';
import {
  evaluateExpression,
  evaluateCondition,
  renderTemplate,
  validateExpression,
  ExpressionError,
} from '@/orchestrator/engine/expression.js';

describe('安全表达式引擎 - 基础运算', () => {
  it('支持算术运算与优先级', () => {
    expect(evaluateExpression('1 + 2 * 3', {})).toBe(7);
    expect(evaluateExpression('(1 + 2) * 3', {})).toBe(9);
    expect(evaluateExpression('10 % 3', {})).toBe(1);
    expect(evaluateExpression('10 / 4', {})).toBe(2.5);
  });

  it('支持比较运算', () => {
    expect(evaluateExpression('3 > 2', {})).toBe(true);
    expect(evaluateExpression('2 >= 2', {})).toBe(true);
    expect(evaluateExpression('1 === 1', {})).toBe(true);
    expect(evaluateExpression('1 !== 2', {})).toBe(true);
    expect(evaluateExpression('"a" == "a"', {})).toBe(true);
  });

  it('支持逻辑运算与短路', () => {
    expect(evaluateExpression('true && false', {})).toBe(false);
    expect(evaluateExpression('false || true', {})).toBe(true);
    expect(evaluateExpression('!false', {})).toBe(true);
    expect(evaluateCondition('age >= 18 && role == "doctor"', { age: 35, role: 'doctor' })).toBe(true);
  });

  it('支持三目运算', () => {
    expect(evaluateExpression('age >= 18 ? "成年" : "未成年"', { age: 20 })).toBe('成年');
    expect(evaluateExpression('age >= 18 ? "成年" : "未成年"', { age: 10 })).toBe('未成年');
  });
});

describe('安全表达式引擎 - 变量与成员访问', () => {
  const ctx = {
    input: { name: '张三', age: 65, tags: ['高血压', '糖尿病'] },
    nodes: {
      lab: { output: { glucose: 8.4, items: [{ name: '血糖' }] } },
    },
    vars: { threshold: 7.0 },
  };

  it('读取嵌套属性', () => {
    expect(evaluateExpression('input.name', ctx)).toBe('张三');
    expect(evaluateExpression('nodes.lab.output.glucose', ctx)).toBe(8.4);
  });

  it('读取数组元素（下标与计算属性）', () => {
    expect(evaluateExpression('input.tags[0]', ctx)).toBe('高血压');
    expect(evaluateExpression('nodes.lab.output.items[0].name', ctx)).toBe('血糖');
    expect(evaluateExpression('input.tags[1]', ctx)).toBe('糖尿病');
  });

  it('跨节点变量比较', () => {
    expect(evaluateCondition('nodes.lab.output.glucose > vars.threshold', ctx)).toBe(true);
  });

  it('访问不存在的路径返回 undefined 而非抛错', () => {
    expect(evaluateExpression('nodes.x.output.y', ctx)).toBeUndefined();
    expect(evaluateExpression('input.nope.deep', ctx)).toBeUndefined();
  });
});

describe('安全表达式引擎 - 容器与白名单函数', () => {
  it('构造数组与对象', () => {
    expect(evaluateExpression('[1, 2, 3]', {})).toEqual([1, 2, 3]);
    expect(evaluateExpression('{ a: 1, b: 2 }.b', {})).toBe(2);
  });

  it('白名单聚合函数', () => {
    expect(evaluateExpression('sum([1, 2, 3, 4])', {})).toBe(10);
    expect(evaluateExpression('avg([2, 4, 6])', {})).toBe(4);
    expect(evaluateExpression('count([1, 2])', {})).toBe(2);
    expect(evaluateExpression('max([3, 9, 2])', {})).toBe(9);
    expect(evaluateExpression('min([3, 9, 2])', {})).toBe(2);
  });

  it('白名单字符串/集合函数', () => {
    expect(evaluateExpression('lower("ABC")', {})).toBe('abc');
    expect(evaluateExpression('contains(["a","b"], "b")', {})).toBe(true);
    expect(evaluateExpression('contains("hello world", "world")', {})).toBe(true);
    expect(evaluateExpression('startsWith("病历", "病")', {})).toBe(true);
    expect(evaluateExpression('coalesce(null, "", "x")', {})).toBe('x');
    expect(evaluateExpression('exists(name)', { name: 'x' })).toBe(true);
    expect(evaluateExpression('exists(name)', {})).toBe(false);
    expect(evaluateExpression('length([1,2,3])', {})).toBe(3);
  });
});

describe('安全表达式引擎 - 模板渲染', () => {
  it('替换 ${...} 占位', () => {
    const out = renderTemplate('患者 ${input.name}，血糖 ${nodes.lab.output.glucose} mmol/L', {
      input: { name: '张三' },
      nodes: { lab: { output: { glucose: 8.4 } } },
    });
    expect(out).toBe('患者 张三，血糖 8.4 mmol/L');
  });

  it('对象占位渲染为 JSON', () => {
    expect(renderTemplate('数据 ${vars.obj}', { vars: { obj: { a: 1 } } })).toBe('数据 {"a":1}');
  });
});

describe('安全表达式引擎 - 安全红线（必须拒绝）', () => {
  const malicious = [
    'process.exit(1)',
    'global.process',
    'globalThis',
    'require("fs")',
    'constructor',
    'obj.__proto__',
    'obj.constructor',
    'obj.prototype',
    '{"__proto__": 1}',
    'evilFunction()',
    'input.constructor.name',
    'Function("return 1")()',
    'x => x',
    'this.constructor',
  ];

  it.each(malicious)('拒绝恶意表达式: %s', (expr) => {
    const result = validateExpression(expr);
    // 构造器/危险全局即便能解析，求值时也必须抛错或不可达
    if (result.valid) {
      expect(() => evaluateExpression(expr, { obj: {}, x: 1 })).toThrow(ExpressionError);
    } else {
      expect(result.valid).toBe(false);
    }
  });

  it('不允许调用任意对象方法（阻断代码执行面）', () => {
    // toLocaleString 等方法不在白名单，必须拒绝
    expect(() => evaluateExpression('"x".toString()', {})).toThrow(ExpressionError);
  });

  it('字符串内的注入载荷不会被当作代码执行', () => {
    // 注入内容只是字符串字面量
    const v = evaluateExpression('input.q', { input: { q: 'process.exit(1)' } });
    expect(v).toBe('process.exit(1)');
  });
});
