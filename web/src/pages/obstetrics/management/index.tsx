/**
 * 健澜科技 jlmedaios - 产科管理（M848 原地升级 M818 视图）
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
import { useObstetricsWorkloadM848Store } from '@/store/obstetricsWorkloadM848Store';
import type { ObstetricsWorkloadM848 } from '@/services/api/obstetricsWorkloadM848';

const deliveryColumns: ColumnsType<{ name: string; count: number }> = [
  { title: '分娩方式', dataIndex: 'name' },
  { title: '数量', dataIndex: 'count', align: 'right' },
];

const buildColumns = (setDetail: (r: ObstetricsWorkloadM848) => void): ColumnsType<ObstetricsWorkloadM848> => [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '分娩数', dataIndex: 'deliveries', width: 100, align: 'right', render: (v: number) => <Tag color="blue">{v}</Tag> },
  { title: '剖宫产数', dataIndex: 'cesarean', width: 110, align: 'right', render: (v: number) => <Tag color="red">{v}</Tag> },
  { title: '顺产数', dataIndex: 'vaginal', width: 100, align: 'right', render: (v: number) => <Tag color="green">{v}</Tag> },
  {
    title: '高危妊娠数',
    dataIndex: 'highRisk',
    width: 120,
    align: 'right',
    render: (v: number) => <Tag color={v > 0 ? 'orange' : 'default'}>{v}</Tag>,
  },
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

export default function ObstetricsManagementM848Page() {
  usePageTitle('产科管理');
  const { items, loading, error, demo, load } = useObstetricsWorkloadM848Store();
  const [detail, setDetail] = useState<ObstetricsWorkloadM848 | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="产科管理"
      description="日期 / 分娩数 / 剖宫产数 / 顺产数 / 高危妊娠数 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`产科工作（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1200 }} />
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
              <Descriptions.Item label="剖宫产数">{detail.cesarean}</Descriptions.Item>
              <Descriptions.Item label="顺产数">{detail.vaginal}</Descriptions.Item>
              <Descriptions.Item label="高危妊娠数">{detail.highRisk}</Descriptions.Item>
              <Descriptions.Item label="状态">{detail.status}</Descriptions.Item>
              <Descriptions.Item label="新生儿 Apgar 评分" span={2}>{detail.apgar}</Descriptions.Item>
              <Descriptions.Item label="产后出血记录" span={2}>{detail.postpartumHemorrhage}</Descriptions.Item>
              <Descriptions.Item label="妊高征管理" span={2}>{detail.preEclampsia}</Descriptions.Item>
              <Descriptions.Item label="产后访视" span={2}>{detail.followUp}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="分娩方式分解">
              <Table rowKey="name" dataSource={detail.deliveryBreakdown} columns={deliveryColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
