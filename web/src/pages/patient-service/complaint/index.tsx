/**
 * 健澜科技 jlmedaios - 投诉管理（M902）
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
import { useComplaintWorkloadM902Store } from '@/store/complaintWorkloadM902Store';
import type { ComplaintWorkload } from '@/services/api/complaintWorkloadM902';

const simpleColumns: ColumnsType<{ name: string; count: number }> = [
  { title: '项目', dataIndex: 'name' },
  { title: '数量', dataIndex: 'count', align: 'right' },
];

const buildColumns = (setDetail: (r: ComplaintWorkload) => void): ColumnsType<ComplaintWorkload> => [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '投诉总数', dataIndex: 'total', width: 110, align: 'right', render: (v: number) => <Tag color="red">{v}</Tag> },
  { title: '已受理数', dataIndex: 'accepted', width: 110, align: 'right', render: (v: number) => <Tag color="blue">{v}</Tag> },
  { title: '处理中数', dataIndex: 'processing', width: 110, align: 'right', render: (v: number) => <Tag color="orange">{v}</Tag> },
  { title: '已结案数', dataIndex: 'closed', width: 110, align: 'right', render: (v: number) => <Tag color="green">{v}</Tag> },
  {
    title: '满意度评分(%)',
    dataIndex: 'satisfaction',
    width: 140,
    align: 'right',
    render: (v: number) => <Tag color={v >= 90 ? 'green' : 'orange'}>{v}%</Tag>,
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

export default function ComplaintManagementM902Page() {
  usePageTitle('投诉管理');
  const { items, loading, error, demo, load } = useComplaintWorkloadM902Store();
  const [detail, setDetail] = useState<ComplaintWorkload | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="投诉管理"
      description="日期 / 投诉总数 / 已受理 / 处理中 / 已结案 / 满意度 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`投诉工作（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1400 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="投诉工作详情"
        width={900}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="日期">{detail.date}</Descriptions.Item>
              <Descriptions.Item label="投诉总数">{detail.total}</Descriptions.Item>
              <Descriptions.Item label="已受理数">{detail.accepted}</Descriptions.Item>
              <Descriptions.Item label="处理中数">{detail.processing}</Descriptions.Item>
              <Descriptions.Item label="已结案数">{detail.closed}</Descriptions.Item>
              <Descriptions.Item label="满意度评分">{detail.satisfaction}%</Descriptions.Item>
              <Descriptions.Item label="状态">{detail.status}</Descriptions.Item>
              <Descriptions.Item label="处理流程（受理→调查→反馈→结案）" span={2}>{detail.processFlow}</Descriptions.Item>
              <Descriptions.Item label="改进措施" span={2}>{detail.improvements}</Descriptions.Item>
              <Descriptions.Item label="投诉热点分析" span={2}>{detail.hotspotAnalysis}</Descriptions.Item>
            </Descriptions>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Card size="small" title="投诉分类（态度/技术/环境/费用/等待）">
                <Table rowKey="name" dataSource={detail.categoryBreakdown} columns={simpleColumns} size="small" pagination={false} />
              </Card>
              <Card size="small" title="投诉渠道（电话/意见箱/网络/现场）">
                <Table rowKey="name" dataSource={detail.channelBreakdown} columns={simpleColumns} size="small" pagination={false} />
              </Card>
            </div>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
