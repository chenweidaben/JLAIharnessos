/**
 * 健澜科技 jlmedaios - 医保谈判药品管理（M772）
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
import { useNegotiatedDrugM772Store } from '@/store/negotiatedDrugM772Store';
import {
  NEG_DRUG_STATUS_META,
  type NegotiatedDrug,
} from '@/services/api/negotiatedDrugM772';

const rxColumns: ColumnsType<{ date: string; patient: string; dept: string; qty: number }> = [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '患者', dataIndex: 'patient', width: 110 },
  { title: '科室', dataIndex: 'dept', width: 140 },
  { title: '数量', dataIndex: 'qty', align: 'right' },
];

const buildColumns = (setDetail: (r: NegotiatedDrug) => void): ColumnsType<NegotiatedDrug> => [
  { title: '药品编码', dataIndex: 'code', width: 110 },
  { title: '药品名称', dataIndex: 'name', ellipsis: true },
  { title: '谈判价格', dataIndex: 'price', width: 120, align: 'right', render: (v: number) => `¥${v.toLocaleString()}` },
  { title: '限定支付范围', dataIndex: 'paymentScope', width: 240, ellipsis: true },
  {
    title: '状态',
    dataIndex: 'status',
    width: 100,
    render: (v: NegotiatedDrug['status']) => <Tag color={NEG_DRUG_STATUS_META[v].color}>{NEG_DRUG_STATUS_META[v].label}</Tag>,
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

export default function NegotiatedDrugsM772Page() {
  usePageTitle('医保谈判药品管理');
  const { items, loading, error, demo, load } = useNegotiatedDrugM772Store();
  const [detail, setDetail] = useState<NegotiatedDrug | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="医保谈判药品管理"
      description="药品编码 / 药品名称 / 谈判价格 / 限定支付范围 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`谈判药品（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1200 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="谈判药品详情"
        width={780}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="药品编码">{detail.code}</Descriptions.Item>
              <Descriptions.Item label="谈判价格">¥{detail.price.toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label="药品名称" span={2}>{detail.name}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={NEG_DRUG_STATUS_META[detail.status].color}>{NEG_DRUG_STATUS_META[detail.status].label}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="报销比例">{detail.reimbursementRatio}</Descriptions.Item>
              <Descriptions.Item label="适应症" span={2}>{detail.indications}</Descriptions.Item>
              <Descriptions.Item label="限定支付范围" span={2}>{detail.paymentScope}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="处方记录">
              <Table rowKey="date" dataSource={detail.prescriptions} columns={rxColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
