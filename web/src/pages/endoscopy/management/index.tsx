/**
 * 健澜科技 jlmedaios - 内镜中心管理（M841 原地升级 M808 视图）
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
import { useEndoscopyWorkloadM841Store } from '@/store/endoscopyWorkloadM841Store';
import type { EndoscopyWorkloadM841 } from '@/services/api/endoscopyWorkloadM841';

const typeColumns: ColumnsType<{ name: string; count: number }> = [
  { title: '检查类型', dataIndex: 'name' },
  { title: '数量', dataIndex: 'count', align: 'right' },
];

const compColumns: ColumnsType<{ time: string; patient: string; type: string; action: string }> = [
  { title: '时间', dataIndex: 'time', width: 80 },
  { title: '患者', dataIndex: 'patient', width: 100 },
  { title: '并发症', dataIndex: 'type' },
  { title: '处置', dataIndex: 'action' },
];

const buildColumns = (setDetail: (r: EndoscopyWorkloadM841) => void): ColumnsType<EndoscopyWorkloadM841> => [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '胃镜数', dataIndex: 'gastroscopy', width: 100, align: 'right', render: (v: number) => <Tag color="blue">{v}</Tag> },
  { title: '肠镜数', dataIndex: 'colonoscopy', width: 100, align: 'right', render: (v: number) => <Tag color="cyan">{v}</Tag> },
  { title: '支气管镜数', dataIndex: 'bronchoscopy', width: 120, align: 'right', render: (v: number) => <Tag color="green">{v}</Tag> },
  { title: '超声内镜数', dataIndex: 'eus', width: 110, align: 'right', render: (v: number) => <Tag color="purple">{v}</Tag> },
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

export default function EndoscopyManagementM841Page() {
  usePageTitle('内镜中心管理');
  const { items, loading, error, demo, load } = useEndoscopyWorkloadM841Store();
  const [detail, setDetail] = useState<EndoscopyWorkloadM841 | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="内镜中心管理"
      description="日期 / 胃镜数 / 肠镜数 / 支气管镜数 / 超声内镜数 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`内镜工作（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1200 }} />
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
              <Descriptions.Item label="胃镜数">{detail.gastroscopy}</Descriptions.Item>
              <Descriptions.Item label="肠镜数">{detail.colonoscopy}</Descriptions.Item>
              <Descriptions.Item label="支气管镜数">{detail.bronchoscopy}</Descriptions.Item>
              <Descriptions.Item label="超声内镜数">{detail.eus}</Descriptions.Item>
              <Descriptions.Item label="状态">{detail.status}</Descriptions.Item>
              <Descriptions.Item label="活检记录" span={2}>{detail.biopsyRecords}</Descriptions.Item>
              <Descriptions.Item label="息肉切除记录" span={2}>{detail.polypectomyRecords}</Descriptions.Item>
              <Descriptions.Item label="麻醉记录" span={2}>{detail.anesthesia}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="检查类型分解" style={{ marginBottom: 16 }}>
              <Table rowKey="name" dataSource={detail.typeBreakdown} columns={typeColumns} size="small" pagination={false} />
            </Card>
            <Card size="small" title="术后并发症记录">
              <Table rowKey="time" dataSource={detail.complications} columns={compColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
