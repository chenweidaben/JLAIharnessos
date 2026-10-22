/**
 * 健澜科技 jlmedaios - 内分泌科管理（M862）
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
import { useEndocrinologyWorkloadM862Store } from '@/store/endocrinologyWorkloadM862Store';
import type { EndocrinologyWorkload } from '@/services/api/endocrinologyWorkloadM862';

const diseaseColumns: ColumnsType<{ name: string; count: number }> = [
  { title: '疾病类型', dataIndex: 'name' },
  { title: '数量', dataIndex: 'count', align: 'right' },
];

const buildColumns = (setDetail: (r: EndocrinologyWorkload) => void): ColumnsType<EndocrinologyWorkload> => [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '门诊数', dataIndex: 'outpatient', width: 100, align: 'right', render: (v: number) => <Tag color="blue">{v}</Tag> },
  { title: '住院数', dataIndex: 'inpatient', width: 100, align: 'right', render: (v: number) => <Tag color="cyan">{v}</Tag> },
  { title: '糖尿病随访数', dataIndex: 'diabetesFollowUp', width: 140, align: 'right', render: (v: number) => <Tag color="green">{v}</Tag> },
  { title: '甲状腺结节数', dataIndex: 'thyroidNodule', width: 140, align: 'right', render: (v: number) => <Tag color="purple">{v}</Tag> },
  { title: '骨质疏松数', dataIndex: 'osteoporosis', width: 120, align: 'right', render: (v: number) => <Tag color="orange">{v}</Tag> },
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

export default function EndocrinologyManagementM862Page() {
  usePageTitle('内分泌科管理');
  const { items, loading, error, demo, load } = useEndocrinologyWorkloadM862Store();
  const [detail, setDetail] = useState<EndocrinologyWorkload | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="内分泌科管理"
      description="日期 / 门诊数 / 住院数 / 糖尿病随访数 / 甲状腺结节数 / 骨质疏松数 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`内分泌工作（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1400 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="内分泌工作详情"
        width={820}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="日期">{detail.date}</Descriptions.Item>
              <Descriptions.Item label="门诊数">{detail.outpatient}</Descriptions.Item>
              <Descriptions.Item label="住院数">{detail.inpatient}</Descriptions.Item>
              <Descriptions.Item label="糖尿病随访数">{detail.diabetesFollowUp}</Descriptions.Item>
              <Descriptions.Item label="甲状腺结节数">{detail.thyroidNodule}</Descriptions.Item>
              <Descriptions.Item label="骨质疏松数">{detail.osteoporosis}</Descriptions.Item>
              <Descriptions.Item label="状态">{detail.status}</Descriptions.Item>
              <Descriptions.Item label="糖尿病随访（HbA1c/血糖监测）" span={2}>{detail.diabetesRecords}</Descriptions.Item>
              <Descriptions.Item label="甲状腺结节穿刺" span={2}>{detail.thyroidBiopsy}</Descriptions.Item>
              <Descriptions.Item label="骨密度检查" span={2}>{detail.boneDensity}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="疾病谱分解（糖尿病/甲亢/甲减/骨质疏松）">
              <Table rowKey="name" dataSource={detail.diseaseBreakdown} columns={diseaseColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
