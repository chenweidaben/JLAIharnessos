/**
 * 健澜科技 jlmedaios - 护理排班（M664，配套 M559）
 *
 * 三甲流程：排班 Table（日期/班次 badge/护士/科室）+ 周视图 Grid。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { useEffect } from 'react';
import { Alert, Card, Col, Row, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';

import { PageContainer } from '@/components/common';
import DemoModeBanner from '@/components/common/DemoModeBanner';
import { usePageTitle } from '@/hooks';
import { useNursingScheduleV2M664Store } from '@/store/nursingScheduleV2M664Store';
import {
  SHIFT_META,
  type NursingSchedule,
} from '@/services/api/nursingScheduleV2M664';

const columns: ColumnsType<NursingSchedule> = [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '科室', dataIndex: 'dept', width: 140 },
  { title: '护士', dataIndex: 'nurseName', width: 120 },
  {
    title: '班次',
    dataIndex: 'shift',
    width: 130,
    render: (v: NursingSchedule['shift']) => (
      <Tag color={SHIFT_META[v].color}>{SHIFT_META[v].label}（{SHIFT_META[v].time}）</Tag>
    ),
  },
];

export default function NursingScheduleV2M664Page() {
  usePageTitle('护理排班');

  const { items, loading, error, demo, load } = useNursingScheduleV2M664Store();

  useEffect(() => {
    void load();
  }, [load]);

  const nurses = Array.from(new Set(items.map((s) => s.nurseName)));
  const dates = Array.from(new Set(items.map((s) => s.date))).sort();

  return (
    <PageContainer
      title="护理排班（v2）"
      description="日期 / 班次 / 护士 / 科室"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title="周视图（护士 × 日期）" style={{ marginBottom: 16 }}>
        <Spin spinning={loading}>
          <Row gutter={[8, 8]}>
            {nurses.map((n) => (
              <Col span={24} key={n}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{n}</div>
                <Row gutter={[8, 8]}>
                  {dates.map((d) => {
                    const cell = items.find((s) => s.nurseName === n && s.date === d);
                    return (
                      <Col span={24 / (dates.length || 1) || 4} key={d}>
                        <Card size="small" style={{ background: cell ? '#f6ffed' : '#fafafa' }}>
                          <div style={{ fontSize: 12, color: '#999' }}>{d}</div>
                          {cell ? (
                            <Tag color={SHIFT_META[cell.shift].color}>{SHIFT_META[cell.shift].label}</Tag>
                          ) : (
                            <span style={{ color: '#bbb' }}>—</span>
                          )}
                        </Card>
                      </Col>
                    );
                  })}
                </Row>
              </Col>
            ))}
          </Row>
        </Spin>
      </Card>

      <Card size="small" title={`排班明细（${items.length}）`}>
        <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={{ pageSize: 10 }} />
      </Card>
    </PageContainer>
  );
}
