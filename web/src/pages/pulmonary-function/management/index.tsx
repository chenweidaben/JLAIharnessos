/**
 * 健澜科技 jlmedaios - 肺功能检查管理（M842）
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
import { usePulmonaryFunctionWorkloadM842Store } from '@/store/pulmonaryFunctionWorkloadM842Store';
import type { PulmonaryFunctionWorkload } from '@/services/api/pulmonaryFunctionWorkloadM842';

const typeColumns: ColumnsType<{ name: string; count: number; abnormal: number }> = [
  { title: '检查类型', dataIndex: 'name' },
  { title: '检查数', dataIndex: 'count', align: 'right' },
  { title: '异常数', dataIndex: 'abnormal', align: 'right', render: (v: number) => <Tag color="red">{v}</Tag> },
];

const buildColumns = (setDetail: (r: PulmonaryFunctionWorkload) => void): ColumnsType<PulmonaryFunctionWorkload> => [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '通气功能数', dataIndex: 'ventilation', width: 120, align: 'right', render: (v: number) => <Tag color="blue">{v}</Tag> },
  { title: '弥散功能数', dataIndex: 'diffusion', width: 120, align: 'right', render: (v: number) => <Tag color="cyan">{v}</Tag> },
  { title: '支气管舒张试验数', dataIndex: 'bronchodilator', width: 160, align: 'right', render: (v: number) => <Tag color="green">{v}</Tag> },
  { title: '运动心肺数', dataIndex: 'cardiopulmonary', width: 120, align: 'right', render: (v: number) => <Tag color="purple">{v}</Tag> },
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

export default function PulmonaryFunctionManagementM842Page() {
  usePageTitle('肺功能检查管理');
  const { items, loading, error, demo, load } = usePulmonaryFunctionWorkloadM842Store();
  const [detail, setDetail] = useState<PulmonaryFunctionWorkload | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="肺功能检查管理"
      description="日期 / 通气功能数 / 弥散功能数 / 支气管舒张试验数 / 运动心肺数 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`肺功能工作（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1300 }} />
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
              <Descriptions.Item label="通气功能数">{detail.ventilation}</Descriptions.Item>
              <Descriptions.Item label="弥散功能数">{detail.diffusion}</Descriptions.Item>
              <Descriptions.Item label="支气管舒张试验数">{detail.bronchodilator}</Descriptions.Item>
              <Descriptions.Item label="运动心肺数">{detail.cardiopulmonary}</Descriptions.Item>
              <Descriptions.Item label="状态">{detail.status}</Descriptions.Item>
              <Descriptions.Item label="FEV1/FVC 比值" span={2}>{detail.fev1Fvc}</Descriptions.Item>
              <Descriptions.Item label="舒张试验阳性记录" span={2}>{detail.bronchoPositive}</Descriptions.Item>
              <Descriptions.Item label="慢阻肺分级（GOLD 1-4）" span={2}>{detail.gold}</Descriptions.Item>
              <Descriptions.Item label="报告记录" span={2}>{detail.reports}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="检查类型分解（通气/弥散/舒张/CPET）">
              <Table rowKey="name" dataSource={detail.typeBreakdown} columns={typeColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
