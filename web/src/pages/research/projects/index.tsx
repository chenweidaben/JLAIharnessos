/**
 * 健澜科技 jlmedaios - 科研项目管理（M739，升级自 M279 简易页）
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
import { useResearchProjectM739Store } from '@/store/researchProjectM739Store';
import {
  PROJECT_STATUS_META,
  type ResearchProject,
} from '@/services/api/researchProjectM739';

const expColumns: ColumnsType<{ item: string; amount: number }> = [
  { title: '科目', dataIndex: 'item' },
  { title: '金额(元)', dataIndex: 'amount', align: 'right', render: (v: number) => v.toLocaleString() },
];

const buildColumns = (setDetail: (r: ResearchProject) => void): ColumnsType<ResearchProject> => [
  { title: '项目编号', dataIndex: 'code', width: 130 },
  { title: '项目名称', dataIndex: 'name', ellipsis: true },
  { title: '负责人', dataIndex: 'pi', width: 100 },
  { title: '经费', dataIndex: 'budget', width: 120, align: 'right', render: (v: number) => `¥${(v / 10000).toFixed(1)}万` },
  { title: '起止时间', dataIndex: 'period', width: 180 },
  {
    title: '状态',
    dataIndex: 'status',
    width: 100,
    render: (v: ResearchProject['status']) => <Tag color={PROJECT_STATUS_META[v].color}>{PROJECT_STATUS_META[v].label}</Tag>,
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

export default function ResearchProjectsPage() {
  usePageTitle('科研项目管理');
  const { items, loading, error, demo, load } = useResearchProjectM739Store();
  const [detail, setDetail] = useState<ResearchProject | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="科研项目管理"
      description="项目编号 / 项目名称 / 负责人 / 经费 / 起止时间 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`科研项目（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1200 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="科研项目详情"
        width={780}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="项目编号">{detail.code}</Descriptions.Item>
              <Descriptions.Item label="项目名称" span={2}>{detail.name}</Descriptions.Item>
              <Descriptions.Item label="负责人">{detail.pi}</Descriptions.Item>
              <Descriptions.Item label="经费预算">¥{detail.budget.toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label="起止时间" span={2}>{detail.period}</Descriptions.Item>
              <Descriptions.Item label="项目摘要" span={2}>{detail.summary}</Descriptions.Item>
              <Descriptions.Item label="阶段性成果" span={2}>{detail.deliverables}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="经费使用">
              <Table rowKey="item" dataSource={detail.expenses} columns={expColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
