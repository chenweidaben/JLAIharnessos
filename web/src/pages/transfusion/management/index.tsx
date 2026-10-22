/**
 * 健澜科技 jlmedaios - 输血科管理（M834 原地升级旧 M688 视图）
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
import { useTransfusionWorkloadM834Store } from '@/store/transfusionWorkloadM834Store';
import type { TransfusionWorkload } from '@/services/api/transfusionWorkloadM834';

const bloodTypeColumns: ColumnsType<{ type: string; units: number }> = [
  { title: '血型', dataIndex: 'type' },
  { title: '单位数', dataIndex: 'units', align: 'right' },
];

const crossmatchColumns: ColumnsType<{ patient: string; bloodType: string; result: string }> = [
  { title: '患者', dataIndex: 'patient', width: 100 },
  { title: '血型', dataIndex: 'bloodType', width: 120 },
  { title: '配血结果', dataIndex: 'result' },
];

const reactionColumns: ColumnsType<{ time: string; patient: string; type: string; action: string }> = [
  { title: '时间', dataIndex: 'time', width: 80 },
  { title: '患者', dataIndex: 'patient', width: 100 },
  { title: '反应类型', dataIndex: 'type' },
  { title: '处置', dataIndex: 'action' },
];

const discardColumns: ColumnsType<{ item: string; units: number; reason: string }> = [
  { title: '血液品种', dataIndex: 'item' },
  { title: '单位数', dataIndex: 'units', align: 'right' },
  { title: '报废原因', dataIndex: 'reason' },
];

const buildColumns = (setDetail: (r: TransfusionWorkload) => void): ColumnsType<TransfusionWorkload> => [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '红细胞数', dataIndex: 'redCells', width: 100, align: 'right', render: (v: number) => <Tag color="red">{v}</Tag> },
  { title: '血浆数', dataIndex: 'plasma', width: 100, align: 'right', render: (v: number) => <Tag color="orange">{v}</Tag> },
  { title: '血小板数', dataIndex: 'platelets', width: 100, align: 'right', render: (v: number) => <Tag color="purple">{v}</Tag> },
  { title: '自体输血数', dataIndex: 'autologous', width: 110, align: 'right', render: (v: number) => <Tag color="green">{v}</Tag> },
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

export default function TransfusionManagementM834Page() {
  usePageTitle('输血科管理');
  const { items, loading, error, demo, load } = useTransfusionWorkloadM834Store();
  const [detail, setDetail] = useState<TransfusionWorkload | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="输血科管理"
      description="日期 / 红细胞数 / 血浆数 / 血小板数 / 自体输血数 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`输血工作（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1100 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="输血工作详情"
        width={820}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="日期">{detail.date}</Descriptions.Item>
              <Descriptions.Item label="红细胞数">{detail.redCells}</Descriptions.Item>
              <Descriptions.Item label="血浆数">{detail.plasma}</Descriptions.Item>
              <Descriptions.Item label="血小板数">{detail.platelets}</Descriptions.Item>
              <Descriptions.Item label="自体输血数">{detail.autologous}</Descriptions.Item>
              <Descriptions.Item label="状态">{detail.status}</Descriptions.Item>
              <Descriptions.Item label="输血指征审核" span={2}>{detail.indicationReview}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="血型分布" style={{ marginBottom: 16 }}>
              <Table rowKey="type" dataSource={detail.bloodTypeDistribution} columns={bloodTypeColumns} size="small" pagination={false} />
            </Card>
            <Card size="small" title="交叉配血记录" style={{ marginBottom: 16 }}>
              <Table rowKey="patient" dataSource={detail.crossmatchRecords} columns={crossmatchColumns} size="small" pagination={false} />
            </Card>
            <Card size="small" title="输血反应记录" style={{ marginBottom: 16 }}>
              <Table rowKey="time" dataSource={detail.reactions} columns={reactionColumns} size="small" pagination={false} />
            </Card>
            <Card size="small" title="血液报废记录">
              <Table rowKey="item" dataSource={detail.discards} columns={discardColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
