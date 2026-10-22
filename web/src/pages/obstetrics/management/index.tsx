/**
 * 健澜科技 jlmedaios - 产科管理（M818）
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
import { useObstetricsWorkloadM818Store } from '@/store/obstetricsWorkloadM818Store';
import type { ObstetricsWorkload } from '@/services/api/obstetricsWorkloadM818';

const modeColumns: ColumnsType<{ name: string; count: number }> = [
  { title: '分娩方式', dataIndex: 'name' },
  { title: '例数', dataIndex: 'count', align: 'right' },
];

const resusColumns: ColumnsType<{ time: string; baby: string; apgar1: number; action: string }> = [
  { title: '时间', dataIndex: 'time', width: 80 },
  { title: '新生儿', dataIndex: 'baby', width: 140 },
  { title: '1min Apgar', dataIndex: 'apgar1', width: 100, align: 'right', render: (v: number) => <Tag color={v < 7 ? 'red' : 'green'}>{v}</Tag> },
  { title: '复苏处置', dataIndex: 'action' },
];

const buildColumns = (setDetail: (r: ObstetricsWorkload) => void): ColumnsType<ObstetricsWorkload> => [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '分娩数', dataIndex: 'deliveries', width: 90, align: 'right' },
  { title: '顺产数', dataIndex: 'vaginal', width: 90, align: 'right', render: (v: number) => <Tag color="green">{v}</Tag> },
  { title: '剖宫产数', dataIndex: 'cesarean', width: 110, align: 'right', render: (v: number) => <Tag color="orange">{v}</Tag> },
  { title: '会阴侧切数', dataIndex: 'episiotomy', width: 120, align: 'right' },
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

export default function ObstetricsManagementM818Page() {
  usePageTitle('产科管理');
  const { items, loading, error, demo, load } = useObstetricsWorkloadM818Store();
  const [detail, setDetail] = useState<ObstetricsWorkload | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="产科管理"
      description="日期 / 分娩数 / 顺产数 / 剖宫产数 / 会阴侧切数 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`产科工作（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1100 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="产科工作详情"
        width={820}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="日期">{detail.date}</Descriptions.Item>
              <Descriptions.Item label="分娩数">{detail.deliveries}</Descriptions.Item>
              <Descriptions.Item label="顺产数">{detail.vaginal}</Descriptions.Item>
              <Descriptions.Item label="剖宫产数">{detail.cesarean}</Descriptions.Item>
              <Descriptions.Item label="会阴侧切数">{detail.episiotomy}</Descriptions.Item>
              <Descriptions.Item label="状态">{detail.status}</Descriptions.Item>
              <Descriptions.Item label="新生儿 Apgar 评分" span={2}>{detail.apgar}</Descriptions.Item>
              <Descriptions.Item label="产后出血监测" span={2}>{detail.postpartumHemorrhage}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="分娩方式分解" style={{ marginBottom: 16 }}>
              <Table rowKey="name" dataSource={detail.modeBreakdown} columns={modeColumns} size="small" pagination={false} />
            </Card>
            <Card size="small" title="新生儿窒息抢救记录">
              <Table rowKey="time" dataSource={detail.asphyxiaResus} columns={resusColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
