/**
 * 健澜科技 jlmedaios - HL7 / WS363 标准对接升级 V5 纯函数（M281-B）
 *
 * parseHL7V5 / buildHL7V5 / validateWS363V5 / buildHl7IntegrationV5Report
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** HL7 消息 */
export interface HL7Message {
  messageType: string;
  sender: string;
  receiver: string;
  patientId: string;
  payload: string;
}

/** WS363 国标校验结果 */
export interface WS363Validation {
  field: string;
  present: boolean;
  compliant: boolean;
}

/**
 * 解析 HL7 消息 V5（纯函数）：按 | 分段提取关键字段。
 *
 * @param msg HL7 原始串
 * @returns 解析结果
 */
export function parseHL7V5(msg: string): HL7Message {
  const parts = msg.split("|");
  return {
    messageType: parts[0] ?? "ADT^A01",
    sender: parts[1] ?? "",
    receiver: parts[2] ?? "",
    patientId: parts[3] ?? "",
    payload: msg,
  };
}

/**
 * 构造 HL7 消息 V5（纯函数）：按 | 拼接。
 *
 * @param type 消息类型
 * @param data 业务数据
 * @returns HL7 消息串
 */
export function buildHL7V5(type: string, data: { sender: string; receiver: string; patientId: string }): string {
  return [type, data.sender, data.receiver, data.patientId].join("|");
}

/**
 * WS363 国标校验 V5（纯函数）：必填字段完整性。
 *
 * @param data 待校验数据
 * @returns 校验结果
 */
export function validateWS363V5(data: { patientId: string; name: string; gender: string; birthDate: string }): { compliant: boolean; results: WS363Validation[] } {
  const fields = [
    { field: "patientId", present: data.patientId.length > 0 },
    { field: "name", present: data.name.length > 0 },
    { field: "gender", present: data.gender.length > 0 },
    { field: "birthDate", present: data.birthDate.length > 0 },
  ];
  const results: WS363Validation[] = fields.map((f) => ({ field: f.field, present: f.present, compliant: f.present }));
  return { compliant: results.every((r) => r.compliant), results };
}

/** 对接看板输出 */
export interface Hl7IntegrationV5Report {
  totalMessages: number;
  byType: Record<string, number>;
  ws363ComplianceRate: number;
}

/**
 * 构建 HL7 对接看板（纯函数）。
 *
 * @param messages 消息列表
 * @param ws363Results 国标校验结果列表
 * @returns 看板
 */
export function buildHl7IntegrationV5Report(
  messages: HL7Message[],
  ws363Results: boolean[],
): Hl7IntegrationV5Report {
  const byType: Record<string, number> = {};
  for (const m of messages) {
    byType[m.messageType] = (byType[m.messageType] ?? 0) + 1;
  }
  const compliant = ws363Results.filter((r) => r).length;
  const ws363ComplianceRate = ws363Results.length > 0
    ? Math.round((compliant / ws363Results.length) * 1000) / 10
    : 0;
  return { totalMessages: messages.length, byType, ws363ComplianceRate };
}
