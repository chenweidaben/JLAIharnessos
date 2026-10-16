/**
 * 健澜科技 jlmedaios - 科研管理纯函数单测（M191-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildResearchManagementReport,
  calculateResearchScore,
  type ResearchData,
} from '../../src/bff/aggregators/researchManagementAggregator';

describe('calculateResearchScore', () => {
  it('得分不超过 100', () => {
    const data: ResearchData = {
      nationalProjects: 10,
      provincialProjects: 20,
      sciPapers: 50,
      corePapers: 100,
      patents: 20,
      conversionRate: 1,
    };
    expect(calculateResearchScore(data)).toBeLessThanOrEqual(100);
  });

  it('科研成果越多得分越高', () => {
    const low: ResearchData = { nationalProjects: 1, provincialProjects: 1, sciPapers: 1, corePapers: 1, patents: 1, conversionRate: 0.1 };
    const high: ResearchData = { nationalProjects: 5, provincialProjects: 5, sciPapers: 5, corePapers: 5, patents: 5, conversionRate: 0.5 };
    expect(calculateResearchScore(high)).toBeGreaterThan(calculateResearchScore(low));
  });
});

describe('buildResearchManagementReport', () => {
  it('生成项目统计', () => {
    const r = buildResearchManagementReport('科研处', '30d');
    expect(r.projects.national).toBeGreaterThanOrEqual(0);
  });

  it('生成论文统计', () => {
    const r = buildResearchManagementReport('科研处', '30d');
    expect(r.papers.sci).toBeGreaterThanOrEqual(0);
  });

  it('生成成果统计', () => {
    const r = buildResearchManagementReport('科研处', '30d');
    expect(r.achievements.patents).toBeGreaterThanOrEqual(0);
  });

  it('生成科研绩效', () => {
    const r = buildResearchManagementReport('科研处', '30d');
    expect(r.researchScore).toBeGreaterThan(0);
  });

  it('生成改进建议', () => {
    const r = buildResearchManagementReport('科研处', '30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
