/**
 * 健澜科技杠OS - 安全表达式引擎
 *
 * 工作流 DSL 中的条件分支、变量映射、循环条件等均通过本引擎求值。
 * 为彻底杜绝 Prompt 注入或恶意工作流导致的任意代码执行，本引擎
 * 【不使用 eval / new Function / require】，而是实现：
 *   词法分析（Tokenizer） -> 递归下降语法分析（Parser） -> 白名单 AST 求值（Evaluator）
 *
 * 能力边界（仅允许以下安全子集）：
 *   - 字面量：字符串、数字、true/false/null
 *   - 变量与成员访问：input.age、nodes.lab.output.items[0].name
 *   - 算术：+ - * / %        比较：== != === !== > >= < <=
 *   - 逻辑：&& || !           容器：[]、{}
 *   - 条件：cond ? a : b
 *   - 白名单安全函数：exists/length/contains/lower/upper/trim/startsWith/endsWith
 *                    now/sum/avg/count/min/max/coalesce/toNumber/toString/round
 *
 * 明确禁止：赋值、函数定义、new、原型链（__proto__/constructor/prototype）、
 *           任意方法调用（除白名单函数外）、访问 process/global/require 等。
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

// ============================================================================
// 词法分析
// ============================================================================

type TokenType =
  | 'number'
  | 'string'
  | 'ident'
  | 'op'
  | 'lparen'
  | 'rparen'
  | 'lbracket'
  | 'rbracket'
  | 'lbrace'
  | 'rbrace'
  | 'comma'
  | 'colon'
  | 'question'
  | 'dot'
  | 'eof';

interface Token {
  type: TokenType;
  value: string;
  pos: number;
}

const MULTI_OPS = ['===', '!==', '>=', '<=', '&&', '||', '==', '!='];
const SINGLE_OPS = ['+', '-', '*', '/', '%', '>', '<', '!'];

/** 危险属性名（原型链污染防护） */
const FORBIDDEN_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

function tokenize(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const n = expr.length;

  while (i < n) {
    const ch = expr[i];

    // 空白
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
      i++;
      continue;
    }

    // 数字字面量
    if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(expr[i + 1] ?? ''))) {
      let num = '';
      while (i < n && /[0-9.]/.test(expr[i])) {
        num += expr[i];
        i++;
      }
      tokens.push({ type: 'number', value: num, pos: i });
      continue;
    }

    // 字符串字面量（单/双引号）
    if (ch === '"' || ch === "'") {
      const quote = ch;
      i++;
      let str = '';
      while (i < n && expr[i] !== quote) {
        if (expr[i] === '\\' && i + 1 < n) {
          const next = expr[i + 1];
          str += next === 'n' ? '\n' : next === 't' ? '\t' : next;
          i += 2;
        } else {
          str += expr[i];
          i++;
        }
      }
      if (i >= n) {
        throw new ExpressionError('字符串未闭合', expr);
      }
      i++; // 跳过结束引号
      tokens.push({ type: 'string', value: str, pos: i });
      continue;
    }

    // 标识符（变量名/函数名/true/false/null）
    if (/[a-zA-Z_$]/.test(ch)) {
      let id = '';
      while (i < n && /[a-zA-Z0-9_$]/.test(expr[i])) {
        id += expr[i];
        i++;
      }
      tokens.push({ type: 'ident', value: id, pos: i });
      continue;
    }

    // 多字符操作符
    const two = expr.slice(i, i + 3);
    const three = MULTI_OPS.find((op) => op.length === 3 && expr.startsWith(op, i));
    if (three) {
      tokens.push({ type: 'op', value: three, pos: i });
      i += 3;
      continue;
    }
    const twoOp = MULTI_OPS.find((op) => op.length === 2 && expr.startsWith(op, i));
    if (twoOp) {
      tokens.push({ type: 'op', value: twoOp, pos: i });
      i += 2;
      continue;
    }
    if (SINGLE_OPS.includes(ch)) {
      tokens.push({ type: 'op', value: ch, pos: i });
      i++;
      continue;
    }

    switch (ch) {
      case '(':
        tokens.push({ type: 'lparen', value: ch, pos: i });
        break;
      case ')':
        tokens.push({ type: 'rparen', value: ch, pos: i });
        break;
      case '[':
        tokens.push({ type: 'lbracket', value: ch, pos: i });
        break;
      case ']':
        tokens.push({ type: 'rbracket', value: ch, pos: i });
        break;
      case '{':
        tokens.push({ type: 'lbrace', value: ch, pos: i });
        break;
      case '}':
        tokens.push({ type: 'rbrace', value: ch, pos: i });
        break;
      case ',':
        tokens.push({ type: 'comma', value: ch, pos: i });
        break;
      case ':':
        tokens.push({ type: 'colon', value: ch, pos: i });
        break;
      case '?':
        tokens.push({ type: 'question', value: ch, pos: i });
        break;
      case '.':
        tokens.push({ type: 'dot', value: ch, pos: i });
        break;
      default:
        throw new ExpressionError(`非法字符: ${ch}`, expr);
    }
    i++;
  }

  tokens.push({ type: 'eof', value: '', pos: n });
  return tokens;
}

