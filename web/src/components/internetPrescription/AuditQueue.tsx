/**
 * 健澜科技 jlmedaios - 互联网电子处方 · 药师审方队列（M3-L）
 *
 * 审方职责分离：仅药师角色可见队列；通过/驳回/退回必须给出结论，
 * 驳回与退回必填审核意见（与后端校验一致）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { useEffect, useState } from 'react';
import {
  Button,
  Card,
  Descriptions,
  Drawer,
  Input,
  Modal,
  Space,
  Table,
  Tag,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useInternetPrescriptionStore } from '../../store/internetPrescriptionStore';
import type { EPrescriptionView } from '../../types/internetPrescription';

const STATUS_TAG: Record<string, { color: string; label: string }> = {
  pending_review: { color: 'gold', label: '待审方' },
  approved: { color: 'green', label: '已通过' },
  rejected: { color: 'red', label: '已驳回' },
  returned: { color: 'orange', label: '已退回' },
  cancelled: { color: 'default', label: '已取消' },
};

export function AuditQueue() {
  const { auditQueue, loadAuditQueue, openAudit, currentAudit, review, submitting, health } =
    useInternetPrescriptionStore();
  const [comment, setComment] = useState('');
  const [modal, setModal] = useState<null | 'rejected' | 'returned'>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (health.online) loadAuditQueue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [health.online]);

  const doReview = async (
    decision: 'approved' | 'rejected' | 'returned',
    auditComment?: string,
  ) => {
    if (!currentAudit) return;
    try {
      await review(currentAudit.id, decision, auditComment);
      message.success(
        decision === 'approved' ? '已通过该处方' : decision === 'rejected' ? '已驳回' : '已退回医生修改',
      );
      setModal(null);
      setConfirmOpen(false);
      setComment('');
    } catch (e) {
      message.error((e as Error).message || '审方失败');
    }
  };

  const columns: ColumnsType<EPrescriptionView> = [
    { title: '处方号', dataIndex: 'rxNo', key: 'rxNo', width: 170 },
    { title: '患者', dataIndex: 'patientName', key: 'patient', width: 90 },
    { title: '开方医生', dataIndex: 'prescriberName', key: 'prescriber', width: 110 },
    { title: '科室', dataIndex: 'department', key: 'dept', width: 100 },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (v: string) => <Tag color={STATUS_TAG[v]?.color}>{STATUS_TAG[v]?.label}</Tag>,
    },
    {
      title: '金额',
      dataIndex: 'totalFee',
      key: 'fee',
      width: 90,
      render: (v?: number | null) => (v == null ? '-' : `¥${v.toFixed(2)}`),
    },
    { title: '提交时间', dataIndex: 'createdAt', key: 'createdAt', width: 160 },
    {
      title: '操作',
      key: 'op',
      width: 90,
      render: (_, r) => (
        <Button type="link" size="small" disabled={r.status !== 'pending_review'} onClick={() => openAudit(r.id)}>
          审方
        </Button>
      ),
    },
  ];

  return (
    <Card title="互联网电子处方 · 审方队列" size="small">
      <Table
        rowKey="id"
        size="small"
        columns={columns}
        dataSource={auditQueue}
        loading={submitting}
        pagination={{ pageSize: 20 }}
        locale={{ emptyText: '暂无待审处方' }}
      />
      <Drawer
        title={currentAudit ? `审方 · ${currentAudit.rxNo}` : '审方'}
        width={560}
        open={!!currentAudit}
        onClose={() => useInternetPrescriptionStore.setState({ currentAudit: null })}
        footer={
          currentAudit && currentAudit.status === 'pending_review' ? (
            <Space>
              <Button
                type="primary"
                onClick={() => {
                  if (comment.trim().length < 2) {
                    message.warning('审核意见至少 2 个字');
                    return;
                  }
                  setConfirmOpen(true);
                }}
              >
                通过
              </Button>
              <Button danger onClick={() => setModal('rejected')}>
                驳回
              </Button>
              <Button onClick={() => setModal('returned')}>退回修改</Button>
            </Space>
          ) : null
        }
      >
        {currentAudit && (
          <>
            <Descriptions column={2} size="small" bordered>
              <Descriptions.Item label="患者">{currentAudit.patientName ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="开方医生">{currentAudit.prescriberName ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="科室">{currentAudit.department ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="风险等级">
                {currentAudit.riskLevel === 'high' ? <Tag color="red">高</Tag> : <Tag>中/低</Tag>}
              </Descriptions.Item>
              <Descriptions.Item label="总金额">
                {currentAudit.totalFee == null ? '-' : `¥${currentAudit.totalFee.toFixed(2)}`}
              </Descriptions.Item>
              <Descriptions.Item label="提交时间">{currentAudit.createdAt}</Descriptions.Item>
            </Descriptions>
            {currentAudit.counsel && (
              <p style={{ marginTop: 12 }}>
                <b>用药指导：</b>
                {currentAudit.counsel}
              </p>
            )}
            <Table
              rowKey="id"
              size="small"
              style={{ marginTop: 12 }}
              pagination={false}
              dataSource={currentAudit.items}
              columns={[
                { title: '药品', dataIndex: 'drugName', key: 'drugName' },
                { title: '规格', dataIndex: 'specification', key: 'spec', render: (v?: string | null) => v ?? '-' },
                {
                  title: '用法',
                  key: 'usage',
                  render: (_, i) =>
                    [i.dosage ? `${i.dosage}${i.dosageUnit ?? ''}` : '', i.frequency ?? '', i.route ?? '']
                      .filter(Boolean)
                      .join(' '),
                },
                {
                  title: '数量',
                  key: 'qty',
                  render: (_, i) => (i.quantity ? `${i.quantity}${i.quantityUnit ?? ''}` : '-'),
                },
                { title: '单价', dataIndex: 'unitPrice', key: 'price', render: (v?: number | null) => (v == null ? '-' : `¥${v.toFixed(2)}`) },
                { title: '金额', dataIndex: 'amount', key: 'amount', render: (v?: number | null) => (v == null ? '-' : `¥${v.toFixed(2)}`) },
                {
                  title: '皮试',
                  key: 'skin',
                  render: (_, i) => (i.skinTest ? <Tag color="red">需皮试</Tag> : '-'),
                },
              ]}
            />
            <Input.TextArea
              rows={3}
              placeholder="审核意见（驳回/退回必填）"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              style={{ marginTop: 12 }}
            />
            {currentAudit.auditComment && (
              <p style={{ marginTop: 8, color: '#888' }}>
                <b>历史意见：</b>
                {currentAudit.auditComment}
              </p>
            )}
          </>
        )}
      </Drawer>

      <Modal
        title={modal === 'rejected' ? '驳回处方' : '退回修改'}
        open={modal !== null}
        okText="确认"
        okButtonProps={{ danger: modal === 'rejected' }}
        onOk={() => {
          if (comment.trim().length < 2) {
            message.warning('驳回/退回必须填写审核意见');
            return;
          }
          doReview(modal!, comment);
        }}
        onCancel={() => setModal(null)}
      >
        <p>请填写审核意见（必填，将随处方反馈给开方医生）：</p>
        <Input.TextArea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} />
      </Modal>

      <Modal
        title="确认通过"
        open={confirmOpen}
        okText="确认通过"
        onOk={() => doReview('approved', comment)}
        onCancel={() => setConfirmOpen(false)}
      >
        <p>通过后处方将可进入取药/配送环节。确认无误？</p>
      </Modal>
    </Card>
  );
}
