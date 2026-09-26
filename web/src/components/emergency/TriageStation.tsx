/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 分诊台：接诊新患者 / 待分诊队列 / 分级颜色 / 响应时限倒计时（真实 BFF）
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  App as AntdApp,
  Badge,
  Button,
  Card,
  Col,
  Empty,
  Form,
  Input,
  Modal,
  Radio,
  Row,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Tooltip,
} from 'antd';
import {
  ClockCircleOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  ThunderboltOutlined,
  UserAddOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import clsx from 'clsx';

import { useEmergencyStore } from '@/store/emergencyStore';
import type { EmergencyQueueItem } from '@/types/emergency';
import DispositionModal from './DispositionModal';
import { EM_STATUS_META, TRIAGE_LEVEL_META } from './constants';

type FilterKey = 'waiting' | 'active' | 'all';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'waiting', label: '待分诊' },
  { key: 'active', label: '在院急诊' },
  { key: 'all', label: '全部' },
];

/** 倒计时/时限单元格 */
function CountdownCell({ item }: { item: EmergencyQueueItem }) {
  // 待分诊：显示已等待
  if (item.emStatus === 'waiting_triage') {
    return (
      <Tooltip title="自到达起已等待">
        <span className="text-ink-secondary">
          <ClockCircleOutlined /> 已等 {item.waitMinutes}′
        </span>
      </Tooltip>
    );
  }
  // 终末状态：不显示倒计时
  if (['admitted', 'transferred', 'discharged', 'deceased'].includes(item.emStatus)) {
    return <span className="text-ink-secondary">—</span>;
  }
  if (item.remainingMinutes == null) {
    return <span className="text-ink-secondary">—</span>;
  }
  const overdue = item.overdue || item.remainingMinutes < 0;
  const min = Math.abs(item.remainingMinutes);
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded px-2 py-0.5 text-sm font-semibold',
        overdue ? 'animate-pulse-slow bg-medical-critical/10 text-medical-critical' : 'text-ink-primary',
      )}
    >
      <ThunderboltOutlined />
      {overdue ? `已超时 ${min}′` : `剩余 ${min}′`}
    </span>
  );
}

