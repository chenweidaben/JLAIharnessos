/**
 * 健澜科技 jlmedaios - 手术室管理（M873）
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
import { useOperatingRoomWorkloadM873Store } from '@/store/operatingRoomWorkloadM873Store';
import type { OperatingRoomWorkload } from '@/services/api/operatingRoomWorkloadM873';

const simpleColumns: ColumnsType<{ name: string; count: number }> = [
  { title: '项目', dataIndex: 'name' },
  { title: '数量', dataIndex: 'count', align: 'right' },
];

const buildColumns = (setDetail: (r: OperatingRoomWorkload) => void): ColumnsType<OperatingRoomWorkload> => [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '手术间数', dataIndex: 'rooms', width: 110, align: 'right', render: (v: number) => <Tag color="blue">{v}</Tag> },
  { title: '台次数', dataIndex: 'cases', width: 110, align: 'right', render: (v: number) => <Tag color="cyan">{v}</Tag> },
  { title: '急诊手术数', dataIndex: 'emergencyCases', width: 130, align: 'right', render: (v: number) => <Tag color="red">{v}</Tag> },
  { title: '接台时间(min)', dataIndex: 'turnoverMin', width: 140, align: 'right', render: (v: number) => <Tag color={v <= 25 ? 'green' : 'orange'}>{v}</Tag> },
  { title: '状态', dataIndex: 'status', width: 110 },
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

export default function OperatingRoomManagementM873Page() {
  usePageTitle('手术室管理');
  const { items, loading, error, demo, load } = useOperatingRoomWorkloadM873Store();
  const [detail, setDetail] = useState<OperatingRoomWorkload | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="手术室管理"
      description="日期 / 手术间数 / 台次数 / 急诊手术数 / 接台时间 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`手术室工作（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1300 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="手术室工作详情"
        width={900}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="日期">{detail.date}</Descriptions.Item>
              <Descriptions.Item label="手术间数">{detail.rooms}</Descriptions.Item>
              <Descriptions.Item label="台次数">{detail.cases}</Descriptions.Item>
              <Descriptions.Item label="急诊手术数">{detail.emergencyCases}</Descriptions.Item>
              <Descriptions.Item label="平均接台时间">{detail.turnoverMin} min</Descriptions.Item>
              <Descriptions.Item label="状态">{detail.status}</Descriptions.Item>
              <Descriptions.Item label="手术取消原因" span={2}>{detail.cancellationReasons}</Descriptions.Item>
            </Descriptions>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Card size="small" title="手术间使用分布">
                <Table rowKey="name" dataSource={detail.roomBreakdown} columns={simpleColumns} size="small" pagination={false} />
              </Card>
              <Card size="small" title="手术分级（Ⅰ/Ⅱ/Ⅲ/Ⅳ级）">
                <Table rowKey="name" dataSource={detail.levelBreakdown} columns={simpleColumns} size="small" pagination={false} />
              </Card>
              <Card size="small" title="麻醉方式">
                <Table rowKey="name" dataSource={detail.anesthesiaBreakdown} columns={simpleColumns} size="small" pagination={false} />
              </Card>
            </div>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
