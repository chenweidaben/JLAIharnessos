/**
 * 健澜科技 jlmedaios - 超声科管理（M840 原地升级 M805 视图）
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
import { useUltrasoundWorkloadM840Store } from '@/store/ultrasoundWorkloadM840Store';
import type { UltrasoundWorkloadM840 } from '@/services/api/ultrasoundWorkloadM840';

const typeColumns: ColumnsType<{ name: string; count: number; positive: number }> = [
  { title: '检查类型', dataIndex: 'name' },
  { title: '检查数', dataIndex: 'count', align: 'right' },
  { title: '阳性数', dataIndex: 'positive', align: 'right', render: (v: number) => <Tag color="red">{v}</Tag> },
];

const interColumns: ColumnsType<{ time: string; patient: string; procedure: string }> = [
  { title: '时间', dataIndex: 'time', width: 80 },
  { title: '患者', dataIndex: 'patient', width: 100 },
  { title: '介入操作', dataIndex: 'procedure' },
];

const buildColumns = (setDetail: (r: UltrasoundWorkloadM840) => void): ColumnsType<UltrasoundWorkloadM840> => [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '腹部超声', dataIndex: 'abdomen', width: 110, align: 'right', render: (v: number) => <Tag color="blue">{v}</Tag> },
  { title: '心血管超声', dataIndex: 'cardiovascular', width: 130, align: 'right', render: (v: number) => <Tag color="cyan">{v}</Tag> },
  { title: '妇产超声', dataIndex: 'obstetricsGynecology', width: 110, align: 'right', render: (v: number) => <Tag color="green">{v}</Tag> },
  { title: '小器官超声', dataIndex: 'smallParts', width: 120, align: 'right', render: (v: number) => <Tag color="purple">{v}</Tag> },
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

export default function UltrasoundManagementM840Page() {
  usePageTitle('超声科管理');
  const { items, loading, error, demo, load } = useUltrasoundWorkloadM840Store();
  const [detail, setDetail] = useState<UltrasoundWorkloadM840 | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="超声科管理"
      description="日期 / 腹部超声 / 心血管超声 / 妇产超声 / 小器官超声 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`超声工作（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1200 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="超声工作详情"
        width={820}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="日期">{detail.date}</Descriptions.Item>
              <Descriptions.Item label="腹部超声">{detail.abdomen}</Descriptions.Item>
              <Descriptions.Item label="心血管超声">{detail.cardiovascular}</Descriptions.Item>
              <Descriptions.Item label="妇产超声">{detail.obstetricsGynecology}</Descriptions.Item>
              <Descriptions.Item label="小器官超声">{detail.smallParts}</Descriptions.Item>
              <Descriptions.Item label="状态">{detail.status}</Descriptions.Item>
              <Descriptions.Item label="报告时效记录" span={2}>{detail.reportTimeliness}</Descriptions.Item>
              <Descriptions.Item label="阳性率统计" span={2}>{detail.positivity}</Descriptions.Item>
              <Descriptions.Item label="图像质量评级" span={2}>{detail.imageQuality}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="检查类型分解" style={{ marginBottom: 16 }}>
              <Table rowKey="name" dataSource={detail.typeBreakdown} columns={typeColumns} size="small" pagination={false} />
            </Card>
            <Card size="small" title="介入超声记录">
              <Table rowKey="time" dataSource={detail.interventional} columns={interColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
