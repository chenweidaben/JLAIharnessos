/**
 * 健澜科技 jlmedaios - 疼痛科管理（M887 原地升级 M847 视图）
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
import { usePainWorkloadM887Store } from '@/store/painWorkloadM887Store';
import type { PainWorkloadM887 } from '@/services/api/painWorkloadM887';

const simpleColumns: ColumnsType<{ name: string; count: number }> = [
  { title: '项目', dataIndex: 'name' },
  { title: '数量', dataIndex: 'count', align: 'right' },
];

const buildColumns = (setDetail: (r: PainWorkloadM887) => void): ColumnsType<PainWorkloadM887> => [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '门诊疼痛患者数', dataIndex: 'clinicPatients', width: 160, align: 'right', render: (v: number) => <Tag color="blue">{v}</Tag> },
  { title: '神经阻滞数', dataIndex: 'nerveBlock', width: 130, align: 'right', render: (v: number) => <Tag color="cyan">{v}</Tag> },
  { title: '射频治疗数', dataIndex: 'rf', width: 120, align: 'right', render: (v: number) => <Tag color="purple">{v}</Tag> },
  { title: '鞘内泵数', dataIndex: 'intrathecalPump', width: 120, align: 'right', render: (v: number) => <Tag color="red">{v}</Tag> },
  { title: '癌痛随访数', dataIndex: 'cancerFollowup', width: 130, align: 'right', render: (v: number) => <Tag color="orange">{v}</Tag> },
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

export default function PainManagementM887Page() {
  usePageTitle('疼痛科管理');
  const { items, loading, error, demo, load } = usePainWorkloadM887Store();
  const [detail, setDetail] = useState<PainWorkloadM887 | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="疼痛科管理"
      description="日期 / 门诊疼痛患者 / 神经阻滞 / 射频治疗 / 鞘内泵 / 癌痛随访 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`疼痛科工作（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1500 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="疼痛科工作详情"
        width={900}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="日期">{detail.date}</Descriptions.Item>
              <Descriptions.Item label="门诊疼痛患者数">{detail.clinicPatients}</Descriptions.Item>
              <Descriptions.Item label="神经阻滞数">{detail.nerveBlock}</Descriptions.Item>
              <Descriptions.Item label="射频治疗数">{detail.rf}</Descriptions.Item>
              <Descriptions.Item label="鞘内泵数">{detail.intrathecalPump}</Descriptions.Item>
              <Descriptions.Item label="癌痛随访数">{detail.cancerFollowup}</Descriptions.Item>
              <Descriptions.Item label="状态">{detail.status}</Descriptions.Item>
              <Descriptions.Item label="NRS 治疗前 vs 治疗后" span={2}>{detail.nrsComparison}</Descriptions.Item>
              <Descriptions.Item label="癌痛规范化治疗（GPM）" span={2}>{detail.gpm}</Descriptions.Item>
            </Descriptions>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Card size="small" title="疼痛分类（神经病理性/脊柱/癌痛/术后慢性）">
                <Table rowKey="name" dataSource={detail.categoryBreakdown} columns={simpleColumns} size="small" pagination={false} />
              </Card>
              <Card size="small" title="治疗手段（神经阻滞/射频/鞘内泵/SCS）">
                <Table rowKey="name" dataSource={detail.modalityBreakdown} columns={simpleColumns} size="small" pagination={false} />
              </Card>
            </div>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
