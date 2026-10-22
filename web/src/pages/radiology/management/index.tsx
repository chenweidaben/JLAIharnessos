/**
 * 健澜科技 jlmedaios - 放射科管理（M839 原地升级 M804 视图）
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
import { useRadiologyWorkloadM839Store } from '@/store/radiologyWorkloadM839Store';
import type { RadiologyWorkloadM839 } from '@/services/api/radiologyWorkloadM839';

const typeColumns: ColumnsType<{ name: string; count: number; positive: number }> = [
  { title: '检查类型', dataIndex: 'name' },
  { title: '检查数', dataIndex: 'count', align: 'right' },
  { title: '阳性数', dataIndex: 'positive', align: 'right', render: (v: number) => <Tag color="red">{v}</Tag> },
];

const contrastColumns: ColumnsType<{ time: string; patient: string; reaction: string; action: string }> = [
  { title: '时间', dataIndex: 'time', width: 80 },
  { title: '患者', dataIndex: 'patient', width: 100 },
  { title: '不良反应', dataIndex: 'reaction' },
  { title: '处置', dataIndex: 'action' },
];

const buildColumns = (setDetail: (r: RadiologyWorkloadM839) => void): ColumnsType<RadiologyWorkloadM839> => [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: 'CT 数', dataIndex: 'ct', width: 90, align: 'right', render: (v: number) => <Tag color="blue">{v}</Tag> },
  { title: 'MR 数', dataIndex: 'mr', width: 90, align: 'right', render: (v: number) => <Tag color="cyan">{v}</Tag> },
  { title: 'DR 数', dataIndex: 'dr', width: 90, align: 'right', render: (v: number) => <Tag color="green">{v}</Tag> },
  { title: '介入数', dataIndex: 'interventional', width: 100, align: 'right', render: (v: number) => <Tag color="purple">{v}</Tag> },
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

export default function RadiologyManagementM839Page() {
  usePageTitle('放射科管理');
  const { items, loading, error, demo, load } = useRadiologyWorkloadM839Store();
  const [detail, setDetail] = useState<RadiologyWorkloadM839 | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="放射科管理"
      description="日期 / CT 数 / MR 数 / DR 数 / 介入数 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`放射工作（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1100 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="放射工作详情"
        width={820}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="日期">{detail.date}</Descriptions.Item>
              <Descriptions.Item label="CT 数">{detail.ct}</Descriptions.Item>
              <Descriptions.Item label="MR 数">{detail.mr}</Descriptions.Item>
              <Descriptions.Item label="DR 数">{detail.dr}</Descriptions.Item>
              <Descriptions.Item label="介入数">{detail.interventional}</Descriptions.Item>
              <Descriptions.Item label="状态">{detail.status}</Descriptions.Item>
              <Descriptions.Item label="报告时效记录" span={2}>{detail.reportTimeliness}</Descriptions.Item>
              <Descriptions.Item label="阳性率统计" span={2}>{detail.positivity}</Descriptions.Item>
              <Descriptions.Item label="图像质量评级" span={2}>{detail.imageQuality}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="检查类型分解" style={{ marginBottom: 16 }}>
              <Table rowKey="name" dataSource={detail.typeBreakdown} columns={typeColumns} size="small" pagination={false} />
            </Card>
            <Card size="small" title="造影剂不良反应记录">
              <Table rowKey="time" dataSource={detail.contrastReactions} columns={contrastColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
