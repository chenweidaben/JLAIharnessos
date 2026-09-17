/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 检查检验申请面板：检验 / 检查 / 治疗三类，支持套餐、部位、造影剂过敏提醒、已开申请管理。
 */
import React, { useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Empty,
  Input,
  List,
  Popconfirm,
  Space,
  Statistic,
  Table,
  Tag,
  message,
} from 'antd';
import { DeleteOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';
import type { OrderItem } from '@/types/outpatient';
import { useOutpatientStore } from '@/store/outpatientStore';
import {
  mockImagingCatalog,
  mockLabCatalog,
  mockLabPanels,
  mockTreatmentCatalog,
} from '@/mock/outpatientMock';
import { orderKindLabel } from './constants';

type TabKey = 'lab' | 'imaging' | 'treatment';

export const OrderPanel: React.FC = () => {
  const orders = useOutpatientStore((s) => s.orders);
  const addOrder = useOutpatientStore((s) => s.addOrder);
  const cancelOrder = useOutpatientStore((s) => s.cancelOrder);
  const currentPatient = useOutpatientStore((s) => s.currentPatient);
  const [tab, setTab] = useState<TabKey>('lab');
  const [kw, setKw] = useState('');

  const filteredLab = useMemo(() => {
    const k = kw.trim().toLowerCase();
    if (!k) return mockLabCatalog;
    return mockLabCatalog.filter(
      (l) => l.name.includes(k) || l.code.toLowerCase().includes(k) || l.pinyin.includes(k),
    );
  }, [kw]);

  const filteredImaging = useMemo(() => {
    const k = kw.trim().toLowerCase();
    if (!k) return mockImagingCatalog;
    return mockImagingCatalog.filter(
      (l) => l.name.includes(k) || l.modality.includes(k.toUpperCase()) || l.pinyin.includes(k),
    );
  }, [kw]);

  const filteredTreatment = useMemo(() => {
    const k = kw.trim().toLowerCase();
    if (!k) return mockTreatmentCatalog;
    return mockTreatmentCatalog.filter((l) => l.name.includes(k) || l.pinyin.includes(k));
  }, [kw]);

  const addLab = (itemId: string) => {
    const it = mockLabCatalog.find((l) => l.itemId === itemId);
    if (!it) return;
    const o: OrderItem = {
      orderId: `ORD-${Date.now()}`,
      kind: 'lab',
      catalogId: it.itemId,
      name: it.name,
      price: it.price,
      status: 'pending',
      clinicalReason: '门诊申请',
      note: it.fasting ? '需空腹' : undefined,
      createdAt: new Date().toLocaleString('zh-CN'),
    };
    addOrder(o);
    message.success(`已加检验：${it.name}`);
  };

  const addImaging = (itemId: string) => {
    const it = mockImagingCatalog.find((l) => l.itemId === itemId);
    if (!it) return;
    if (it.needsContrast) {
      const renalOk = currentPatient?.chronicConditions?.some((c) => c.includes('肾')) === false;
      if (!renalOk) {
        message.warning('增强检查需评估肾功能与碘过敏史，请先完成肾功能检查');
      }
    }
    const o: OrderItem = {
      orderId: `ORD-${Date.now()}`,
      kind: 'imaging',
      catalogId: it.itemId,
      name: it.name,
      price: it.price,
      status: 'pending',
      clinicalReason: '门诊申请',
      note: it.note,
      createdAt: new Date().toLocaleString('zh-CN'),
    };
    addOrder(o);
    message.success(`已加检查：${it.name}`);
  };

  const addTreatment = (itemId: string) => {
    const it = mockTreatmentCatalog.find((l) => l.treatmentId === itemId);
    if (!it) return;
    const o: OrderItem = {
      orderId: `ORD-${Date.now()}`,
      kind: 'treatment',
      catalogId: it.treatmentId,
      name: it.name,
      price: it.price,
      status: 'pending',
      clinicalReason: '门诊申请',
      note: it.note,
      createdAt: new Date().toLocaleString('zh-CN'),
    };
    addOrder(o);
    message.success(`已加治疗：${it.name}`);
  };

  const totalFee = orders.reduce((s, o) => s + o.price, 0);

  const columns = [
    {
      title: '类型',
      dataIndex: 'kind',
      render: (k: OrderItem['kind']) => <Tag>{orderKindLabel[k]}</Tag>,
    },
    { title: '项目', dataIndex: 'name' },
    { title: '价格', dataIndex: 'price', render: (p: number) => `¥${p.toFixed(2)}` },
    {
      title: '状态',
      dataIndex: 'status',
      render: (s: OrderItem['status']) => (
        <Tag color={s === 'reported' ? 'success' : s === 'cancelled' ? 'default' : 'processing'}>
          {s === 'pending'
            ? '待执行'
            : s === 'drawn'
              ? '已采样'
              : s === 'reported'
                ? '已报告'
                : '已取消'}
        </Tag>
      ),
    },
    { title: '临床指征', dataIndex: 'clinicalReason' },
    {
      title: '操作',
      render: (_: unknown, o: OrderItem) => (
        <Popconfirm
          title="取消该申请？"
          onConfirm={() => {
            cancelOrder(o.orderId);
            message.info('已取消');
          }}
        >
          <Button size="small" type="text" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      {/* Tab */}
      <div className="flex gap-1">
        {(
          [
            { k: 'lab', label: '检验申请' },
            { k: 'imaging', label: '检查申请' },
            { k: 'treatment', label: '治疗申请' },
          ] as const
        ).map((t) => (
          <button
            key={t.k}
            onClick={() => setTab(t.k)}
            className={`px-3 py-1.5 text-sm rounded ${tab === t.k ? 'text-white' : 'text-ink-secondary hover:bg-gray-100'}`}
            style={tab === t.k ? { background: '#0A4D8C' } : undefined}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Input
        prefix={<SearchOutlined />}
        placeholder="搜索项目名 / 编码 / 拼音"
        value={kw}
        onChange={(e) => setKw(e.target.value)}
        allowClear
      />

      {tab === 'lab' && (
        <>
          {/* 检验套餐 */}
          <Card size="small" title={<span className="text-sm font-semibold">常用检验套餐</span>}>
            <Space wrap>
              {mockLabPanels.map((p) => (
                <Tag
                  key={p.panelId}
                  color="blue"
                  className="cursor-pointer"
                  onClick={() => p.itemIds.forEach(addLab)}
                >
                  {p.name} ¥{p.price}
                </Tag>
              ))}
            </Space>
          </Card>
          <List
            size="small"
            dataSource={filteredLab}
            renderItem={(l) => (
              <List.Item
                actions={[
                  <Button
                    key="add"
                    size="small"
                    type="link"
                    icon={<PlusOutlined />}
                    onClick={() => addLab(l.itemId)}
                  />,
                ]}
              >
                <List.Item.Meta
                  title={
                    <Space size={4}>
                      <span className="font-medium text-sm">{l.name}</span>
                      {l.fasting && (
                        <Tag color="orange" className="!mr-0">
                          空腹
                        </Tag>
                      )}
                    </Space>
                  }
                  description={
                    <span className="text-xs text-ink-secondary">
                      {l.specimen} · ¥{l.price} · {l.turnaroundHours}h 出报告
                      {l.note ? ` · ${l.note}` : ''}
                    </span>
                  }
                />
              </List.Item>
            )}
          />
        </>
      )}

      {tab === 'imaging' && (
        <>
          {currentPatient?.allergies && currentPatient.allergies.length > 0 && (
            <Alert
              type="warning"
              showIcon
              message={`增强检查造影剂提示：患者过敏史 ${currentPatient.allergies.join('、')}，行增强 CT/MRI 前必须评估肾功能与碘/钆过敏。`}
            />
          )}
          <List
            size="small"
            dataSource={filteredImaging}
            renderItem={(l) => (
              <List.Item
                actions={[
                  <Button
                    key="add"
                    size="small"
                    type="link"
                    icon={<PlusOutlined />}
                    onClick={() => addImaging(l.itemId)}
                  />,
                ]}
              >
                <List.Item.Meta
                  title={
                    <Space size={4}>
                      <span className="font-medium text-sm">{l.name}</span>
                      <Tag color="geekblue" className="!mr-0">
                        {l.modality}
                      </Tag>
                      {l.needsContrast && (
                        <Tag color="red" className="!mr-0">
                          需造影剂
                        </Tag>
                      )}
                    </Space>
                  }
                  description={
                    <span className="text-xs text-ink-secondary">
                      ¥{l.price} · 等待约 {l.waitHours}h{l.note ? ` · ${l.note}` : ''}
                    </span>
                  }
                />
              </List.Item>
            )}
          />
        </>
      )}

      {tab === 'treatment' && (
        <List
          size="small"
          dataSource={filteredTreatment}
          renderItem={(l) => (
            <List.Item
              actions={[
                <Button
                  key="add"
                  size="small"
                  type="link"
                  icon={<PlusOutlined />}
                  onClick={() => addTreatment(l.treatmentId)}
                />,
              ]}
            >
              <List.Item.Meta
                title={<span className="font-medium text-sm">{l.name}</span>}
                description={
                  <span className="text-xs text-ink-secondary">
                    ¥{l.price} · 约{l.durationMin}分钟{l.note ? ` · ${l.note}` : ''}
                  </span>
                }
              />
            </List.Item>
          )}
        />
      )}

      {/* 已开申请 */}
      <Card
        size="small"
        title={<span className="text-sm font-semibold">已开申请（{orders.length}）</span>}
      >
        {orders.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无申请" />
        ) : (
          <Table
            rowKey="orderId"
            size="small"
            columns={columns as never}
            dataSource={orders}
            pagination={false}
          />
        )}
        <div className="mt-3 flex items-center justify-between">
          <Statistic
            title="申请总额"
            value={totalFee}
            precision={2}
            prefix="¥"
            valueStyle={{ fontSize: 18, color: '#0A4D8C' }}
          />
          <Button
            type="primary"
            style={{ background: '#0A4D8C' }}
            onClick={() => message.success('申请单已提交，患者可前往相应科室/窗口执行')}
          >
            提交申请
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default OrderPanel;