// ============================================================================
// AST 定义
// ============================================================================

type AstNode =
  | { kind: 'literal'; value: unknown }
  | { kind: 'var'; name: string }
  | { kind: 'member'; object: AstNode; property: AstNode; computed: boolean }
  | { kind: 'call'; callee: string; args: AstNode[] }
  | { kind: 'unary'; op: string; argument: AstNode }
  | { kind: 'binary'; op: string; left: AstNode; right: AstNode }
  | { kind: 'logical'; op: string; left: AstNode; right: AstNode }
  | { kind: 'conditional'; test: AstNode; consequent: AstNode; alternate: AstNode }
  | { kind: 'array'; elements: AstNode[] }
  | { kind: 'object'; properties: { key: string; value: AstNode }[] };

/** 表达式错误 */
export class ExpressionError extends Error {
  constructor(
    message: string,
    public readonly expression: string,
  ) {
    super(`表达式错误: ${message}（表达式: ${expression.slice(0, 80)}）`);
    this.name = 'ExpressionError';
  }
}

// ============================================================================
// 递归下降语法分析
// ============================================================================

class Parser {
  private pos = 0;
  constructor(private readonly tokens: Token[], private readonly src: string) {}

  private peek(): Token {
    return this.tokens[this.pos];
  }

  private next(): Token {
    return this.tokens[this.pos++];
  }

  private expect(type: TokenType): Token {
    const t = this.next();
    if (t.type !== type) {
      throw new ExpressionError(`期望 ${type}，实际得到 ${t.type}("${t.value}")`, this.src);
    }
    return t;
  }

  parse(): AstNode {
    const node = this.parseConditional();
    if (this.peek().type !== 'eof') {
      throw new ExpressionError(`意外的 token: ${this.peek().value}`, this.src);
    }
    return node;
  }

  // 三目：a ? b : c（右结合）
  private parseConditional(): AstNode {
    const test = this.parseLogical();
    if (this.peek().type === 'question') {
      this.next();
      const consequent = this.parseConditional();
      this.expect('colon');
      const alternate = this.parseConditional();
      return { kind: 'conditional', test, consequent, alternate };
    }
    return test;
  }

  private parseLogical(): AstNode {
    let left = this.parseEquality();
    while (this.peek().type === 'op' && (this.peek().value === '&&' || this.peek().value === '||')) {
      const op = this.next().value;
      const right = this.parseEquality();
      left = { kind: 'logical', op, left, right };
    }
    return left;
  }

  private parseEquality(): AstNode {
    let left = this.parseComparison();
    while (
      this.peek().type === 'op' &&
      (this.peek().value === '==' || this.peek().value === '!=' ||
        this.peek().value === '===' || this.peek().value === '!==')
    ) {
      const op = this.next().value;
      const right = this.parseComparison();
      left = { kind: 'binary', op, left, right };
    }
    return left;
  }

  private parseComparison(): AstNode {
    let left = this.parseAdditive();
    while (
      this.peek().type === 'op' &&
      ['>', '>=', '<', '<='].includes(this.peek().value)
    ) {
      const op = this.next().value;
      const right = this.parseAdditive();
      left = { kind: 'binary', op, left, right };
    }
    return left;
  }

  private parseAdditive(): AstNode {
    let left = this.parseMultiplicative();
    while (this.peek().type === 'op' && (this.peek().value === '+' || this.peek().value === '-')) {
      const op = this.next().value;
      const right = this.parseMultiplicative();
      left = { kind: 'binary', op, left, right };
    }
    return left;
  }

