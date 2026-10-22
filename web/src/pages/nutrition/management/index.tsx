/**
 * 健澜科技 jlmedaios - 营养科管理（M880 原地升级 M833 视图）
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
import { useNutritionWorkloadM880Store } from '@/store/nutritionWorkloadM880Store';
import type { NutritionWorkloadM880 } from '@/services/api/nutritionWorkloadM880';

const simpleColumns: ColumnsType<{ name: string; count: number }> = [
  { title: '项目', dataIndex: 'name' },
  { title: '数量', dataIndex: 'count', align: 'right' },
];

const buildColumns = (setDetail: (r: NutritionWorkloadM880) => void): ColumnsType<NutritionWorkloadM880> => [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '营养会诊数', dataIndex: 'consultations', width: 130, align: 'right', render: (v: number) => <Tag color="blue">{v}</Tag> },
  { title: '肠内营养数', dataIndex: 'enteral', width: 120, align: 'right', render: (v: number) => <Tag color="green">{v}</Tag> },
  { title: '肠外营养数', dataIndex: 'parenteral', width: 120, align: 'right', render: (v: number) => <Tag color="purple">{v}</Tag> },
  { title: '营养筛查数', dataIndex: 'screening', width: 120, align: 'right', render: (v: number) => <Tag color="cyan">{v}</Tag> },
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

export default function NutritionManagementM880Page() {
  usePageTitle('营养科管理');
  const { items, loading, error, demo, load } = useNutritionWorkloadM880Store();
  const [detail, setDetail] = useState<NutritionWorkloadM880 | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="营养科管理"
      description="日期 / 营养会诊数 / 肠内营养数 / 肠外营养数 / 营养筛查数 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`营养科工作（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1300 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="营养科工作详情"
        width={900}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="日期">{detail.date}</Descriptions.Item>
              <Descriptions.Item label="营养会诊数">{detail.consultations}</Descriptions.Item>
              <Descriptions.Item label="肠内营养数">{detail.enteral}</Descriptions.Item>
              <Descriptions.Item label="肠外营养数">{detail.parenteral}</Descriptions.Item>
              <Descriptions.Item label="营养筛查数">{detail.screening}</Descriptions.Item>
              <Descriptions.Item label="状态">{detail.status}</Descriptions.Item>
              <Descriptions.Item label="营养风险筛查（NRS2002）" span={2}>{detail.nrs}</Descriptions.Item>
              <Descriptions.Item label="肠外营养（TPN）" span={2}>{detail.tpn}</Descriptions.Item>
              <Descriptions.Item label="饮食医嘱" span={2}>{detail.dietOrders}</Descriptions.Item>
            </Descriptions>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Card size="small" title="会诊记录（ICU/肿瘤/糖尿病肾病）">
                <Table rowKey="name" dataSource={detail.consultBreakdown} columns={simpleColumns} size="small" pagination={false} />
              </Card>
              <Card size="small" title="肠内营养配方（瑞素/瑞能/百普力）">
                <Table rowKey="name" dataSource={detail.enteralFormulas} columns={simpleColumns} size="small" pagination={false} />
              </Card>
            </div>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
