/**
 * 健澜科技 jlmedaios - PACU 管理（M874）
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
import { usePacuWorkloadM874Store } from '@/store/pacuWorkloadM874Store';
import type { PacuWorkload } from '@/services/api/pacuWorkloadM874';

const buildColumns = (setDetail: (r: PacuWorkload) => void): ColumnsType<PacuWorkload> => [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '入 PACU 数', dataIndex: 'admitted', width: 130, align: 'right', render: (v: number) => <Tag color="blue">{v}</Tag> },
  { title: '出 PACU 数', dataIndex: 'discharged', width: 130, align: 'right', render: (v: number) => <Tag color="cyan">{v}</Tag> },
  { title: '平均停留(min)', dataIndex: 'avgStayMin', width: 140, align: 'right', render: (v: number) => <Tag color={v <= 60 ? 'green' : 'orange'}>{v}</Tag> },
  { title: '延迟拔管数', dataIndex: 'delayedExtubation', width: 130, align: 'right', render: (v: number) => <Tag color="purple">{v}</Tag> },
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

export default function PacuManagementM874Page() {
  usePageTitle('麻醉恢复室（PACU）管理');
  const { items, loading, error, demo, load } = usePacuWorkloadM874Store();
  const [detail, setDetail] = useState<PacuWorkload | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="麻醉恢复室（PACU）管理"
      description="日期 / 入 PACU 数 / 出 PACU 数 / 平均停留时间 / 延迟拔管数 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`PACU 工作（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1300 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="PACU 工作详情"
        width={820}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="日期">{detail.date}</Descriptions.Item>
            <Descriptions.Item label="入 PACU 数">{detail.admitted}</Descriptions.Item>
            <Descriptions.Item label="出 PACU 数">{detail.discharged}</Descriptions.Item>
            <Descriptions.Item label="平均停留">{detail.avgStayMin} min</Descriptions.Item>
            <Descriptions.Item label="延迟拔管数">{detail.delayedExtubation}</Descriptions.Item>
            <Descriptions.Item label="状态">{detail.status}</Descriptions.Item>
            <Descriptions.Item label="Aldrete 评分" span={2}>{detail.aldrete}</Descriptions.Item>
            <Descriptions.Item label="苏醒延迟（>30min）" span={2}>{detail.delayedWake}</Descriptions.Item>
            <Descriptions.Item label="术后恶心呕吐（PONV）" span={2}>{detail.ponv}</Descriptions.Item>
            <Descriptions.Item label="疼痛评分（NRS）" span={2}>{detail.painNrs}</Descriptions.Item>
            <Descriptions.Item label="再入室率" span={2}>{detail.readmission}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </PageContainer>
  );
}
