/**
 * 健澜科技 jlmedaios - 药师审方弹窗（M2-A）
 *
 * 真实 BFF，无 mock。药师对 pending_review 处方进行审核：
 *  - 通过 → approved（进入待发药队列）；
 *  - 退回 → rejected，须填写退回原因；
 *  - 结论哈希链留痕签名（聚合器同事务）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */

import { useEffect, useState } from 'react';
import {
  Button,
  Descriptions,
  Empty,
  Form,
  Input,
  Modal,
  Space,
  Table,
} from 'antd';

import { usePharmacyStore } from '@/store/pharmacyStore';
import type { PharmacyQueueItem } from '@/types/pharmacy';

interface Props {
  item: PharmacyQueueItem | null;
  onClose: () => void;
}

export function ReviewModal({ item, onClose }: Props) {
  const review = usePharmacyStore((s) => s.review);
  const submitting = usePharmacyStore((s) => s.submitting);

  const [comment, setComment] = useState('');
  const rx = item?.prescription ?? null;

  useEffect(() => {
    setComment('');
  }, [rx?.id]);

  const columns = [
    { title: '药品', dataIndex: 'drugName', key: 'drugName' },
    { title: '规格', dataIndex: 'specification', key: 'spec' },
    { title: '用法', dataIndex: 'frequency', key: 'freq' },
    {
      title: '数量',
      key: 'qty',
      render: (_: unknown, row: { quantity: number | null; quantityUnit: string | null }) =>
        `${row.quantity ?? ''} ${row.quantityUnit ?? ''}`,
    },
  ];

  const approve = async () => {
    if (!rx) return;
    const ok = await review(rx.id, 'approved', comment.trim() || null);
    if (ok) onClose();
  };

  const reject = async () => {
    if (!rx) return;
    if (!comment.trim()) return; // 退回必须有原因（按钮禁用兜底）
    const ok = await review(rx.id, 'rejected', comment.trim());
    if (ok) onClose();
  };

  return (
    <Modal
      title="药师处方审核"
      open={Boolean(rx)}
      width={760}
      onCancel={onClose}
      footer={[
        <Button
          key="reject"
          danger
          aria-label="退回处方"
          disabled={!comment.trim() || submitting}
          loading={submitting}
          onClick={() => void reject()}
        >
          退回
        </Button>,
        <Button
          key="approve"
          type="primary"
          aria-label="审核通过"
          loading={submitting}
          onClick={() => void approve()}
        >
          审核通过
        </Button>,
      ]}
      destroyOnClose
    >
      {rx && item ? (
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Descriptions size="small" column={3} bordered>
            <Descriptions.Item label="处方号">{rx.rxNo}</Descriptions.Item>
            <Descriptions.Item label="患者">{item.patientName ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="科室">{item.department ?? '-'}</Descriptions.Item>
          </Descriptions>
          <Table
            rowKey="id"
            size="small"
            pagination={false}
            columns={columns}
            dataSource={rx.items}
          />
          <Form layout="vertical">
            <Form.Item label="审核意见（退回时必填）">
              <Input.TextArea
                aria-label="审核意见"
                rows={2}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="通过可留空；退回请填写原因"
              />
            </Form.Item>
          </Form>
        </Space>
      ) : (
        <Empty description="未选择处方" />
      )}
    </Modal>
  );
}
