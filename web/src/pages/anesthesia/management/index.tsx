/**
 * 健澜科技 jlmedaios - 麻醉科管理（M813）
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
import { useAnesthesiaWorkloadM813Store } from '@/store/anesthesiaWorkloadM813Store';
import type { AnesthesiaWorkload } from '@/services/api/anesthesiaWorkloadM813';

const modeColumns: ColumnsType<{ name: string; count: number }> = [
  { title: '麻醉方式', dataIndex: 'name' },
  { title: '例数', dataIndex: 'count', align: 'right' },
];

const eventColumns: ColumnsType<{ time: string; patient: string; event: string; action: string }> = [
  { title: '时间', dataIndex: 'time', width: 80 },
  { title: '患者', dataIndex: 'patient', width: 100 },
  { title: '术中事件', dataIndex: 'event' },
  { title: '处置', dataIndex: 'action' },
];

const buildColumns = (setDetail: (r: AnesthesiaWorkload) => void): ColumnsType<AnesthesiaWorkload> => [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '手术台次', dataIndex: 'surgeries', width: 100, align: 'right' },
  { title: '全麻数', dataIndex: 'general', width: 100, align: 'right', render: (v: number) => <Tag color="blue">{v}</Tag> },
  { title: '椎管内数', dataIndex: 'neuraxial', width: 110, align: 'right', render: (v: number) => <Tag color="cyan">{v}</Tag> },
  { title: '局麻数', dataIndex: 'local', width: 100, align: 'right', render: (v: number) => <Tag color="green">{v}</Tag> },
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

export default function AnesthesiaManagementM813Page() {
  usePageTitle('麻醉科管理');
  const { items, loading, error, demo, load } = useAnesthesiaWorkloadM813Store();
  const [detail, setDetail] = useState<AnesthesiaWorkload | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="麻醉科管理"
      description="日期 / 手术台次 / 全麻数 / 椎管内数 / 局麻数 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`麻醉工作（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1100 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="麻醉工作详情"
        width={820}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="日期">{detail.date}</Descriptions.Item>
              <Descriptions.Item label="手术台次">{detail.surgeries}</Descriptions.Item>
              <Descriptions.Item label="全麻数">{detail.general}</Descriptions.Item>
              <Descriptions.Item label="椎管内数">{detail.neuraxial}</Descriptions.Item>
              <Descriptions.Item label="局麻数">{detail.local}</Descriptions.Item>
              <Descriptions.Item label="状态">{detail.status}</Descriptions.Item>
              <Descriptions.Item label="麻醉医生" span={2}>{detail.anesthesiologists}</Descriptions.Item>
              <Descriptions.Item label="苏醒室（PACU）记录" span={2}>{detail.pacu}</Descriptions.Item>
              <Descriptions.Item label="术后镇痛" span={2}>{detail.analgesia}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="麻醉方式分解" style={{ marginBottom: 16 }}>
              <Table rowKey="name" dataSource={detail.modeBreakdown} columns={modeColumns} size="small" pagination={false} />
            </Card>
            <Card size="small" title="术中事件记录">
              <Table rowKey="time" dataSource={detail.intraopEvents} columns={eventColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
