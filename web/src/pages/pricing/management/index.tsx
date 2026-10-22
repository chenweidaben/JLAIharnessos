/**
 * 健澜科技 jlmedaios - 物价管理（M905）
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
import { usePricingWorkloadM905Store } from '@/store/pricingWorkloadM905Store';
import type { PricingWorkload } from '@/services/api/pricingWorkloadM905';

const serviceColumns: ColumnsType<{ name: string; count: number }> = [
  { title: '项目分类', dataIndex: 'name' },
  { title: '项目数', dataIndex: 'count', align: 'right' },
];

const buildColumns = (setDetail: (r: PricingWorkload) => void): ColumnsType<PricingWorkload> => [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '医疗服务项目数', dataIndex: 'serviceItems', width: 150, align: 'right', render: (v: number) => <Tag color="blue">{v}</Tag> },
  { title: '药品价格数', dataIndex: 'drugPrices', width: 130, align: 'right', render: (v: number) => <Tag color="green">{v}</Tag> },
  { title: '耗材价格数', dataIndex: 'consumablePrices', width: 130, align: 'right', render: (v: number) => <Tag color="cyan">{v}</Tag> },
  { title: '价格调整次数', dataIndex: 'adjustments', width: 130, align: 'right', render: (v: number) => <Tag color="orange">{v}</Tag> },
  {
    title: '违规收费数',
    dataIndex: 'violations',
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

export default function PricingManagementM905Page() {
  usePageTitle('物价管理');
  const { items, loading, error, demo, load } = usePricingWorkloadM905Store();
  const [detail, setDetail] = useState<PricingWorkload | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="物价管理"
      description="日期 / 医疗服务 / 药品 / 耗材 / 价格调整 / 违规收费 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`物价工作（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1500 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="物价工作详情"
        width={900}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="日期">{detail.date}</Descriptions.Item>
              <Descriptions.Item label="医疗服务项目数">{detail.serviceItems}</Descriptions.Item>
              <Descriptions.Item label="药品价格数">{detail.drugPrices}</Descriptions.Item>
              <Descriptions.Item label="耗材价格数">{detail.consumablePrices}</Descriptions.Item>
              <Descriptions.Item label="价格调整次数">{detail.adjustments}</Descriptions.Item>
              <Descriptions.Item label="违规收费数">{detail.violations}</Descriptions.Item>
              <Descriptions.Item label="状态">{detail.status}</Descriptions.Item>
              <Descriptions.Item label="药品价格目录" span={2}>{detail.drugCatalog}</Descriptions.Item>
              <Descriptions.Item label="耗材价格目录" span={2}>{detail.consumableCatalog}</Descriptions.Item>
              <Descriptions.Item label="价格调整记录" span={2}>{detail.adjustmentRecords}</Descriptions.Item>
              <Descriptions.Item label="违规收费整改" span={2}>{detail.violationRectification}</Descriptions.Item>
              <Descriptions.Item label="物价公示" span={2}>{detail.publicity}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="医疗服务项目分类（综合/检查/治疗/手术）">
              <Table rowKey="name" dataSource={detail.serviceBreakdown} columns={serviceColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
