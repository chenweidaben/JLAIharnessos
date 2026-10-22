/**
 * 健澜科技 jlmedaios - 三级公立医院绩效考核（M762）
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
import { useNationalPerformanceM762Store } from '@/store/nationalPerformanceM762Store';
import type { NationalPerfIndicator } from '@/services/api/nationalPerformanceM762';

const buildColumns = (setDetail: (r: NationalPerfIndicator) => void): ColumnsType<NationalPerfIndicator> => [
  { title: '指标编码', dataIndex: 'code', width: 100 },
  { title: '指标名称', dataIndex: 'name', ellipsis: true },
  { title: '指标类别', dataIndex: 'category', width: 110 },
  { title: '年度目标', dataIndex: 'target', width: 110 },
  { title: '实际完成', dataIndex: 'actual', width: 110 },
  { title: '得分', dataIndex: 'score', width: 90, align: 'right', render: (v: number) => <Tag color="blue">{v}</Tag> },
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

export default function NationalPerformanceM762Page() {
  usePageTitle('三级公立医院绩效考核');
  const { items, loading, error, demo, load } = useNationalPerformanceM762Store();
  const [detail, setDetail] = useState<NationalPerfIndicator | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="三级公立医院绩效考核"
      description="指标编码 / 指标名称 / 指标类别 / 年度目标 / 实际完成 / 得分"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`考核指标（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1200 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="考核指标详情"
        width={780}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="指标编码">{detail.code}</Descriptions.Item>
              <Descriptions.Item label="指标类别">{detail.category}</Descriptions.Item>
              <Descriptions.Item label="指标名称" span={2}>{detail.name}</Descriptions.Item>
              <Descriptions.Item label="年度目标">{detail.target}</Descriptions.Item>
              <Descriptions.Item label="实际完成">{detail.actual}</Descriptions.Item>
              <Descriptions.Item label="得分">{detail.score}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="指标定义" style={{ marginBottom: 16 }}>{detail.definition}</Card>
            <Card size="small" title="数据来源" style={{ marginBottom: 16 }}>{detail.source}</Card>
            <Card size="small" title="对标分析">{detail.benchmark}</Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
