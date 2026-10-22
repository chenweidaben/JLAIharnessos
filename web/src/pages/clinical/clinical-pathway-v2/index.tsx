/**
 * 健澜科技 jlmedaios - 临床路径管理（M667，配套 M562）
 *
 * 三甲流程：路径 Table（路径名/入径人数/变异率）+ 详情 Modal。
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
  Progress,
  Space,
  Spin,
  Steps,
  Table,
  Tag,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';

import { PageContainer } from '@/components/common';
import DemoModeBanner from '@/components/common/DemoModeBanner';
import { usePageTitle } from '@/hooks';
import { useClinicalPathwayV2M667Store } from '@/store/clinicalPathwayV2M667Store';
import type { ClinicalPathway } from '@/services/api/clinicalPathwayV2M667';

const buildColumns = (setDetail: (row: ClinicalPathway) => void): ColumnsType<ClinicalPathway> => [
  { title: '路径编码', dataIndex: 'code', width: 160 },
  { title: '路径名称', dataIndex: 'name', ellipsis: true },
  { title: '对应疾病', dataIndex: 'disease', width: 240, ellipsis: true },
  { title: '平均住院日', dataIndex: 'avgLengthOfStay', width: 110, align: 'right', render: (v: number) => `${v} 天` },
  { title: '入径人数', dataIndex: 'enrolledCount', width: 100, align: 'right' },
  { title: '完成人数', dataIndex: 'completedCount', width: 100, align: 'right' },
  {
    title: '变异率',
    dataIndex: 'deviationRatePct',
    width: 180,
    sorter: (a, b) => a.deviationRatePct - b.deviationRatePct,
    render: (v: number) => (
      <Progress
        percent={v}
        size="small"
        strokeColor={v < 5 ? '#3f8600' : v < 15 ? '#faad14' : '#cf1322'}
      />
    ),
  },
  {
    title: '操作',
    dataIndex: 'id',
    width: 90,
    render: (_v, row) => (
      <Button type="link" size="small" onClick={() => setDetail(row)}>
        详情
      </Button>
    ),
  },
];

export default function ClinicalPathwayV2M667Page() {
  usePageTitle('临床路径管理');

  const { items, loading, error, demo, load } = useClinicalPathwayV2M667Store();

  const [detail, setDetail] = useState<ClinicalPathway | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="临床路径管理（v2）"
      description="路径名称 / 入径人数 / 变异率"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`临床路径（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1100 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="临床路径详情"
        width={720}
        footer={
          <Space>
            <Button onClick={() => setDetail(null)}>关闭</Button>
          </Space>
        }
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={1} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="路径编码">{detail.code}</Descriptions.Item>
              <Descriptions.Item label="路径名称">{detail.name}</Descriptions.Item>
              <Descriptions.Item label="对应疾病">{detail.disease}</Descriptions.Item>
              <Descriptions.Item label="平均住院日">{detail.avgLengthOfStay} 天</Descriptions.Item>
              <Descriptions.Item label="入径 / 完成">
                {detail.completedCount} / {detail.enrolledCount}
              </Descriptions.Item>
              <Descriptions.Item label="变异率">{detail.deviationRatePct}%</Descriptions.Item>
            </Descriptions>
            <Steps
              direction="vertical"
              size="small"
              current={detail.steps.length}
              items={detail.steps.map((s, i) => ({ title: `第 ${i + 1} 步：${s}` }))}
            />
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
