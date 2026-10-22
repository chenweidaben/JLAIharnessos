/**
 * 健澜科技 jlmedaios - 排班管理（M734）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Modal,
  Spin,
  Table,
  Tag,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';

import { PageContainer } from '@/components/common';
import DemoModeBanner from '@/components/common/DemoModeBanner';
import { usePageTitle } from '@/hooks';
import { useSchedulingM734Store } from '@/store/schedulingM734Store';
import {
  SCHEDULE_STATUS_META,
  SHIFT_META,
  type Schedule,
} from '@/services/api/scheduleM734';

const swapColumns: ColumnsType<{ date: string; from: string; to: string; reason: string }> = [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '调出', dataIndex: 'from', width: 100 },
  { title: '调入', dataIndex: 'to', width: 100 },
  { title: '原因', dataIndex: 'reason' },
];

const buildColumns = (setDetail: (r: Schedule) => void): ColumnsType<Schedule> => [
  { title: '科室', dataIndex: 'dept', width: 160 },
  { title: '日期', dataIndex: 'date', width: 120 },
  {
    title: '班次',
    dataIndex: 'shift',
    width: 110,
    render: (v: Schedule['shift']) => <Tag color={SHIFT_META[v].color}>{SHIFT_META[v].label}</Tag>,
  },
  { title: '人数', dataIndex: 'headcount', width: 90, align: 'right' },
  {
    title: '状态',
    dataIndex: 'status',
    width: 110,
    render: (v: Schedule['status']) => <Tag color={SCHEDULE_STATUS_META[v].color}>{SCHEDULE_STATUS_META[v].label}</Tag>,
  },
  {
    title: '操作',
    width: 90,
    render: (_v, row) => (
      <Button type="link" size="small" onClick={() => setDetail(row)}>
        详情
      </Button>
    ),
  },
];

export default function SchedulingM734Page() {
  usePageTitle('排班管理');
  const { items, loading, error, demo, load } = useSchedulingM734Store();
  const [detail, setDetail] = useState<Schedule | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="排班管理"
      description="科室 / 日期 / 班次 / 人数 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`排班表（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="排班详情"
        width={780}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="科室">{detail.dept}</Descriptions.Item>
              <Descriptions.Item label="日期">{detail.date}</Descriptions.Item>
              <Descriptions.Item label="班次">
                <Tag color={SHIFT_META[detail.shift].color}>{SHIFT_META[detail.shift].label}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="班次时间">{detail.shiftTime}</Descriptions.Item>
              <Descriptions.Item label="人数">{detail.headcount}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={SCHEDULE_STATUS_META[detail.status].color}>{SCHEDULE_STATUS_META[detail.status].label}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="排班人员" span={2}>
                {detail.personnel.map((p) => <Tag key={p} style={{ marginBottom: 4 }}>{p}</Tag>)}
              </Descriptions.Item>
            </Descriptions>
            <Card size="small" title="换班记录">
              {detail.swaps.length
                ? <Table rowKey="date" dataSource={detail.swaps} columns={swapColumns} size="small" pagination={false} />
                : <span style={{ color: '#999' }}>无换班记录</span>}
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
