/**
 * 健澜科技 jlmedaios - 临床路径变异分析（M709）
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
import { usePathwayVariationM709Store } from '@/store/pathwayVariationM709Store';
import type { PathwayVariation } from '@/services/api/pathwayVariationM709';

const catColumns: ColumnsType<{ name: string; count: number }> = [
  { title: '变异分类', dataIndex: 'name' },
  { title: '例数', dataIndex: 'count', align: 'right' },
];

const rateOf = (r: Pick<PathwayVariation, 'variantCount' | 'totalCount'>): number =>
  r.totalCount === 0 ? 0 : Math.round((r.variantCount / r.totalCount) * 1000) / 10;

const rateColor = (r: number): string => (r <= 10 ? 'green' : r <= 20 ? 'blue' : r <= 30 ? 'orange' : 'red');

const buildColumns = (setDetail: (r: PathwayVariation) => void): ColumnsType<PathwayVariation> => [
  { title: '路径名称', dataIndex: 'pathwayName', ellipsis: true },
  { title: '变异例数', dataIndex: 'variantCount', width: 90, align: 'right' },
  {
    title: '变异率',
    width: 120,
    align: 'right',
    render: (_v, row) => {
      const r = rateOf(row);
      return <Tag color={rateColor(r)}>{r}%</Tag>;
    },
  },
  { title: '主要变异原因', dataIndex: 'mainReason', ellipsis: true },
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

export default function PathwayVariationM709Page() {
  usePageTitle('临床路径变异分析');
  const { items, loading, error, demo, load } = usePathwayVariationM709Store();
  const [detail, setDetail] = useState<PathwayVariation | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="临床路径变异分析"
      description="路径名称 / 变异病例数 / 变异率 / 主要变异原因"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`临床路径（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1000 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="路径变异详情"
        width={720}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="路径名称" span={2}>{detail.pathwayName}</Descriptions.Item>
              <Descriptions.Item label="变异例数">{detail.variantCount} / {detail.totalCount}</Descriptions.Item>
              <Descriptions.Item label="变异率">
                <Tag color={rateColor(rateOf(detail))}>{rateOf(detail)}%</Tag>
              </Descriptions.Item>
            </Descriptions>
            <Card size="small" title="变异分类统计" style={{ marginBottom: 16 }}>
              <Table rowKey="name" dataSource={detail.categories} columns={catColumns} size="small" pagination={false} />
            </Card>
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="变异原因分析">{detail.reasonAnalysis}</Descriptions.Item>
              <Descriptions.Item label="改进建议">{detail.suggestions}</Descriptions.Item>
            </Descriptions>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
