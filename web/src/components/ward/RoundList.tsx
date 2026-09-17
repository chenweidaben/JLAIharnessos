/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 查房列表组件（分类 Tab + 重点患者 + 三级查房标识 + 进度）
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Checkbox, Empty, Progress, Space, Tabs, Tag, Tooltip } from 'antd';
import {
  ArrowDownOutlined,
  ClockCircleOutlined,
  EyeOutlined,
  PlayCircleOutlined,
  PrinterOutlined,
} from '@ant-design/icons';
import type { RoundPatient } from '@/types/ward';
import { conditionMeta, nursingLevelMeta } from './meta';

interface RoundListProps {
  list: RoundPatient[];
  onStartRound: (patientId: string) => void;
}

type TabKey = 'pending' | 'key' | 'new' | 'surgery' | 'discharge' | 'finished';

const severityWeight: Record<string, number> = { critical: 3, serious: 2, normal: 1 };

export default function RoundList({ list, onStartRound }: RoundListProps) {
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabKey>('pending');
  const [sortBySeverity, setSortBySeverity] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  const counts = useMemo(
    () => ({
      pending: list.filter((r) => r.roundStatus === 'pending' || r.roundStatus === 'in_progress')
        .length,
      key: list.filter((r) => r.isKeyPatient).length,
      new: list.filter((r) => r.isNewAdmit).length,
      surgery: list.filter((r) => r.isTodaySurgery).length,
      discharge: list.filter((r) => r.isPendingDischarge).length,
      finished: list.filter((r) => r.roundStatus === 'finished').length,
    }),
    [list],
  );

  const filtered = useMemo(() => {
    let arr: RoundPatient[];
    switch (tab) {
      case 'pending':
        arr = list.filter((r) => r.roundStatus !== 'finished');
        break;
      case 'key':
        arr = list.filter((r) => r.isKeyPatient);
        break;
      case 'new':
        arr = list.filter((r) => r.isNewAdmit);
        break;
      case 'surgery':
        arr = list.filter((r) => r.isTodaySurgery);
        break;
      case 'discharge':
        arr = list.filter((r) => r.isPendingDischarge);
        break;
      case 'finished':
        arr = list.filter((r) => r.roundStatus === 'finished');
        break;
    }
    return sortBySeverity
      ? [...arr].sort(
          (a, b) =>
            severityWeight[b.patient.condition] - severityWeight[a.patient.condition] ||
            Number(a.bedNo.replace(/-/g, '')) - Number(b.bedNo.replace(/-/g, '')),
        )
      : [...arr].sort(
          (a, b) => Number(a.bedNo.replace(/-/g, '')) - Number(b.bedNo.replace(/-/g, '')),
        );
  }, [list, tab, sortBySeverity]);

  const finishedCount = counts.finished;
  const total = list.length;
  const percent = total === 0 ? 0 : Math.round((finishedCount / total) * 100);

  const toggleSelect = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <div className="rounded-lg border border-ink-border bg-white shadow-card">
      {/* 进度 + 批量操作 */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-border p-3">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-ink-primary">今日查房进度</span>
          <Progress percent={percent} size="small" style={{ width: 180 }} strokeColor="#0A4D8C" />
          <span className="text-xs text-ink-secondary">
            已查 {finishedCount}/{total}
          </span>
        </div>
        <Space>
          <Button
            size="small"
            icon={<ArrowDownOutlined />}
            onClick={() => setSortBySeverity((v) => !v)}
          >
            {sortBySeverity ? '按病情排序中' : '按床号排序'}
          </Button>
          <Button size="small" icon={<PrinterOutlined />}>
            批量打印
          </Button>
        </Space>
      </div>

      <Tabs
        activeKey={tab}
        onChange={(k) => setTab(k as TabKey)}
        className="px-3"
        items={[
          { key: 'pending', label: `全部待查 (${counts.pending})` },
          { key: 'key', label: `重点患者 (${counts.key})` },
          { key: 'new', label: `今日新入院 (${counts.new})` },
          { key: 'surgery', label: `今日手术 (${counts.surgery})` },
          { key: 'discharge', label: `待出院 (${counts.discharge})` },
          { key: 'finished', label: `已查 (${counts.finished})` },
        ]}
      />

      <div className="max-h-[560px] overflow-y-auto px-3 pb-3">
        {filtered.length === 0 ? (
          <Empty description="暂无患者" />
        ) : (
          <div className="space-y-2">
            {filtered.map((r) => {
              const p = r.patient;
              const nlm = nursingLevelMeta[p.nursingLevel];
              const cm = conditionMeta[p.condition];
              return (
                <div
                  key={p.id}
                  className="flex items-start gap-3 rounded-md border border-ink-border p-3 transition-shadow hover:shadow-card"
                >
                  <Checkbox checked={selected.includes(p.id)} onChange={() => toggleSelect(p.id)} />
                  <div className="w-14 shrink-0 text-center">
                    <div className="text-lg font-bold text-jl-primary">{r.bedNo}</div>
                    <div className="text-xs text-ink-secondary">住{p.stayDays}d</div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-ink-primary">{p.name}</span>
                      <span className="text-xs text-ink-secondary">
                        {p.gender === 'male' ? '男' : '女'} · {p.age}岁
                      </span>
                      <Tag color={nlm.color} style={{ fontSize: 11 }}>
                        {nlm.label}护理
                      </Tag>
                      <Tag color={cm.color} style={{ fontSize: 11 }}>
                        {cm.label}
                      </Tag>
                      {r.isNewAdmit && (
                        <Tag color="purple" style={{ fontSize: 11 }}>
                          新入院
                        </Tag>
                      )}
                      {r.isTodaySurgery && (
                        <Tag color="blue" style={{ fontSize: 11 }}>
                          今日手术
                        </Tag>
                      )}
                      {r.isPendingDischarge && (
                        <Tag color="cyan" style={{ fontSize: 11 }}>
                          待出院
                        </Tag>
                      )}
                    </div>
                    <div className="mt-1 truncate text-sm text-ink-secondary" title={p.diagnosis}>
                      {p.diagnosis}
                    </div>
                    <div className="mt-1 space-y-0.5">
                      {r.focusPoints.map((fp, i) => (
                        <div key={i} className="text-xs text-amber-600">
                          · {fp}
                        </div>
                      ))}
                    </div>
                    {/* 三级查房 */}
                    <div className="mt-2 flex items-center gap-2 text-xs">
                      <span className="text-ink-secondary">三级查房：</span>
                      <ThirdRoundBadge label="住院医" done={r.thirdRound.resident} />
                      <ThirdRoundBadge label="主治" done={r.thirdRound.attending} />
                      <ThirdRoundBadge label="主任" done={r.thirdRound.chief} />
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <RoundStatusBadge status={r.roundStatus} />
                    <Space>
                      {r.roundStatus === 'finished' ? (
                        <Button
                          size="small"
                          icon={<EyeOutlined />}
                          onClick={() => navigate(`/ward/round/${p.id}`)}
                        >
                          查看
                        </Button>
                      ) : (
                        <Button
                          type="primary"
                          size="small"
                          icon={<PlayCircleOutlined />}
                          onClick={() => {
                            onStartRound(p.id);
                            navigate(`/ward/round/${p.id}`);
                          }}
                        >
                          {r.roundStatus === 'in_progress' ? '继续查房' : '开始查房'}
                        </Button>
                      )}
                    </Space>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function ThirdRoundBadge({ label, done }: { label: string; done: boolean }) {
  return (
    <Tooltip title={done ? '已完成' : '未完成'}>
      <span
        className="rounded px-1.5 py-0.5 text-[11px]"
        style={{
          background: done ? '#F6FFED' : '#FFF1F0',
          color: done ? '#52C41A' : '#F5222D',
        }}
      >
        {label} {done ? '✓' : '○'}
      </span>
    </Tooltip>
  );
}

function RoundStatusBadge({ status }: { status: RoundPatient['roundStatus'] }) {
  const map = {
    pending: { label: '未查', color: '#8C8C8C' },
    in_progress: { label: '查房中', color: '#FAAD14' },
    finished: { label: '已查', color: '#52C41A' },
  } as const;
  const m = map[status];
  return (
    <span className="flex items-center gap-1 text-xs" style={{ color: m.color }}>
      <ClockCircleOutlined />
      {m.label}
    </span>
  );
}
