/**
 * 健澜科技 jlmedaios - 病案证明与复印申请（M461 DEMO_MODE=1 短路）
 * 说明：避开 M441 病案管理(archive/*)、M458 kiosk/print 打印终端硬件、M454 患者门户；
 * 独立新文件，不改动任何既有路由。
 *
 * GET /api/v1/record-copy/requests     复印申请
 * GET /api/v1/record-copy/records      复印记录
 * GET /api/v1/certificate/birth        出生医学证明
 * GET /api/v1/certificate/death        死亡证明
 * GET /api/v1/certificate/diagnosis    诊断证明
 * GET /api/v1/record-copy/mail         病历邮寄
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type Ctx, json, ok, type RouteDef } from '../types.js';

function items(builder: (i: number) => Record<string, unknown>, n = 5) {
  return { items: Array.from({ length: n }, (_, i) => ({ id: `rc-${i + 1}`, ...builder(i + 1) })) };
}

export const recCertM461Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/record-copy/requests',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) =>({ reqNo: `RC-R${54000 + n}`, patient: `患者-${n}`, purpose: `用途-${n}`, copies: n, status: n % 2 === 0 ? 'approved' : 'pending' })))),
  },
  {
    method: 'GET',
    path: '/api/v1/record-copy/records',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) =>({ recordNo: `RC-C${55000 + n}`, copyList: `复印件清单-${n}`, handler: `经办人-${n}`, pickup: n % 2 === 0 ? 'on-site' : 'mail', time: new Date(Date.now() - n * 86400000).toISOString() })))),
  },
  {
    method: 'GET',
    path: '/api/v1/certificate/birth',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) =>({ certNo: `BIR-${56000 + n}`, mother: `母亲-${n}`, newborn: `新生儿-${n}`, issuer: `签发机构-${n}`, status: n % 2 === 0 ? 'issued' : 'pending' })))),
  },
  {
    method: 'GET',
    path: '/api/v1/certificate/death',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) =>({ certNo: `DTH-${57000 + n}`, deceased: `逝者-${n}`, cause: `死因-${n}`, signer: `签发人-${n}`, status: 'issued' })))),
  },
  {
    method: 'GET',
    path: '/api/v1/certificate/diagnosis',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) =>({ certNo: `DG-${58000 + n}`, patient: `患者-${n}`, diagnosis: `诊断-${n}`, doctor: `医生-${n}`, reviewStatus: n % 2 === 0 ? 'approved' : 'reviewing' })))),
  },
  {
    method: 'GET',
    path: '/api/v1/record-copy/mail',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) =>({ reqNo: `RC-M${59000 + n}`, recipient: `收件人-${n}`, address: `地址-${n}`, trackingNo: `SF${6000000000 + n}`, delivered: n % 2 === 0 })))),
  },
];