/**
 * 健澜科技 jlmedaios - 排班日历（M614，P0）
 *
 * 三甲流程：antd Calendar 月视图，每天格子内显示当日班次人数（按 shiftType 色标 Tag）
 * → 上方覆盖率卡片（每科室 Progress 进度条 actual/expected，rate%）。权限码 schedule:view。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { useEffect, useMemo } from 'react';
import { Alert, Calendar, Card, Col, Progress, Row, Spin, Tag } from 'antd';
import type { Dayjs } from 'dayjs';

import { PageContainer } from '@/components/common';
import DemoModeBanner from '@/components/common/DemoModeBanner';
import { usePageTitle } from '@/hooks';
import { usePermission } from '@/router/guards';
import { useSchedulingCalendarM614Store } from '@/store/schedulingCalendarM614Store';
import {
  SHIFT_TYPE_META,
  type ShiftType,
} from '@/services/api/schedulingCalendarM614';

export default function SchedulingCalendarM614Page() {
  usePageTitle('排班日历');
  const { hasPermission } = usePermission();
  const canView = hasPermission('schedule:view');

  const { shifts, coverage, loading, error, demo, load } = useSchedulingCalendarM614Store();

  useEffect(() => {
    void load();
  }, [load]);

  /** shiftDate -> 当日班次计数 */
  const byDate = useMemo(() => {
    const map = new Map<string, Partial<Record<ShiftType, number>>>();
    for (const s of shifts) {
      const entry = map.get(s.shiftDate) ?? {};
      entry[s.shiftType] = (entry[s.shiftType] ?? 0) + 1;
      map.set(s.shiftDate, entry);
    }
    return map;
  }, [shifts]);

  const dateCellRender = (value: Dayjs) => {
    const key = value.format('YYYY-MM-DD');
    const entry = byDate.get(key);
    if (!entry) return null;
    const types = (Object.keys(entry) as ShiftType[]).filter((k) => entry[k]);
    return (
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {types.map((t) => (
          <li key={t}>
            <Tag color={SHIFT_TYPE_META[t].color} style={{ fontSize: 11, marginBottom: 2 }}>
              {SHIFT_TYPE_META[t].label} {entry[t]}人
            </Tag>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <PageContainer
      title="排班日历"
      description="Calendar 月视图：每日按班次色标显示人数；顶部科室覆盖率进度条"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}
      {!canView && (
        <Alert type="warning" showIcon style={{ marginBottom: 12 }} message="当前账号缺少 schedule:view 权限" />
      )}

      <Card size="small" title="科室覆盖率" style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]}>
          {coverage.map((c) => (
            <Col xs={24} sm={12} lg={8} key={c.deptCode}>
              <div style={{ marginBottom: 4 }}>
                <b>{c.deptCode}</b>
                <span style={{ marginLeft: 8, color: '#888', fontSize: 12 }}>
                  实到 {c.actual} / 应到 {c.expected}
                  {c.gap > 0 && <Tag color="red" style={{ marginLeft: 8 }}>缺 {c.gap} 人</Tag>}
                </span>
              </div>
              <Progress
                percent={c.rate}
                size="small"
                status={c.rate >= 90 ? 'success' : c.rate >= 70 ? 'active' : 'exception'}
              />
            </Col>
          ))}
        </Row>
      </Card>

      <Card size="small">
        <Spin spinning={loading}>
          <Calendar dateCellRender={dateCellRender} />
        </Spin>
      </Card>
    </PageContainer>
  );
}