  private parseMultiplicative(): AstNode {
    let left = this.parseUnary();
    while (this.peek().type === 'op' && ['*', '/', '%'].includes(this.peek().value)) {
      const op = this.next().value;
      const right = this.parseUnary();
      left = { kind: 'binary', op, left, right };
    }
    return left;
  }

  private parseUnary(): AstNode {
    if (this.peek().type === 'op' && (this.peek().value === '!' || this.peek().value === '-')) {
      const op = this.next().value;
      return { kind: 'unary', op, argument: this.parseUnary() };
    }
    return this.parsePostfix();
  }

  // 后置：成员访问 a.b / a[b]，函数调用 f(...)
  private parsePostfix(): AstNode {
    let node = this.parsePrimary();

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const t = this.peek();
      if (t.type === 'dot') {
        this.next();
        const prop = this.expect('ident');
        if (FORBIDDEN_KEYS.has(prop.value)) {
          throw new ExpressionError(`禁止访问属性: ${prop.value}`, this.src);
        }
        node = { kind: 'member', object: node, property: { kind: 'literal', value: prop.value }, computed: false };
      } else if (t.type === 'lbracket') {
        this.next();
        const propExpr = this.parseConditional();
        this.expect('rbracket');
        node = { kind: 'member', object: node, property: propExpr, computed: true };
      } else {
        break;
      }
    }
    return node;
  }

  private parsePrimary(): AstNode {
    const t = this.peek();

    if (t.type === 'number') {
      this.next();
      return { kind: 'literal', value: Number(t.value) };
    }
    if (t.type === 'string') {
      this.next();
      return { kind: 'literal', value: t.value };
    }
    if (t.type === 'ident') {
      this.next();
      if (t.value === 'true') return { kind: 'literal', value: true };
      if (t.value === 'false') return { kind: 'literal', value: false };
      if (t.value === 'null') return { kind: 'literal', value: null };

      // 函数调用：仅允许白名单函数名
      if (this.peek().type === 'lparen') {
        if (!SAFE_FUNCTIONS.has(t.value)) {
          throw new ExpressionError(`不允许调用函数: ${t.value}（仅允许白名单安全函数）`, this.src);
        }
        this.next();
        const args: AstNode[] = [];
        if (this.peek().type !== 'rparen') {
          args.push(this.parseConditional());
          while (this.peek().type === 'comma') {
            this.next();
            args.push(this.parseConditional());
          }
        }
        this.expect('rparen');
        return { kind: 'call', callee: t.value, args };
      }
      return { kind: 'var', name: t.value };
    }
    if (t.type === 'lparen') {
      this.next();
      const node = this.parseConditional();
      this.expect('rparen');
      return node;
    }
    if (t.type === 'lbracket') {
      return this.parseArray();
    }
    if (t.type === 'lbrace') {
      return this.parseObject();
    }
    throw new ExpressionError(`意外的 token: ${t.value || t.type}`, this.src);
  }

  private parseArray(): AstNode {
    this.expect('lbracket');
    const elements: AstNode[] = [];
    if (this.peek().type !== 'rbracket') {
      elements.push(this.parseConditional());
      while (this.peek().type === 'comma') {
        this.next();
        if (this.peek().type === 'rbracket') break; // 允许尾逗号
        elements.push(this.parseConditional());
      }
    }
    this.expect('rbracket');
    return { kind: 'array', elements };
  }

  private parseObject(): AstNode {
    this.expect('lbrace');
    const properties: { key: string; value: AstNode }[] = [];
    if (this.peek().type !== 'rbrace') {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const keyToken = this.next();
        if (keyToken.type !== 'ident' && keyToken.type !== 'string') {
          throw new ExpressionError('对象键必须是标识符或字符串', this.src);
        }
        if (FORBIDDEN_KEYS.has(keyToken.value)) {
          throw new ExpressionError(`禁止的对象键: ${keyToken.value}`, this.src);
        }
        this.expect('colon');
        const value = this.parseConditional();
        properties.push({ key: keyToken.value, value });
        if (this.peek().type === 'comma') {
          this.next();
          if (this.peek().type === 'rbrace') break;
          continue;
        }
        break;
      }
    }
    this.expect('rbrace');
    return { kind: 'object', properties };
  }
}

