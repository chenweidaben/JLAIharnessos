/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 候诊队列组件：待诊/已诊/过号/停诊 Tab、叫号、搜索、统计。
 */
import React, { useMemo, useState } from 'react';
import {
  Button,
  Card,
  Empty,
  Input,
  Popconfirm,
  Space,
  Statistic,
  Tag,
  Tooltip,
  message,
} from 'antd';
import {
  AudioOutlined,
  SearchOutlined,
  ClockCircleOutlined,
  RedoOutlined,
  StopOutlined,
  CustomerServiceOutlined,
} from '@ant-design/icons';
import type { WaitingPatient, QueueStatus } from '@/types/outpatient';
import { useOutpatientStore } from '@/store/outpatientStore';
import { clickableProps } from '@/utils/a11y';
import {
  insuranceLabel,
  queueStatusColor,
  queueStatusLabel,
  visitTypeColor,
  visitTypeLabel,
} from './constants';

interface Props {
  onSelect: (encounterId: string) => void;
}

type TabKey = QueueStatus;

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'waiting', label: '待诊' },
  { key: 'in_consult', label: '就诊中' },
  { key: 'visited', label: '已诊' },
  { key: 'passed', label: '过号' },
  { key: 'stopped', label: '停诊' },
];

export const WaitingQueue: React.FC<Props> = ({ onSelect }) => {
  const queue = useOutpatientStore((s) => s.queue);
  const currentEncounterId = useOutpatientStore((s) => s.currentEncounterId);
  const markQueueStatus = useOutpatientStore((s) => s.markQueueStatus);
  const fetchWaitingQueue = useOutpatientStore((s) => s.fetchWaitingQueue);
  const loading = useOutpatientStore((s) => s.loading);
  const stats = useOutpatientStore((s) => s.stats);
  const [kw, setKw] = useState('');
  const [tab, setTab] = useState<TabKey>('waiting');

  /** 呼叫下一位候诊患者 */
  const callNextLocal = (): void => {
    const next = queue.find((q) => q.status === 'waiting');
    if (next) {
      onSelect(next.encounterId);
      message.success(`已叫号 ${next.patient.nameMasked}（${next.queueNo}号）`);
    } else {
      message.info('当前没有待诊患者');
    }
  };

  const counts = useMemo(() => {
    const c: Record<QueueStatus, number> = {
      waiting: 0,
      in_consult: 0,
      visited: 0,
      passed: 0,
      stopped: 0,
    };
    queue.forEach((q) => (c[q.status] += 1));
    return c;
  }, [queue]);

  const filtered = useMemo(() => {
    const k = kw.trim();
    const byTab = queue.filter((q) => q.status === tab);
    if (!k) return byTab;
    return byTab.filter(
      (q) =>
        q.patient.nameMasked.includes(k) || String(q.queueNo).includes(k) || q.ticketNo.includes(k),
    );
  }, [queue, kw, tab]);

  const renderItem = (item: WaitingPatient) => {
    const isCurrent = item.encounterId === currentEncounterId;
    return (
      <div
        key={item.encounterId}
        {...clickableProps(() => {
          if (item.status === 'waiting' || item.status === 'in_consult') {
            onSelect(item.encounterId);
          }
        })}
        className={`px-3 py-2.5 border-b border-ink-border cursor-pointer transition-colors hover:bg-blue-50 border-l-4 ${
          isCurrent ? 'bg-blue-50' : 'border-l-transparent'
        }`}
        style={isCurrent ? { borderLeftColor: '#0A4D8C' } : undefined}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold text-white shrink-0"
              style={{ background: isCurrent ? '#0A4D8C' : '#8c8c8c' }}
            >
              {item.queueNo}
            </span>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-medium text-ink-primary">{item.patient.nameMasked}</span>
                <span className="text-xs text-ink-secondary">
                  {item.patient.gender === 'male' ? '男' : '女'} · {item.patient.age}岁
                </span>
                <Tag color={visitTypeColor[item.visitType]} className="!mr-0 !text-[10px]">
                  {visitTypeLabel[item.visitType]}
                </Tag>
              </div>
              <div className="text-xs text-ink-secondary mt-0.5 flex items-center gap-2">
                <span>{insuranceLabel[item.patient.insurance]}</span>
                <span className="flex items-center gap-0.5">
                  <ClockCircleOutlined /> {item.registerTime}
                </span>
                {item.waitMinutes > 0 && item.status === 'waiting' && (
                  <span className="text-medical-abnormal">等{item.waitMinutes}min</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Tag color={queueStatusColor[item.status]}>{queueStatusLabel[item.status]}</Tag>
            {item.status === 'waiting' && (
              <Space size={4} onClick={(e) => e.stopPropagation()}>
                <Tooltip title="叫号">
                  <Button
                    size="small"
                    type="primary"
                    ghost
                    icon={<AudioOutlined />}
                    onClick={() => {
                      onSelect(item.encounterId);
                      message.success(`已叫号 ${item.patient.nameMasked}（${item.queueNo}号）`);
                    }}
                  />
                </Tooltip>
                <Popconfirm
                  title="确认过号？"
                  onConfirm={() => {
                    markQueueStatus(item.encounterId, 'passed');
                    message.info('已置为过号');
                  }}
                >
                  <Tooltip title="过号">
                    <Button size="small" icon={<RedoOutlined />} />
                  </Tooltip>
                </Popconfirm>
                <Popconfirm
                  title="确认停诊？"
                  onConfirm={() => {
                    markQueueStatus(item.encounterId, 'stopped');
                    message.info('已停诊');
                  }}
                >
                  <Tooltip title="停诊">
                    <Button size="small" danger icon={<StopOutlined />} />
                  </Tooltip>
                </Popconfirm>
              </Space>
            )}
          </div>
        </div>
        {item.chiefComplaint && (
          <div className="mt-1.5 ml-10 text-xs text-gray-600 truncate">
            主诉：{item.chiefComplaint}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card
      size="small"
      title={
        <div className="flex items-center justify-between">
          <span className="font-semibold">候诊队列</span>
          <Button
            size="small"
            icon={<RedoOutlined />}
            loading={loading}
            onClick={() => void fetchWaitingQueue()}
          >
            刷新
          </Button>
        </div>
      }
      styles={{ body: { padding: 0 } }}
    >
      {/* 统计 */}
      <div className="grid grid-cols-4 gap-2 p-3 bg-gray-50 border-b border-ink-border">
        <Statistic title="今日挂号" value={stats?.todayRegistered ?? 0} valueStyle={{ fontSize: 18 }} />
        <Statistic
          title="已诊"
          value={stats?.todayVisited ?? 0}
          valueStyle={{ fontSize: 18, color: '#52C41A' }}
        />
        <Statistic
          title="待诊"
          value={stats?.todayWaiting ?? 0}
          valueStyle={{ fontSize: 18, color: '#0A4D8C' }}
        />
        <Statistic
          title="平均等待"
          value={`${stats?.avgWaitMinutes ?? 0}分`}
          valueStyle={{ fontSize: 18, color: '#FA8C16' }}
        />
      </div>

      {/* 叫号按钮 */}
      <div className="px-3 pt-3">
        <Button
          type="primary"
          block
          size="large"
          icon={<CustomerServiceOutlined />}
          onClick={() => callNextLocal()}
          style={{ background: '#0A4D8C' }}
        >
          呼叫下一位
        </Button>
      </div>

      {/* 搜索 */}
      <div className="p-2">
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder="搜索姓名 / 号次 / 挂号单号"
          value={kw}
          onChange={(e) => setKw(e.target.value)}
        />
      </div>

      {/* Tab */}
      <div className="flex gap-1 px-2 pb-2">
        {TABS.map((it) => (
          <button
            key={it.key}
            onClick={() => setTab(it.key)}
            className={`px-2.5 py-1 text-xs rounded transition-colors ${
              tab === it.key ? 'text-white' : 'text-ink-secondary hover:bg-gray-100'
            }`}
            style={tab === it.key ? { background: '#0A4D8C' } : undefined}
          >
            {it.label} ({counts[it.key]})
          </button>
        ))}
      </div>

      {/* 列表 */}
      <div className="max-h-[460px] overflow-y-auto">
        {filtered.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无患者" />
        ) : (
          filtered.map(renderItem)
        )}
      </div>
    </Card>
  );
};

export default WaitingQueue;
