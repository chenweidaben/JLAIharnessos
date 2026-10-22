/**
 * 健澜科技 jlmedaios - 特殊药品管理（M717）
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
import { useSpecialDrugM717Store } from '@/store/specialDrugM717Store';
import {
  SPECIAL_CATEGORY_META,
  type SpecialDrugLedger,
} from '@/services/api/specialDrugM717';

const buildColumns = (setDetail: (r: SpecialDrugLedger) => void): ColumnsType<SpecialDrugLedger> => [
  { title: '药品名称', dataIndex: 'drugName', ellipsis: true },
  {
    title: '类别',
    dataIndex: 'category',
    width: 150,
    render: (v: SpecialDrugLedger['category']) => <Tag color={SPECIAL_CATEGORY_META[v].color}>{SPECIAL_CATEGORY_META[v].label}</Tag>,
  },
  { title: '批号', dataIndex: 'batchNo', width: 120 },
  { title: '库存数量', dataIndex: 'stockQty', width: 100, align: 'right' },
  { title: '效期', dataIndex: 'expiryDate', width: 120 },
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

export default function SpecialDrugM717Page() {
  usePageTitle('特殊药品管理');
  const { items, loading, error, demo, load } = useSpecialDrugM717Store();
  const [detail, setDetail] = useState<SpecialDrugLedger | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="特殊药品管理"
      description="药品名称 / 类别 / 批号 / 库存数量 / 效期"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`特殊药品台账（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1000 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="特殊药品详情"
        width={720}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="药品名称" span={2}>{detail.drugName}</Descriptions.Item>
              <Descriptions.Item label="类别">
                <Tag color={SPECIAL_CATEGORY_META[detail.category].color}>{SPECIAL_CATEGORY_META[detail.category].label}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="批号">{detail.batchNo}</Descriptions.Item>
              <Descriptions.Item label="库存数量">{detail.stockQty}</Descriptions.Item>
              <Descriptions.Item label="效期">{detail.expiryDate}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="逐日消耗记录" style={{ marginBottom: 16 }}>
              {detail.dailyConsumption.map((c) => <div key={c}>· {c}</div>)}
            </Card>
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="双人核对签字">{detail.doubleCheck}</Descriptions.Item>
              <Descriptions.Item label="空安瓿回收">{detail.vialRecycled}</Descriptions.Item>
            </Descriptions>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