// ============================================================================
// 白名单安全函数
// ============================================================================

function isArray(v: unknown): v is unknown[] {
  return Array.isArray(v);
}

const SAFE_FUNCTIONS = new Set<string>([
  'exists',
  'length',
  'contains',
  'lower',
  'upper',
  'trim',
  'startsWith',
  'endsWith',
  'now',
  'sum',
  'avg',
  'count',
  'min',
  'max',
  'coalesce',
  'toNumber',
  'toString',
  'round',
  'empty',
]);

function callSafeFunction(name: string, args: unknown[]): unknown {
  switch (name) {
    case 'exists':
      return args[0] !== null && args[0] !== undefined;
    case 'empty':
      return args[0] === null || args[0] === undefined || args[0] === '' ||
        (isArray(args[0]) && args[0].length === 0);
    case 'length': {
      const v = args[0];
      if (typeof v === 'string' || isArray(v)) return v.length;
      if (v && typeof v === 'object') return Object.keys(v).length;
      return 0;
    }
    case 'contains': {
      const [coll, item] = args;
      if (typeof coll === 'string') return coll.includes(String(item));
      if (isArray(coll)) return coll.includes(item);
      return false;
    }
    case 'lower':
      return String(args[0] ?? '').toLowerCase();
    case 'upper':
      return String(args[0] ?? '').toUpperCase();
    case 'trim':
      return String(args[0] ?? '').trim();
    case 'startsWith':
      return String(args[0] ?? '').startsWith(String(args[1] ?? ''));
    case 'endsWith':
      return String(args[0] ?? '').endsWith(String(args[1] ?? ''));
    case 'now':
      return Date.now();
    case 'sum':
      return isArray(args[0]) ? (args[0] as number[]).reduce((a, b) => a + (Number(b) || 0), 0) : 0;
    case 'count':
      return isArray(args[0]) ? args[0].length : 0;
    case 'avg': {
      if (!isArray(args[0]) || args[0].length === 0) return null;
      const nums = (args[0] as number[]).map(Number).filter((x) => !Number.isNaN(x));
      return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
    }
    case 'min':
      return isArray(args[0]) && args[0].length ? Math.min(...(args[0] as number[])) : null;
    case 'max':
      return isArray(args[0]) && args[0].length ? Math.max(...(args[0] as number[])) : null;
    case 'coalesce':
      return args.find((a) => a !== null && a !== undefined && a !== '') ?? null;
    case 'toNumber': {
      const num = Number(args[0]);
      return Number.isNaN(num) ? null : num;
    }
    case 'toString':
      return args[0] === null || args[0] === undefined ? '' : String(args[0]);
    case 'round': {
      const digits = args[1] === undefined ? 0 : Number(args[1]);
      const f = 10 ** digits;
      return Math.round(Number(args[0]) * f) / f;
    }
    default:
      throw new ExpressionError(`未实现的安全函数: ${name}`, '');
  }
}

// ============================================================================
// 安全求值器
// ============================================================================

/** 表达式求值上下文（变量根对象） */
export type ExpressionContext = Record<string, unknown>;

class Evaluator {
  constructor(private readonly context: ExpressionContext) {}

  eval(node: AstNode): unknown {
    switch (node.kind) {
      case 'literal':
        return node.value;
      case 'var':
        return this.resolveRoot(node.name);
      case 'member': {
        const obj = this.eval(node.object);
        const prop = node.computed ? this.eval(node.property) : (node.property as { value: unknown }).value;
        return this.accessMember(obj, prop);
      }
      case 'call':
        return callSafeFunction(node.callee, node.args.map((a) => this.eval(a)));
      case 'unary': {
        const v = this.eval(node.argument);
        if (node.op === '!') return !this.toBool(v);
        if (node.op === '-') return -Number(v);
        return v;
      }
      case 'binary':
        return this.evalBinary(node);
      case 'logical':
        return this.evalLogical(node);
      case 'conditional':
        return this.toBool(this.eval(node.test)) ? this.eval(node.consequent) : this.eval(node.alternate);
      case 'array':
        return node.elements.map((e) => this.eval(e));
      case 'object': {
        const out: Record<string, unknown> = {};
        for (const p of node.properties) out[p.key] = this.eval(p.value);
        return out;
      }
      default:
        return undefined;
    }
  }

