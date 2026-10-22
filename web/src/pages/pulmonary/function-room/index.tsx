/**
 * 健澜科技 jlmedaios - 肺功能室管理（M812）
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
import { usePulmonaryFunctionWorkloadM812Store } from '@/store/pulmonaryFunctionWorkloadM812Store';
import type { PulmonaryFunctionWorkload } from '@/services/api/pulmonaryFunctionWorkloadM812';

const typeColumns: ColumnsType<{ name: string; count: number; abnormal: number }> = [
  { title: '检查类型', dataIndex: 'name' },
  { title: '检查数', dataIndex: 'count', align: 'right' },
  { title: '异常数', dataIndex: 'abnormal', align: 'right', render: (v: number) => <Tag color="red">{v}</Tag> },
];

const buildColumns = (setDetail: (r: PulmonaryFunctionWorkload) => void): ColumnsType<PulmonaryFunctionWorkload> => [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '检查类型', dataIndex: 'examType', width: 120 },
  { title: '检查数', dataIndex: 'studies', width: 100, align: 'right' },
  {
    title: '异常数',
    dataIndex: 'abnormal',
    width: 100,
    align: 'right',
    render: (v: number) => <Tag color="red">{v}</Tag>,
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

export default function PulmonaryFunctionRoomM812Page() {
  usePageTitle('肺功能室管理');
  const { items, loading, error, demo, load } = usePulmonaryFunctionWorkloadM812Store();
  const [detail, setDetail] = useState<PulmonaryFunctionWorkload | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="肺功能室管理"
      description="日期 / 检查类型 / 检查数 / 异常数 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`肺功能工作（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 900 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="肺功能工作详情"
        width={820}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="日期">{detail.date}</Descriptions.Item>
              <Descriptions.Item label="检查类型">{detail.examType}</Descriptions.Item>
              <Descriptions.Item label="检查数">{detail.studies}</Descriptions.Item>
              <Descriptions.Item label="异常数">{detail.abnormal}</Descriptions.Item>
              <Descriptions.Item label="FEV1/FVC 比值" span={2}>{detail.fev1FvcRatio}</Descriptions.Item>
              <Descriptions.Item label="诊断结果" span={2}>{detail.diagnosis}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="检查类型分解">
              <Table rowKey="name" dataSource={detail.typeBreakdown} columns={typeColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
