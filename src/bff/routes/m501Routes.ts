/**
 * 健澜科技 jlmedaios - M501 P0 合规重点：患者隐私授权管理 3 端点
 *
 * privacy/consent 患者授权记录、privacy/access-log 隐私访问日志、privacy/violation 隐私违规事件。
 * 与 M477 /security/audit-anomaly（安全审计异常）、M500 /waste/*、M499 /mdt/*、M498 /tech/*、/outpatient/* 路由区分。
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/privacy/consent - 患者授权记录（患者/授权类型Tag/授权时间/有效期至）5 条 */
async function handlePrivacyConsent(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'PC-001', patient: '患者姓名：张**（女，58 岁，住院号 20261018001）', type: '授权类型Tag：诊疗同意（入院知情同意书，电子签名）', time: '授权时间：2026-10-18 09:30（入院当日签署）', expiry: '有效期至：2026-11-18（住院期间有效，出院自动失效）' },
    { id: 'PC-002', patient: '患者姓名：李**（男，66 岁，住院号 20261016002）', type: '授权类型Tag：数据共享（授权医院向上级转诊医院共享病历）', time: '授权时间：2026-10-16 14:00', expiry: '有效期至：2026-12-16（6 个月，可随时撤回）' },
    { id: 'PC-003', patient: '患者姓名：王**（女，45 岁，住院号 20261010003）', type: '授权类型Tag：科研使用（授权脱敏后数据用于临床研究）', time: '授权时间：2026-10-10 10:00', expiry: '有效期至：长期有效（可随时书面撤回）' },
    { id: 'PC-004', patient: '患者姓名：赵**（男，72 岁，住院号 20261012004）', type: '授权类型Tag：隐私查询（授权家属代为查询病情）', time: '授权时间：2026-10-12 16:00（ICU 患者，家属代查）', expiry: '有效期至：2026-11-12（住院期间有效）' },
    { id: 'PC-005', patient: '患者姓名：孙**（女，52 岁，门诊号 20260920005）', type: '授权类型Tag：诊疗同意（门诊有创操作知情同意书）', time: '授权时间：2026-09-20 11:00', expiry: '有效期至：2026-09-27（单次操作有效）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/privacy/access-log - 隐私访问日志（访问人/科室/访问数据类型Tag/访问时间/用途）5 条 */
async function handlePrivacyAccessLog(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'PAL-001', user: '访问人：王教授（心血管内科主任医师，工号 D001）', dept: '所在科室：心血管内科', data: '访问数据类型Tag：病历（张**电子病历详情，含病程记录）', time: '访问时间：2026-10-20 09:15（查房调阅）', purpose: '用途说明：日常诊疗查房（合规访问，已记日志）' },
    { id: 'PAL-002', user: '访问人：李护士（普外科病房，工号 N1023）', dept: '所在科室：普外科', data: '访问数据类型Tag：费用（赵**住院费用明细）', time: '访问时间：2026-10-20 10:30', purpose: '用途说明：协助患者解释费用清单（合规访问）' },
    { id: 'PAL-003', user: '访问人：张技师（影像科技师，工号 R016）', dept: '所在科室：影像科', data: '访问数据类型Tag：影像（李**胸部 CT 影像调阅）', time: '访问时间：2026-10-19 15:00', purpose: '用途说明：影像报告复核（合规访问）' },
    { id: 'PAL-004', user: '访问人：刘医生（急诊科主治医师，工号 D208）', dept: '所在科室：急诊科', data: '访问数据类型Tag：检验（赵**血常规/生化结果）', time: '访问时间：2026-10-20 08:00', purpose: '用途说明：急诊抢救调阅检验结果（合规访问）' },
    { id: 'PAL-005', user: '访问人：周药师（药剂科主管药师，工号 P031）', dept: '所在科室：药剂科', data: '访问数据类型Tag：病历（孙**门诊处方用药记录）', time: '访问时间：2026-10-18 14:00', purpose: '用途说明：处方点评（合规访问）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/privacy/violation - 隐私违规事件（事件描述/涉事人/发现时间/处理状态Tag/整改措施）5 条 */
async function handlePrivacyViolation(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'PV-001', desc: '事件描述：某护士在朋友圈发布患者输液照片（含床号/姓名），被患者家属截图举报', person: '涉事人：某外科病房李护士（工号 N108）', time: '发现时间：2026-09-15（患者家属投诉至医务处）', status: '处理状态Tag：已处理（2026-09-18 完成处理）', action: '整改措施：全院通报批评 + 扣当月绩效 20% + 取消年度评优资格 + 补学《个人信息保护法》' },
    { id: 'PV-002', desc: '事件描述：某进修医师未经授权调阅本院知名患者病历（与进修科室无关）', person: '涉事人：某院进修医师（工号 V021）', time: '发现时间：2026-09-22（系统审计日志异常告警）', status: '处理状态Tag：已处理（2026-09-25 完成处理）', action: '整改措施：终止进修资格 + 退回原单位 + 记入个人医德档案 + 通报全市卫健系统' },
    { id: 'PV-003', desc: '事件描述：某收费处收银员将患者手机号泄露给第三方保险业务员', person: '涉事人：收费处王收银员（工号 C008）', time: '发现时间：2026-10-02（患者投诉至 12345 热线）', status: '处理状态Tag：已处理（2026-10-05 完成处理）', action: '整改措施：解除劳动合同 + 移交公安机关（涉嫌侵犯公民个人信息罪）' },
    { id: 'PV-004', desc: '事件描述：某科室白板上患者姓名/诊断未及时擦除，被外来人员拍照', person: '涉事人：某科室当班医师（工号 D315）', time: '发现时间：2026-10-10（院内质控巡查发现）', status: '处理状态Tag：已处理（2026-10-12 完成处理）', action: '整改措施：科室内部批评教育 + 全院推行白板脱敏制度 + 整改完成复查' },
    { id: 'PV-005', desc: '事件描述：某医师将患者病历 PDF 通过个人邮箱外发（未走医院 OA）', person: '涉事人：某内科主治医师（工号 D256）', time: '发现时间：2026-10-15（DLP 数据防泄漏系统告警）', status: '处理状态Tag：调查中（2026-10-18 立案调查）', action: '整改措施：暂停病历调阅权限 + 信息安全部门介入调查 + 待处理结论' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m501Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/privacy/consent', handle: handlePrivacyConsent, auth: true },
  { method: 'GET', path: '/api/v1/privacy/access-log', handle: handlePrivacyAccessLog, auth: true },
  { method: 'GET', path: '/api/v1/privacy/violation', handle: handlePrivacyViolation, auth: true },
];
