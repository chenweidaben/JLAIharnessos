/**
 * 健澜科技 jlmedaios - 转诊详情组件（M3-R）
 *
 * 转诊信息 + 随附资料列表 + 添加资料；
 * 接收（生成本院就诊）/ 拒绝 / 完成 / 取消 状态机操作。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */

import { useState } from 'react';
import {
  Button,
  Card,
  Descriptions,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
} from 'antd';
import { useReferralStore } from '@/store/referralStore';
import type { ReferralDocType, ReferralDocument } from '@/types/referral';

const DOC_TYPE_LABEL: Record<string, string> = {
  dicom: 'DICOM 影像',
  front_page: '病案首页',
  diagnosis: '诊断证明书',
  lab: '检验结果',
  exam: '检查报告',
  other: '其他',
};

interface DocForm {
  docType: ReferralDocType;
  title: string;
  contentRef?: string;
  contentText?: string;
}

export default function ReferralDetail() {
  const {
    detail,
    loading,
    submitting,
    addDocument,
    accept,
    reject,
    complete,
    cancel,
  } = useReferralStore();

  const [docOpen, setDocOpen] = useState(false);
  const [acceptOpen, setAcceptOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [docForm] = Form.useForm<DocForm>();
  const [acceptForm] = Form.useForm<{ department: string; visitType: 'outpatient' | 'inpatient' }>();
  const [rejectForm] = Form.useForm<{ reason: string }>();

  if (!detail) {
    return (
      <Card>
        <Empty description="请选择转诊单查看详情" />
      </Card>
    );
  }

  const r = detail.referral;
  const canProcess = r.status === 'submitted';
  const canComplete = r.status === 'accepted';

  const submitDoc = async () => {
    const values = await docForm.validateFields();
    const ok = await addDocument({
      docType: values.docType,
      title: values.title,
      contentRef: values.contentRef ?? null,
      contentText: values.contentText ?? null,
    });
    if (ok) {
      setDocOpen(false);
      docForm.resetFields();
    }
  };

  const submitAccept = async () => {
    const values = await acceptForm.validateFields();
    const ok = await accept({
      department: values.department,
      visitType: values.visitType,
    });
    if (ok) setAcceptOpen(false);
  };

  const submitReject = async () => {
    const values = await rejectForm.validateFields();
    const ok = await reject(values.reason);
    if (ok) setRejectOpen(false);
  };

  const docColumns = [
    {
      title: '类型',
      key: 'docType',
      render: (_: unknown, d: ReferralDocument) => (
        <Tag color="blue">{DOC_TYPE_LABEL[d.docType]}</Tag>
      ),
    },
    { title: '标题', dataIndex: 'title', key: 'title' },
    {
      title: '内容引用',
      dataIndex: 'contentRef',
      key: 'contentRef',
      render: (v: string | null) => v ?? '—',
    },
    {
      title: '来源机构',
      dataIndex: 'sourceOrg',
      key: 'sourceOrg',
      render: (v: string | null) => v ?? '—',
    },
    {
      title: '接收时间',
      dataIndex: 'receivedAt',
      key: 'receivedAt',
      render: (v: string) => new Date(v).toLocaleString('zh-CN'),
    },
  ];

  return (
    <Card
      loading={loading}
      title={`转诊详情 · ${r.referralNo}`}
      extra={
        <Space>
          <Button onClick={() => setDocOpen(true)}>补充资料</Button>
          {r.direction === 'incoming' && (
            <Button type="primary" disabled={!canProcess} onClick={() => setAcceptOpen(true)}>
              接收并生成本院就诊
            </Button>
          )}
          <Button danger disabled={!canProcess} onClick={() => setRejectOpen(true)}>
            拒绝
          </Button>
          {canComplete && (
            <Button type="primary" onClick={() => void complete()}>
              完成
            </Button>
          )}
          {canProcess && (
            <Popconfirm title="确认取消该转诊单？" onConfirm={() => void cancel()}>
              <Button>取消</Button>
            </Popconfirm>
          )}
        </Space>
      }
    >
      <Descriptions bordered size="small" column={2} className="mb-4">
        <Descriptions.Item label="方向">
          {r.direction === 'incoming' ? '转入' : '转出'}
        </Descriptions.Item>
        <Descriptions.Item label="状态">
          <Tag color={r.urgency === 'urgent' ? 'red' : 'blue'}>
            {r.status}
            {r.urgency === 'urgent' ? '（急诊）' : ''}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label="患者">{r.patientName ?? '—'}</Descriptions.Item>
        <Descriptions.Item label="性别">{r.gender ?? '—'}</Descriptions.Item>
        <Descriptions.Item label="源机构">
          {r.sourceOrg}
          {r.sourceDept ? `（${r.sourceDept}）` : ''}
          {r.sourceDoctor ? ` ${r.sourceDoctor}` : ''}
        </Descriptions.Item>
        <Descriptions.Item label="目标机构">
          {r.targetOrg}
          {r.targetDept ? `（${r.targetDept}）` : ''}
        </Descriptions.Item>
        <Descriptions.Item label="转诊原因" span={2}>
          {r.reason}
        </Descriptions.Item>
        <Descriptions.Item label="生成就诊" span={2}>
          {r.encounterId ?? '尚未生成'}
        </Descriptions.Item>
        {r.rejectedReason && (
          <Descriptions.Item label="拒绝原因" span={2}>
            {r.rejectedReason}
          </Descriptions.Item>
        )}
      </Descriptions>

      <Table<ReferralDocument>
        rowKey="id"
        size="small"
        columns={docColumns}
        dataSource={detail.documents}
        pagination={false}
        expandable={{
          expandedRowRender: (d) => (
            <p className="whitespace-pre-wrap">{d.contentText ?? '（无文本内容）'}</p>
          ),
          rowExpandable: (d) => Boolean(d.contentText),
        }}
      />

      {/* 补充资料 */}
      <Modal
        title="补充随附资料"
        open={docOpen}
        confirmLoading={submitting}
        onOk={() => void submitDoc()}
        onCancel={() => setDocOpen(false)}
      >
        <Form form={docForm} layout="vertical" initialValues={{ docType: 'dicom' }}>
          <Form.Item name="docType" label="资料类型" rules={[{ required: true }]}>
            <Select
              options={Object.entries(DOC_TYPE_LABEL).map(([v, l]) => ({
                value: v,
                label: l,
              }))}
            />
          </Form.Item>
          <Form.Item name="title" label="标题" rules={[{ required: true }]}>
            <Input placeholder="如 胸部CT" />
          </Form.Item>
          <Form.Item name="contentRef" label="内容引用（study UID / 文件 key）">
            <Input placeholder="如 1.2.840.xxx" />
          </Form.Item>
          <Form.Item name="contentText" label="文本内容（报告摘要）">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 接收 */}
      <Modal
        title="接收转诊并生成本院就诊"
        open={acceptOpen}
        confirmLoading={submitting}
        onOk={() => void submitAccept()}
        onCancel={() => setAcceptOpen(false)}
      >
        <Form form={acceptForm} layout="vertical" initialValues={{ visitType: 'outpatient' }}>
          <Form.Item name="visitType" label="就诊类型">
            <Select
              options={[
                { label: '门诊', value: 'outpatient' },
                { label: '住院', value: 'inpatient' },
              ]}
            />
          </Form.Item>
          <Form.Item
            name="department"
            label="接收科室"
            rules={[{ required: true, message: '请输入接收科室' }]}
          >
            <Input placeholder="如 心血管内科" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 拒绝 */}
      <Modal
        title="拒绝转诊"
        open={rejectOpen}
        confirmLoading={submitting}
        onOk={() => void submitReject()}
        onCancel={() => setRejectOpen(false)}
      >
        <Form form={rejectForm} layout="vertical">
          <Form.Item
            name="reason"
            label="拒绝原因"
            rules={[{ required: true, message: '请填写拒绝原因' }]}
          >
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
