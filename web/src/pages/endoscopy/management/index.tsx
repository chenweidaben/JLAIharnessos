/**
 * 健澜科技 jlmedaios - 内镜中心管理（M808）
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
import { useEndoscopyWorkloadM808Store } from '@/store/endoscopyWorkloadM808Store';
import type { EndoscopyWorkload } from '@/services/api/endoscopyWorkloadM808';

const typeColumns: ColumnsType<{ name: string; exams: number; treatments: number; biopsies: number }> = [
  { title: '内镜类型', dataIndex: 'name' },
  { title: '检查数', dataIndex: 'exams', align: 'right' },
  { title: '治疗数', dataIndex: 'treatments', align: 'right' },
  { title: '活检数', dataIndex: 'biopsies', align: 'right' },
];

const compColumns: ColumnsType<{ time: string; patient: string; type: string; action: string }> = [
  { title: '时间', dataIndex: 'time', width: 80 },
  { title: '患者', dataIndex: 'patient', width: 100 },
  { title: '并发症类型', dataIndex: 'type' },
  { title: '处置', dataIndex: 'action' },
];

const buildColumns = (setDetail: (r: EndoscopyWorkload) => void): ColumnsType<EndoscopyWorkload> => [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '内镜类型', dataIndex: 'scopeType', width: 120 },
  { title: '检查数', dataIndex: 'exams', width: 100, align: 'right' },
  { title: '治疗数', dataIndex: 'treatments', width: 100, align: 'right' },
  { title: '活检数', dataIndex: 'biopsies', width: 100, align: 'right' },
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

export default function EndoscopyManagementM808Page() {
  usePageTitle('内镜中心管理');
  const { items, loading, error, demo, load } = useEndoscopyWorkloadM808Store();
  const [detail, setDetail] = useState<EndoscopyWorkload | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="内镜中心管理"
      description="日期 / 内镜类型 / 检查数 / 治疗数 / 活检数 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`内镜工作（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1100 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="内镜工作详情"
        width={820}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="日期">{detail.date}</Descriptions.Item>
              <Descriptions.Item label="内镜类型">{detail.scopeType}</Descriptions.Item>
              <Descriptions.Item label="检查数">{detail.exams}</Descriptions.Item>
              <Descriptions.Item label="治疗数">{detail.treatments}</Descriptions.Item>
              <Descriptions.Item label="活检数">{detail.biopsies}</Descriptions.Item>
              <Descriptions.Item label="息肉切除数">{detail.polypectomy}</Descriptions.Item>
              <Descriptions.Item label="洗消记录" span={2}>{detail.disinfection}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="内镜类型分解" style={{ marginBottom: 16 }}>
              <Table rowKey="name" dataSource={detail.typeBreakdown} columns={typeColumns} size="small" pagination={false} />
            </Card>
            <Card size="small" title="并发症记录">
              <Table rowKey="time" dataSource={detail.complications} columns={compColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
