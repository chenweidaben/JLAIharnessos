/**
 * 健澜科技 jlmedaios - 医疗服务价格管理（M727）
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
import { useServicePriceItemM727Store } from '@/store/servicePriceItemM727Store';
import {
  PRICE_STATUS_META,
  type ServicePriceItem,
} from '@/services/api/servicePriceItemM727';

const historyColumns: ColumnsType<{ date: string; price: string }> = [
  { title: '生效日期', dataIndex: 'date' },
  { title: '价格', dataIndex: 'price' },
];

const insuranceColor = (c: string): string =>
  c === '甲类' ? 'green' : c === '乙类' ? 'blue' : 'orange';

const buildColumns = (setDetail: (r: ServicePriceItem) => void): ColumnsType<ServicePriceItem> => [
  { title: '项目编码', dataIndex: 'code', width: 140 },
  { title: '项目名称', dataIndex: 'name', ellipsis: true },
  { title: '价格', dataIndex: 'price', width: 110, align: 'right', render: (v: number) => `¥${v.toFixed(2)}` },
  { title: '计价单位', dataIndex: 'unit', width: 100 },
  {
    title: '医保类别',
    dataIndex: 'insuranceCategory',
    width: 110,
    render: (v: ServicePriceItem['insuranceCategory']) => <Tag color={insuranceColor(v)}>{v}</Tag>,
  },
  {
    title: '状态',
    dataIndex: 'status',
    width: 110,
    render: (v: ServicePriceItem['status']) => <Tag color={PRICE_STATUS_META[v].color}>{PRICE_STATUS_META[v].label}</Tag>,
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

export default function ServicePriceItemM727Page() {
  usePageTitle('医疗服务价格管理');
  const { items, loading, error, demo, load } = useServicePriceItemM727Store();
  const [detail, setDetail] = useState<ServicePriceItem | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="医疗服务价格管理"
      description="项目编码 / 项目名称 / 价格 / 计价单位 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`收费项目（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1100 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="收费项目详情"
        width={680}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="项目编码">{detail.code}</Descriptions.Item>
              <Descriptions.Item label="项目名称" span={2}>{detail.name}</Descriptions.Item>
              <Descriptions.Item label="现行价格">¥{detail.price.toFixed(2)} / {detail.unit}</Descriptions.Item>
              <Descriptions.Item label="医保类别">
                <Tag color={insuranceColor(detail.insuranceCategory)}>{detail.insuranceCategory}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="项目说明" span={2}>{detail.description}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="价格历史">
              <Table rowKey="date" dataSource={detail.priceHistory} columns={historyColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
