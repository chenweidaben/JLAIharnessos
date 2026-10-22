/**
 * 健澜科技 jlmedaios - 放射科管理（M869 原地升级 M839 视图）
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
import { useRadiologyWorkloadM869Store } from '@/store/radiologyWorkloadM869Store';
import type { RadiologyWorkloadM869 } from '@/services/api/radiologyWorkloadM869';

const categoryColumns: ColumnsType<{ name: string; count: number; positive: number }> = [
  { title: '检查项目', dataIndex: 'name' },
  { title: '检查数', dataIndex: 'count', align: 'right' },
  { title: '阳性数', dataIndex: 'positive', align: 'right', render: (v: number) => <Tag color="red">{v}</Tag> },
];

const buildColumns = (setDetail: (r: RadiologyWorkloadM869) => void): ColumnsType<RadiologyWorkloadM869> => [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: 'DR 数', dataIndex: 'dr', width: 100, align: 'right', render: (v: number) => <Tag color="blue">{v}</Tag> },
  { title: 'CT 数', dataIndex: 'ct', width: 100, align: 'right', render: (v: number) => <Tag color="cyan">{v}</Tag> },
  { title: 'MRI 数', dataIndex: 'mri', width: 100, align: 'right', render: (v: number) => <Tag color="green">{v}</Tag> },
  { title: '造影数', dataIndex: 'contrast', width: 110, align: 'right', render: (v: number) => <Tag color="purple">{v}</Tag> },
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

export default function RadiologyManagementM869Page() {
  usePageTitle('放射科管理');
  const { items, loading, error, demo, load } = useRadiologyWorkloadM869Store();
  const [detail, setDetail] = useState<RadiologyWorkloadM869 | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="放射科管理"
      description="日期 / DR 数 / CT 数 / MRI 数 / 造影数 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`放射科工作（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1200 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="放射科工作详情"
        width={820}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="日期">{detail.date}</Descriptions.Item>
              <Descriptions.Item label="DR 数">{detail.dr}</Descriptions.Item>
              <Descriptions.Item label="CT 数">{detail.ct}</Descriptions.Item>
              <Descriptions.Item label="MRI 数">{detail.mri}</Descriptions.Item>
              <Descriptions.Item label="造影数">{detail.contrast}</Descriptions.Item>
              <Descriptions.Item label="状态">{detail.status}</Descriptions.Item>
              <Descriptions.Item label="急诊 CT 报告时间（30min）" span={2}>{detail.statCtTime}</Descriptions.Item>
              <Descriptions.Item label="检查阳性率" span={2}>{detail.positivity}</Descriptions.Item>
              <Descriptions.Item label="设备利用率（CT/MRI 开机率）" span={2}>{detail.utilization}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="检查项目分类（DR/CT/MRI/造影/介入）">
              <Table rowKey="name" dataSource={detail.categoryBreakdown} columns={categoryColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
