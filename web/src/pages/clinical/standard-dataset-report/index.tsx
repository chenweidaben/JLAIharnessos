/**
 * 健澜科技 jlmedaios - 标准数据集上报（M658，配套 M584）
 *
 * 三甲流程：上报 Table（数据集/频率/周期/记录数/状态 badge/达标率 Progress）
 * + 详情 Modal。
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
  Progress,
  Space,
  Spin,
  Table,
  Tag,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

import { PageContainer } from '@/components/common';
import DemoModeBanner from '@/components/common/DemoModeBanner';
import { usePageTitle } from '@/hooks';
import { useStandardDatasetReportM658Store } from '@/store/standardDatasetReportM658Store';
import {
  DATASET_STATUS_META,
  type StandardDatasetReport,
} from '@/services/api/standardDatasetReportM658';

const buildColumns = (setDetail: (row: StandardDatasetReport) => void): ColumnsType<StandardDatasetReport> => [
  { title: '数据集', dataIndex: 'datasetName', width: 240 },
  { title: '频率', dataIndex: 'frequency', width: 90 },
  { title: '周期', dataIndex: 'period', width: 110 },
  { title: '记录数', dataIndex: 'recordCount', width: 100, align: 'right' },
  {
    title: '状态',
    dataIndex: 'status',
    width: 110,
    render: (v: StandardDatasetReport['status']) => (
      <Tag color={DATASET_STATUS_META[v].color}>{DATASET_STATUS_META[v].label}</Tag>
    ),
  },
  {
    title: '达标率',
    dataIndex: 'compliancePct',
    width: 180,
    render: (v: number) => (
      <Progress
        percent={v}
        size="small"
        strokeColor={v >= 98 ? '#3f8600' : v >= 90 ? '#faad14' : '#cf1322'}
      />
    ),
  },
  {
    title: '最近上报',
    dataIndex: 'lastReportedAt',
    width: 150,
    render: (v: string) => dayjs(v).format('MM-DD HH:mm'),
  },
  {
    title: '操作',
    dataIndex: 'id',
    width: 100,
    render: (_v, row) => (
      <Button type="link" size="small" onClick={() => setDetail(row)}>
        详情
      </Button>
    ),
  },
];

export default function StandardDatasetReportPage() {
  usePageTitle('标准数据集上报');

  const { items, loading, error, demo, load } = useStandardDatasetReportM658Store();

  const [detail, setDetail] = useState<StandardDatasetReport | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="标准数据集上报"
      description="数据集名称 / 上报频率 / 状态 / 达标率"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`数据集（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1100 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="数据集上报详情"
        footer={
          <Space>
            <Button onClick={() => setDetail(null)}>关闭</Button>
          </Space>
        }
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="数据集名称">{detail.datasetName}</Descriptions.Item>
            <Descriptions.Item label="上报频率">{detail.frequency}</Descriptions.Item>
            <Descriptions.Item label="周期">{detail.period}</Descriptions.Item>
            <Descriptions.Item label="记录数">{detail.recordCount}</Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={DATASET_STATUS_META[detail.status].color}>{DATASET_STATUS_META[detail.status].label}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="达标率">
              <Progress percent={detail.compliancePct} size="small" />
            </Descriptions.Item>
            <Descriptions.Item label="最近上报时间">
              {dayjs(detail.lastReportedAt).format('YYYY-MM-DD HH:mm')}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </PageContainer>
  );
}
