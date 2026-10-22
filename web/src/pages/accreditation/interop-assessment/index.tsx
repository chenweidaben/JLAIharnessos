/**
 * 健澜科技 jlmedaios - 互联互通测评管理（M761）
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
import { useInteropAssessmentM761Store } from '@/store/interopAssessmentM761Store';
import {
  INTEROP_PASS_META,
  type InteropIndicator,
} from '@/services/api/interopAssessmentM761';

const buildColumns = (setDetail: (r: InteropIndicator) => void): ColumnsType<InteropIndicator> => [
  { title: '指标编码', dataIndex: 'code', width: 110 },
  { title: '指标名称', dataIndex: 'name', ellipsis: true },
  { title: '测评等级', dataIndex: 'level', width: 110 },
  { title: '当前得分', dataIndex: 'score', width: 100, align: 'right', render: (v: number) => <Tag color="blue">{v}</Tag> },
  {
    title: '达标状态',
    dataIndex: 'pass',
    width: 120,
    render: (v: InteropIndicator['pass']) => <Tag color={INTEROP_PASS_META[v].color}>{INTEROP_PASS_META[v].label}</Tag>,
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

export default function InteropAssessmentM761Page() {
  usePageTitle('互联互通测评管理');
  const { items, loading, error, demo, load } = useInteropAssessmentM761Store();
  const [detail, setDetail] = useState<InteropIndicator | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="互联互通测评管理"
      description="指标编码 / 指标名称 / 测评等级 / 当前得分 / 达标状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`测评指标（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1000 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="测评指标详情"
        width={720}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="指标编码">{detail.code}</Descriptions.Item>
              <Descriptions.Item label="指标名称">{detail.name}</Descriptions.Item>
              <Descriptions.Item label="测评等级">{detail.level}</Descriptions.Item>
              <Descriptions.Item label="当前得分">{detail.score}</Descriptions.Item>
              <Descriptions.Item label="达标状态">
                <Tag color={INTEROP_PASS_META[detail.pass].color}>{INTEROP_PASS_META[detail.pass].label}</Tag>
              </Descriptions.Item>
            </Descriptions>
            <Card size="small" title="指标说明" style={{ marginBottom: 16 }}>{detail.description}</Card>
            <Card size="small" title="数据标准符合性" style={{ marginBottom: 16 }}>{detail.standard}</Card>
            <Card size="small" title="共享交换情况">{detail.exchange}</Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
