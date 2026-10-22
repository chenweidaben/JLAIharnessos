/**
 * 健澜科技 jlmedaios - 病理科管理（M806）
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
import { usePathologyWorkloadM806Store } from '@/store/pathologyWorkloadM806Store';
import type { PathologyWorkload } from '@/services/api/pathologyWorkloadM806';

const typeColumns: ColumnsType<{ name: string; count: number }> = [
  { title: '标本类型', dataIndex: 'name' },
  { title: '数量', dataIndex: 'count', align: 'right' },
];

const ihcColumns: ColumnsType<{ item: string; count: number }> = [
  { title: '免疫组化项目', dataIndex: 'item' },
  { title: '数量', dataIndex: 'count', align: 'right' },
];

const buildColumns = (setDetail: (r: PathologyWorkload) => void): ColumnsType<PathologyWorkload> => [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '标本类型', dataIndex: 'specimenType', width: 130 },
  { title: '标本数', dataIndex: 'specimens', width: 100, align: 'right' },
  { title: '诊断数', dataIndex: 'diagnoses', width: 100, align: 'right' },
  { title: '报告时效', dataIndex: 'reportSla', width: 220, ellipsis: true },
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

export default function PathologyManagementM806Page() {
  usePageTitle('病理科管理');
  const { items, loading, error, demo, load } = usePathologyWorkloadM806Store();
  const [detail, setDetail] = useState<PathologyWorkload | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="病理科管理"
      description="日期 / 标本类型 / 标本数 / 诊断数 / 报告时效 / 状态"
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
              <Descriptions.Item label="标本类型">{detail.specimenType}</Descriptions.Item>
              <Descriptions.Item label="标本数">{detail.specimens}</Descriptions.Item>
              <Descriptions.Item label="诊断数">{detail.diagnoses}</Descriptions.Item>
              <Descriptions.Item label="报告时效" span={2}>{detail.reportSla}</Descriptions.Item>
              <Descriptions.Item label="诊断符合率" span={2}>{detail.concordance}</Descriptions.Item>
              <Descriptions.Item label="报告时效统计" span={2}>{detail.reportTimeliness}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="标本类型分解" style={{ marginBottom: 16 }}>
              <Table rowKey="name" dataSource={detail.typeBreakdown} columns={typeColumns} size="small" pagination={false} />
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
