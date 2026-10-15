/**
 * 健澜科技 jlmedaios - 医院知识回流纯函数单测（M114-D，依据宪法第七章）
 *
 * 覆盖：三级晋升逻辑（个人→科室→医院、同名合并、教训置顶）、
 *       脱敏处理（手机号 / 身份证 / 工号 / 署名掩码、个人标识符不上行）、
 *       来源标注（doctor/nurse/pharma/admin 透传、非法角色归一）、
 *       基线加载（角色归一、科室透传、教训置顶排序）。
 * 全部 mock 数据，不依赖数据库，不碰 WebSocket。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';

import {
  desensitize,
  LESSON_PRIORITY,
  STANDARD_PRIORITY,
  loadHospitalBaseline,
  promoteToHospital,
  type DeptMuse,
  type DeptMuseEntry,
  type HospitalMuse,
} from '../../src/bff/aggregators/hospitalKnowledgeAggregator';

/** 构造科室待回流条目（个人标识符齐全，用于验证脱敏剥离） */
function makeDeptEntry(partial: Partial<DeptMuseEntry> = {}): DeptMuseEntry {
  return {
    id: 'dept-1',
    deptCode: 'DEP-CARDIO',
    title: '默认条目',
    content: '默认正文',
    sourceRole: 'doctor',
    isLesson: false,
    authorId: 'G10086',
    authorName: '张三',
    successRate: 0.9,
    usageCount: 20,
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...partial,
  };
}

/** 构造空医院容器 */
function emptyHospital(): HospitalMuse {
  return { entries: [], updatedAt: '2026-01-01T00:00:00.000Z' };
}

