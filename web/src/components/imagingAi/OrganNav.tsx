/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * DAMO-RADAR 左侧 18 器官导航：每器官阳性数徽标，点击过滤右侧发现列表。
 * 顺序固定（契约 §1）：主动脉、十二指肠、大肠、小肠、心脏、肋骨、肝、肺、肾、
 * 肾上腺、胃、胆囊、胰腺、脾、膀胱、门静脉、食管、骶骨。
 */
import { FundOutlined } from '@ant-design/icons';
import { Badge, List } from 'antd';

import type { RadarFinding } from '@/types/imagingAi';

interface OrganNavProps {
  /** 18 个器官 key（顺序固定） */
  organs: string[];
  /** 全量 146 发现，用于统计每器官阳性数 */
  findings: RadarFinding[];
  /** 当前选中器官；null 表示“全部” */
  selected: string | null;
  onSelect: (organ: string | null) => void;
}

export default function OrganNav({ organs, findings, selected, onSelect }: OrganNavProps) {
  // 每器官阳性数（确定性 O(n) 统计）
  const positiveByOrgan = new Map<string, number>();
  for (const f of findings) {
    if (!f.positive) continue;
    positiveByOrgan.set(f.organ_zh, (positiveByOrgan.get(f.organ_zh) ?? 0) + 1);
  }
  const totalPositive = findings.filter((f) => f.positive).length;

  const items: { key: string | null; label: string; count: number }[] = [
    { key: null, label: '全部器官', count: totalPositive },
    ...organs.map((organ) => ({
      key: organ,
      label: organ,
      count: positiveByOrgan.get(organ) ?? 0,
    })),
  ];

  return (
    <List
      size="small"
      dataSource={items}
      data-testid="organ-nav"
      renderItem={(it) => {
        const active = selected === it.key;
        return (
          <List.Item
            key={it.key ?? '__all__'}
            onClick={() => onSelect(it.key)}
            style={{
              cursor: 'pointer',
              padding: '8px 12px',
              borderRadius: 6,
              background: active ? '#e6f4ff' : undefined,
              borderLeft: active ? '3px solid #1677ff' : '3px solid transparent',
            }}
          >
            <span style={{ flex: 1 }}>
              {it.key === null && <FundOutlined style={{ marginRight: 6 }} />}
              {it.label}
            </span>
            <Badge
              count={it.count}
              size="small"
              color={it.count > 0 ? (active ? '#1677ff' : '#fa541c') : '#d9d9d9'}
              overflowCount={99}
            />
          </List.Item>
        );
      }}
    />
  );
}
