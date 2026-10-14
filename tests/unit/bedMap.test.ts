/**
 * 健澜科技 jlmedaios - 全院床位图聚合器纯函数单测。
 *
 * 不依赖数据库：仅测 groupByRoom / summarize 两个纯函数。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, it, expect } from 'bun:test';
import { groupByRoom, summarize, type BedMapRow, type BedMapStatus } from '@/bff/aggregators/bedMapAggregator';

function row(partial: Partial<BedMapRow>): BedMapRow {
  return {
    bedId: 'b',
    bedNo: '1',
    roomNo: '501',
    floor: '5',
    wardId: 'w1',
    wardName: '心内科',
    department: '心血管内科',
    status: 'available',
    bedType: 'standard',
    occupiedAt: null,
    patient: null,
    ...partial,
  };
}

describe('groupByRoom', () => {
  it('空输入返回空数组', () => {
    expect(groupByRoom([])).toEqual([]);
  });

  it('按 楼层/房号/病区 分组，组内床位完整保留', () => {
    const rows = [
      row({ bedId: 'b1', bedNo: '01', roomNo: '501', floor: '5', wardId: 'w1' }),
      row({ bedId: 'b2', bedNo: '02', roomNo: '501', floor: '5', wardId: 'w1', status: 'occupied' }),
      row({ bedId: 'b3', bedNo: '01', roomNo: '502', floor: '5', wardId: 'w1' }),
    ];
    const groups = groupByRoom(rows);
    expect(groups).toHaveLength(2);
    expect(groups[0].roomNo).toBe('501');
    expect(groups[0].beds.map((b) => b.bedId)).toEqual(['b1', 'b2']);
    expect(groups[1].roomNo).toBe('502');
    expect(groups[1].beds).toHaveLength(1);
  });

  it('同号不同病区不合并', () => {
    const rows = [
      row({ bedId: 'b1', roomNo: '501', floor: '5', wardId: 'w1' }),
      row({ bedId: 'b2', roomNo: '501', floor: '5', wardId: 'w2', wardName: '普外科' }),
    ];
    const groups = groupByRoom(rows);
    expect(groups).toHaveLength(2);
  });

  it('组内床号按自然序排序，组间按楼层/房号排序', () => {
    const rows = [
      row({ bedId: 'late', bedNo: '12', roomNo: '501', floor: '5', wardId: 'w1' }),
      row({ bedId: 'early', bedNo: '2', roomNo: '501', floor: '5', wardId: 'w1' }),
      row({ bedId: 'up', bedNo: '01', roomNo: '601', floor: '6', wardId: 'w1' }),
    ];
    const groups = groupByRoom(rows);
    // 5 楼在前
    expect(groups[0].floor).toBe('5');
    expect(groups[0].beds.map((b) => b.bedNo)).toEqual(['2', '12']);
    expect(groups[1].floor).toBe('6');
  });

  it('不修改入参', () => {
    const rows = [row({ bedId: 'b1', bedNo: '10', roomNo: '501', floor: '5' })];
    const snapshot = rows.map((r) => ({ ...r }));
    groupByRoom(rows);
    expect(rows).toEqual(snapshot);
  });
});

describe('summarize', () => {
  it('统计四态数量', () => {
    const mk = (status: BedMapStatus) => row({ status });
    const rows = [
      mk('available'), mk('available'),
      mk('occupied'),
      mk('isolation'),
      mk('maintenance'), mk('maintenance'), mk('maintenance'),
    ];
    const s = summarize(rows);
    expect(s.total).toBe(7);
    expect(s.available).toBe(2);
    expect(s.occupied).toBe(1);
    expect(s.isolation).toBe(1);
    expect(s.maintenance).toBe(3);
  });

  it('空列表归零', () => {
    expect(summarize([])).toEqual({ total: 0, available: 0, occupied: 0, isolation: 0, maintenance: 0 });
  });
});
