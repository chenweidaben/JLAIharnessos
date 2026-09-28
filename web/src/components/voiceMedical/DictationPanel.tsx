/**
 * 健澜科技 jlmedaios - 语音口述发起面板（M2-C）
 *
 * 选择就诊与音频引用（对象存储 key / URL / 本地路径），发起 ASR + 医疗后处理。
 * 离线环境提供本地演示引用快捷选择；真实部署由对象存储 / 录音组件产出 audioRef。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */

import { useState } from 'react';
import {
  Button,
  Card,
  Input,
  Select,
  Space,
  Tag,
  Typography,
} from 'antd';
import { AudioOutlined } from '@ant-design/icons';
import { useVoiceMedicalStore } from '@/store/voiceMedicalStore';
import type { AudioFormat } from '@/types/voiceMedical';

const DEMO_REFS = [
  { ref: 'demo:cardiology-followup', label: '心血管复诊（演示）' },
  { ref: 'demo:respiratory-consult', label: '呼吸科门诊（演示）' },
];

export default function DictationPanel() {
  const dictate = useVoiceMedicalStore((s) => s.dictate);
  const transcribing = useVoiceMedicalStore((s) => s.transcribing);
  const dbUp = useVoiceMedicalStore((s) => s.dbUp);

  const [visitId, setVisitId] = useState('');
  const [audioRef, setAudioRef] = useState('');
  const [audioFormat, setAudioFormat] = useState<AudioFormat>('wav');

  const canSubmit = Boolean(visitId.trim() && audioRef.trim()) && dbUp && !transcribing;

  const onSubmit = async () => {
    const ok = await dictate({
      visitId: visitId.trim(),
      audioRef: audioRef.trim(),
      audioFormat,
    });
    if (ok) setAudioRef('');
  };

  return (
    <Card
      size="small"
      title={
        <Space>
          <AudioOutlined />
          <span>发起语音口述</span>
        </Space>
      }
      data-testid="dictation-panel"
    >
      <Space direction="vertical" className="w-full" size="small">
        <div>
          <Typography.Text type="secondary" className="text-xs">
            就诊 ID
          </Typography.Text>
          <Input
            data-testid="dictation-visit-input"
            placeholder="粘贴 / 选择就诊 ID"
            value={visitId}
            onChange={(e) => setVisitId(e.target.value)}
          />
        </div>
        <div>
          <Typography.Text type="secondary" className="text-xs">
            音频引用（对象存储 key / URL / 本地路径）
          </Typography.Text>
          <Input
            data-testid="dictation-ref-input"
            placeholder="audioRef"
            value={audioRef}
            onChange={(e) => setAudioRef(e.target.value)}
          />
        </div>
        <Space wrap>
          <Select
            data-testid="dictation-format-select"
            value={audioFormat}
            style={{ width: 110 }}
            onChange={(v) => setAudioFormat(v as AudioFormat)}
            options={['wav', 'mp3', 'm4a', 'pcm', 'ogg'].map((f) => ({
              value: f,
              label: f,
            }))}
          />
          {DEMO_REFS.map((d) => (
            <Tag
              key={d.ref}
              color="blue"
              data-testid="dictation-demo-ref"
              style={{ cursor: 'pointer' }}
              onClick={() => setAudioRef(d.ref)}
            >
              {d.label}
            </Tag>
          ))}
        </Space>
        <Button
          type="primary"
          data-testid="dictation-submit"
          loading={transcribing}
          disabled={!canSubmit}
          onClick={() => void onSubmit()}
        >
          开始转写
        </Button>
      </Space>
    </Card>
  );
}
