/**
 * 健澜科技 jlmedaios - 消毒灭菌效果监测（M705）
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
import { useDisinfectionTestM705Store } from '@/store/disinfectionTestM705Store';
import {
  TEST_STATUS_META,
  type DisinfectionTest,
} from '@/services/api/disinfectionTestM705';

const buildColumns = (setDetail: (r: DisinfectionTest) => void): ColumnsType<DisinfectionTest> => [
  { title: '监测对象', dataIndex: 'target', width: 180 },
  { title: '监测类型', dataIndex: 'testType', width: 130 },
  { title: '采样日期', dataIndex: 'sampledAt', width: 110 },
  { title: '检测结果', dataIndex: 'result', ellipsis: true },
  {
    title: '状态',
    dataIndex: 'status',
    width: 110,
    render: (v: DisinfectionTest['status']) => <Tag color={TEST_STATUS_META[v].color}>{TEST_STATUS_META[v].label}</Tag>,
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

export default function DisinfectionTestM705Page() {
  usePageTitle('消毒灭菌效果监测');
  const { items, loading, error, demo, load } = useDisinfectionTestM705Store();
  const [detail, setDetail] = useState<DisinfectionTest | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="消毒灭菌效果监测"
      description="监测对象 / 监测类型 / 采样日期 / 结果 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`监测记录（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1000 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="消毒灭菌监测详情"
        width={680}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="监测对象">{detail.target}</Descriptions.Item>
            <Descriptions.Item label="监测类型">{detail.testType}</Descriptions.Item>
            <Descriptions.Item label="采样日期">{detail.sampledAt}</Descriptions.Item>
            <Descriptions.Item label="检测方法">{detail.method}</Descriptions.Item>
            <Descriptions.Item label="检测结果">{detail.result}</Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={TEST_STATUS_META[detail.status].color}>{TEST_STATUS_META[detail.status].label}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="不合格处理">{detail.handling}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </PageContainer>
  );
}
