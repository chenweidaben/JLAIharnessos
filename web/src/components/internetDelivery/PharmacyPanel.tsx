/**
 * 健澜科技 jlmedaios - 药房配送履约面板（M3-N）
 *
 * 1）建单：从已支付处方选择（自取 / 快递，快递必填收货地址快照）；
 * 2）履约：打包 → 发货（物流公司 + 单号）→ 送达；自取 → 打包 → 核销；未发货可取消。
 * 状态机非法推进由后端拦截，前端仅展示合法下一步。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { useEffect, useState } from 'react';
import {
  Alert, Button, Card, Form, Input, message, Modal, Popconfirm,
  Radio, Space, Spin, Table, Tag,
} from 'antd';
import { useInternetDeliveryStore } from '../../store/internetDeliveryStore';
import { internetDeliveryApi } from '../../services/api/internetDelivery';
import type { PrescriptionDeliveryView } from '../../types/internetDelivery';
import type { EPrescriptionView } from '../../types/internetPrescription';

const NEXT: Record<string, { to: string; label: string }[]> = {
  created: [
    { to: 'packed', label: '打包' },
    { to: 'cancelled', label: '取消' },
  ],
  packed: [
    { to: 'shipped', label: '发货' },
    { to: 'picked_up', label: '自取核销' },
    { to: 'cancelled', label: '取消' },
  ],
  shipped: [{ to: 'delivered', label: '确认送达' }],
  delivered: [],
  picked_up: [],
  cancelled: [],
};

const STATUS_TAG: Record<string, string> = {
  created: '待打包', packed: '已打包', shipped: '已发货',
  delivered: '已送达', picked_up: '已取走', cancelled: '已取消',
};

export function PharmacyPanel() {
  const { healthOk, loading, submitting, allDeliveries, loadAll, createDelivery, fulfill } =
    useInternetDeliveryStore();
  const [form] = Form.useForm();
  const [createOpen, setCreateOpen] = useState(false);
  const [rxOptions, setRxOptions] = useState<EPrescriptionView[]>([]);
  const [rxLoading, setRxLoading] = useState(false);
  const [shippingTarget, setShippingTarget] = useState<PrescriptionDeliveryView | null>(null);
  const [shippingCompany, setShippingCompany] = useState('');
  const [shippingNo, setShippingNo] = useState('');

  useEffect(() => {
    if (healthOk) loadAll();
  }, [healthOk, loadAll]);

  useEffect(() => {
    if (createOpen && healthOk) {
      setRxLoading(true);
      internetDeliveryApi
        .paidRx()
        .then((r) => setRxOptions(r.rxList ?? []))
        .catch(() => setRxOptions([]))
        .finally(() => setRxLoading(false));
    }
  }, [createOpen, healthOk]);

  const openCreate = () => {
    form.resetFields();
    setCreateOpen(true);
  };

  const submitCreate = async () => {
    try {
      const v = await form.validateFields();
      await createDelivery({ rxId: v.rxId, channel: v.channel, address: v.address });
      message.success('配送单已创建');
      setCreateOpen(false);
    } catch (e) {
      // 校验失败（errorFields）由 Form.Item 就地展示，不弹全局错误
      if (!(e as { errorFields?: unknown }).errorFields) {
        message.error((e as Error).message || '建单失败');
      }
    }
  };

  const doFulfill = async (d: PrescriptionDeliveryView, to: string, extra?: Record<string, string>) => {
    try {
      await fulfill({ deliveryId: d.id, to: to as 'packed' | 'shipped' | 'delivered' | 'picked_up' | 'cancelled', ...extra });
      message.success('履约状态已更新');
    } catch (e) {
      message.error((e as Error).message || '操作失败');
    }
  };

  return (
    <Space direction="vertical" size={12} style={{ width: '100%' }}>
      <Card title="药房配送履约" size="small" extra={
        <Button type="primary" onClick={openCreate}>创建配送单</Button>
      }>
        {!healthOk ? (
          <Alert type="warning" showIcon message="服务未就绪，配送业务暂不可用" />
        ) : loading ? (
          <Spin />
        ) : allDeliveries.length === 0 ? (
          <Alert type="info" showIcon message="暂无配送单。请为已支付处方创建配送单。" />
        ) : (
          <Table
            rowKey="id"
            dataSource={allDeliveries}
            pagination={false}
            size="small"
            scroll={{ x: 900 }}
            columns={[
              { title: '配送单号', dataIndex: 'deliveryNo', width: 210, render: (v: string) => <strong>{v}</strong> },
              {
                title: '方式', dataIndex: 'channel', width: 80,
                render: (v: string) => (v === 'self_pick' ? '自取' : '快递'),
              },
              {
                title: '状态', dataIndex: 'status', width: 90,
                render: (v: string) => <Tag color={v === 'cancelled' ? 'error' : v === 'delivered' || v === 'picked_up' ? 'success' : v === 'shipped' ? 'blue' : v === 'packed' ? 'processing' : 'default'}>{STATUS_TAG[v] ?? v}</Tag>,
              },
              {
                title: '取货码/物流', key: 'detail', width: 180,
                render: (_: unknown, r: PrescriptionDeliveryView) =>
                  r.channel === 'self_pick'
                    ? (r.pickupCode ?? '—')
                    : `${r.courierCompany ?? ''} ${r.trackingNo ?? ''}`.trim() || '—',
              },
              {
                title: '收货地址', dataIndex: 'addressSnapshot', width: 180,
                render: (v: string | null) => v ?? '—',
              },
              {
                title: '操作', key: 'action', width: 220,
                render: (_: unknown, r: PrescriptionDeliveryView) => {
                  const nexts = NEXT[r.status] ?? [];
                  if (!nexts.length) return <span style={{ color: '#999' }}>已终态</span>;
                  return (
                    <Space size={4} wrap>
                      {nexts.map((n) =>
                        n.to === 'cancelled' ? (
                          <Popconfirm
                            key={n.to}
                            title="确认取消该配送单？"
                            onConfirm={() => doFulfill(r, n.to)}
                          >
                            <Button danger size="small">{n.label}</Button>
                          </Popconfirm>
                        ) : n.to === 'shipped' ? (
                          <Button key={n.to} size="small" onClick={() => setShippingTarget(r)}>
                            {n.label}
                          </Button>
                        ) : (
                          <Button key={n.to} size="small" onClick={() => doFulfill(r, n.to)}>
                            {n.label}
                          </Button>
                        ),
                      )}
                    </Space>
                  );
                },
              },
            ]}
          />
        )}
      </Card>

      <Modal
        title="创建配送单"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={submitCreate}
        okText="创建"
        confirmLoading={submitting}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="rxId"
            label="电子处方"
            rules={[{ required: true, message: '请选择已支付处方' }]}
          >
            {rxLoading ? (
              <Spin size="small" />
            ) : rxOptions.length === 0 ? (
              <Alert type="info" showIcon message="暂无已支付处方可配送" />
            ) : (
              <Radio.Group>
                {rxOptions.map((r) => (
                  <Radio key={r.id} value={r.id} style={{ display: 'block', marginBottom: 8 }}>
                    {r.rxNo} ￥{r.totalFee ?? 0}
                  </Radio>
                ))}
              </Radio.Group>
            )}
          </Form.Item>
          <Form.Item
            name="channel"
            label="配送方式"
            initialValue="self_pick"
            rules={[{ required: true, message: '请选择配送方式' }]}
          >
            <Radio.Group>
              <Radio.Button value="self_pick">自取（生成取货码）</Radio.Button>
              <Radio.Button value="express">快递</Radio.Button>
            </Radio.Group>
          </Form.Item>
          <Form.Item noStyle shouldUpdate={(prev, cur) => prev.channel !== cur.channel}>
            {({ getFieldValue }) =>
              getFieldValue('channel') === 'express' ? (
                <Form.Item
                  name="address"
                  label="收货地址快照"
                  rules={[{ required: true, message: '快递配送必须填写收货地址' }]}
                >
                  <Input placeholder="收货人 / 电话 / 详细地址" maxLength={200} />
                </Form.Item>
              ) : null
            }
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="发货信息"
        open={!!shippingTarget}
        onCancel={() => setShippingTarget(null)}
        onOk={() => {
          if (shippingTarget && shippingCompany && shippingNo) {
            doFulfill(shippingTarget, 'shipped', {
              courierCompany: shippingCompany,
              trackingNo: shippingNo,
            });
            setShippingTarget(null);
          }
        }}
        okText="确认发货"
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Input
            placeholder="物流公司（如 顺丰/中通）"
            value={shippingCompany}
            onChange={(e) => setShippingCompany(e.target.value)}
            maxLength={40}
          />
          <Input
            placeholder="快递单号"
            value={shippingNo}
            onChange={(e) => setShippingNo(e.target.value)}
            maxLength={40}
          />
          {shippingTarget?.addressSnapshot ? (
            <Alert type="info" showIcon message={`收货地址：${shippingTarget.addressSnapshot}`} />
          ) : null}
        </Space>
      </Modal>
    </Space>
  );
}
