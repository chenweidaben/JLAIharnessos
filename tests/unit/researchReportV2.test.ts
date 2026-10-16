/**
 * 健澜科技 jlmedaios - 科研创新 V2 纯函数单测（M219-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildResearchReportV2,
  scoreResearchOutput,
  trackResearchProject,
  type ResearchProject,
} from '../../src/bff/aggregators/researchReportV2Aggregator';

describe('scoreResearchOutput', () => {
  it('50论文 10专利 5课题 → 155分优秀', () => {
    const r = scoreResearchOutput(50, 10, 5);
    expect(r.score).toBe(155);
    expect(r.level).toBe('优秀');
  });

  it('5论文 1专利 1课题 → 18分待提升', () => {
    const r = scoreResearchOutput(5, 1, 1);
    expect(r.level).toBe('待提升');
  });
});

describe('trackResearchProject', () => {
  it('4项目 2在研 → 50% 在研率', () => {
    const projects: ResearchProject[] = [
      { name: '国自然', funding: 100, status: '在研' },
      { name: '横向', funding: 50, status: '在研' },
      { name: '省课题', funding: 30, status: '结题' },
      { name: '院课题', funding: 10, status: '验收' },
    ];
    const r = trackResearchProject(projects);
    expect(r.activeRate).toBe(50);
  });
});

describe('buildResearchReportV2', () => {
  it('生成项目数据', () => {
    const r = buildResearchReportV2('30d');
    expect(r.projects.nsfc).toBeGreaterThan(0);
  });

  it('生成成果数据', () => {
    const r = buildResearchReportV2('30d');
    expect(r.output.sci).toBeGreaterThan(0);
  });

  it('生成经费数据', () => {
    const r = buildResearchReportV2('30d');
    expect(r.funding.total).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildResearchReportV2('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
