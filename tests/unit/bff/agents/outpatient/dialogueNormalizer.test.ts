/**
 * S-09 对话归一规则单测（4.2.3 dialogue-normalize）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from 'bun:test';
import { normalizeDialogue } from '@/bff/agents/outpatient/dialogueNormalizer.js';
import { dialogue } from './fixtures.js';

describe('对话归一 normalizeDialogue', () => {
  it('去除口语填充词并做术语展示归一（血压高→高血压、头疼→头痛）', () => {
    const result = normalizeDialogue(
      dialogue([['patient', '嗯，那个血压高，头疼好几天了。', 1]]),
      { encounterDate: '2026-10-26' },
    );
    const normalized = result.segments[0].normalizedText;
    expect(normalized).toContain('高血压');
    expect(normalized).toContain('头痛');
    expect(normalized).not.toContain('嗯');
    expect(normalized).not.toContain('那个');
  });

  it('相对时间词解析为日期并按时间线升序排列', () => {
    const result = normalizeDialogue(
      dialogue([
        ['patient', '昨天开始头痛。', 1],
        ['patient', '上周就有点咳嗽。', 2],
      ]),
      { encounterDate: '2026-10-26' },
    );
    expect(result.timeline.map((event) => event.date)).toEqual(['2026-10-19', '2026-10-25']);
  });

  it('无法解析的模糊时间表述挂入 missingElements', () => {
    const result = normalizeDialogue(
      dialogue([['patient', '很久以前就不舒服了。', 1]]),
      { encounterDate: '2026-10-26' },
    );
    expect(result.missingElements.join('；')).toContain('时间表述无法解析');
  });

  it('初诊缺失必备章节时输出完整缺项清单', () => {
    const result = normalizeDialogue(
      dialogue([['patient', '有点不舒服。', 1]]),
      { encounterDate: '2026-10-26', encounterKind: 'initial' },
    );
    for (const label of ['主诉', '现病史', '既往史', '查体', '辅助检查']) {
      expect(result.missingElements).toContain(label);
    }
  });

  it('复诊缺失必备章节时输出复诊缺项清单', () => {
    const result = normalizeDialogue(
      dialogue([['patient', '有点不舒服。', 1]]),
      { encounterDate: '2026-10-26', encounterKind: 'follow-up' },
    );
    for (const label of ['诊疗经过', '病情变化', '查体', '辅助检查', '诊断调整', '后续处理']) {
      expect(result.missingElements).toContain(label);
    }
  });

  it('初诊对话覆盖全部必备章节关键词时缺项清单为空', () => {
    const result = normalizeDialogue(
      dialogue([
        ['patient', '主诉头痛三天。现病史：三天前出现头痛。既往史：无慢性病。查体：神清。辅助检查：头颅 CT 未见异常。', 1],
      ]),
      { encounterDate: '2026-10-26', encounterKind: 'initial' },
    );
    expect(result.missingElements).toEqual([]);
  });
});
