/**
 * 健澜科技 jlmedaios - 病理科管理（M836 原地升级 M806 视图）
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
import { usePathologyWorkloadM836Store } from '@/store/pathologyWorkloadM836Store';
import type { PathologyWorkloadM836 } from '@/services/api/pathologyWorkloadM836';

const specimenColumns: ColumnsType<{ type: string; count: number }> = [
  { title: '标本类型', dataIndex: 'type' },
  { title: '数量', dataIndex: 'count', align: 'right' },
];

const ihcColumns: ColumnsType<{ item: string; count: number }> = [
  { title: '免疫组化项目', dataIndex: 'item' },
  { title: '数量', dataIndex: 'count', align: 'right' },
];

const buildColumns = (setDetail: (r: PathologyWorkloadM836) => void): ColumnsType<PathologyWorkloadM836> => [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '活检数', dataIndex: 'biopsy', width: 90, align: 'right', render: (v: number) => <Tag color="blue">{v}</Tag> },
  { title: '细胞学数', dataIndex: 'cytology', width: 100, align: 'right', render: (v: number) => <Tag color="cyan">{v}</Tag> },
  { title: '冰冻数', dataIndex: 'frozen', width: 90, align: 'right', render: (v: number) => <Tag color="orange">{v}</Tag> },
  { title: '特殊染色数', dataIndex: 'specialStain', width: 120, align: 'right', render: (v: number) => <Tag color="purple">{v}</Tag> },
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

export default function PathologyManagementM836Page() {
  usePageTitle('病理科管理');
  const { items, loading, error, demo, load } = usePathologyWorkloadM836Store();
  const [detail, setDetail] = useState<PathologyWorkloadM836 | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="病理科管理"
      description="日期 / 活检数 / 细胞学数 / 冰冻数 / 特殊染色数 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`病理工作（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1100 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="病理工作详情"
        width={820}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="日期">{detail.date}</Descriptions.Item>
              <Descriptions.Item label="活检数">{detail.biopsy}</Descriptions.Item>
              <Descriptions.Item label="细胞学数">{detail.cytology}</Descriptions.Item>
              <Descriptions.Item label="冰冻数">{detail.frozen}</Descriptions.Item>
              <Descriptions.Item label="特殊染色数">{detail.specialStain}</Descriptions.Item>
              <Descriptions.Item label="状态">{detail.status}</Descriptions.Item>
              <Descriptions.Item label="制片记录" span={2}>{detail.slideMaking}</Descriptions.Item>
              <Descriptions.Item label="诊断记录" span={2}>{detail.diagnosisRecords}</Descriptions.Item>
              <Descriptions.Item label="远程会诊记录" span={2}>{detail.remoteConsult}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="标本类型分解" style={{ marginBottom: 16 }}>
              <Table rowKey="type" dataSource={detail.specimenBreakdown} columns={specimenColumns} size="small" pagination={false} />
            </Card>
            <Card size="small" title="免疫组化记录">
              <Table rowKey="item" dataSource={detail.ihcRecords} columns={ihcColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
