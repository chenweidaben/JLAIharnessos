/**
 * 健澜科技 jlmedaios - 审计管理（M907）
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
import { useAuditWorkloadM907Store } from '@/store/auditWorkloadM907Store';
import type { AuditWorkload } from '@/services/api/auditWorkloadM907';

const typeColumns: ColumnsType<{ name: string; count: number }> = [
  { title: '审计类型', dataIndex: 'name' },
  { title: '次数', dataIndex: 'count', align: 'right' },
];

const buildColumns = (setDetail: (r: AuditWorkload) => void): ColumnsType<AuditWorkload> => [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '内部审计次数', dataIndex: 'internalAudits', width: 140, align: 'right', render: (v: number) => <Tag color="blue">{v}</Tag> },
  { title: '外部审计次数', dataIndex: 'externalAudits', width: 140, align: 'right', render: (v: number) => <Tag color="cyan">{v}</Tag> },
  { title: '整改问题数', dataIndex: 'issues', width: 130, align: 'right', render: (v: number) => <Tag color="orange">{v}</Tag> },
  {
    title: '整改完成数',
    dataIndex: 'rectified',
    width: 130,
    align: 'right',
    render: (v: number, r) => <Tag color={v / r.issues >= 0.8 ? 'green' : 'orange'}>{v}</Tag>,
  },
  { title: '审计金额(万)', dataIndex: 'auditAmount', width: 140, align: 'right', render: (v: number) => <Tag color="purple">{v}</Tag> },
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

export default function AuditManagementM907Page() {
  usePageTitle('审计管理');
  const { items, loading, error, demo, load } = useAuditWorkloadM907Store();
  const [detail, setDetail] = useState<AuditWorkload | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="审计管理"
      description="日期 / 内部审计 / 外部审计 / 问题 / 整改完成 / 审计金额 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`审计工作（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1500 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="审计工作详情"
        width={900}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="日期">{detail.date}</Descriptions.Item>
              <Descriptions.Item label="内部审计次数">{detail.internalAudits}</Descriptions.Item>
              <Descriptions.Item label="外部审计次数">{detail.externalAudits}</Descriptions.Item>
              <Descriptions.Item label="整改问题数">{detail.issues}</Descriptions.Item>
              <Descriptions.Item label="整改完成数">{detail.rectified}</Descriptions.Item>
              <Descriptions.Item label="审计金额">{detail.auditAmount} 万</Descriptions.Item>
              <Descriptions.Item label="状态">{detail.status}</Descriptions.Item>
              <Descriptions.Item label="审计发现问题" span={2}>{detail.findings}</Descriptions.Item>
              <Descriptions.Item label="整改落实情况" span={2}>{detail.rectification}</Descriptions.Item>
              <Descriptions.Item label="外部审计配合" span={2}>{detail.externalCoordination}</Descriptions.Item>
              <Descriptions.Item label="审计报告管理" span={2}>{detail.reportManagement}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="审计类型（财务/经济责任/工程/专项）">
              <Table rowKey="name" dataSource={detail.typeBreakdown} columns={typeColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
