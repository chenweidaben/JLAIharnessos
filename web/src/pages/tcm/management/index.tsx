/**
 * 健澜科技 jlmedaios - 中医科管理（M856 原地升级 M826 视图）
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
import { useTcmWorkloadM856Store } from '@/store/tcmWorkloadM856Store';
import type { TcmWorkloadM856 } from '@/services/api/tcmWorkloadM856';

const diseaseColumns: ColumnsType<{ name: string; count: number }> = [
  { title: '疾病类型', dataIndex: 'name' },
  { title: '数量', dataIndex: 'count', align: 'right' },
];

const buildColumns = (setDetail: (r: TcmWorkloadM856) => void): ColumnsType<TcmWorkloadM856> => [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '门诊数', dataIndex: 'outpatient', width: 100, align: 'right', render: (v: number) => <Tag color="blue">{v}</Tag> },
  { title: '针灸数', dataIndex: 'acupuncture', width: 100, align: 'right', render: (v: number) => <Tag color="cyan">{v}</Tag> },
  { title: '推拿数', dataIndex: 'tuina', width: 100, align: 'right', render: (v: number) => <Tag color="green">{v}</Tag> },
  { title: '拔罐数', dataIndex: 'cupping', width: 100, align: 'right', render: (v: number) => <Tag color="orange">{v}</Tag> },
  { title: '中药处方数', dataIndex: 'herbalPrescriptions', width: 130, align: 'right', render: (v: number) => <Tag color="purple">{v}</Tag> },
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

export default function TcmManagementM856Page() {
  usePageTitle('中医科管理');
  const { items, loading, error, demo, load } = useTcmWorkloadM856Store();
  const [detail, setDetail] = useState<TcmWorkloadM856 | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="中医科管理"
      description="日期 / 门诊数 / 针灸数 / 推拿数 / 拔罐数 / 中药处方数 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`中医工作（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1400 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="中医工作详情"
        width={820}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="日期">{detail.date}</Descriptions.Item>
              <Descriptions.Item label="门诊数">{detail.outpatient}</Descriptions.Item>
              <Descriptions.Item label="针灸数">{detail.acupuncture}</Descriptions.Item>
              <Descriptions.Item label="推拿数">{detail.tuina}</Descriptions.Item>
              <Descriptions.Item label="拔罐数">{detail.cupping}</Descriptions.Item>
              <Descriptions.Item label="中药处方数">{detail.herbalPrescriptions}</Descriptions.Item>
              <Descriptions.Item label="状态">{detail.status}</Descriptions.Item>
              <Descriptions.Item label="针灸记录" span={2}>{detail.acupunctureRecords}</Descriptions.Item>
              <Descriptions.Item label="推拿记录" span={2}>{detail.tuinaRecords}</Descriptions.Item>
              <Descriptions.Item label="中药处方记录" span={2}>{detail.herbalRecords}</Descriptions.Item>
              <Descriptions.Item label="中医体质辨识" span={2}>{detail.constitution}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="疾病谱分解（颈椎病/腰椎病/失眠/面瘫）">
              <Table rowKey="name" dataSource={detail.diseaseBreakdown} columns={diseaseColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
