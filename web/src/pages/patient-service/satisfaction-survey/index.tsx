/**
 * 健澜科技 jlmedaios - 满意度调查管理（M754）
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
import { useSatisfactionSurveyM754Store } from '@/store/satisfactionSurveyM754Store';
import {
  SURVEY_STATUS_META,
  type SatisfactionSurvey,
} from '@/services/api/satisfactionSurveyM754';

const buildColumns = (setDetail: (r: SatisfactionSurvey) => void): ColumnsType<SatisfactionSurvey> => [
  { title: '调查名称', dataIndex: 'name', ellipsis: true },
  { title: '调查类型', dataIndex: 'type', width: 130 },
  { title: '发放数量', dataIndex: 'distributed', width: 100, align: 'right' },
  { title: '回收数量', dataIndex: 'collected', width: 100, align: 'right' },
  {
    title: '满意度',
    dataIndex: 'score',
    width: 110,
    align: 'right',
    render: (v: number) => <Tag color={v >= 90 ? 'green' : v >= 80 ? 'blue' : 'orange'}>{v.toFixed(1)}%</Tag>,
  },
  {
    title: '状态',
    dataIndex: 'status',
    width: 100,
    render: (v: SatisfactionSurvey['status']) => <Tag color={SURVEY_STATUS_META[v].color}>{SURVEY_STATUS_META[v].label}</Tag>,
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

export default function SatisfactionSurveysM754Page() {
  usePageTitle('满意度调查管理');
  const { items, loading, error, demo, load } = useSatisfactionSurveyM754Store();
  const [detail, setDetail] = useState<SatisfactionSurvey | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="满意度调查管理"
      description="调查名称 / 调查类型 / 发放数量 / 回收数量 / 满意度 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`满意度调查（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1200 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="满意度调查详情"
        width={780}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="调查名称" span={2}>{detail.name}</Descriptions.Item>
              <Descriptions.Item label="调查类型">{detail.type}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={SURVEY_STATUS_META[detail.status].color}>{SURVEY_STATUS_META[detail.status].label}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="发放数量">{detail.distributed}</Descriptions.Item>
              <Descriptions.Item label="回收数量">{detail.collected}</Descriptions.Item>
              <Descriptions.Item label="问卷结构" span={2}>{detail.structure}</Descriptions.Item>
              <Descriptions.Item label="统计结果" span={2}>{detail.stats}</Descriptions.Item>
              <Descriptions.Item label="改进建议" span={2}>{detail.suggestions}</Descriptions.Item>
            </Descriptions>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
