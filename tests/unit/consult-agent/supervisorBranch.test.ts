/**
 * 单元测试 - Supervisor 分诊路由补充分支（补基线未覆盖分支）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 *
 * 覆盖基线未覆盖行：
 * - supervisor.ts 41-43：chronic_management / clarification_answer 路由到医师角色
 * 另覆盖同文件其余未被既有测试触及的路由分支（document_upload / unknown /
 * acute_emergency / exit / symptom_report 充分态），纯函数、不联网。
 */

import { describe, expect, it } from 'bun:test';

import { isSufficientForDoctor, routeNextRole } from '../../../src/core/agent/consult/supervisor';
import type { ConsultMessage, IntentKind } from '../../../src/core/agent/consult/types';

function triage(intent: IntentKind, text: string) {
  return { intent, text, history: [] as ConsultMessage[] };
}

describe('supervisor routeNextRole 意图路由（基线 41-43 行）', () => {
  it('慢病管理意图路由到医师角色（41-42 行）', () => {
    expect(routeNextRole(triage('chronic_management', '我想复查血压并调整长期管理方案'))).toBe(
      'doctor',
    );
  });

  it('追问补充回答意图路由到医师角色（43-44 行）', () => {
    expect(routeNextRole(triage('clarification_answer', '症状持续了大概一周左右'))).toBe('doctor');
  });

  it('文档上传与未知意图路由到追问角色（47-50 行）', () => {
    expect(routeNextRole(triage('document_upload', '我上传了一份化验单'))).toBe('examiner');
    expect(routeNextRole(triage('unknown', '随便聊聊'))).toBe('examiner');
  });

  it('急症 / 退出 / 问候意图停留分诊主管，不切换角色（51-55 行）', () => {
    expect(routeNextRole(triage('acute_emergency', '我胸痛得很厉害'))).toBeNull();
    expect(routeNextRole(triage('exit', '再见，退出会话'))).toBeNull();
    expect(routeNextRole(triage('greeting', '你好'))).toBeNull();
  });

  it('症状主诉信息充分路由医师；信息不足路由追问（46 行双分支）', () => {
    expect(routeNextRole(triage('symptom_report', '我最近总是心慌，感觉不舒服，想咨询一下'))).toBe(
      'doctor',
    );
    expect(routeNextRole(triage('symptom_report', '我难受'))).toBe('examiner');
  });
});

describe('supervisor isSufficientForDoctor 信息充分性阈值', () => {
  it('文本长度达到 12 字即视为信息充分', () => {
    expect(isSufficientForDoctor('我头痛三天了，伴有咳嗽和乏力的症状')).toBe(true);
  });

  it('长度达到 8 字且包含病程时长词时视为信息充分；缺时长词则不足', () => {
    expect(isSufficientForDoctor('我头痛三天了感觉不适')).toBe(true);
    expect(isSufficientForDoctor('浑身乏力没有其他')).toBe(false);
  });

  it('长度不足 8 字时即使含时长词也视为信息不足；空文本不足', () => {
    expect(isSufficientForDoctor('轻微头痛三天了')).toBe(false);
    expect(isSufficientForDoctor('')).toBe(false);
  });
});
