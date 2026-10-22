/**
 * 健澜科技 jlmedaios - 手术排程看板（M665，配套 M560）
 *
 * 三甲流程：按手术间分组 Table（时段/患者/手术名/术者/状态 badge）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { useEffect } from 'react';
import { Alert, Card, Space, Spin, Table, Tabs, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';

import { PageContainer } from '@/components/common';
import DemoModeBanner from '@/components/common/DemoModeBanner';
import { usePageTitle } from '@/hooks';
import { useSurgeryScheduleV2M665Store } from '@/store/surgeryScheduleV2M665Store';
import {
  SCHEDULE_STATUS_META,
  type SurgerySchedule,
} from '@/services/api/surgeryScheduleV2M665';

const columns: ColumnsType<SurgerySchedule> = [
  { title: '时段', dataIndex: 'timeSlot', width: 140 },
  { title: '患者', dataIndex: 'patientId', width: 100 },
  { title: '手术名称', dataIndex: 'surgeryName', ellipsis: true },
  { title: '术者', dataIndex: 'surgeon', width: 100 },
  { title: '麻醉', dataIndex: 'anesthesiaType', width: 120 },
  {
    title: '状态',
    dataIndex: 'status',
    width: 110,
    render: (v: SurgerySchedule['status']) => (
      <Tag color={SCHEDULE_STATUS_META[v].color}>{SCHEDULE_STATUS_META[v].label}</Tag>
    ),
  },
];

export default function SurgeryScheduleV2M665Page() {
  usePageTitle('手术排程');

  const { items, loading, error, demo, load } = useSurgeryScheduleV2M665Store();

  useEffect(() => {
    void load();
  }, [load]);

  const rooms = Array.from(new Set(items.map((s) => s.orRoom)));

  return (
    <PageContainer
      title="手术排程看板（v2）"
      description="手术间 / 时段 / 手术名称 / 术者"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`今日排程（${items.length}）`}>
        <Spin spinning={loading}>
          <Tabs
            items={rooms.map((room) => ({
              key: room,
              label: `${room}（${items.filter((s) => s.orRoom === room).length}）`,
              children: (
                <Table
                  rowKey="id"
                  dataSource={items.filter((s) => s.orRoom === room)}
                  columns={columns}
                  size="small"
                  pagination={false}
                />
              ),
            }))}
          />
        </Spin>
      </Card>

      <Card size="small" style={{ marginTop: 16 }} title="状态说明">
        <Space wrap>
          {(Object.keys(SCHEDULE_STATUS_META) as SurgerySchedule['status'][]).map((k) => (
            <Tag key={k} color={SCHEDULE_STATUS_META[k].color}>
              {SCHEDULE_STATUS_META[k].label}
            </Tag>
          ))}
        </Space>
      </Card>
    </PageContainer>
  );
}
