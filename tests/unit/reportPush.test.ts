/**
 * 健澜科技 jlmedaios - 报告推送纯函数单测（M19-B）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import { canPushReport, nextViewState, unreadCount } from '../../src/medical-tools/internet/reportPush';

describe('reportPush pure', () => {
  it('可推送', () => {
    expect(canPushReport({ reviewed: true, hasConclusion: true })).toBe(true);
    expect(canPushReport({ reviewed: false, hasConclusion: true })).toBe(false);
  });
  it('回执状态机', () => {
    const s = nextViewState({ status: 'pushed', viewCount: 0 });
    expect(s.status).toBe('viewed');
    expect(s.viewCount).toBe(1);
  });
  it('未读计数', () => {
    expect(unreadCount([{ status: 'pushed' }, { status: 'pushed' }, { status: 'viewed' }])).toBe(2);
  });
});
