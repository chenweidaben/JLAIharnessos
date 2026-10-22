/**
 * 健澜科技 jlmedaios - 科研管理（M891）
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
import { useResearchWorkloadM891Store } from '@/store/researchWorkloadM891Store';
import type { ResearchWorkload } from '@/services/api/researchWorkloadM891';

const simpleColumns: ColumnsType<{ name: string; count: number }> = [
  { title: '项目', dataIndex: 'name' },
  { title: '数量', dataIndex: 'count', align: 'right' },
];

const buildColumns = (setDetail: (r: ResearchWorkload) => void): ColumnsType<ResearchWorkload> => [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '在研课题数', dataIndex: 'ongoingProjects', width: 130, align: 'right', render: (v: number) => <Tag color="blue">{v}</Tag> },
  { title: '新立项课题数', dataIndex: 'newProjects', width: 140, align: 'right', render: (v: number) => <Tag color="green">{v}</Tag> },
  { title: '论文发表数', dataIndex: 'papers', width: 120, align: 'right', render: (v: number) => <Tag color="purple">{v}</Tag> },
  { title: '专利申请数', dataIndex: 'patents', width: 120, align: 'right', render: (v: number) => <Tag color="orange">{v}</Tag> },
  { title: '科研经费到账(万)', dataIndex: 'funding', width: 170, align: 'right', render: (v: number) => <Tag color="cyan">{v}</Tag> },
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

export default function ResearchManagementM891Page() {
  usePageTitle('科研管理');
  const { items, loading, error, demo, load } = useResearchWorkloadM891Store();
  const [detail, setDetail] = useState<ResearchWorkload | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="科研管理"
      description="日期 / 在研课题 / 新立项 / 论文 / 专利 / 经费到账 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`科研工作（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1500 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="科研工作详情"
        width={900}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="日期">{detail.date}</Descriptions.Item>
              <Descriptions.Item label="在研课题数">{detail.ongoingProjects}</Descriptions.Item>
              <Descriptions.Item label="新立项课题数">{detail.newProjects}</Descriptions.Item>
              <Descriptions.Item label="论文发表数">{detail.papers}</Descriptions.Item>
              <Descriptions.Item label="专利申请数">{detail.patents}</Descriptions.Item>
              <Descriptions.Item label="科研经费到账">{detail.funding} 万元</Descriptions.Item>
              <Descriptions.Item label="状态">{detail.status}</Descriptions.Item>
              <Descriptions.Item label="科研合作（高校/企业/研究院）" span={2}>{detail.collaboration}</Descriptions.Item>
              <Descriptions.Item label="伦理审查" span={2}>{detail.ethics}</Descriptions.Item>
            </Descriptions>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <Card size="small" title="课题分级">
                <Table rowKey="name" dataSource={detail.projectBreakdown} columns={simpleColumns} size="small" pagination={false} />
              </Card>
              <Card size="small" title="论文分类">
                <Table rowKey="name" dataSource={detail.paperBreakdown} columns={simpleColumns} size="small" pagination={false} />
              </Card>
              <Card size="small" title="专利类型">
                <Table rowKey="name" dataSource={detail.patentBreakdown} columns={simpleColumns} size="small" pagination={false} />
              </Card>
            </div>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
