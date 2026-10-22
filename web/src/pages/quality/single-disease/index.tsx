/**
 * 健澜科技 jlmedaios - 单病种质量管理（M708）
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
import { useSingleDiseaseM708Store } from '@/store/singleDiseaseM708Store';
import type { SingleDisease } from '@/services/api/singleDiseaseM708';

const devColumns: ColumnsType<{ inpatientNo: string; reason: string }> = [
  { title: '住院号', dataIndex: 'inpatientNo', width: 140 },
  { title: '偏差原因', dataIndex: 'reason' },
];

const rateColor = (r: number): string =>
  r >= 95 ? 'green' : r >= 85 ? 'blue' : r >= 75 ? 'orange' : 'red';

const buildColumns = (setDetail: (r: SingleDisease) => void): ColumnsType<SingleDisease> => [
  { title: '病种名称', dataIndex: 'name', ellipsis: true },
  { title: '病例数', dataIndex: 'caseCount', width: 90, align: 'right' },
  { title: '平均住院日', dataIndex: 'avgLosDays', width: 110, align: 'right', render: (v: number) => `${v} 天` },
  { title: '次均费用', dataIndex: 'avgCost', width: 120, align: 'right', render: (v: number) => `¥${v.toLocaleString()}` },
  {
    title: '达标率',
    dataIndex: 'complianceRate',
    width: 130,
    align: 'right',
    render: (v: number) => <Tag color={rateColor(v)}>{v}%</Tag>,
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

export default function SingleDiseaseM708Page() {
  usePageTitle('单病种质量管理');
  const { items, loading, error, demo, load } = useSingleDiseaseM708Store();
  const [detail, setDetail] = useState<SingleDisease | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="单病种质量管理"
      description="病种名称 / 病例数 / 平均住院日 / 次均费用 / 达标率"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`单病种（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1000 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="单病种详情"
        width={720}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="病种名称" span={2}>{detail.name}</Descriptions.Item>
              <Descriptions.Item label="病例数">{detail.caseCount}</Descriptions.Item>
              <Descriptions.Item label="平均住院日">{detail.avgLosDays} 天</Descriptions.Item>
              <Descriptions.Item label="次均费用">¥{detail.avgCost.toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label="达标率">
                <Tag color={rateColor(detail.complianceRate)}>{detail.complianceRate}%</Tag>
              </Descriptions.Item>
            </Descriptions>
            <Card size="small" title={`偏差病例（${detail.deviations.length}）`}>
              <Table rowKey="inpatientNo" dataSource={detail.deviations} columns={devColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
