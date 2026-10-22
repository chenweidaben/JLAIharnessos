/**
 * 健澜科技 jlmedaios - DRG 分组管理（M768）
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
import { useDrgCaseM768Store } from '@/store/drgCaseM768Store';
import type { DrgCase } from '@/services/api/drgCaseM768';

const costColumns: ColumnsType<{ item: string; amount: number }> = [
  { title: '费用项目', dataIndex: 'item' },
  { title: '金额(元)', dataIndex: 'amount', align: 'right', render: (v: number) => v.toLocaleString() },
];

const buildColumns = (setDetail: (r: DrgCase) => void): ColumnsType<DrgCase> => [
  { title: '住院号', dataIndex: 'inpatientNo', width: 130 },
  { title: '患者姓名', dataIndex: 'patient', width: 110 },
  { title: '主要诊断', dataIndex: 'mainDiagnosis', width: 200, ellipsis: true },
  { title: 'DRG 组', dataIndex: 'drgGroup', width: 200, ellipsis: true },
  { title: '权重', dataIndex: 'weight', width: 90, align: 'right', render: (v: number) => v.toFixed(2) },
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

export default function DrgGroupingM768Page() {
  usePageTitle('DRG 分组管理');
  const { items, loading, error, demo, load } = useDrgCaseM768Store();
  const [detail, setDetail] = useState<DrgCase | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="DRG 分组管理"
      description="住院号 / 患者姓名 / 主要诊断 / DRG 组 / 权重 / 费用 / 盈亏"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`DRG 病例（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1300 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="DRG 病例详情"
        width={780}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="住院号">{detail.inpatientNo}</Descriptions.Item>
              <Descriptions.Item label="患者姓名">{detail.patient}</Descriptions.Item>
              <Descriptions.Item label="主要诊断" span={2}>{detail.mainDiagnosis}</Descriptions.Item>
              <Descriptions.Item label="DRG 组" span={2}>{detail.drgGroup}</Descriptions.Item>
              <Descriptions.Item label="权重">{detail.weight.toFixed(2)}</Descriptions.Item>
              <Descriptions.Item label="总费用">¥{detail.cost.toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label="诊断列表" span={2}>{detail.diagnoses.join('；')}</Descriptions.Item>
              <Descriptions.Item label="手术操作" span={2}>{detail.procedures.join('；')}</Descriptions.Item>
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
