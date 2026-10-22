/**
 * 健澜科技 jlmedaios - 物资管理（M896）
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
import { useMaterialsWorkloadM896Store } from '@/store/materialsWorkloadM896Store';
import type { MaterialsWorkload } from '@/services/api/materialsWorkloadM896';

const moneyColumns: ColumnsType<{ name: string; amount: number }> = [
  { title: '物资分类', dataIndex: 'name' },
  { title: '库存金额(万)', dataIndex: 'amount', align: 'right' },
];

const buildColumns = (setDetail: (r: MaterialsWorkload) => void): ColumnsType<MaterialsWorkload> => [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '入库批次', dataIndex: 'inboundBatches', width: 110, align: 'right', render: (v: number) => <Tag color="green">{v}</Tag> },
  { title: '出库批次', dataIndex: 'outboundBatches', width: 110, align: 'right', render: (v: number) => <Tag color="blue">{v}</Tag> },
  { title: '库存金额(万)', dataIndex: 'inventoryAmount', width: 140, align: 'right', render: (v: number) => <Tag color="purple">{v}</Tag> },
  {
    title: '低库存物资数',
    dataIndex: 'lowStock',
    width: 140,
    align: 'right',
    render: (v: number) => <Tag color={v === 0 ? 'green' : 'orange'}>{v}</Tag>,
  },
  {
    title: '过期物资数',
    dataIndex: 'expired',
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

export default function MaterialsManagementM896Page() {
  usePageTitle('物资管理');
  const { items, loading, error, demo, load } = useMaterialsWorkloadM896Store();
  const [detail, setDetail] = useState<MaterialsWorkload | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="物资管理"
      description="日期 / 入库批次 / 出库批次 / 库存金额 / 低库存 / 过期 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`物资工作（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1500 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="物资工作详情"
        width={880}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="日期">{detail.date}</Descriptions.Item>
              <Descriptions.Item label="入库批次">{detail.inboundBatches}</Descriptions.Item>
              <Descriptions.Item label="出库批次">{detail.outboundBatches}</Descriptions.Item>
              <Descriptions.Item label="库存金额">{detail.inventoryAmount} 万</Descriptions.Item>
              <Descriptions.Item label="低库存物资数">{detail.lowStock}</Descriptions.Item>
              <Descriptions.Item label="过期物资数">{detail.expired}</Descriptions.Item>
              <Descriptions.Item label="状态">{detail.status}</Descriptions.Item>
              <Descriptions.Item label="库存周转率" span={2}>{detail.turnover}</Descriptions.Item>
              <Descriptions.Item label="低库存预警" span={2}>{detail.lowStockAlert}</Descriptions.Item>
              <Descriptions.Item label="高值耗材追溯（UDI）" span={2}>{detail.highValueTraceability}</Descriptions.Item>
              <Descriptions.Item label="供应商评价" span={2}>{detail.supplierEvaluation}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="物资分类（医用耗材/办公用品/被服/消毒）">
              <Table rowKey="name" dataSource={detail.categoryBreakdown} columns={moneyColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