  private resolveRoot(name: string): unknown {
    // 禁止访问危险全局与原型相关标识符
    if (
      [
        'process',
        'global',
        'globalThis',
        'require',
        'module',
        'exports',
        'window',
        'document',
        'Function',
        'eval',
        'this',
        'self',
        'top',
        'parent',
        'constructor',
        'prototype',
        '__proto__',
      ].includes(name)
    ) {
      throw new ExpressionError(`禁止访问标识符: ${name}`, '');
    }
    return Object.prototype.hasOwnProperty.call(this.context, name) ? this.context[name] : undefined;
  }

  private accessMember(obj: unknown, prop: unknown): unknown {
    if (obj === null || obj === undefined) return undefined;
    const key = String(prop);
    if (FORBIDDEN_KEYS.has(key)) {
      throw new ExpressionError(`禁止访问属性: ${key}`, '');
    }
    if (typeof obj !== 'object') return undefined;
    return (obj as Record<string, unknown>)[key];
  }

  private toBool(v: unknown): boolean {
    return !!v;
  }

  private evalBinary(node: Extract<AstNode, { kind: 'binary' }>): unknown {
    const l = this.eval(node.left);
    const r = this.eval(node.right);
    switch (node.op) {
      case '+':
        // 字符串拼接或数值相加
        if (typeof l === 'string' || typeof r === 'string') return String(l ?? '') + String(r ?? '');
        return Number(l) + Number(r);
      case '-':
        return Number(l) - Number(r);
      case '*':
        return Number(l) * Number(r);
      case '/':
        return Number(l) / Number(r);
      case '%':
        return Number(l) % Number(r);
      case '==':
      case '===':
        // eslint-disable-next-line eqeqeq
        return l === r || l == r;
      case '!=':
      case '!==':
        // eslint-disable-next-line eqeqeq
        return l !== r && l != r;
      case '>':
        return Number(l) > Number(r);
      case '>=':
        return Number(l) >= Number(r);
      case '<':
        return Number(l) < Number(r);
      case '<=':
        return Number(l) <= Number(r);
      default:
        throw new ExpressionError(`不支持的操作符: ${node.op}`, '');
    }
  }

  private evalLogical(node: Extract<AstNode, { kind: 'logical' }>): unknown {
    const l = this.eval(node.left);
    if (node.op === '&&') return this.toBool(l) ? this.eval(node.right) : l;
    return this.toBool(l) ? l : this.eval(node.right);
  }
}

// ============================================================================
// 对外 API
// ============================================================================

/** AST 缓存（同一表达式只解析一次） */
const astCache = new Map<string, AstNode>();

/** 解析表达式为 AST（内部使用，也可供校验器预检） */
export function parseExpression(expr: string): AstNode {
  const cached = astCache.get(expr);
  if (cached) return cached;
  const tokens = tokenize(expr);
  const ast = new Parser(tokens, expr).parse();
  astCache.set(expr, ast);
  return ast;
}

/**
 * 求值表达式
 * @param expr 表达式文本
 * @param context 变量上下文（通常含 input/nodes/vars/patient 等根对象）
 * @returns 求值结果
 */
export function evaluateExpression(expr: string, context: ExpressionContext): unknown {
  if (typeof expr !== 'string' || expr.trim() === '') return undefined;
  const ast = parseExpression(expr.trim());
  return new Evaluator(context).eval(ast);
}

/**
 * 求值布尔条件（用于 condition / while）
 */
export function evaluateCondition(expr: string, context: ExpressionContext): boolean {
  const v = evaluateExpression(expr, context);
  return Boolean(v);
}

/**
 * 静态校验表达式是否可解析（不实际求值），用于工作流加载期预检
 */
export function validateExpression(expr: string): { valid: boolean; error?: string } {
  try {
    parseExpression(expr);
    return { valid: true };
  } catch (e) {
    return { valid: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * 模板渲染：将 "xxx ${expr} yyy" 中的 ${...} 替换为求值结果
 */
export function renderTemplate(template: string, context: ExpressionContext): string {
  if (typeof template !== 'string') return '';
  return template.replace(/\$\{([^}]+)\}/g, (_match, inner: string) => {
    const v = evaluateExpression(inner.trim(), context);
    if (v === null || v === undefined) return '';
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
  });
}
