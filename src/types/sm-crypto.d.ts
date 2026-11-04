/**
 * sm-crypto 无官方类型声明的最小补充（健澜AI原生医院操作系统OS - P0-6 国密签名）。
 * 仅声明本切片用到的 sm2/sm3 接口，避免 any 隐式类型报错。
 */
declare module 'sm-crypto' {
  export const sm2: {
    generateKeyPairHex(): { publicKey: string; privateKey: string };
    doSignature(digestHex: string, privateKeyHex: string): string;
    doVerifySignature(digestHex: string, signatureHex: string, publicKeyHex: string): boolean;
  };
  export function sm3(message: string): string;
}
