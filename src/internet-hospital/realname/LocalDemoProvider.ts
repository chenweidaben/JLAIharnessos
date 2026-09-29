/**
 * 健澜科技 jlmedaios - 本地演示实名认证提供方（M3-J）
 *
 * 仅用于本地开发与无真实凭证的演示：
 *  - 不连接任何第三方，不做真实公安/人脸核验；
 *  - 仅做身份证格式与基本校验位的确定性校验；
 *  - 结果明确标注 isDemo，禁止冒充真实认证；
 *  - 生产环境必须切换为第三方持证提供方。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type RealnameProvider, type RealnameRequest, type RealnameResult } from './types';

/** 身份证 18 位格式校验（含加权校验位） */
export function isValidIdCard(idCard: string): boolean {
  if (!/^\d{17}[\dXx]$/.test(idCard)) return false;
  const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
  const checkCodes = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2'];
  let sum = 0;
  for (let i = 0; i < 17; i++) sum += Number(idCard[i]) * weights[i];
  const expected = checkCodes[sum % 11];
  return idCard[17].toUpperCase() === expected;
}

export class LocalDemoRealnameProvider implements RealnameProvider {
  readonly name = 'local-demo';
  readonly isDemo = true;

  async verify(request: RealnameRequest): Promise<RealnameResult> {
    if (!request.realName?.trim()) {
      return { passed: false, provider: this.name, reason: '真实姓名不能为空', isDemo: true };
    }
    if (!isValidIdCard(request.idCard)) {
      return { passed: false, provider: this.name, reason: '身份证号格式或校验位不正确（本地演示校验）', isDemo: true };
    }
    // 本地演示：格式正确即通过；若提供人脸图像，返回确定性演示分数（非真实比对）
    return {
      passed: true,
      provider: this.name,
      score: request.faceImageBase64 ? 99.0 : undefined,
      isDemo: true,
    };
  }
}
