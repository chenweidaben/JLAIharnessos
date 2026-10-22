/**
 * 健澜科技 jlmedaios - 应急演练管理（M767）
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
import { useDrillM767Store } from '@/store/drillM767Store';
import {
  DRILL_RESULT_META,
  type Drill,
} from '@/services/api/drillM767';

const buildColumns = (setDetail: (r: Drill) => void): ColumnsType<Drill> => [
  { title: '演练名称', dataIndex: 'name', ellipsis: true },
  { title: '演练类型', dataIndex: 'type', width: 150 },
  { title: '演练时间', dataIndex: 'heldAt', width: 160 },
  { title: '参演人数', dataIndex: 'participantCount', width: 100, align: 'right' },
  {
    title: '演练结果',
    dataIndex: 'result',
    width: 110,
    render: (v: Drill['result']) => <Tag color={DRILL_RESULT_META[v].color}>{DRILL_RESULT_META[v].label}</Tag>,
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

export default function DrillsM767Page() {
  usePageTitle('应急演练管理');
  const { items, loading, error, demo, load } = useDrillM767Store();
  const [detail, setDetail] = useState<Drill | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="应急演练管理"
      description="演练名称 / 演练类型 / 演练时间 / 参演人数 / 演练结果"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`应急演练（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1100 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="应急演练详情"
        width={780}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="演练名称" span={2}>{detail.name}</Descriptions.Item>
              <Descriptions.Item label="演练类型">{detail.type}</Descriptions.Item>
              <Descriptions.Item label="演练时间">{detail.heldAt}</Descriptions.Item>
              <Descriptions.Item label="参演人数">{detail.participantCount}</Descriptions.Item>
              <Descriptions.Item label="演练结果">
                <Tag color={DRILL_RESULT_META[detail.result].color}>{DRILL_RESULT_META[detail.result].label}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="演练方案" span={2}>{detail.plan}</Descriptions.Item>
              <Descriptions.Item label="演练过程" span={2}>{detail.process}</Descriptions.Item>
              <Descriptions.Item label="评估报告" span={2}>{detail.evaluation}</Descriptions.Item>
              <Descriptions.Item label="改进措施" span={2}>{detail.improvements}</Descriptions.Item>
            </Descriptions>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
