/**
 * 健澜科技 jlmedaios - 检验科管理（M803）
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
import { useLabWorkloadM803Store } from '@/store/labWorkloadM803Store';
import type { LabWorkload } from '@/services/api/labWorkloadM803';

const itemColumns: ColumnsType<{ item: string; count: number }> = [
  { title: '检验项目', dataIndex: 'item' },
  { title: '数量', dataIndex: 'count', align: 'right' },
];

const reasonColumns: ColumnsType<{ reason: string; count: number }> = [
  { title: '不合格原因', dataIndex: 'reason' },
  { title: '数量', dataIndex: 'count', align: 'right' },
];

const buildColumns = (setDetail: (r: LabWorkload) => void): ColumnsType<LabWorkload> => [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '科室', dataIndex: 'section', width: 140 },
  { title: '标本数', dataIndex: 'specimens', width: 100, align: 'right' },
  { title: '合格数', dataIndex: 'qualified', width: 100, align: 'right', render: (v: number) => <Tag color="green">{v}</Tag> },
  {
    title: '不合格数',
    dataIndex: 'unqualified',
    width: 110,
    align: 'right',
    render: (v: number) => <Tag color={v > 0 ? 'red' : 'default'}>{v}</Tag>,
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

export default function LabManagementM803Page() {
  usePageTitle('检验科管理');
  const { items, loading, error, demo, load } = useLabWorkloadM803Store();
  const [detail, setDetail] = useState<LabWorkload | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="检验科管理"
      description="日期 / 科室 / 标本数 / 合格数 / 不合格数 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`检验工作（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1100 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="检验工作详情"
        width={820}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="日期">{detail.date}</Descriptions.Item>
              <Descriptions.Item label="科室">{detail.section}</Descriptions.Item>
              <Descriptions.Item label="标本数">{detail.specimens}</Descriptions.Item>
              <Descriptions.Item label="合格数">{detail.qualified}</Descriptions.Item>
              <Descriptions.Item label="不合格数">{detail.unqualified}</Descriptions.Item>
              <Descriptions.Item label="状态">{detail.status}</Descriptions.Item>
              <Descriptions.Item label="质控记录" span={2}>{detail.qcRecords}</Descriptions.Item>
              <Descriptions.Item label="设备运行状态" span={2}>{detail.equipment}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="检验项目分解" style={{ marginBottom: 16 }}>
              <Table rowKey="item" dataSource={detail.itemsBreakdown} columns={itemColumns} size="small" pagination={false} />
            </Card>
            <Card size="small" title="不合格原因">
              <Table rowKey="reason" dataSource={detail.unqualifiedReasons} columns={reasonColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
