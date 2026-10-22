/**
 * 健澜科技 jlmedaios - DIP 分组管理（M769）
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
import { useDipCaseM769Store } from '@/store/dipCaseM769Store';
import type { DipCase } from '@/services/api/dipCaseM769';

const costColumns: ColumnsType<{ item: string; amount: number }> = [
  { title: '费用项目', dataIndex: 'item' },
  { title: '金额(元)', dataIndex: 'amount', align: 'right', render: (v: number) => v.toLocaleString() },
];

const buildColumns = (setDetail: (r: DipCase) => void): ColumnsType<DipCase> => [
  { title: '住院号', dataIndex: 'inpatientNo', width: 130 },
  { title: '患者姓名', dataIndex: 'patient', width: 110 },
  { title: '主病种', dataIndex: 'mainDisease', width: 200, ellipsis: true },
  { title: '病种分值', dataIndex: 'score', width: 100, align: 'right' },
  { title: '费用', dataIndex: 'cost', width: 110, align: 'right', render: (v: number) => `¥${v.toLocaleString()}` },
  {
    title: '盈亏',
    dataIndex: 'profit',
    width: 110,
    align: 'right',
    render: (v: number) => (
      <Tag color={v >= 0 ? 'green' : 'red'}>{v >= 0 ? `+${v}` : v}</Tag>
    ),
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

export default function DipGroupingM769Page() {
  usePageTitle('DIP 分组管理');
  const { items, loading, error, demo, load } = useDipCaseM769Store();
  const [detail, setDetail] = useState<DipCase | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="DIP 分组管理"
      description="住院号 / 患者姓名 / 主病种 / 病种分值 / 费用 / 盈亏"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`DIP 病例（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1200 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="DIP 病例详情"
        width={780}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="住院号">{detail.inpatientNo}</Descriptions.Item>
              <Descriptions.Item label="患者姓名">{detail.patient}</Descriptions.Item>
              <Descriptions.Item label="主病种" span={2}>{detail.mainDisease}</Descriptions.Item>
              <Descriptions.Item label="病种分值">{detail.score}</Descriptions.Item>
              <Descriptions.Item label="治疗方式">{detail.treatment}</Descriptions.Item>
              <Descriptions.Item label="病种列表" span={2}>{detail.diseases.join('；')}</Descriptions.Item>
              <Descriptions.Item label="分组过程" span={2}>{detail.groupingProcess}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="费用明细">
              <Table rowKey="item" dataSource={detail.costBreakdown} columns={costColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
