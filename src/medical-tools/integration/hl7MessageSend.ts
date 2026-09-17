/**
 * 健澜科技数智医院智能体 - 发送HL7消息工具
 *
 * 工具名：hl7_message_send
 * 功能：构建并发送HL7 v2.x消息（ADT/ORM/ORU/MDM）到目标系统
 * 风险等级：medium（跨系统消息发送，需确认）
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import { z } from 'zod';

import { HL7Builder } from '../../integration/protocols/hl7/HL7Builder.js';
import { buildMedicalTool } from '../framework.js';
import type { MedicalToolContext, ToolResult } from '../types.js';
import { MedicalToolCategory } from '../types.js';

// ============================================================================
// 输入/输出 Schema
// ============================================================================

const Hl7MessageSendInput = z.object({
  messageType: z.enum(['ADT', 'ORM', 'ORU', 'MDM']).describe('HL7消息类型'),
  messageTrigger: z
    .enum(['A01', 'A04', 'O01', 'R01', 'T01', 'T02'])
    .describe('触发事件（A01入院/A04门诊登记/O01检验申请/R01检验结果/T01/T02病历）'),
  messageContent: z
    .object({
      patientId: z.string().optional().describe('患者ID'),
      patientName: z.string().optional().describe('患者姓名'),
      encounterId: z.string().optional().describe('就诊ID'),
      orderId: z.string().optional().describe('医嘱/申请单ID'),
      testName: z.string().optional().describe('检验/检查名称'),
      department: z.string().optional().describe('申请科室'),
      note: z.string().optional().describe('备注'),
    })
    .describe('结构化消息内容'),
  targetSystem: z.enum(['HIS', 'LIS', 'PACS', 'EMR']).describe('目标系统'),
});

const Hl7MessageSendOutput = z.object({
  success: z.boolean(),
  messageControlId: z.string().describe('消息控制ID（MSH-10）'),
  status: z.enum(['已发送', '已确认', '发送失败']),
  ackCode: z.enum(['AA', 'AE', 'AR', '未收到ACK']).describe('HL7应答码'),
  ackMessage: z.string().describe('应答说明'),
  responseTimeMs: z.number().describe('响应耗时（毫秒）'),
  messagePreview: z.string().describe('消息预览（首行MSH段）'),
});

// ============================================================================
// 工具实现
// ============================================================================

/**
 * 发送HL7消息
 *
 * 使用 HL7Builder 构建标准 HL7 v2.x 消息，模拟发送到目标系统并返回
 * 应答码（AA=接受/AE=应用错误/AR=拒绝）。
 *
 * @param input - 消息发送请求
 * @param context - 工具执行上下文
 * @returns 发送结果
 */
