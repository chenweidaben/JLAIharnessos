/**
 * 健澜科技数智医院智能体 - security/input/InputValidator.ts
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

/**
 * 健澜科技数智医院智能体 - 输入验证器
 *
 * 版权所有 (c) 2026 健澜科技
 * 本文件实现输入验证器，包括SQL注入检测与防护、命令注入检测
 * （医疗工具参数白名单校验）、XSS检测与输出编码、特殊字符过滤。
 *
 * @module security/input/InputValidator
 */

import { InjectionType, type InputValidationResult, RiskLevel } from '../types';

/**
 * SQL注入检测模式
 */
const SQL_INJECTION_PATTERNS: { pattern: RegExp; description: string }[] = [
  {
    pattern:
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|EXEC|EXECUTE|UNION|DECLARE|CAST|CONVERT)\b)/gi,
    description: 'SQL关键字',
  },
  { pattern: /(--|#|\/\*|\*\/)/g, description: 'SQL注释符' },
  {
    pattern: /('|")\s*(OR|AND)\s+('|")?\d+('|")?\s*=\s*('|")?\d+('|")?/gi,
    description: '布尔恒真注入',
  },
  { pattern: /;\s*(DROP|DELETE|UPDATE|INSERT|ALTER|CREATE)/gi, description: '堆叠查询注入' },
  { pattern: /\b(UNION\s+SELECT|UNION\s+ALL\s+SELECT)\b/gi, description: 'UNION注入' },
  {
    pattern: /\b(WAITFOR\s+DELAY|BENCHMARK\s*\(|SLEEP\s*\(|PG_SLEEP\s*\()/gi,
    description: '时间盲注',
  },
  { pattern: /\b(CONVERT\s*\(|CAST\s*\(|CHAR\s*\(|ASCII\s*\()/gi, description: '函数注入' },
  { pattern: /\b(INFORMATION_SCHEMA|SYS\.|SYSOBJECTS|SYSCOLUMNS)\b/gi, description: '系统表访问' },
  { pattern: /\b(LOAD_FILE|INTO\s+OUTFILE|INTO\s+DUMPFILE)\b/gi, description: '文件操作注入' },
  { pattern: /\b(xp_cmdshell|sp_executesql|sp_oacreate)\b/gi, description: '存储过程注入' },
];

/**
 * 命令注入检测模式
 */
const COMMAND_INJECTION_PATTERNS: { pattern: RegExp; description: string }[] = [
  { pattern: /[;&|`$]/g, description: '命令分隔符' },
  { pattern: /\$\([^)]+\)/g, description: '命令替换' },
  { pattern: /`[^`]+`/g, description: '反引号命令执行' },
  { pattern: /\|\||&&/g, description: '逻辑运算符' },
  {
    pattern: /\b(cat|ls|rm|cp|mv|wget|curl|nc|bash|sh|zsh|cmd|powershell|python|perl|ruby)\b/gi,
    description: '危险命令',
  },
  { pattern: />\s*\/dev\/\w+|<\s*\/dev\/\w+/g, description: '设备文件重定向' },
  { pattern: /\.\.\//g, description: '路径遍历' },
  { pattern: /%0[0-9a-fA-F]/g, description: '空字节注入' },
];

/**
 * XSS检测模式
 */
const XSS_PATTERNS: { pattern: RegExp; description: string }[] = [
  { pattern: /<\s*script[^>]*>/gi, description: 'Script标签' },
  { pattern: /<\s*\/\s*script\s*>/gi, description: 'Script闭合标签' },
  { pattern: /javascript\s*:/gi, description: 'JavaScript伪协议' },
  { pattern: /on\w+\s*=/gi, description: '事件处理器' },
  { pattern: /<\s*iframe[^>]*>/gi, description: 'Iframe标签' },
  { pattern: /<\s*img[^>]+src\s*=/gi, description: 'Img标签注入' },
  { pattern: /<\s*svg[^>]*>/gi, description: 'SVG标签' },
  { pattern: /eval\s*\(/gi, description: 'eval函数' },
  { pattern: /document\s*\.\s*(cookie|write|location)/gi, description: 'DOM操作' },
  { pattern: /<\s*object[^>]*>/gi, description: 'Object标签' },
  { pattern: /<\s*embed[^>]*>/gi, description: 'Embed标签' },
  { pattern: /vbscript\s*:/gi, description: 'VBScript伪协议' },
  { pattern: /data\s*:\s*text\/html/gi, description: 'Data URI注入' },
];

/**
 * 医疗工具参数白名单
 * 定义允许的字符集和格式
 */
const MEDICAL_PARAM_WHITELIST: Record<string, RegExp> = {
  patientId: /^[A-Za-z0-9\-_]{1,32}$/,
  medicalRecordNo: /^[A-Za-z0-9\-_]{1,32}$/,
  orderId: /^[A-Za-z0-9\-_]{1,32}$/,
  department: /^[\u4e00-\u9fa5A-Za-z0-9\-_]{1,50}$/,
  drugName: /^[\u4e00-\u9fa5A-Za-z0-9\s\-()（）]{1,100}$/,
  dosage: /^\d+(\.\d+)?\s*(mg|g|ml|μg|IU|单位)$/,
  frequency: /^[\u4e00-\u9fa5A-Za-z0-9/]{1,20}$/,
  labTestCode: /^[A-Za-z0-9\-_]{1,20}$/,
  icdCode: /^[A-Z]\d{2}(\.\d{1,4})?$/,
  date: /^\d{4}-\d{2}-\d{2}$/,
  page: /^\d{1,6}$/,
  pageSize: /^\d{1,3}$/,
};

/**
 * 输入验证器
 *
 * 负责检测和防护各类注入攻击，包括SQL注入、命令注入、XSS等。
 *
 * @example
 * const validator = new InputValidator();
 * const result = validator.validate("SELECT * FROM users");
 * if (!result.valid) { console.log(result.detectedInjections); }
 */
export class InputValidator {
  /**
   * 验证输入安全性
   *
   * @param input - 输入字符串
   * @returns 验证结果
   */
  public validate(input: string): InputValidationResult {
    if (!input || input.length === 0) {
      return { valid: true, riskLevel: RiskLevel.LOW };
    }

    const detectedInjections: InjectionType[] = [];
    const details: InputValidationResult['details'] = [];

    // SQL注入检测
    const sqlFindings = this.detectPatterns(input, SQL_INJECTION_PATTERNS);
    if (sqlFindings.length > 0) {
      detectedInjections.push(InjectionType.SQL_INJECTION);
      details.push(
        ...sqlFindings.map((f) => ({
          type: InjectionType.SQL_INJECTION,
          matchedPattern: f.description,
          position: f.index,
        })),
      );
    }

    // 命令注入检测
    const cmdFindings = this.detectPatterns(input, COMMAND_INJECTION_PATTERNS);
    if (cmdFindings.length > 0) {
      detectedInjections.push(InjectionType.COMMAND_INJECTION);
      details.push(
        ...cmdFindings.map((f) => ({
          type: InjectionType.COMMAND_INJECTION,
          matchedPattern: f.description,
          position: f.index,
        })),
      );
    }

    // XSS检测
    const xssFindings = this.detectPatterns(input, XSS_PATTERNS);
    if (xssFindings.length > 0) {
      detectedInjections.push(InjectionType.XSS);
      details.push(
        ...xssFindings.map((f) => ({
          type: InjectionType.XSS,
          matchedPattern: f.description,
          position: f.index,
        })),
      );
    }

    // 路径遍历检测
    if (input.includes('../') || input.includes('..\\')) {
      detectedInjections.push(InjectionType.PATH_TRAVERSAL);
      details.push({
        type: InjectionType.PATH_TRAVERSAL,
        matchedPattern: '路径遍历',
        position: input.search(/\.\.[/\\]/),
      });
    }

    // 计算风险等级
    const riskLevel = this.calculateRiskLevel(detectedInjections);

    // 生成清洗后的输入
    const sanitizedInput = detectedInjections.length > 0 ? this.sanitize(input) : undefined;

    return {
      valid: detectedInjections.length === 0,
      detectedInjections,
      riskLevel,
      sanitizedInput,
      details: details.length > 0 ? details : undefined,
    };
  }

  /**
   * 验证医疗工具参数
   * 使用白名单校验参数格式
   *
   * @param paramName - 参数名
   * @param value - 参数值
   * @returns 是否通过白名单校验
   */
  public validateMedicalParam(paramName: string, value: string): boolean {
    const pattern = MEDICAL_PARAM_WHITELIST[paramName];
    if (!pattern) {
      // 未定义白名单的参数，使用通用安全检查
      return this.validate(value).valid;
    }
    return pattern.test(value);
  }

  /**
   * 验证所有医疗工具参数
   *
   * @param params - 参数对象
   * @returns 验证结果（每个参数的验证状态）
   */
  public validateMedicalParams(params: Record<string, string>): Record<string, boolean> {
    const results: Record<string, boolean> = {};
    for (const [key, value] of Object.entries(params)) {
      results[key] = this.validateMedicalParam(key, value);
    }
    return results;
  }

  /**
   * HTML输出编码
   * 防止XSS攻击，对特殊字符进行HTML实体编码
   *
   * @param input - 输入字符串
   * @returns 编码后的字符串
   */
  public encodeHtml(input: string): string {
    if (!input) return input;
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  /**
   * SQL参数转义（仅用于不支持参数化查询的场景）
   * 推荐使用参数化查询，而非手动转义
   *
   * @param input - 输入字符串
   * @returns 转义后的字符串
   */
  public escapeSql(input: string): string {
    if (!input) return input;
    return (
      input
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/"/g, '\\"')
        // 以下两处为有意转义 SQL 控制字符（NUL / SUB），属安全转义逻辑
        // eslint-disable-next-line no-control-regex
        .replace(/\x00/g, '\\0')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        // eslint-disable-next-line no-control-regex
        .replace(/\x1a/g, '\\Z')
    );
  }

  /**
   * 过滤特殊字符
   * 移除非字母数字和常见安全字符
   *
   * @param input - 输入字符串
   * @param allowedChars - 允许的额外字符
   * @returns 过滤后的字符串
   */
  public filterSpecialChars(input: string, allowedChars = ''): string {
    if (!input) return input;
    const escapedAllowed = allowedChars.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`[^a-zA-Z0-9\\s${escapedAllowed}]`, 'g');
    return input.replace(pattern, '');
  }

  /**
   * 清洗输入（移除危险内容）
   *
   * @param input - 输入字符串
   * @returns 清洗后的字符串
   */
  public sanitize(input: string): string {
    if (!input) return input;
    let result = input;
    // 移除SQL注释
    result = result.replace(/--.*$/gm, '');
    result = result.replace(/\/\*[\s\S]*?\*\//g, '');
    // 移除script标签
    result = result.replace(/<\s*script[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi, '');
    // 移除事件处理器
    result = result.replace(/on\w+\s*=\s*"[^"]*"/gi, '');
    result = result.replace(/on\w+\s*=\s*'[^']*'/gi, '');
    // 移除javascript:协议
    result = result.replace(/javascript\s*:/gi, '');
    // 移除命令分隔符
    result = result.replace(/[;&|`$]/g, '');
    return result;
  }

  /**
   * 检测模式匹配
   */
  private detectPatterns(
    input: string,
    patterns: { pattern: RegExp; description: string }[],
  ): { description: string; index: number }[] {
    const findings: { description: string; index: number }[] = [];
    for (const { pattern, description } of patterns) {
      // 重置正则的lastIndex
      const regex = new RegExp(pattern.source, pattern.flags);
      const match = regex.exec(input);
      if (match) {
        findings.push({ description, index: match.index });
      }
    }
    return findings;
  }

  /**
   * 计算风险等级
   */
  private calculateRiskLevel(injections: InjectionType[]): RiskLevel {
    if (injections.length === 0) return RiskLevel.LOW;
    if (injections.includes(InjectionType.SQL_INJECTION)) return RiskLevel.CRITICAL;
    if (injections.includes(InjectionType.COMMAND_INJECTION)) return RiskLevel.CRITICAL;
    if (injections.includes(InjectionType.XSS)) return RiskLevel.HIGH;
    if (injections.includes(InjectionType.PATH_TRAVERSAL)) return RiskLevel.HIGH;
    return RiskLevel.MEDIUM;
  }

  /**
   * 获取医疗参数白名单
   */
  public getMedicalParamWhitelist(): Record<string, RegExp> {
    return { ...MEDICAL_PARAM_WHITELIST };
  }
}
