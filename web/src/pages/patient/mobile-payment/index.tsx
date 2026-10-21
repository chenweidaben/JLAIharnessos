/**
 * 健澜科技 jlmedaios - 移动缴费（M616，P11 智慧服务）
 *
 * 三甲流程：待缴账单 Table（合计金额）→ 行内「立即支付」Modal 选支付方式 →
 * POST /payments → 缴费记录 Table。权限码 payment:pay。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Input,
  Modal,
  Radio,
  Row,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

import { PageContainer } from '@/components/common';
import DemoModeBanner from '@/components/common/DemoModeBanner';
import { usePageTitle } from '@/hooks';
import { usePermission } from '@/router/guards';
import { useMobilePaymentM616Store } from '@/store/mobilePaymentM616Store';
import {
  FEE_TYPE_META,
  type PendingBill,
  type PaymentRecord,
} from '@/services/api/mobilePaymentM616';

export default function MobilePaymentM616Page() {
  usePageTitle('移动缴费');
  const { hasPermission } = usePermission();
  const canPay = hasPermission('payment:pay');

  const { patientId, bills, payments, loading, acting, error, demo, load, pay } =
    useMobilePaymentM616Store();

  const [activeBill, setActiveBill] = useState<PendingBill | null>(null);
  const [payMethod, setPayMethod] = useState<PaymentRecord['payMethod']>('wechat');

  useEffect(() => {
    void load(patientId);
  }, [load, patientId]);

  const totalDue = bills.reduce((s, b) => s + b.amount, 0);

  const doPay = async () => {
    if (!activeBill) return;
    const ok = await pay({
      patientId,
      billId: activeBill.billId,
      amount: activeBill.amount,
      feeType: activeBill.feeType,
      payMethod,
    });
    if (ok) {
      message.success(`账单 ${activeBill.billId} 已支付 ¥${activeBill.amount.toFixed(2)}`);
      setActiveBill(null);
    }
  };

  const billColumns: ColumnsType<PendingBill> = [
    { title: '账单号', dataIndex: 'billId', width: 180 },
    { title: '项目', dataIndex: 'itemName', width: 220 },
    { title: '费别', dataIndex: 'feeType', width: 110, render: (v: PendingBill['feeType']) => FEE_TYPE_META[v] },
    { title: '金额', dataIndex: 'amount', width: 110, align: 'right', render: (v: number) => `¥${v.toFixed(2)}` },
    { title: '应缴日期', dataIndex: 'dueDate', width: 120 },
    {
      title: '操作',
      width: 110,
      render: (_: unknown, r) => (
        <Button type="link" size="small" disabled={!canPay} onClick={() => setActiveBill(r)}>
          立即支付
        </Button>
      ),
    },
  ];

  const payColumns: ColumnsType<PaymentRecord> = [
    { title: '支付单号', dataIndex: 'id', width: 120 },
    { title: '账单号', dataIndex: 'billId', width: 180 },
    { title: '金额', dataIndex: 'amount', width: 100, align: 'right', render: (v: number) => `¥${v.toFixed(2)}` },
    { title: '费别', dataIndex: 'feeType', width: 100, render: (v: PaymentRecord['feeType']) => FEE_TYPE_META[v] },
    { title: '方式', dataIndex: 'payMethod', width: 100, render: (v: PaymentRecord['payMethod']) => ({ wechat: '微信', alipay: '支付宝', unionpay: '银联' })[v] },
    { title: '支付时间', dataIndex: 'paidAt', width: 160, render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm') },
    { title: '状态', dataIndex: 'status', width: 100, render: (v: PaymentRecord['status']) => (
        <Tag color={v === 'paid' ? 'green' : 'red'}>{v === 'paid' ? '已支付' : '已退款'}</Tag>
    ) },
  ];

  return (
    <PageContainer
      title="移动缴费"
      description="待缴账单在线支付（微信/支付宝/银联），支付记录可查"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}
      {!canPay && (
        <Alert type="warning" showIcon style={{ marginBottom: 12 }} message="当前账号缺少 payment:pay 权限" />
      )}

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic title="待缴笔数" value={bills.length} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="待缴合计（元）" precision={2} value={totalDue} />
          </Card>
        </Col>
        <Col span={12}>
          <Card size="small">
            <Input
              addonBefore="患者"
              defaultValue={patientId}
              onPressEnter={(e) => void load((e.target as HTMLInputElement).value)}
            />
          </Card>
        </Col>
      </Row>

      <Card size="small" title={`待缴账单（${bills.length}）`} style={{ marginBottom: 16 }}>
        <Spin spinning={loading}>
          <Table rowKey="billId" dataSource={bills} columns={billColumns} size="small" pagination={false} />
        </Spin>
      </Card>

      <Card size="small" title={`缴费记录（${payments.length}）`}>
        <Table rowKey="id" dataSource={payments} columns={payColumns} size="small" pagination={{ pageSize: 8 }} />
      </Card>

      <Modal
        open={activeBill != null}
        title="确认支付"
        onCancel={() => setActiveBill(null)}
        footer={null}
      >
        {activeBill && (
          <>
            <Descriptions column={1} size="small" bordered style={{ marginBottom: 16 }}>
              <Descriptions.Item label="账单号">{activeBill.billId}</Descriptions.Item>
              <Descriptions.Item label="项目">{activeBill.itemName}</Descriptions.Item>
              <Descriptions.Item label="金额">
                <b style={{ color: '#cf1322' }}>¥{activeBill.amount.toFixed(2)}</b>
              </Descriptions.Item>
            </Descriptions>
            <Radio.Group
              value={payMethod}
              onChange={(e) => setPayMethod(e.target.value)}
              style={{ marginBottom: 16 }}
            >
              <Radio.Button value="wechat">微信</Radio.Button>
              <Radio.Button value="alipay">支付宝</Radio.Button>
              <Radio.Button value="unionpay">银联</Radio.Button>
            </Radio.Group>
            <Space>
              <Button type="primary" loading={acting} onClick={() => void doPay()}>
                确认支付
              </Button>
              <Button onClick={() => setActiveBill(null)}>取消</Button>
            </Space>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
