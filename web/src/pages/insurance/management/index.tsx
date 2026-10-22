/**
 * 健澜科技 jlmedaios - 医保管理（M904）
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
import { useInsuranceWorkloadM904Store } from '@/store/insuranceWorkloadM904Store';
import type { InsuranceWorkload } from '@/services/api/insuranceWorkloadM904';

const typeColumns: ColumnsType<{ name: string; count: number }> = [
  { title: '医保类型', dataIndex: 'name' },
  { title: '出院数', dataIndex: 'count', align: 'right' },
];

const buildColumns = (setDetail: (r: InsuranceWorkload) => void): ColumnsType<InsuranceWorkload> => [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '医保出院人数', dataIndex: 'discharges', width: 140, align: 'right', render: (v: number) => <Tag color="blue">{v}</Tag> },
  { title: '医保收入总额(万)', dataIndex: 'income', width: 150, align: 'right', render: (v: number) => <Tag color="green">{v}</Tag> },
  {
    title: '自费比例(%)',
    dataIndex: 'selfPayRatio',
    width: 130,
    align: 'right',
    render: (v: number) => <Tag color={v <= 20 ? 'green' : 'orange'}>{v}%</Tag>,
  },
  { title: 'DRG 付费金额(万)', dataIndex: 'drgPayment', width: 170, align: 'right', render: (v: number) => <Tag color="purple">{v}</Tag> },
  {
    title: '医保拒付金额(万)',
    dataIndex: 'rejection',
    width: 170,
    align: 'right',
    render: (v: number) => <Tag color={v === 0 ? 'green' : 'red'}>{v}</Tag>,
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

export default function InsuranceManagementM904Page() {
  usePageTitle('医保管理');
  const { items, loading, error, demo, load } = useInsuranceWorkloadM904Store();
  const [detail, setDetail] = useState<InsuranceWorkload | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="医保管理"
      description="日期 / 医保出院 / 医保收入 / 自费比例 / DRG 付费 / 拒付 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`医保工作（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1700 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="医保工作详情"
        width={900}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="日期">{detail.date}</Descriptions.Item>
              <Descriptions.Item label="医保出院人数">{detail.discharges}</Descriptions.Item>
              <Descriptions.Item label="医保收入总额">{detail.income} 万</Descriptions.Item>
              <Descriptions.Item label="自费比例">{detail.selfPayRatio}%</Descriptions.Item>
              <Descriptions.Item label="DRG 付费金额">{detail.drgPayment} 万</Descriptions.Item>
              <Descriptions.Item label="医保拒付金额">{detail.rejection} 万</Descriptions.Item>
              <Descriptions.Item label="状态">{detail.status}</Descriptions.Item>
              <Descriptions.Item label="DRG 付费结果" span={2}>{detail.drgResult}</Descriptions.Item>
              <Descriptions.Item label="医保拒付原因" span={2}>{detail.rejectionReasons}</Descriptions.Item>
              <Descriptions.Item label="自费比例分析" span={2}>{detail.selfPayAnalysis}</Descriptions.Item>
              <Descriptions.Item label="医保政策执行" span={2}>{detail.policyExecution}</Descriptions.Item>
              <Descriptions.Item label="医保结算记录" span={2}>{detail.settlementRecords}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="医保类型（职工/居民/异地/商保）">
              <Table rowKey="name" dataSource={detail.typeBreakdown} columns={typeColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
