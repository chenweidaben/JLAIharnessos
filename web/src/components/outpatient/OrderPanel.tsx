/**
 * 健澜科技 jlmedaios - 检查检验申请面板（真实接口）
 *
 * 检验 / 检查 / 治疗三类目录（BFF 真实目录），支持检验套餐、造影剂提醒、
 * 已开申请管理与撤销。开立即真实落 clinical.orders。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Empty,
  Input,
  List,
  Popconfirm,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
} from 'antd';
import { DeleteOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';
import type {
  ExamCatalogItem,
  OrderItem,
  TreatmentCatalogItem,
} from '@/types/outpatient';
import { useOutpatientStore } from '@/store/outpatientStore';
import {
  fetchImaging,
  fetchLabPanels,
  fetchLabs,
  fetchTreatments,
} from '@/services/api/outpatient';
import { orderKindLabel } from './constants';

type TabKey = 'lab' | 'imaging' | 'treatment';

/** BFF 检验套餐视图 */
interface LabPanelView {
  id: string;
  name: string;
  totalPrice: number;
  itemIds: string[];
  description?: string;
}

export const OrderPanel: React.FC = () => {
  const orders = useOutpatientStore((s) => s.orders);
  const addOrder = useOutpatientStore((s) => s.addOrder);
  const cancelOrder = useOutpatientStore((s) => s.cancelOrder);
  const currentPatient = useOutpatientStore((s) => s.currentPatient);
  const [tab, setTab] = useState<TabKey>('lab');
  const [kw, setKw] = useState('');
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [labs, setLabs] = useState<ExamCatalogItem[]>([]);
  const [imaging, setImaging] = useState<ExamCatalogItem[]>([]);
  const [treatments, setTreatments] = useState<TreatmentCatalogItem[]>([]);
  const [panels, setPanels] = useState<LabPanelView[]>([]);

  useEffect(() => {
    let alive = true;
    setLoadingCatalog(true);
    Promise.all([
      fetchLabs(),
      fetchImaging(),
      fetchTreatments(),
      fetchLabPanels(),
    ])
      .then(([l, i, t, p]) => {
        if (!alive) return;
        setLabs(l);
        setImaging(i);
        setTreatments(t);
        setPanels(p as unknown as LabPanelView[]);
      })
      .catch(() => undefined)
      .finally(() => {
        if (alive) setLoadingCatalog(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const filterItems = <T extends { name: string; id: string }>(list: T[]): T[] => {
    const k = kw.trim().toLowerCase();
    if (!k) return list;
    return list.filter(
      (it) => it.name.includes(k) || it.id.toLowerCase().includes(k),
    );
  };

  const filteredLabs = useMemo(() => filterItems(labs), [labs, kw]);
  const filteredImaging = useMemo(() => filterItems(imaging), [imaging, kw]);
  const filteredTreatments = useMemo(
    () => filterItems(treatments),
    [treatments, kw],
  );

  const addLab = (item: ExamCatalogItem): void => {
    addOrder({
      kind: 'lab',
      catalogId: item.id,
      name: item.name,
      price: Number(item.price),
      clinicalReason: '门诊申请',
      note: item.sampleType ? `标本：${item.sampleType}` : undefined,
    });
  };

  const addImaging = (item: ExamCatalogItem): void => {
    if (item.contrast) {
      const hasRenal = currentPatient?.chronicConditions?.some((c) => c.includes('肾'));
      if (hasRenal) {
        // 仅提醒，不阻断医师决策
      }
    }
    addOrder({
      kind: 'imaging',
      catalogId: item.id,
      name: item.name,
      bodyPart: item.bodyPart ? String(item.bodyPart) : undefined,
      price: Number(item.price),
      clinicalReason: '门诊申请',
      note: item.contrast ? '需造影剂，先评估肾功能/过敏' : undefined,
    });
  };

  const addTreatment = (item: TreatmentCatalogItem): void => {
    addOrder({
      kind: 'treatment',
      catalogId: item.id,
      name: item.name,
      price: Number(item.price),
      clinicalReason: '门诊申请',
      note: item.description,
    });
  };

  const totalFee = orders
    .filter((o) => o.status !== 'cancelled')
    .reduce((s, o) => s + o.price, 0);

  const columns = [
    {
      title: '类型',
      dataIndex: 'kind',
      render: (k: OrderItem['kind']) => <Tag>{orderKindLabel[k]}</Tag>,
    },
    { title: '项目', dataIndex: 'name' },
    { title: '价格', dataIndex: 'price', render: (p: number) => `¥${Number(p).toFixed(2)}` },
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
      render: (_: unknown, o: OrderItem) =>
        o.status === 'cancelled' ? null : (
          <Popconfirm
            title="取消该申请？"
            onConfirm={() => cancelOrder(o.orderId)}
          >
            <Button size="small" type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        ),
    },
  ];

  const renderCatalogList = <T extends { id: string; name: string; price: number }>(
    data: T[],
    onAdd: (item: T) => void,
    meta: (item: T) => React.ReactNode,
  ): React.ReactNode => (
    <List
      size="small"
      dataSource={data}
      renderItem={(item) => (
        <List.Item
          actions={[
            <Button
              key="add"
              size="small"
              type="link"
              icon={<PlusOutlined />}
              onClick={() => onAdd(item)}
            />,
          ]}
        >
          <List.Item.Meta
            title={
              <Space size={4}>
                <span className="font-medium text-sm">{item.name}</span>
                {meta(item)}
              </Space>
            }
            description={
              <span className="text-xs text-ink-secondary">
                ¥{Number(item.price).toFixed(2)}
              </span>
            }
          />
        </List.Item>
      )}
    />
  );

  return (
    <div className="space-y-3">
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
        placeholder="搜索项目名 / 编码"
        value={kw}
        onChange={(e) => setKw(e.target.value)}
        allowClear
      />

      {loadingCatalog ? (
        <div className="py-8 text-center">
          <Spin />
        </div>
      ) : (
        <>
          {tab === 'lab' && (
            <>
              {panels.length > 0 && (
                <Card
                  size="small"
                  title={<span className="text-sm font-semibold">常用检验套餐</span>}
                >
                  <Space wrap>
                    {panels.map((p) => (
                      <Tag
                        key={p.id}
                        color="blue"
                        className="cursor-pointer"
                        onClick={() =>
                          p.itemIds.forEach((cid) => {
                            const it = labs.find((l) => l.id === cid);
                            if (it) addLab(it);
                          })
                        }
                      >
                        {p.name} ¥{p.totalPrice}
                      </Tag>
                    ))}
                  </Space>
                </Card>
              )}
              {renderCatalogList(
                filteredLabs,
                addLab,
                (it) =>
                  it.sampleType ? <Tag className="!mr-0">{it.sampleType}</Tag> : null,
              )}
            </>
          )}

          {tab === 'imaging' && (
            <>
              {currentPatient && currentPatient.allergies.length > 0 && (
                <Alert
                  type="warning"
                  showIcon
                  message={`增强检查造影剂提示：患者过敏史 ${currentPatient.allergies.join('、')}，行增强 CT/MRI 前必须评估肾功能与碘/钆过敏。`}
                />
              )}
              {renderCatalogList(
                filteredImaging,
                addImaging,
                (it) => (
                  <Space size={2}>
                    {it.bodyPart && <Tag color="geekblue" className="!mr-0">{String(it.bodyPart)}</Tag>}
                    {it.contrast && <Tag color="red" className="!mr-0">需造影剂</Tag>}
                  </Space>
                ),
              )}
            </>
          )}

          {tab === 'treatment' &&
            renderCatalogList(filteredTreatments, addTreatment, () => null)}
        </>
      )}

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
        </div>
      </Card>
    </div>
  );
};

export default OrderPanel;
