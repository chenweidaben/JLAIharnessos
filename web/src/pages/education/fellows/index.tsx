/**
 * 健澜科技 jlmedaios - 进修医生管理（M741）
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
import { useFellowM741Store } from '@/store/fellowM741Store';
import {
  FELLOW_STATUS_META,
  type Fellow,
} from '@/services/api/fellowM741';

const buildColumns = (setDetail: (r: Fellow) => void): ColumnsType<Fellow> => [
  { title: '姓名', dataIndex: 'name', width: 100 },
  { title: '原单位', dataIndex: 'origin', width: 220, ellipsis: true },
  { title: '进修科室', dataIndex: 'dept', width: 130 },
  { title: '进修时间', dataIndex: 'period', width: 220 },
  {
    title: '状态',
    dataIndex: 'status',
    width: 110,
    render: (v: Fellow['status']) => <Tag color={FELLOW_STATUS_META[v].color}>{FELLOW_STATUS_META[v].label}</Tag>,
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

export default function FellowsM741Page() {
  usePageTitle('进修医生管理');
  const { items, loading, error, demo, load } = useFellowM741Store();
  const [detail, setDetail] = useState<Fellow | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="进修医生管理"
      description="姓名 / 原单位 / 进修科室 / 进修时间 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`进修医生（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1100 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="进修医生详情"
        width={720}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="姓名">{detail.name}</Descriptions.Item>
              <Descriptions.Item label="进修科室">{detail.dept}</Descriptions.Item>
              <Descriptions.Item label="原单位" span={2}>{detail.origin}</Descriptions.Item>
              <Descriptions.Item label="进修时间" span={2}>{detail.period}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={FELLOW_STATUS_META[detail.status].color}>{FELLOW_STATUS_META[detail.status].label}</Tag>
              </Descriptions.Item>
            </Descriptions>
            <Card size="small" title="进修计划" style={{ marginBottom: 16 }}>{detail.plan}</Card>
            <Card size="small" title="考核记录" style={{ marginBottom: 16 }}>{detail.assessments}</Card>
            <Card size="small" title="结业评价">{detail.evaluation}</Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
