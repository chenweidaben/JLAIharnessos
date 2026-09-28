/**
 * 健澜科技 jlmedaios - 语音口述会话列表（M2-C）
 *
 * 展示本人语音口述会话，按状态着色，点击选中进入复核。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */

import { Card, Empty, List, Tag, Typography } from 'antd';
import { useVoiceMedicalStore } from '@/store/voiceMedicalStore';
import type { VoiceDictationStatus } from '@/types/voiceMedical';

const STATUS_COLOR: Record<VoiceDictationStatus, string> = {
  draft: 'orange',
  converted: 'green',
  discarded: 'default',
};
const STATUS_LABEL: Record<VoiceDictationStatus, string> = {
  draft: '待复核',
  converted: '已转病历',
  discarded: '已作废',
};

export default function DictationList() {
  const dictations = useVoiceMedicalStore((s) => s.dictations);
  const loading = useVoiceMedicalStore((s) => s.loading);
  const currentId = useVoiceMedicalStore((s) => s.currentId);
  const selectDictation = useVoiceMedicalStore((s) => s.selectDictation);

  return (
    <Card size="small" title="我的语音口述" data-testid="dictation-list">
      {dictations.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="暂无语音口述会话"
          data-testid="dictation-empty"
        />
      ) : (
        <List
          size="small"
          loading={loading}
          dataSource={dictations}
          renderItem={(d) => (
            <List.Item
              data-testid="dictation-item"
              onClick={() => void selectDictation(d.id)}
              style={{
                cursor: 'pointer',
                background: d.id === currentId ? '#e6f4ff' : undefined,
                padding: '8px',
              }}
            >
              <div className="w-full">
                <div className="flex items-center justify-between gap-2">
                  <Typography.Text ellipsis style={{ maxWidth: 180 }}>
                    {d.audioRef}
                  </Typography.Text>
                  <Tag color={STATUS_COLOR[d.status]}>{STATUS_LABEL[d.status]}</Tag>
                </div>
                <Typography.Text type="secondary" className="text-xs">
                  {d.asrProvider}
                  {d.avgConfidence != null
                    ? ` · 置信 ${(d.avgConfidence * 100).toFixed(0)}%`
                    : ''}
                  {d.resultingRecordId ? ` · 病历 ${d.resultingRecordId.slice(0, 8)}` : ''}
                </Typography.Text>
              </div>
            </List.Item>
          )}
        />
      )}
    </Card>
  );
}
