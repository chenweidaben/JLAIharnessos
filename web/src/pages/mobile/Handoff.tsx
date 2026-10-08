/**
 * 健澜科技 jlmedaios - 移动护理 SBAR 交班（M16-A）
 * 聚合本班信息生成交班草稿（S/B/A/R 四段，未签名），护士核对/编辑后本人签名落库。
 * 医疗安全：草稿为聚合参考，不杜撰；签名须本人确认；AI 不自动生成交班结论。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { useEffect, useState } from 'react';
import { Button, Card, Input, Select, Alert, Checkbox, Space } from 'antd';
import { useMobileNursingStore } from '@/store/mobileNursingStore';

const SECTION_LABELS: { key: 'situation' | 'background' | 'assessment' | 'recommendation'; label: string }[] = [
  { key: 'situation', label: 'S 现状' },
  { key: 'background', label: 'B 背景' },
  { key: 'assessment', label: 'A 评估' },
  { key: 'recommendation', label: 'R 建议' },
];

export default function MobileHandoff() {
  const { deptCode, sbarDraft, loadSbar, signSbar, dbUp } = useMobileNursingStore();
  const [shift, setShift] = useState<'day' | 'night'>('day');
  const [sections, setSections] = useState({ situation: '', background: '', assessment: '', recommendation: '' });
  const [signed, setSigned] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (dbUp && deptCode) void loadSbar(shift).catch(() => undefined);
  }, [dbUp, deptCode, shift, loadSbar]);

  useEffect(() => {
    if (sbarDraft) setSections({ ...sbarDraft.sections });
  }, [sbarDraft]);

  const onSign = async () => {
    if (!signed) return;
    setDone(false);
    try {
      await signSbar({ deptCode, shift, sections });
      setDone(true);
    } catch {
      /* 错误已入 store.error */
    }
  };

  return (
    <Space direction="vertical" size={12} style={{ width: '100%' }}>
      <Card size="small" title="交班班次">
        <Select
          style={{ width: '100%' }}
          value={shift}
          data-testid="m-sbar-shift"
          onChange={(v) => setShift(v)}
          options={[
            { value: 'day', label: '白班' },
            { value: 'night', label: '夜班' },
          ]}
        />
      </Card>

      <Card size="small" title="SBAR 交班草稿（AI 聚合·只读参考）">
        {SECTION_LABELS.map(({ key, label }) => (
          <div key={key} style={{ marginBottom: 8 }}>
            <div style={{ marginBottom: 4 }}>{label}</div>
            <Input.TextArea
              rows={2}
              value={sections[key]}
              data-testid={`m-sbar-${key}`}
              onChange={(e) => setSections((s) => ({ ...s, [key]: e.target.value }))}
            />
          </div>
        ))}
        {sbarDraft && sbarDraft.items.length > 0 && (
          <Alert type="info" showIcon message="本班聚合项（只读核对）" description={sbarDraft.items.join('；')} />
        )}
      </Card>

      <Checkbox checked={signed} onChange={(e) => setSigned(e.target.checked)} data-testid="m-sbar-sign-check">
        本人签名确认交班内容属实
      </Checkbox>
      <Button data-testid="m-sbar-sign-btn" type="primary" block disabled={!signed} onClick={onSign}>
        签名交班
      </Button>
      {done && <Alert data-testid="m-sbar-done" type="success" showIcon message="交班已签名落库。" />}
    </Space>
  );
}
