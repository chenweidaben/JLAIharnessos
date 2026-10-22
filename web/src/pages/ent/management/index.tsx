/**
 * 健澜科技 jlmedaios - 耳鼻喉科管理（M853 原地升级 M823 视图）
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
import { useEntWorkloadM853Store } from '@/store/entWorkloadM853Store';
import type { EntWorkloadM853 } from '@/services/api/entWorkloadM853';

const diseaseColumns: ColumnsType<{ name: string; count: number }> = [
  { title: '疾病类型', dataIndex: 'name' },
  { title: '数量', dataIndex: 'count', align: 'right' },
];

const buildColumns = (setDetail: (r: EntWorkloadM853) => void): ColumnsType<EntWorkloadM853> => [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '门诊数', dataIndex: 'outpatient', width: 100, align: 'right', render: (v: number) => <Tag color="blue">{v}</Tag> },
  { title: '鼻内镜数', dataIndex: 'nasoEndoscopy', width: 120, align: 'right', render: (v: number) => <Tag color="cyan">{v}</Tag> },
  { title: '喉镜数', dataIndex: 'laryngoscopy', width: 110, align: 'right', render: (v: number) => <Tag color="green">{v}</Tag> },
  { title: '听力检查数', dataIndex: 'hearing', width: 130, align: 'right', render: (v: number) => <Tag color="purple">{v}</Tag> },
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

export default function EntManagementM853Page() {
  usePageTitle('耳鼻喉科管理');
  const { items, loading, error, demo, load } = useEntWorkloadM853Store();
  const [detail, setDetail] = useState<EntWorkloadM853 | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="耳鼻喉科管理"
      description="日期 / 门诊数 / 鼻内镜数 / 喉镜数 / 听力检查数 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`耳鼻喉工作（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1200 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="耳鼻喉工作详情"
        width={820}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="日期">{detail.date}</Descriptions.Item>
              <Descriptions.Item label="门诊数">{detail.outpatient}</Descriptions.Item>
              <Descriptions.Item label="鼻内镜数">{detail.nasoEndoscopy}</Descriptions.Item>
              <Descriptions.Item label="喉镜数">{detail.laryngoscopy}</Descriptions.Item>
              <Descriptions.Item label="听力检查数">{detail.hearing}</Descriptions.Item>
              <Descriptions.Item label="状态">{detail.status}</Descriptions.Item>
              <Descriptions.Item label="手术记录（鼻息肉/扁桃体/鼓膜）" span={2}>{detail.surgeries}</Descriptions.Item>
              <Descriptions.Item label="听力检查（纯音测听/声导抗）" span={2}>{detail.hearingTests}</Descriptions.Item>
              <Descriptions.Item label="眩晕门诊" span={2}>{detail.vertigo}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="疾病谱分解（鼻炎/咽炎/中耳炎/声带息肉）">
              <Table rowKey="name" dataSource={detail.diseaseBreakdown} columns={diseaseColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
