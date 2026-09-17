/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 医嘱调整组件 - 当前医嘱 / 新开医嘱 / CDS审核提醒 / 模板
 */
import { useMemo, useState } from 'react';
import { Button, Form, Input, Modal, Popconfirm, Select, Space, Tabs, Tag, message } from 'antd';
import {
  AuditOutlined,
  CloseCircleOutlined,
  EditOutlined,
  FileAddOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import type { OrderCategory, OrderItem, OrderKind } from '@/types/ward';
import { orderCategoryMeta, orderStatusMeta } from './meta';

interface OrderAdjustmentProps {
  orders: OrderItem[];
  patientAllergy: string[];
  onSubmit: (order: OrderItem) => void;
  onStop: (orderId: string) => void;
  templates: Array<{ id: string; name: string; kind: OrderKind; items: string[] }>;
}

const kindOptions: Array<{ value: OrderKind; label: string }> = [
  { value: 'drug', label: '药品医嘱' },
  { value: 'lab', label: '检验医嘱' },
  { value: 'exam', label: '检查医嘱' },
  { value: 'treatment', label: '治疗医嘱' },
  { value: 'nursing', label: '护理医嘱' },
  { value: 'diet', label: '饮食医嘱' },
  { value: 'consultation', label: '会诊医嘱' },
];

export default function OrderAdjustment({
  orders,
  patientAllergy,
  onSubmit,
  onStop,
  templates,
}: OrderAdjustmentProps) {
  const [category, setCategory] = useState<OrderCategory>('permanent');
  const [newKind, setNewKind] = useState<OrderKind>('drug');
  const [newContent, setNewContent] = useState('');
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [selectedTpl, setSelectedTpl] = useState<string | undefined>();

  const permanent = useMemo(
    () => orders.filter((o) => o.category === 'permanent' && o.status !== 'stopped'),
    [orders],
  );
  const temporary = useMemo(
    () => orders.filter((o) => o.category === 'temporary' && o.status !== 'stopped'),
    [orders],
  );

  const alerts = orders.flatMap((o) => o.alerts.map((a) => ({ ...a, orderContent: o.content })));

  const applyTemplate = (tplId: string) => {
    const tpl = templates.find((t) => t.id === tplId);
    if (tpl) {
      setNewKind(tpl.kind);
      setNewContent(tpl.items.join('；'));
      setSelectedTpl(tplId);
    }
  };

  const submitNew = () => {
    if (!newContent.trim()) {
      message.warning('请输入医嘱内容');
      return;
    }
    const newOrder: OrderItem = {
      id: `O-NEW-${Date.now()}`,
      patientId: orders[0]?.patientId ?? 'P000',
      category,
      kind: newKind,
      content: newContent,
      status: 'pending',
      doctor: '陈*',
      orderTime: new Date().toLocaleString('zh-CN', { hour12: false }),
      alerts:
        patientAllergy.length > 0 && newKind === 'drug'
          ? [
              {
                id: `A-${Date.now()}`,
                level: 'warning' as const,
                type: 'allergy' as const,
                message: `患者过敏史：${patientAllergy.join('、')}`,
              },
            ]
          : [],
    };
    onSubmit(newOrder);
    message.success('新开医嘱已提交，待电子签名审核');
    setNewModalOpen(false);
    setNewContent('');
  };

  return (
    <div className="rounded-lg border border-ink-border bg-white shadow-card">
      <div className="flex items-center justify-between border-b border-ink-border p-3">
        <div className="flex items-center gap-2">
          <AuditOutlined className="text-jl-primary" />
          <span className="font-semibold text-ink-primary">医嘱调整</span>
        </div>
        <Button type="primary" icon={<FileAddOutlined />} onClick={() => setNewModalOpen(true)}>
          新开医嘱
        </Button>
      </div>

      {/* CDS 提醒 */}
      {alerts.length > 0 && (
        <div className="m-3 rounded-md border border-red-200 bg-red-50 p-2">
          <div className="mb-1 flex items-center gap-1 text-xs font-semibold text-red-700">
            <SafetyCertificateOutlined /> 智能审核提醒（CDS）
          </div>
          {alerts.map((a) => (
            <div key={a.id} className="text-xs text-red-600">
              · [{a.type}] {a.orderContent}：{a.message}
            </div>
          ))}
        </div>
      )}

      <Tabs
        className="px-3"
        items={[
          {
            key: 'permanent',
            label: `长期医嘱 (${permanent.length})`,
            children: <OrderList orders={permanent} onStop={onStop} />,
          },
          {
            key: 'temporary',
            label: `临时医嘱 (${temporary.length})`,
            children: <OrderList orders={temporary} onStop={onStop} />,
          },
        ]}
      />

      {/* 新开医嘱弹窗 */}
      <Modal
        title="新开医嘱"
        open={newModalOpen}
        onCancel={() => setNewModalOpen(false)}
        width={680}
        footer={[
          <Button key="cancel" onClick={() => setNewModalOpen(false)}>
            取消
          </Button>,
          <Button
            key="submit"
            type="primary"
            icon={<SafetyCertificateOutlined />}
            onClick={submitNew}
          >
            签名提交
          </Button>,
        ]}
      >
        <Form layout="vertical">
          <div className="grid grid-cols-2 gap-3">
            <Form.Item label="医嘱类别" required>
              <Select
                value={category}
                onChange={(v) => setCategory(v)}
                options={[
                  { value: 'permanent', label: '长期医嘱' },
                  { value: 'temporary', label: '临时医嘱' },
                ]}
              />
            </Form.Item>
            <Form.Item label="医嘱类型" required>
              <Select value={newKind} onChange={(v) => setNewKind(v)} options={kindOptions} />
            </Form.Item>
          </div>
          <Form.Item label="医嘱模板">
            <Select
              placeholder="选择常用医嘱模板快速带入"
              allowClear
              value={selectedTpl}
              onChange={applyTemplate}
              options={templates.map((t) => ({ value: t.id, label: t.name }))}
            />
          </Form.Item>
          <Form.Item label="医嘱内容" required>
            <Input.TextArea
              rows={4}
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="如：阿司匹林肠溶片 100mg po qd"
            />
          </Form.Item>
          {patientAllergy.length > 0 && (
            <div className="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-600">
              <SafetyCertificateOutlined /> 患者过敏史：{patientAllergy.join('、')}
              ，开嘱时请注意规避。
            </div>
          )}
        </Form>
      </Modal>
    </div>
  );
}

function OrderList({ orders, onStop }: { orders: OrderItem[]; onStop: (id: string) => void }) {
  return (
    <div className="space-y-2 pb-3">
      {orders.length === 0 && (
        <div className="py-6 text-center text-sm text-ink-secondary">暂无医嘱</div>
      )}
      {orders.map((o) => {
        const sm = orderStatusMeta[o.status];
        return (
          <div
            key={o.id}
            className="flex items-center justify-between rounded-md border border-ink-border p-2"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-ink-primary">{o.content}</span>
                <Tag color={sm.color} style={{ fontSize: 11 }}>
                  {sm.label}
                </Tag>
                {o.alerts.map((a) => (
                  <Tag
                    key={a.id}
                    color={
                      a.level === 'error' ? 'error' : a.level === 'warning' ? 'warning' : 'info'
                    }
                    style={{ fontSize: 11 }}
                  >
                    {a.message}
                  </Tag>
                ))}
              </div>
              <div className="mt-0.5 text-xs text-ink-secondary">
                {orderCategoryMeta[o.category]} · 开嘱：{o.doctor} · {o.orderTime}
              </div>
            </div>
            <Space>
              <Button size="small" icon={<EditOutlined />}>
                变更
              </Button>
              <Popconfirm title="确认停止该医嘱？" onConfirm={() => onStop(o.id)}>
                <Button size="small" danger icon={<CloseCircleOutlined />}>
                  停止
                </Button>
              </Popconfirm>
            </Space>
          </div>
        );
      })}
    </div>
  );
}
