/**
 * 健澜科技 jlmedaios - 合同管理（M906）
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
import { useContractWorkloadM906Store } from '@/store/contractWorkloadM906Store';
import type { ContractWorkload } from '@/services/api/contractWorkloadM906';

const categoryColumns: ColumnsType<{ name: string; count: number }> = [
  { title: '合同分类', dataIndex: 'name' },
  { title: '份数', dataIndex: 'count', align: 'right' },
];

const buildColumns = (setDetail: (r: ContractWorkload) => void): ColumnsType<ContractWorkload> => [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '新签合同数', dataIndex: 'newlySigned', width: 130, align: 'right', render: (v: number) => <Tag color="green">{v}</Tag> },
  { title: '履行中合同数', dataIndex: 'inExecution', width: 140, align: 'right', render: (v: number) => <Tag color="blue">{v}</Tag> },
  { title: '到期合同数', dataIndex: 'expiring', width: 130, align: 'right', render: (v: number) => <Tag color="orange">{v}</Tag> },
  { title: '合同总金额(万)', dataIndex: 'totalAmount', width: 150, align: 'right', render: (v: number) => <Tag color="purple">{v}</Tag> },
  {
    title: '纠纷合同数',
    dataIndex: 'disputes',
    width: 130,
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

export default function ContractManagementM906Page() {
  usePageTitle('合同管理');
  const { items, loading, error, demo, load } = useContractWorkloadM906Store();
  const [detail, setDetail] = useState<ContractWorkload | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="合同管理"
      description="日期 / 新签 / 履行中 / 到期 / 合同金额 / 纠纷 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`合同工作（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1500 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="合同工作详情"
        width={900}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="日期">{detail.date}</Descriptions.Item>
              <Descriptions.Item label="新签合同数">{detail.newlySigned}</Descriptions.Item>
              <Descriptions.Item label="履行中合同数">{detail.inExecution}</Descriptions.Item>
              <Descriptions.Item label="到期合同数">{detail.expiring}</Descriptions.Item>
              <Descriptions.Item label="合同总金额">{detail.totalAmount} 万</Descriptions.Item>
              <Descriptions.Item label="纠纷合同数">{detail.disputes}</Descriptions.Item>
              <Descriptions.Item label="状态">{detail.status}</Descriptions.Item>
              <Descriptions.Item label="合同金额分布" span={2}>{detail.amountDistribution}</Descriptions.Item>
              <Descriptions.Item label="合同履行进度" span={2}>{detail.executionProgress}</Descriptions.Item>
              <Descriptions.Item label="合同到期提醒" span={2}>{detail.expiryReminder}</Descriptions.Item>
              <Descriptions.Item label="合同纠纷处理" span={2}>{detail.disputeHandling}</Descriptions.Item>
              <Descriptions.Item label="合同审批流程" span={2}>{detail.approvalFlow}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="合同分类（采购/服务/工程/合作）">
              <Table rowKey="name" dataSource={detail.categoryBreakdown} columns={categoryColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
