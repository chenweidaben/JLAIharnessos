/**
 * 健澜科技 jlmedaios - 论文管理（M740，升级自 M328 简易页）
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
import { usePaperM740Store } from '@/store/paperM740Store';
import {
  PAPER_STATUS_META,
  type Paper,
} from '@/services/api/paperM740';

const buildColumns = (setDetail: (r: Paper) => void): ColumnsType<Paper> => [
  { title: '论文标题', dataIndex: 'title', ellipsis: true },
  { title: '作者', dataIndex: 'authors', width: 180, ellipsis: true },
  { title: '期刊', dataIndex: 'journal', width: 180, ellipsis: true },
  { title: '发表时间', dataIndex: 'publishedAt', width: 110 },
  {
    title: '影响因子',
    dataIndex: 'impactFactor',
    width: 100,
    align: 'right',
    render: (v: number) => <Tag color="blue">{v.toFixed(1)}</Tag>,
  },
  {
    title: '状态',
    dataIndex: 'status',
    width: 100,
    render: (v: Paper['status']) => <Tag color={PAPER_STATUS_META[v].color}>{PAPER_STATUS_META[v].label}</Tag>,
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

export default function ResearchPapersPage() {
  usePageTitle('论文管理');
  const { items, loading, error, demo, load } = usePaperM740Store();
  const [detail, setDetail] = useState<Paper | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="论文管理"
      description="论文标题 / 作者 / 期刊 / 发表时间 / 影响因子 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`论文列表（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1300 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="论文详情"
        width={780}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="论文标题">{detail.title}</Descriptions.Item>
            <Descriptions.Item label="作者">{detail.authors}</Descriptions.Item>
            <Descriptions.Item label="期刊">{detail.journal}</Descriptions.Item>
            <Descriptions.Item label="发表时间">{detail.publishedAt}</Descriptions.Item>
            <Descriptions.Item label="影响因子">{detail.impactFactor.toFixed(1)}</Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={PAPER_STATUS_META[detail.status].color}>{PAPER_STATUS_META[detail.status].label}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="论文摘要">{detail.abstract}</Descriptions.Item>
            <Descriptions.Item label="作者贡献">{detail.contribution}</Descriptions.Item>
            <Descriptions.Item label="收录情况">{detail.indexedIn}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </PageContainer>
  );
}
