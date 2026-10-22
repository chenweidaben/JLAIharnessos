/**
 * 健澜科技 jlmedaios - 医保费用审核（M725）
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
import { useCostAuditM725Store } from '@/store/costAuditM725Store';
import {
  AUDIT_STATUS_META,
  type CostAudit,
} from '@/services/api/costAuditM725';

const buildColumns = (setDetail: (r: CostAudit) => void): ColumnsType<CostAudit> => [
  { title: '审核单号', dataIndex: 'auditNo', width: 150 },
  { title: '患者', dataIndex: 'patientId', width: 100 },
  { title: '费用总额', dataIndex: 'totalFee', width: 120, align: 'right', render: (v: number) => `¥${v.toLocaleString()}` },
  {
    title: '违规金额',
    dataIndex: 'violationAmount',
    width: 120,
    align: 'right',
    render: (v: number) => (v ? <Tag color="red">¥{v.toLocaleString()}</Tag> : <Tag color="green">0</Tag>),
  },
  {
    title: '审核状态',
    dataIndex: 'status',
    width: 120,
    render: (v: CostAudit['status']) => <Tag color={AUDIT_STATUS_META[v].color}>{AUDIT_STATUS_META[v].label}</Tag>,
  },
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

export default function CostAuditM725Page() {
  usePageTitle('医保费用审核');
  const { items, loading, error, demo, load } = useCostAuditM725Store();
  const [detail, setDetail] = useState<CostAudit | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="医保费用审核"
      description="审核单号 / 患者 / 费用总额 / 违规金额 / 审核状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`医保审核（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1000 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="医保费用审核详情"
        width={720}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="审核单号">{detail.auditNo}</Descriptions.Item>
            <Descriptions.Item label="患者 ID">{detail.patientId}</Descriptions.Item>
            <Descriptions.Item label="费用总额">¥{detail.totalFee.toLocaleString()}</Descriptions.Item>
            <Descriptions.Item label="违规金额">
              {detail.violationAmount ? `¥${detail.violationAmount.toLocaleString()}` : '0'}
            </Descriptions.Item>
            <Descriptions.Item label="违规项目清单">
              {detail.violations.length
                ? detail.violations.map((v) => <Tag key={v} color="red" style={{ marginBottom: 4 }}>{v}</Tag>)
                : <span style={{ color: '#3f8600' }}>无违规</span>}
            </Descriptions.Item>
            <Descriptions.Item label="审核意见">{detail.opinion}</Descriptions.Item>
            <Descriptions.Item label="整改要求">{detail.rectification}</Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={AUDIT_STATUS_META[detail.status].color}>{AUDIT_STATUS_META[detail.status].label}</Tag>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </PageContainer>
  );
}