describe('promoteToHospital 三级晋升逻辑（个人→科室→医院）', () => {
  it('科室条目回流后层级标记为 hospital，并继承标题/正文/次数', () => {
    const dept: DeptMuse = {
      deptCode: 'DEP-CARDIO',
      entries: [
        makeDeptEntry({
          id: 'd-1',
          title: 'CAP 路径',
          content: '经验性抗感染 + 48~72h 复评。',
          successRate: 0.92,
          usageCount: 128,
        }),
      ],
    };
    const out = promoteToHospital(dept, emptyHospital());
    expect(out.entries).toHaveLength(1);
    const e = out.entries[0];
    expect(e.tier).toBe('hospital');
    expect(e.title).toBe('CAP 路径');
    expect(e.content).toBe('经验性抗感染 + 48~72h 复评。');
    expect(e.successRate).toBe(0.92);
    expect(e.usageCount).toBe(128);
  });

  it('同名标题条目合并：使用次数累加、成功率按次数加权', () => {
    const existing: HospitalMuse = {
      ...emptyHospital(),
      entries: [
        {
          id: 'h-1',
          deptCode: 'DEP-ENDO',
          tier: 'hospital',
          title: '糖尿病路径',
          content: '既有内容',
          sourceRole: 'doctor',
          isLesson: false,
          priority: STANDARD_PRIORITY,
          successRate: 0.8,
          usageCount: 100,
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    };
    const dept: DeptMuse = {
      deptCode: 'DEP-ENDO',
      entries: [
        makeDeptEntry({
          id: 'd-9',
          title: '糖尿病路径',
          content: '科室补充',
          successRate: 0.9,
          usageCount: 50,
        }),
      ],
    };
    const out = promoteToHospital(dept, existing);
    expect(out.entries).toHaveLength(1);
    expect(out.entries[0].usageCount).toBe(150);
    // (0.8*100 + 0.9*50)/150 = 0.8333
    expect(out.entries[0].successRate).toBe(0.8333);
  });

  it('任一侧为教训，合并后保留教训属性与高优先级', () => {
    const existing: HospitalMuse = {
      ...emptyHospital(),
      entries: [
        {
          id: 'h-1',
          deptCode: 'DEP-CARDIO',
          tier: 'hospital',
          title: '皮试口径',
          content: '常规内容',
          sourceRole: 'doctor',
          isLesson: false,
          priority: STANDARD_PRIORITY,
          successRate: 0.9,
          usageCount: 10,
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    };
    const dept: DeptMuse = {
      deptCode: 'DEP-CARDIO',
      entries: [
        makeDeptEntry({ title: '皮试口径', isLesson: true, successRate: 0.5, usageCount: 5 }),
      ],
    };
    const out = promoteToHospital(dept, existing);
    expect(out.entries[0].isLesson).toBe(true);
    expect(out.entries[0].priority).toBe(LESSON_PRIORITY);
  });

  it('纯函数：不修改入参医院容器与科室条目', () => {
    const existing = emptyHospital();
    const deptEntry = makeDeptEntry({ title: '不可变条目' });
    const dept: DeptMuse = { deptCode: 'DEP-X', entries: [deptEntry] };
    promoteToHospital(dept, existing);
    expect(existing.entries).toEqual([]);
    expect(deptEntry.isLesson).toBe(false);
    expect(deptEntry.authorId).toBe('G10086');
  });

  it('空科室容器回流不报错，保留既有医院条目', () => {
    const existing: HospitalMuse = {
      ...emptyHospital(),
      entries: [
        {
          id: 'h-keep',
          deptCode: 'DEP-A',
          tier: 'hospital',
          title: '既有知识',
          content: 'c',
          sourceRole: 'admin',
          isLesson: false,
          priority: STANDARD_PRIORITY,
          successRate: 0.9,
          usageCount: 1,
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    };
    const out = promoteToHospital({ deptCode: 'DEP-A', entries: [] }, existing);
    expect(out.entries.map((e) => e.title)).toEqual(['既有知识']);
  });
});

describe('promoteToHospital 教训置顶排序', () => {
  it('失败经验（教训）排在常规知识之前', () => {
    const dept: DeptMuse = {
      deptCode: 'DEP-CARDIO',
      entries: [
        makeDeptEntry({ id: 'd-1', title: '常规-A', isLesson: false, successRate: 0.99 }),
        makeDeptEntry({ id: 'd-2', title: '教训-B', isLesson: true, successRate: 0.4 }),
      ],
    };
    const out = promoteToHospital(dept, emptyHospital());
    expect(out.entries.map((e) => e.title)).toEqual(['教训-B', '常规-A']);
    expect(out.entries[0].priority).toBe(LESSON_PRIORITY);
    expect(out.entries[1].priority).toBe(STANDARD_PRIORITY);
  });

  it('同为常规知识时按成功率降序、标题字典序决胜', () => {
    const dept: DeptMuse = {
      deptCode: 'DEP-CARDIO',
      entries: [
        makeDeptEntry({ id: 'd-1', title: 'beta', isLesson: false, successRate: 0.8, usageCount: 5 }),
        makeDeptEntry({ id: 'd-2', title: 'alpha', isLesson: false, successRate: 0.9, usageCount: 5 }),
      ],
    };
    const out = promoteToHospital(dept, emptyHospital());
    expect(out.entries.map((e) => e.title)).toEqual(['alpha', 'beta']);
  });
});

describe('脱敏处理（依据宪法第七章：个人标识不上行）', () => {
  it('desensitize 掩码手机号、身份证号、工号与署名', () => {
    const raw = '联系 13812345678，身份证 11010119900307775X，工号 G10086，作者：王小明。';
    const masked = desensitize(raw);
    expect(masked).not.toContain('13812345678');
    expect(masked).not.toContain('11010119900307775X');
    expect(masked).not.toContain('G10086');
    expect(masked).not.toContain('王小明');
    expect(masked).toContain('「已脱敏」');
  });

  it('回流条目不携带 authorId / authorName，正文中的个人标识被掩码', () => {
    const dept: DeptMuse = {
      deptCode: 'DEP-CARDIO',
      entries: [
        makeDeptEntry({
          title: '随访经验',
          content: '随访电话 13900001111，作者：李四。',
          authorId: 'G2024',
          authorName: '李四',
        }),
      ],
    };
    const out = promoteToHospital(dept, emptyHospital());
    const e = out.entries[0] as unknown as Record<string, unknown>;
    // 个人标识符字段不得出现在医院层条目上
    expect(e.authorId).toBeUndefined();
    expect(e.authorName).toBeUndefined();
    expect(e.content).not.toContain('13900001111');
    expect(e.content).not.toContain('李四');
  });
});

describe('来源角色标注（doctor/nurse/pharma/admin）', () => {
  it('各角色原样透传到医院层条目', () => {
    for (const role of ['doctor', 'nurse', 'pharma', 'admin'] as const) {
      const dept: DeptMuse = {
        deptCode: 'DEP-X',
        entries: [makeDeptEntry({ id: `d-${role}`, title: `知识-${role}`, sourceRole: role })],
      };
      const out = promoteToHospital(dept, emptyHospital());
      expect(out.entries[0].sourceRole).toBe(role);
    }
  });

  it('非法角色归一为 doctor，不抛错', () => {
    const dept: DeptMuse = {
      deptCode: 'DEP-X',
      entries: [makeDeptEntry({ sourceRole: 'unknown' as never })],
    };
    const out = promoteToHospital(dept, emptyHospital());
    expect(out.entries[0].sourceRole).toBe('doctor');
  });
});

describe('loadHospitalBaseline 新员工基线加载', () => {
  it('按角色返回基线，且全部标注该角色来源', () => {
    for (const role of ['doctor', 'nurse', 'pharma', 'admin'] as const) {
      const base = loadHospitalBaseline(role, 'DEP-CARDIO');
      expect(base.role).toBe(role);
      expect(base.tier).toBe('hospital');
      expect(base.deptCode).toBe('DEP-CARDIO');
      expect(base.entries.length).toBeGreaterThan(0);
      expect(base.entries.every((e) => e.sourceRole === role)).toBe(true);
    }
  });

  it('缺省或非法角色归一为 doctor，科室编码透传并 trim', () => {
    const base = loadHospitalBaseline(undefined, '  DEP-ENDO  ');
    expect(base.role).toBe('doctor');
    expect(base.deptCode).toBe('DEP-ENDO');
  });

  it('基线条目教训置顶，层级为 hospital', () => {
    const base = loadHospitalBaseline('nurse', 'DEP-NEURO');
    expect(base.entries[0].isLesson).toBe(true);
    expect(base.entries[0].priority).toBe(LESSON_PRIORITY);
    expect(base.entries.every((e) => e.tier === 'hospital')).toBe(true);
  });

  it('基线正文已经脱敏（不含原始个人标识）', () => {
    const base = loadHospitalBaseline('doctor', 'DEP-X');
    for (const e of base.entries) {
      expect(e.content).not.toMatch(/1[3-9]\d{9}/);
    }
  });
});
