/**
 * 健澜科技 jlmedaios - M431 P1 业务扩展：病历版本/留痕合规深度打磨（补建）
 *
 * 病历留存策略/电子签名历史
 * （versions/diff、versions/restore、locks、audit-trail 已在 M425/M239 建立，此处不重复）
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/emr/retention - 病历留存策略 5 条（病历类型/保存年限/到期处理/责任人/依据） */
async function handleEmrRetention(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'ERT-001', recordType: '病历类型：门诊病历（电子）', keepYears: '保存年限：自患者最后一次就诊之日起不少于 15 年', expiryAction: '到期处理：15 年期满后经评审脱敏归档，超长期冷存储，严禁直接删除', owner: '责任人：病案室主任（归档留存）+ 信息科（电子存储）', basis: '依据：《医疗机构病历管理规定》门诊病历保存 ≥15 年' },
    { id: 'ERT-002', recordType: '病历类型：住院病历（电子+纸质）', keepYears: '保存年限：自患者出院之日起不少于 30 年', expiryAction: '到期处理：30 年期满后数字化备份，纸质经审批封存销毁，电子永久留痕', owner: '责任人：病案室主任 + 医务处（销毁审批）', basis: '依据：《医疗机构病历管理规定》住院病历保存 ≥30 年' },
    { id: 'ERT-003', recordType: '病历类型：急诊抢救留观病历', keepYears: '保存年限：自抢救结束之日起不少于 15 年（抢救记录 ≥30 年）', expiryAction: '到期处理：抢救记录纳入 30 年留存，普通留观按 15 年，到期评审后冷存', owner: '责任人：急诊科护士长 + 病案室', basis: '依据：急诊病历参照门诊 15 年，抢救记录参照住院 30 年' },
    { id: 'ERT-004', recordType: '病历类型：手术/麻醉记录单', keepYears: '保存年限：随住院病历保存 ≥30 年，植入物相关记录永久保存', expiryAction: '到期处理：植入物追溯记录永久保留，其余随病历到期评审归档', owner: '责任人：手术室护士长 + 病案室', basis: '依据：植入物可追溯要求 + 住院病历 30 年规定' },
    { id: 'ERT-005', recordType: '病历类型：电子签名证书与时间戳日志', keepYears: '保存年限：与病历同周期（≥30 年），确保法律效力可验证', expiryAction: '到期处理：随病历迁移至长期存证，证书吊销列表同步留存以备验签', owner: '责任人：信息科安全管理员 + 病案室', basis: '依据：《电子签名法》及电子病历系统功能规范（可信存证）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/emr/signatures/history - 电子签名历史 5 条（病历号/签名人/证书序列号/时间戳/签名状态） */
async function handleEmrSignaturesHistory(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'ESH-001', recordNo: '病历号：EMR-2026-1001（心内科住院病历，首次病程记录）', signer: '签名人：王***（主任医师，工号 D-001，电子证书有效期内）', certSerial: '证书序列号：SN-88F2-A001-2026（国密 SM2 证书）', timestamp: '时间戳：2026-10-19 16:00:12（可信时间源 RFC3161）', sigStatus: '签名状态：有效（验签通过，内容未被篡改，证书未吊销）' },
    { id: 'ESH-002', recordNo: '病历号：EMR-2026-1002（神经内科住院病历，主任查房记录）', signer: '签名人：赵***（科主任，工号 D-003，电子证书有效期内）', certSerial: '证书序列号：SN-77C1-B015-2025（国密 SM2 证书）', timestamp: '时间戳：2026-10-20 11:30:08（可信时间源 RFC3161）', sigStatus: '签名状态：有效（验签通过，链式证书完整）' },
    { id: 'ESH-003', recordNo: '病历号：EMR-2026-1003（骨科手术记录，术者签名）', signer: '签名人：赵***（术者主任医师，工号 D-003）', certSerial: '证书序列号：SN-77C1-B015-2025（国密 SM2 证书）', timestamp: '时间戳：2026-10-17 15:30:45（可信时间源 RFC3161）', sigStatus: '签名状态：有效（术中记录签名，双人复核签名已附）' },
    { id: 'ESH-004', recordNo: '病历号：EMR-2026-0988（既往归档病历，历史签名）', signer: '签名人：李***（离职医师，工号 D-015，证书已随离职吊销）', certSerial: '证书序列号：SN-66B3-C022-2023（旧 RSA 证书，已吊销）', timestamp: '时间戳：2026-03-12 09:20:30（签名当时证书有效）', sigStatus: '签名状态：历史有效（签名时刻验签通过；现证书已吊销，时间戳证明签名当时合法）' },
    { id: 'ESH-005', recordNo: '病历号：EMR-2026-1009（出院病历，医师+护士双签名）', signer: '签名人：陈***（主治医师 D-028）+ 钱***（责任护师 N-042）', certSerial: '证书序列号：SN-55A9-D031 / SN-44E2-E050（双国密 SM2 证书）', timestamp: '时间戳：2026-10-18 10:05:00（双签，可信时间源 RFC3161）', sigStatus: '签名状态：有效（双签名均验签通过，出院闭环完整）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m431Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/emr/retention', handle: handleEmrRetention, auth: true },
  { method: 'GET', path: '/api/v1/emr/signatures/history', handle: handleEmrSignaturesHistory, auth: true },
];
