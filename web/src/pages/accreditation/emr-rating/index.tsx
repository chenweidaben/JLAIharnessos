/**
 * 健澜科技 jlmedaios - 电子病历评级管理（M760）
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
import { useEmrRatingM760Store } from '@/store/emrRatingM760Store';
import {
  EMR_PASS_META,
  type EmrIndicator,
} from '@/services/api/emrRatingM760';

const buildColumns = (setDetail: (r: EmrIndicator) => void): ColumnsType<EmrIndicator> => [
  { title: '指标编码', dataIndex: 'code', width: 120 },
  { title: '指标名称', dataIndex: 'name', ellipsis: true },
  { title: '目标等级', dataIndex: 'targetLevel', width: 100 },
  { title: '当前得分', dataIndex: 'score', width: 100, align: 'right', render: (v: number) => <Tag color="blue">{v}</Tag> },
  {
    title: '达标状态',
    dataIndex: 'pass',
    width: 120,
    render: (v: EmrIndicator['pass']) => <Tag color={EMR_PASS_META[v].color}>{EMR_PASS_META[v].label}</Tag>,
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

export default function EmrRatingM760Page() {
  usePageTitle('电子病历评级管理');
  const { items, loading, error, demo, load } = useEmrRatingM760Store();
  const [detail, setDetail] = useState<EmrIndicator | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="电子病历评级管理"
      description="指标编码 / 指标名称 / 目标等级 / 当前得分 / 达标状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`评级指标（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1000 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="评级指标详情"
        width={720}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="指标编码">{detail.code}</Descriptions.Item>
              <Descriptions.Item label="指标名称">{detail.name}</Descriptions.Item>
              <Descriptions.Item label="目标等级">{detail.targetLevel}</Descriptions.Item>
              <Descriptions.Item label="当前得分">{detail.score}</Descriptions.Item>
              <Descriptions.Item label="达标状态">
                <Tag color={EMR_PASS_META[detail.pass].color}>{EMR_PASS_META[detail.pass].label}</Tag>
              </Descriptions.Item>
            </Descriptions>
            <Card size="small" title="指标说明" style={{ marginBottom: 16 }}>{detail.description}</Card>
            <Card size="small" title="系统功能清单" style={{ marginBottom: 16 }}>{detail.features}</Card>
            <Card size="small" title="应用情况">{detail.application}</Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
