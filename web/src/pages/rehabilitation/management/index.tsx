/**
 * 健澜科技 jlmedaios - 康复科管理（M886 原地升级 M846 视图）
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
import { useRehabilitationWorkloadM886Store } from '@/store/rehabilitationWorkloadM886Store';
import type { RehabilitationWorkloadM886 } from '@/services/api/rehabilitationWorkloadM886';

const simpleColumns: ColumnsType<{ name: string; count: number }> = [
  { title: '项目', dataIndex: 'name' },
  { title: '数量', dataIndex: 'count', align: 'right' },
];

const buildColumns = (setDetail: (r: RehabilitationWorkloadM886) => void): ColumnsType<RehabilitationWorkloadM886> => [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '康复评定数', dataIndex: 'assessments', width: 130, align: 'right', render: (v: number) => <Tag color="blue">{v}</Tag> },
  { title: '物理治疗数', dataIndex: 'pt', width: 120, align: 'right', render: (v: number) => <Tag color="cyan">{v}</Tag> },
  { title: '作业治疗数', dataIndex: 'ot', width: 120, align: 'right', render: (v: number) => <Tag color="green">{v}</Tag> },
  { title: '言语治疗数', dataIndex: 'st', width: 120, align: 'right', render: (v: number) => <Tag color="purple">{v}</Tag> },
  { title: '针灸推拿数', dataIndex: 'acupunctureMassage', width: 130, align: 'right', render: (v: number) => <Tag color="orange">{v}</Tag> },
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

export default function RehabilitationManagementM886Page() {
  usePageTitle('康复科管理');
  const { items, loading, error, demo, load } = useRehabilitationWorkloadM886Store();
  const [detail, setDetail] = useState<RehabilitationWorkloadM886 | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="康复科管理"
      description="日期 / 康复评定 / 物理治疗 / 作业治疗 / 言语治疗 / 针灸推拿 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`康复科工作（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1400 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="康复科工作详情"
        width={900}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="日期">{detail.date}</Descriptions.Item>
              <Descriptions.Item label="康复评定数">{detail.assessments}</Descriptions.Item>
              <Descriptions.Item label="物理治疗（PT）">{detail.pt}</Descriptions.Item>
              <Descriptions.Item label="作业治疗（OT）">{detail.ot}</Descriptions.Item>
              <Descriptions.Item label="言语治疗（ST）">{detail.st}</Descriptions.Item>
              <Descriptions.Item label="针灸推拿">{detail.acupunctureMassage}</Descriptions.Item>
              <Descriptions.Item label="状态">{detail.status}</Descriptions.Item>
              <Descriptions.Item label="康复评定（Fugl-Meyer/Barthel）" span={2}>{detail.assessment}</Descriptions.Item>
              <Descriptions.Item label="康复效果（Barthel 改善）" span={2}>{detail.outcome}</Descriptions.Item>
            </Descriptions>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Card size="small" title="病种分类（脑卒中/脑外伤/脊髓损伤/骨关节术后）">
                <Table rowKey="name" dataSource={detail.diseaseBreakdown} columns={simpleColumns} size="small" pagination={false} />
              </Card>
              <Card size="small" title="治疗手段（PT/OT/ST/针灸/推拿）">
                <Table rowKey="name" dataSource={detail.modalities} columns={simpleColumns} size="small" pagination={false} />
              </Card>
            </div>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
