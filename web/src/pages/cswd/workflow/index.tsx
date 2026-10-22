/**
 * 健澜科技 jlmedaios - 消毒供应中心（M689）
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
  Steps,
  Table,
  Tag,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

import { PageContainer } from '@/components/common';
import DemoModeBanner from '@/components/common/DemoModeBanner';
import { usePageTitle } from '@/hooks';
import { useCswdWorkflowM689Store } from '@/store/cswdWorkflowM689Store';
import {
  CSWD_STAGE_META,
  type CswdItem,
} from '@/services/api/cswdWorkflowM689';

const STAGE_ORDER: CswdItem['stage'][] = ['collected', 'washed', 'packed', 'sterilized', 'issued'];

const buildColumns = (setDetail: (r: CswdItem) => void): ColumnsType<CswdItem> => [
  { title: '器械包名', dataIndex: 'packName', width: 200 },
  { title: '灭菌批次', dataIndex: 'lotNo', width: 140 },
  {
    title: '当前阶段',
    dataIndex: 'stage',
    width: 120,
    render: (v: CswdItem['stage']) => <Tag color={CSWD_STAGE_META[v].color}>{CSWD_STAGE_META[v].label}</Tag>,
  },
  { title: '灭菌器', dataIndex: 'sterilizer', width: 180, render: (v: string) => v || '—' },
  { title: '灭菌时间', dataIndex: 'sterilizedAt', width: 150, render: (v: string) => (v ? dayjs(v).format('MM-DD HH:mm') : '—') },
  { title: '有效期至', dataIndex: 'validUntil', width: 120, render: (v: string) => v || '—' },
  { title: '责任人', dataIndex: 'operator', width: 100 },
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

export default function CswdWorkflowM689Page() {
  usePageTitle('消毒供应中心');
  const { items, loading, error, demo, load } = useCswdWorkflowM689Store();
  const [detail, setDetail] = useState<CswdItem | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="消毒供应中心（CSSD）"
      description="器械包名 / 回收 / 清洗 / 包装 / 灭菌状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`器械包（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1100 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="器械处理流程详情"
        width={720}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Steps
              direction="horizontal"
              size="small"
              current={STAGE_ORDER.indexOf(detail.stage)}
              items={STAGE_ORDER.map((s) => ({ title: CSWD_STAGE_META[s].label }))}
              style={{ marginBottom: 24 }}
            />
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="器械包名">{detail.packName}</Descriptions.Item>
              <Descriptions.Item label="灭菌批次号">{detail.lotNo}</Descriptions.Item>
              <Descriptions.Item label="灭菌器">{detail.sterilizer || '—'}</Descriptions.Item>
              <Descriptions.Item label="灭菌时间">
                {detail.sterilizedAt ? dayjs(detail.sterilizedAt).format('YYYY-MM-DD HH:mm') : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="有效期至">{detail.validUntil || '—'}</Descriptions.Item>
              <Descriptions.Item label="责任人">{detail.operator}</Descriptions.Item>
            </Descriptions>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