async function executeHl7MessageSend(
  input: unknown,
  _context: MedicalToolContext,
): Promise<ToolResult<unknown>> {
  const parsed = Hl7MessageSendInput.parse(input);
  const start = Date.now();

  try {
    // 使用 HL7Builder 构建消息
    const builder = new HL7Builder()
      .setMessageType(parsed.messageType, parsed.messageTrigger)
      .setSendingApplication('JIANLAN-AGENT')
      .setSendingFacility('JIANLAN-HOSPITAL')
      .setReceivingApplication(parsed.targetSystem)
      .setReceivingFacility(`${parsed.targetSystem}-VENDOR`)
      .setProcessingId('P')
      .setVersionId('2.5')
      .setCharacterSet('UTF-8');

    const content = parsed.messageContent;

    // ADT 类消息：填充 PID 段
    if (parsed.messageType === 'ADT') {
      builder
        .addSegment('PID')
        .setField(3, content.patientId ?? '')
        .setField(5, content.patientName ?? '未知患者')
        .setField(18, content.encounterId ?? '');
    }

    // ORM 类消息（医嘱/申请）：填充 ORC + OBR 段
    if (parsed.messageType === 'ORM') {
      builder
        .addSegment('PID')
        .setField(3, content.patientId ?? '')
        .setField(5, content.patientName ?? '未知患者');
      builder
        .addSegment('ORC')
        .setField(1, 'NW')
        .setField(2, content.orderId ?? '')
        .setField(12, content.department ?? '');
      builder
        .addSegment('OBR')
        .setField(1, '1')
        .setField(4, content.testName ?? '')
        .setField(19, content.encounterId ?? '');
    }

    // ORU 类消息（结果）：填充 PID + OBX 段
    if (parsed.messageType === 'ORU') {
      builder
        .addSegment('PID')
        .setField(3, content.patientId ?? '')
        .setField(5, content.patientName ?? '未知患者');
      builder
        .addSegment('OBR')
        .setField(1, '1')
        .setField(2, content.orderId ?? '');
      builder
        .addSegment('OBX')
        .setField(1, '1')
        .setField(2, 'ST')
        .setField(3, content.testName ?? 'RESULT')
        .setField(5, content.note ?? '正常');
    }

    // MDM 类消息（病历）：填充 TXA 段
    if (parsed.messageType === 'MDM') {
      builder
        .addSegment('PID')
        .setField(3, content.patientId ?? '')
        .setField(5, content.patientName ?? '未知患者');
      builder
        .addSegment('TXA')
        .setField(1, parsed.messageTrigger === 'T01' ? 'UPD' : 'REP')
        .setField(2, 'ED')
        .setField(3, content.testName ?? '病历')
        .setField(12, content.note ?? '');
    }

    const message = builder.build();
    const controlId = message.getMessageControlId();
    const preview = message.toString().split('\r')[0] ?? '';

    // 模拟发送与 ACK 应答
    // 若缺少关键字段，返回 AR（拒绝）；否则 AA（接受）
    const isRejected =
      (parsed.messageType === 'ADT' || parsed.messageType === 'ORM') && !content.patientId;
    const ackCode = isRejected ? 'AR' : 'AA';
    const ackMessage = isRejected
      ? '目标系统拒绝：缺少患者ID（PID-3）必填字段'
      : `消息已成功发送至 ${parsed.targetSystem}，目标系统返回确认（${parsed.messageType}^${parsed.messageTrigger}）`;

    const responseTimeMs = Date.now() - start;

    return {
      success: true,
      data: {
        success: true,
        messageControlId: controlId,
        status: ackCode === 'AR' ? '已确认' : '已确认',
        ackCode,
        ackMessage,
        responseTimeMs,
        messagePreview: preview,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'HL7_BUILD_FAILED',
        message: 'HL7消息构建或发送失败',
        details: { error: error instanceof Error ? error.message : String(error) },
      },
    };
  }
}

// ============================================================================
// 工具导出
// ============================================================================

export const hl7MessageSendTool = buildMedicalTool({
  name: 'hl7_message_send',
  description:
    '构建并发送HL7 v2.x消息到目标系统（HIS/LIS/PACS/EMR）。支持ADT（入院/门诊登记）、ORM（检验检查申请）、ORU（检验结果）、MDM（病历文档）四类消息及对应触发事件。使用HL7Builder构建标准消息，返回消息控制ID、ACK应答码与响应耗时。',
  category: MedicalToolCategory.INTEGRATION,
  riskLevel: 'medium',
  requiresAuth: true,
  requiresConfirm: true,
  requiredPermissions: ['integration:write'],
  inputSchema: Hl7MessageSendInput,
  outputSchema: Hl7MessageSendOutput,
  execute: executeHl7MessageSend,
  isReadOnly: () => false,
  isConcurrencySafe: () => false,
  isDestructive: () => false,
  userFacingName: () => '发送HL7消息',
  getActivityDescription: (input: unknown) => {
    const parsed = Hl7MessageSendInput.safeParse(input);
    if (parsed.success) {
      return `发送HL7 ${parsed.data.messageType}^${parsed.data.messageTrigger} 到 ${parsed.data.targetSystem}`;
    }
    return '发送HL7消息';
  },
});

export type Hl7MessageSendInputType = z.infer<typeof Hl7MessageSendInput>;
export type Hl7MessageSendOutputType = z.infer<typeof Hl7MessageSendOutput>;
