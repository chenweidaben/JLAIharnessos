/**
 * 健澜科技 jlmedaios - 语音转写复核（M2-C）
 *
 * 医师复核 ASR 结果：查看原始转写、术语纠正、用药剂量提及与风险提示，
 * 编辑最终病历文本，逐项确认用药后转病历并本人签名；未复核会话可作废。
 *
 * 安全：剂量/频次只标记、不臆改；存在用药提及时必须勾选确认方可转病历。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */

import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Empty,
  Input,
  List,
  Popconfirm,
  Select,
  Space,
  Tag,
  Typography,
} from 'antd';
import { EditOutlined } from '@ant-design/icons';
import { useVoiceMedicalStore } from '@/store/voiceMedicalStore';
import type { VoiceRecordType } from '@/types/voiceMedical';

const RECORD_TYPES: VoiceRecordType[] = [
  'outpatient',
  'admission',
  'progress',
  'operative',
  'discharge',
  'front_page',
];

export default function TranscriptReview() {
  const current = useVoiceMedicalStore((s) => s.current);
  const convert = useVoiceMedicalStore((s) => s.convert);
  const discard = useVoiceMedicalStore((s) => s.discard);
  const working = useVoiceMedicalStore((s) => s.working);
  const lastRecordId = useVoiceMedicalStore((s) => s.lastRecordId);

  const [finalText, setFinalText] = useState('');
  const [recordType, setRecordType] = useState<VoiceRecordType>('outpatient');
  const [title, setTitle] = useState('');
  const [confirmMeds, setConfirmMeds] = useState(false);

  // 切换会话时用规范文本预填，重置编辑态
  useEffect(() => {
    setFinalText(current?.normalizedText ?? '');
    setRecordType('outpatient');
    setTitle('');
    setConfirmMeds(false);
  }, [current?.id, current?.normalizedText]);

  if (!current) {
    return (
      <Card size="small" title="复核与签名" data-testid="transcript-review">
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="请选择一条语音口述会话进行复核"
        />
      </Card>
    );
  }

  const isDraft = current.status === 'draft';
  const hasMeds = current.medicationMentions.length > 0;
  const canConvert =
    isDraft &&
    finalText.trim().length > 0 &&
    (!hasMeds || confirmMeds) &&
    !working;

  const onConvert = async () => {
    await convert({
      finalText: finalText.trim(),
      recordType,
      title: title.trim() || undefined,
      confirmMedications: hasMeds ? confirmMeds : false,
    });
  };

  return (
    <Card
      size="small"
      title={
        <Space>
          <EditOutlined />
          <span>复核与签名</span>
          <Tag color={isDraft ? 'orange' : current.status === 'converted' ? 'green' : 'default'}>
            {current.status}
          </Tag>
          <Tag data-testid="transcript-engine-tag">{current.asrProvider}</Tag>
        </Space>
      }
      data-testid="transcript-review"
    >
      <Space direction="vertical" className="w-full" size="small">
        {current.warnings.length > 0 && (
          <Alert
            type="warning"
            showIcon
            data-testid="transcript-warnings"
            message="转写 / 安全提示"
            description={
              <ul className="mb-0 pl-4">
                {current.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            }
          />
        )}

        <div>
          <Typography.Text type="secondary" className="text-xs">
            ASR 原始转写（仅供核对）
          </Typography.Text>
          <Input.TextArea
            data-testid="transcript-raw"
            value={current.rawTranscript}
            readOnly
            autoSize={{ minRows: 2, maxRows: 5 }}
          />
        </div>

        {current.corrections.length > 0 && (
          <div data-testid="transcript-corrections">
            <Typography.Text type="secondary" className="text-xs">
              术语纠正
            </Typography.Text>
            <List
              size="small"
              bordered
              dataSource={current.corrections}
              renderItem={(c) => (
                <List.Item>
                  <Space wrap>
                    <Typography.Text delete>{c.from}</Typography.Text>
                    <span>→</span>
                    <Typography.Text strong>{c.to}</Typography.Text>
                    <Tag>{c.reason}</Tag>
                  </Space>
                </List.Item>
              )}
            />
          </div>
        )}

        {hasMeds && (
          <div data-testid="transcript-medications">
            <Typography.Text type="secondary" className="text-xs">
              用药 / 剂量 / 频次提及（安全关键，须逐项核对）
            </Typography.Text>
            <List
              size="small"
              bordered
              dataSource={current.medicationMentions}
              renderItem={(m) => (
                <List.Item>
                  <Space wrap>
                    <Typography.Text strong>{m.raw}</Typography.Text>
                    <Tag color="red">{m.reason}</Tag>
                  </Space>
                </List.Item>
              )}
            />
          </div>
        )}

        {isDraft ? (
          <>
            <div>
              <Typography.Text type="secondary" className="text-xs">
                最终病历文本（医师复核 / 编辑）
              </Typography.Text>
              <Input.TextArea
                data-testid="transcript-final-input"
                value={finalText}
                onChange={(e) => setFinalText(e.target.value)}
                autoSize={{ minRows: 4, maxRows: 12 }}
              />
            </div>
            <Space wrap>
              <Select
                data-testid="transcript-type-select"
                value={recordType}
                style={{ width: 140 }}
                onChange={(v) => setRecordType(v as VoiceRecordType)}
                options={RECORD_TYPES.map((t) => ({ value: t, label: t }))}
              />
              <Input
                data-testid="transcript-title-input"
                placeholder="病历标题（可空）"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={{ width: 200 }}
              />
            </Space>
            {hasMeds && (
              <Checkbox
                data-testid="transcript-confirm-meds"
                checked={confirmMeds}
                onChange={(e) => setConfirmMeds(e.target.checked)}
              >
                我已逐项核对上述用药 / 剂量 / 频次，确认无误
              </Checkbox>
            )}
            <Space>
              <Button
                type="primary"
                data-testid="transcript-convert"
                loading={working}
                disabled={!canConvert}
                onClick={() => void onConvert()}
              >
                转病历并本人签名
              </Button>
              <Popconfirm
                title="作废该语音口述会话？"
                onConfirm={() => void discard()}
                okText="作废"
                cancelText="取消"
              >
                <Button danger data-testid="transcript-discard">
                  作 废
                </Button>
              </Popconfirm>
            </Space>
          </>
        ) : (
          <Alert
            type={current.status === 'converted' ? 'success' : 'info'}
            showIcon
            data-testid="transcript-finalized"
            message={
              current.status === 'converted'
                ? `已转为正式病历并签名，病历 ID：${current.resultingRecordId ?? ''}`
                : '该会话已作废'
            }
          />
        )}
        {lastRecordId && (
          <Typography.Text type="success" data-testid="transcript-record-id">
            新病历：{lastRecordId}
          </Typography.Text>
        )}
      </Space>
    </Card>
  );
}
