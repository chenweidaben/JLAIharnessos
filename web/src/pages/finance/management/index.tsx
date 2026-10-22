/**
 * 健澜科技 jlmedaios - 财务管理（M894）
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
import { useFinanceWorkloadM894Store } from '@/store/financeWorkloadM894Store';
import type { FinanceWorkload } from '@/services/api/financeWorkloadM894';

const moneyColumns: ColumnsType<{ name: string; amount: number }> = [
  { title: '项目', dataIndex: 'name' },
  { title: '金额(万元)', dataIndex: 'amount', align: 'right', render: (v: number) => v },
];

const buildColumns = (setDetail: (r: FinanceWorkload) => void): ColumnsType<FinanceWorkload> => [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '门诊收入(万)', dataIndex: 'outpatientRevenue', width: 140, align: 'right', render: (v: number) => <Tag color="green">{v}</Tag> },
  { title: '住院收入(万)', dataIndex: 'inpatientRevenue', width: 140, align: 'right', render: (v: number) => <Tag color="blue">{v}</Tag> },
  { title: '药品收入(万)', dataIndex: 'drugRevenue', width: 130, align: 'right', render: (v: number) => <Tag color="purple">{v}</Tag> },
  { title: '检查收入(万)', dataIndex: 'examRevenue', width: 130, align: 'right', render: (v: number) => <Tag color="cyan">{v}</Tag> },
  { title: '支出合计(万)', dataIndex: 'totalCost', width: 140, align: 'right', render: (v: number) => <Tag color="red">{v}</Tag> },
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

export default function FinanceManagementM894Page() {
  usePageTitle('财务管理');
  const { items, loading, error, demo, load } = useFinanceWorkloadM894Store();
  const [detail, setDetail] = useState<FinanceWorkload | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="财务管理"
      description="日期 / 门诊收入 / 住院收入 / 药品收入 / 检查收入 / 支出合计 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`财务工作（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1500 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="财务工作详情"
        width={900}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="日期">{detail.date}</Descriptions.Item>
              <Descriptions.Item label="门诊收入">{detail.outpatientRevenue} 万</Descriptions.Item>
              <Descriptions.Item label="住院收入">{detail.inpatientRevenue} 万</Descriptions.Item>
              <Descriptions.Item label="药品收入">{detail.drugRevenue} 万</Descriptions.Item>
              <Descriptions.Item label="检查收入">{detail.examRevenue} 万</Descriptions.Item>
              <Descriptions.Item label="支出合计">{detail.totalCost} 万</Descriptions.Item>
              <Descriptions.Item label="状态">{detail.status}</Descriptions.Item>
              <Descriptions.Item label="医保回款" span={2}>{detail.insuranceReimbursement}</Descriptions.Item>
              <Descriptions.Item label="预算执行率" span={2}>{detail.budgetExecution}</Descriptions.Item>
              <Descriptions.Item label="资产负债率" span={2}>{detail.debtRatio}</Descriptions.Item>
            </Descriptions>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Card size="small" title="收入结构（门诊/住院/药品/检查/治疗）">
                <Table rowKey="name" dataSource={detail.revenueBreakdown} columns={moneyColumns} size="small" pagination={false} />
              </Card>
              <Card size="small" title="成本控制（人力/耗材/折旧/后勤）">
                <Table rowKey="name" dataSource={detail.costBreakdown} columns={moneyColumns} size="small" pagination={false} />
              </Card>
            </div>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
