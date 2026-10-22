/**
 * 健澜科技 jlmedaios - 儿科管理（M782）
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
import { usePediatricPatientM782Store } from '@/store/pediatricPatientM782Store';
import type { PediatricPatient } from '@/services/api/pediatricPatientM782';

const vacColumns: ColumnsType<{ date: string; name: string; result: string }> = [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '疫苗', dataIndex: 'name' },
  { title: '结果', dataIndex: 'result', width: 120, render: (v: string) => <Tag color="green">{v}</Tag> },
];

const recColumns: ColumnsType<{ date: string; action: string; outcome: string }> = [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '处理', dataIndex: 'action' },
  { title: '转归', dataIndex: 'outcome' },
];

const buildColumns = (setDetail: (r: PediatricPatient) => void): ColumnsType<PediatricPatient> => [
  { title: '住院号', dataIndex: 'inpatientNo', width: 130 },
  { title: '患儿姓名', dataIndex: 'child', width: 120 },
  { title: '月龄', dataIndex: 'ageMonth', width: 90, align: 'right' },
  { title: '体重(kg)', dataIndex: 'weightKg', width: 100, align: 'right' },
  { title: '诊断', dataIndex: 'diagnosis', width: 220, ellipsis: true },
  { title: '状态', dataIndex: 'status', width: 100 },
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

export default function PediatricsM782Page() {
  usePageTitle('儿科管理');
  const { items, loading, error, demo, load } = usePediatricPatientM782Store();
  const [detail, setDetail] = useState<PediatricPatient | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="儿科管理"
      description="住院号 / 患儿姓名 / 月龄 / 体重 / 诊断 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`儿科患者（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1200 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="儿科患者详情"
        width={820}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="住院号">{detail.inpatientNo}</Descriptions.Item>
              <Descriptions.Item label="患儿姓名">{detail.child}</Descriptions.Item>
              <Descriptions.Item label="月龄">{detail.ageMonth} 月</Descriptions.Item>
              <Descriptions.Item label="体重">{detail.weightKg} kg</Descriptions.Item>
              <Descriptions.Item label="诊断" span={2}>{detail.diagnosis}</Descriptions.Item>
              <Descriptions.Item label="生长发育评估" span={2}>{detail.growth}</Descriptions.Item>
              <Descriptions.Item label="喂养史" span={2}>{detail.feeding}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="疫苗接种" style={{ marginBottom: 16 }}>
              <Table rowKey="name" dataSource={detail.vaccines} columns={vacColumns} size="small" pagination={false} />
            </Card>
            <Card size="small" title="诊疗记录">
              <Table rowKey="date" dataSource={detail.records} columns={recColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
