/**
 * 健澜科技 jlmedaios - 护理质量指标监测（M707）
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
import { useNursingIndicatorM707Store } from '@/store/nursingIndicatorM707Store';
import {
  INDICATOR_STATUS_META,
  type NursingIndicator,
} from '@/services/api/nursingIndicatorM707';

const trendColumns: ColumnsType<{ month: string; value: number }> = [
  { title: '月份', dataIndex: 'month' },
  { title: '实际值（‰）', dataIndex: 'value', align: 'right' },
];

const buildColumns = (setDetail: (r: NursingIndicator) => void): ColumnsType<NursingIndicator> => [
  { title: '指标名称', dataIndex: 'name', width: 180 },
  { title: '统计周期', dataIndex: 'period', width: 110 },
  { title: '目标值', dataIndex: 'target', width: 110, align: 'right' },
  { title: '实际值', dataIndex: 'actual', width: 110, align: 'right' },
  {
    title: '达标状态',
    dataIndex: 'status',
    width: 110,
    render: (v: NursingIndicator['status']) => <Tag color={INDICATOR_STATUS_META[v].color}>{INDICATOR_STATUS_META[v].label}</Tag>,
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

export default function NursingIndicatorM707Page() {
  usePageTitle('护理质量指标监测');
  const { items, loading, error, demo, load } = useNursingIndicatorM707Store();
  const [detail, setDetail] = useState<NursingIndicator | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="护理质量指标监测"
      description="指标名称 / 统计周期 / 目标值 / 实际值 / 达标状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`护理质量指标（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="护理质量指标详情"
        width={720}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="指标名称">{detail.name}</Descriptions.Item>
              <Descriptions.Item label="统计周期">{detail.period}</Descriptions.Item>
              <Descriptions.Item label="目标值">{detail.target}</Descriptions.Item>
              <Descriptions.Item label="实际值">{detail.actual}</Descriptions.Item>
              <Descriptions.Item label="定义" span={2}>{detail.definition}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="近三月趋势" style={{ marginBottom: 16 }}>
              <Table rowKey="month" dataSource={detail.trend} columns={trendColumns} size="small" pagination={false} />
            </Card>
            <Card size="small" title="未达标原因分析">{detail.reason || '—'}</Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