export default function TriageStation() {
  const { message } = AntdApp.useApp();
  const navigate = useNavigate();
  const {
    queue,
    loadingQueue,
    acting,
    ready,
    fetchQueue,
    fetchChannelTypes,
    createArrival,
  } = useEmergencyStore();

  const [filter, setFilter] = useState<FilterKey>('waiting');
  const [arrivalOpen, setArrivalOpen] = useState(false);
  const [dispItem, setDispItem] = useState<EmergencyQueueItem | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    void fetchQueue();
    void fetchChannelTypes();
  }, [fetchQueue, fetchChannelTypes]);

  const filtered = useMemo(() => {
    if (filter === 'waiting') return queue.filter((q) => q.emStatus === 'waiting_triage');
    if (filter === 'active')
      return queue.filter((q) =>
        ['triaged', 'in_treatment', 'resuscitation', 'observation'].includes(q.emStatus),
      );
    return queue;
  }, [queue, filter]);

  const waitingCount = queue.filter((q) => q.emStatus === 'waiting_triage').length;

  const openArrival = () => {
    form.resetFields();
    form.setFieldsValue({ gender: '男' });
    setArrivalOpen(true);
  };

  const handleArrival = async () => {
    const v = await form.validateFields();
    const r = await createArrival({
      newPatient: {
        nameMasked: v.nameMasked,
        gender: v.gender,
        birthDate: v.birthDate || null,
      },
      chiefComplaint: v.chiefComplaint || undefined,
    });
    message.success(`接诊成功，分诊号 ${r.triage.triageNo}`);
    setArrivalOpen(false);
  };

  const columns: ColumnsType<EmergencyQueueItem> = [
    {
      title: '分诊号',
      dataIndex: 'triageNo',
      width: 120,
      render: (v: string) => <b className="text-jl-primary">{v}</b>,
    },
    {
      title: '患者',
      width: 150,
      render: (_, r) => (
        <div>
          <div className="font-semibold text-ink-primary">{r.patientName}</div>
          <div className="text-xs text-ink-secondary">
            {r.gender === 'male' ? '男' : r.gender === 'female' ? '女' : r.gender} · {r.age}
          </div>
        </div>
      ),
    },
    {
      title: '主诉',
      dataIndex: 'chiefComplaint',
      ellipsis: true,
      render: (v: string | null) => v ?? <span className="text-ink-secondary">—</span>,
    },
    {
      title: '分级',
      dataIndex: 'level',
      width: 110,
      render: (level: number | null, r) =>
        level ? (
          <Tag
            color={TRIAGE_LEVEL_META[(level as 1 | 2 | 3 | 4)]?.color}
            className="mr-0 font-semibold"
          >
            {TRIAGE_LEVEL_META[(level as 1 | 2 | 3 | 4)]?.label}
          </Tag>
        ) : (
          <Tag className="mr-0">{r.emStatus === 'waiting_triage' ? '待分诊' : '—'}</Tag>
        ),
    },
    {
      title: '客观评分',
      width: 120,
      render: (_, r) => (
        <Space size={4}>
          {r.newsScore != null && (
            <Tooltip title="NEWS2 评分">
              <Tag color={r.newsScore >= 7 ? 'error' : r.newsScore >= 5 ? 'warning' : 'default'}>
                N{r.newsScore}
              </Tag>
            </Tooltip>
          )}
          {r.gcsTotal != null && (
            <Tooltip title="GCS 昏迷评分">
              <Tag color={r.gcsTotal <= 8 ? 'error' : 'default'}>G{r.gcsTotal}</Tag>
            </Tooltip>
          )}
          {r.newsScore == null && r.gcsTotal == null && (
            <span className="text-ink-secondary">—</span>
          )}
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'emStatus',
      width: 100,
      render: (s: EmergencyQueueItem['emStatus']) => (
        <Tag color={EM_STATUS_META[s].color} className="mr-0">
          {EM_STATUS_META[s].label}
        </Tag>
      ),
    },
    {
      title: '时限',
      width: 120,
      render: (_, r) => <CountdownCell item={r} />,
    },
    {
      title: '操作',
      width: 150,
      fixed: 'right',
      render: (_, r) => {
        const terminal = ['admitted', 'transferred', 'discharged', 'deceased'].includes(
          r.emStatus,
        );
        if (r.emStatus === 'waiting_triage') {
          return (
            <Button
              type="primary"
              size="small"
              icon={<SafetyCertificateOutlined />}
              onClick={() => navigate(`/emergency/triage/${r.visitId}`)}
            >
              开始分诊
            </Button>
          );
        }
        return (
          <Space size={2}>
            {!terminal && (
              <Button size="small" type="link" onClick={() => setDispItem(r)}>
                转归
              </Button>
            )}
            <Button size="small" onClick={() => navigate(`/emergency/triage/${r.visitId}`)}>
              查看
            </Button>
          </Space>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      {/* 顶部操作栏 */}
      <Row gutter={[12, 12]} align="middle">
        <Col flex="auto">
          <Space wrap>
            <Button
              type="primary"
              icon={<UserAddOutlined />}
              onClick={openArrival}
              disabled={ready === false}
            >
              接诊新患者
            </Button>
            <Button icon={<ReloadOutlined />} onClick={() => void fetchQueue()}>
              刷新
            </Button>
          </Space>
        </Col>
        <Col>
          <Space size="large">
            <Badge count={waitingCount} color="#FAAD14" overflowCount={99}>
              <span className="pr-2 text-sm text-ink-secondary">待分诊</span>
            </Badge>
            <Radio.Group
              value={filter}
              onChange={(e) => setFilter(e.target.value as FilterKey)}
              optionType="button"
              buttonStyle="solid"
            >
              {FILTERS.map((f) => (
                <Radio.Button key={f.key} value={f.key}>
                  {f.label}
                </Radio.Button>
              ))}
            </Radio.Group>
          </Space>
        </Col>
      </Row>

      {/* 队列表格 */}
      <Card className="shadow-card" styles={{ body: { padding: 0 } }}>
        <Spin spinning={loadingQueue}>
          {filtered.length === 0 && !loadingQueue ? (
            <div className="py-12">
              <Empty description="暂无符合条件的患者" />
            </div>
          ) : (
            <Table
              rowKey="visitId"
              columns={columns}
              dataSource={filtered}
              pagination={{ pageSize: 10, showSizeChanger: false }}
              size="middle"
              scroll={{ x: 980 }}
            />
          )}
        </Spin>
      </Card>

      <div className="flex items-center justify-between text-xs text-ink-secondary">
        <span>
          分诊号由数据库序列在单事务内生成，UNIQUE(visit_id) 兜底，并发不重不串
        </span>
        {acting && <span>处理中…</span>}
      </div>

      {/* 接诊新患者 */}
      <Modal
        open={arrivalOpen}
        title="接诊新患者"
        onOk={handleArrival}
        confirmLoading={acting}
        onCancel={() => setArrivalOpen(false)}
        okText="确认接诊"
      >
        <Form form={form} layout="vertical" className="mt-2">
          <Row gutter={12}>
            <Col span={14}>
              <Form.Item
                name="nameMasked"
                label="姓名（脱敏）"
                rules={[{ required: true, message: '请输入姓名' }]}
              >
                <Input placeholder="如：张*国" maxLength={20} />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item name="gender" label="性别">
                <Select
                  options={[
                    { value: '男', label: '男' },
                    { value: '女', label: '女' },
                    { value: '未知', label: '未知' },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="birthDate" label="出生日期（可选，用于自动计算年龄）">
            <Input placeholder="YYYY-MM-DD" />
          </Form.Item>
          <Form.Item name="chiefComplaint" label="主诉">
            <Input placeholder="如：胸痛、呼吸困难、外伤" maxLength={100} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 终末转归 */}
      <DispositionModal item={dispItem} onClose={() => setDispItem(null)} />
    </div>
  );
}
