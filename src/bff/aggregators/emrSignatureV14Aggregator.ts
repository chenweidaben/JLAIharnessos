/**
 * 健澜科技 jlmedaios - 病历电子签名与认证 V14 聚合器（M463-A）
 *
 * 纯函数：模拟签名（不接真实密码学库），纯字符串拼接。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/**
 * 生成模拟签名串：SIG-{authorId}-{noteHash.slice(0,8)}。
 *
 * @param authorId 签名人 ID
 * @param noteHash 病历哈希
 * @returns 模拟签名串
 */
export function signNote(authorId: string, noteHash: string): string {
  return `SIG-${authorId}-${noteHash.slice(0, 8)}`;
}

/**
 * 验签：重新计算 signNote(authorId, noteHash) 并与传入 signature 严格相等。
 *
 * @param signature 待验签的签名串
 * @param authorId 签名人 ID
 * @param noteHash 病历哈希
 * @returns 是否验签通过
 */
export function verifySignature(signature: string, authorId: string, noteHash: string): boolean {
  const expected = signNote(authorId, noteHash);
  return signature === expected;
}
