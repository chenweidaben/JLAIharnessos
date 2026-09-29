/**
 * 健澜科技 jlmedaios - 结算单详情组件（M3-B）
 *
 * 展示费用明细、电子票据、退费记录、Saga 编排日志；
 * 对已结算明细发起退费（Saga 补偿，原因必填）；未付结算单可作废。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */

import { useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Divider,
  Input,
  Modal,
  Space,
  Table,
  Tag,
  Timeline,
  Typography,
  message as antdMessage,
} from 'antd';
import {
  FileTextOutlined,
  RedoOutlined,
  RollbackOutlined,
} from '@ant-design/icons';
import { useBillingStore } from '@/store/billingStore';
import {
  FEE_CATEGORY_LABEL,
  FEE_STATUS_COLOR,
  FEE_STATUS_LABEL,
  PAYMENT_METHOD_LABEL,
  SETTLEMENT_STATUS_COLOR,
  SETTLEMENT_STATUS_LABEL,
  type FeeItem,
} from '@/types/billing';

const { Text } = Typography;

export default function SettlementDetail() {
  const {
    detail, loading, submitting, refund, void: voidSettlement,
  } = useBillingStore();
  const [refundTarget, setRefundTarget] = useState<FeeItem | null>(null);
  const [refundReason, setRefundReason] = useState('');

  if (!detail) {
    return (
      <Card>
        <Text type="secondary">请在上方队列选择结算单查看详情。</Text>
      </Card>
    );
  }

  const { settlement, items, invoice, refunds, sagaLog } = detail;

  const feeColumns = [
    { title: '项目', dataIndex: 'itemName', key: 'itemName' },
    {
      title: '类别',
      dataIndex: 'category',
      key: 'category',
      render: (v: FeeItem['category']) => <Tag>{FEE_CATEGORY_LABEL[v]}</Tag>,
    },
    {
      title: '数量', dataIndex: 'quantity', key: 'quantity', align: 'right' as const,
    },
    {
      title: '单价', dataIndex: 'unitPrice', key: 'unitPrice', align: 'right' as const,
      render: (v: string) => `¥${v}`,
    },
    {
      title: '金额', dataIndex: 'amount', key: 'amount', align: 'right' as const,
      render: (v: string) => <strong>¥{v}</strong>,
    },
    {
      title: '状态', dataIndex: 'status', key: 'status',
      render: (v: FeeItem['status']) => (
        <Tag color={FEE_STATUS_COLOR[v]}>{FEE_STATUS_LABEL[v]}</Tag>
      ),
    },
    {
      title: '操作', key: 'action',
      render: (_: unknown, row: FeeItem) =>
        row.status === 'settled' ? (
          <Button
            type="link"
            size="small"
            danger
            icon={<RollbackOutlined />}
            onClick={() => {
              setRefundTarget(row);
              setRefundReason('');
            }}
            data-testid="billing-refund-btn"
          >
            退费
          </Button>
        ) : (
          <span />
        ),
    },
  ];

  const confirmRefund = async () => {
    if (!refundTarget) return;
    if (!refundReason.trim()) {
      antdMessage.warning('请填写退费原因');
      return;
    }
    const ok = await refund(refundTarget.id, refundReason);
    if (ok) {
      antdMessage.success('退费成功');
      setRefundTarget(null);
    }
  };

  return (
    <Card
      title={
        <Space>
          <FileTextOutlined />
          结算单 {settlement.settlementNo}
          <Tag color={SETTLEMENT_STATUS_COLOR[settlement.status]}>
            {SETTLEMENT_STATUS_LABEL[settlement.status]}
          </Tag>
        </Space>
      }
      extra={
        settlement.status === 'unpaid' ? (
          <Button
            danger
            icon={<RedoOutlined />}
            loading={submitting}
            onClick={() => void voidSettlement(settlement.id)}
            data-testid="billing-void-btn"
          >
            作废
          </Button>
        ) : null
      }
    >
      <Descriptions size="small" column={3} bordered>
        <Descriptions.Item label="科室">{settlement.department}</Descriptions.Item>
        <Descriptions.Item label="支付方式">
          {PAYMENT_METHOD_LABEL[settlement.paymentMethod]}
        </Descriptions.Item>
        <Descriptions.Item label="版本号">{settlement.version}</Descriptions.Item>
        <Descriptions.Item label="应收金额">
          <Text strong>¥{settlement.totalAmount}</Text>
        </Descriptions.Item>
        <Descriptions.Item label="已收金额">¥{settlement.paidAmount}</Descriptions.Item>
        <Descriptions.Item label="已退金额">
          <Text type={Number(settlement.refundedAmount) > 0 ? 'danger' : undefined}>
            ¥{settlement.refundedAmount}
          </Text>
        </Descriptions.Item>
      </Descriptions>

      <Divider orientation="left">费用明细</Divider>
      <Table<FeeItem>
        rowKey="id"
        size="small"
        loading={loading}
        columns={feeColumns}
        dataSource={items}
        pagination={false}
      />

      <Divider orientation="left">电子票据</Divider>
      {invoice ? (
        <Alert
          type="success"
          showIcon
          data-testid="billing-invoice"
          message={
            <span>
              票据号 <strong>{invoice.invoiceNo}</strong>（
              {invoice.invoiceType === 'electronic' ? '电子医疗票据' : '纸质票据'}）
              ，金额 ¥{invoice.totalAmount}
              {Number(invoice.refundedAmount) > 0 &&
                `，已退 ¥${invoice.refundedAmount}`}
            </span>
          }
        />
      ) : (
        <Text type="secondary">尚未开具票据。</Text>
      )}

      <Divider orientation="left">退费记录（{refunds.length}）</Divider>
      {refunds.length === 0 ? (
        <Text type="secondary">无退费记录。</Text>
      ) : (
        <Table
          rowKey="id"
          size="small"
          pagination={false}
          dataSource={refunds}
          columns={[
            { title: '退费单号', dataIndex: 'refundNo', key: 'refundNo' },
            {
              title: '金额', dataIndex: 'amount', key: 'amount',
              render: (v: string) => `¥${v}`,
            },
            { title: '原因', dataIndex: 'reason', key: 'reason' },
            { title: '时间', dataIndex: 'refundedAt', key: 'refundedAt' },
          ]}
        />
      )}

      <Divider orientation="left">Saga 编排日志</Divider>
      <Timeline
        items={sagaLog.map((log) => ({
          color: log.direction === 'compensate' ? 'red' : 'green',
          children: (
            <span data-testid="billing-saga-item">
              <Tag color={log.direction === 'compensate' ? 'red' : 'blue'}>
                {log.direction === 'compensate' ? '补偿' : '正向'}
              </Tag>
              {log.step} · {log.status}
            </span>
          ),
        }))}
      />

      <Modal
        title="费用退费（Saga 补偿）"
        open={refundTarget !== null}
        onOk={() => void confirmRefund()}
        confirmLoading={submitting}
        onCancel={() => setRefundTarget(null)}
        okText="确认退费"
        cancelText="取消"
        okButtonProps={{ danger: true }}
        data-testid="billing-refund-modal"
      >
        {refundTarget && (
          <Space direction="vertical" className="w-full">
            <Text>
              项目：{refundTarget.itemName}，退费金额{' '}
              <Text type="danger" strong>¥{refundTarget.amount}</Text>
            </Text>
            <Input.TextArea
              rows={3}
              placeholder="请填写退费原因（必填，如：药品退回、检查取消）"
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              data-testid="billing-refund-reason"
            />
          </Space>
        )}
      </Modal>
    </Card>
  );
}
