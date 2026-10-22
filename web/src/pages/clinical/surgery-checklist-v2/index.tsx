/**
 * 健澜科技 jlmedaios - 手术核查表（M660，配套 M551）
 *
 * 三甲流程：三方核查 Table（signIn 麻醉前 / timeOut 切皮前 / signOut 离室前）+ 详情 Modal。
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
  Space,
  Spin,
  Table,
  Tag,
} from 'antd';
import { CheckCircleFilled, MinusCircleFilled } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

import { PageContainer } from '@/components/common';
import DemoModeBanner from '@/components/common/DemoModeBanner';
import { usePageTitle } from '@/hooks';
import { useSurgeryChecklistV2M660Store } from '@/store/surgeryChecklistV2M660Store';
import type { SurgeryChecklist } from '@/services/api/surgeryChecklistV2M660';

const renderStep = (done: boolean, at: string) =>
  done ? (
    <Tag color="green" icon={<CheckCircleFilled />}>
      {at ? dayjs(at).format('MM-DD HH:mm') : '已完成'}
    </Tag>
  ) : (
    <Tag color="default" icon={<MinusCircleFilled />}>
      未完成
    </Tag>
  );

const buildColumns = (setDetail: (row: SurgeryChecklist) => void): ColumnsType<SurgeryChecklist> => [
  { title: '核查号', dataIndex: 'id', width: 100 },
  { title: '手术号', dataIndex: 'surgeryId', width: 100 },
  { title: '手术名称', dataIndex: 'surgeryName', ellipsis: true },
  { title: '术者', dataIndex: 'surgeon', width: 100 },
  { title: 'Sign In（麻醉前）', dataIndex: 'signIn', width: 160, render: (v: SurgeryChecklist['signIn']) => renderStep(v.done, v.at) },
  { title: 'Time Out（切皮前）', dataIndex: 'timeOut', width: 160, render: (v: SurgeryChecklist['timeOut']) => renderStep(v.done, v.at) },
  { title: 'Sign Out（离室前）', dataIndex: 'signOut', width: 160, render: (v: SurgeryChecklist['signOut']) => renderStep(v.done, v.at) },
  {
    title: '操作',
    dataIndex: 'id',
    width: 100,
    render: (_v, row) => <Button type="link" size="small" onClick={() => setDetail(row)}>详情</Button>,
  },
];

export default function SurgeryChecklistV2M660Page() {
  usePageTitle('手术核查表');

  const { items, loading, error, demo, load } = useSurgeryChecklistV2M660Store();

  const [detail, setDetail] = useState<SurgeryChecklist | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="手术核查表（v2）"
      description="麻醉前 / 切皮前 / 离室前三方核查"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`核查记录（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1000 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="核查详情"
        width={720}
        footer={
          <Space>
            <Button onClick={() => setDetail(null)}>关闭</Button>
          </Space>
        }
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="手术号">{detail.surgeryId}</Descriptions.Item>
            <Descriptions.Item label="患者 ID">{detail.patientId}</Descriptions.Item>
            <Descriptions.Item label="手术名称">{detail.surgeryName}</Descriptions.Item>
            <Descriptions.Item label="术者">{detail.surgeon}</Descriptions.Item>
            <Descriptions.Item label="麻醉医师">{detail.anesthesiologist}</Descriptions.Item>
            <Descriptions.Item label="巡回护士">{detail.nurse}</Descriptions.Item>
            <Descriptions.Item label="Sign In（麻醉前）">
              {renderStep(detail.signIn.done, detail.signIn.at)}
              <div style={{ marginTop: 6 }}>{detail.signIn.note}</div>
            </Descriptions.Item>
            <Descriptions.Item label="Time Out（切皮前）">
              {renderStep(detail.timeOut.done, detail.timeOut.at)}
              <div style={{ marginTop: 6 }}>{detail.timeOut.note}</div>
            </Descriptions.Item>
            <Descriptions.Item label="Sign Out（离室前）">
              {renderStep(detail.signOut.done, detail.signOut.at)}
              <div style={{ marginTop: 6 }}>{detail.signOut.note}</div>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </PageContainer>
  );
}
