/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * DAMO-RADAR 右侧发现列表：每行 发现名称(中英) + 置信度进度条 + 阳性/阴性标签。
 * 分级视觉（契约 §5）：critical 红色警示条、major 橙色、minor 默认。
 */
import { Progress, Tag, Typography } from 'antd';

import type { RadarFinding } from '@/types/imagingAi';

const { Text } = Typography;

interface FindingListProps {
  findings: RadarFinding[];
  /** 阳性阈值，用于在进度条上标记参考线 */
  threshold?: number;
}

const TIER_STYLE: Record<RadarFinding['tier'], { bg: string; bar: string; label: string }> = {
  critical: { bg: '#fff1f0', bar: '#cf1322', label: '危急' },
  major: { bg: '#fff7e6', bar: '#d46b08', label: '重要' },
  minor: { bg: 'transparent', bar: '#1677ff', label: '' },
};

export default function FindingList({ findings, threshold = 0.5 }: FindingListProps) {
  return (
    <div data-testid="finding-list" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {findings.map((f) => {
        const tier = f.positive ? f.tier : 'minor';
        const style = TIER_STYLE[tier];
        const percent = Math.round(f.probability * 1000) / 10;
        return (
          <div
            key={f.key}
            data-testid="finding-row"
            data-tier={f.positive ? f.tier : 'negative'}
            data-positive={f.positive ? 'true' : 'false'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '6px 10px',
              borderRadius: 6,
              background: f.positive ? style.bg : 'transparent',
              borderLeft: f.positive ? `3px solid ${style.bar}` : '3px solid transparent',
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Text strong={f.positive}>{f.name_zh}</Text>
                {f.positive && f.tier === 'critical' && (
                  <Tag color="red" data-testid="critical-tag">
                    {style.label}
                  </Tag>
                )}
                {f.positive && f.tier === 'major' && (
                  <Tag color="orange" data-testid="major-tag">
                    {style.label}
                  </Tag>
                )}
              </div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {f.name_en}
              </Text>
            </div>
            <div style={{ width: 180 }}>
              <Progress
                percent={percent}
                size="small"
                showInfo
                format={(v) => `${v?.toFixed(1)}%`}
                strokeColor={f.positive ? style.bar : '#bfbfbf'}
              />
            </div>
            <div style={{ width: 64, textAlign: 'right' }}>
              {f.positive ? (
                <Tag color={f.tier === 'critical' ? 'red' : f.tier === 'major' ? 'orange' : 'blue'}>
                  阳性
                </Tag>
              ) : (
                <Tag>阴性</Tag>
              )}
            </div>
            <div style={{ width: 0, overflow: 'hidden' }} aria-hidden data-threshold={threshold} />
          </div>
        );
      })}
    </div>
  );
}
