/**
 * 健澜科技 jlmedaios - AI 原生 · 病历草稿生成（M88-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 *
 * 病历草稿生成 + 人工复核闭环：
 *   GET  /api/v1/ai-note-drafts?visitId=          查询某就诊历史草稿
 *   POST /api/v1/ai-note-drafts/generate          AI 生成草稿（权限 ai_note:generate）
 *   POST /api/v1/ai-note-drafts/:id/review        采纳/退回/修改（权限 ai_note:review）
 */
import { useState } from 'react';
import {
  Alert, Button, Card, Empty, Input, Layout, Modal, Select, Spin, Tag, Typography, message,
} from 'antd';
import { usePermission } from '@/router/guards';
import { useNoteDraftStore, type AiNoteDraft } from '@/store/aiNativeStore';

const { Header, Content } = Layout;
const { Title, Paragraph, Text } = Typography;

const DRAFT_TYPE_OPTIONS = [
  { value: 'progress_note', label: '病程记录' },
  { value: 'admission_summary', label: '入院记录' },
  { value: 'discharge_summary', label: '出院小结' },
  { value: 'consult_reply', label: '会诊意见' },
];

const STATUS_TAG: Record<AiNoteDraft['status'], { color: string; text: string }> = {
  draft: { color: 'orange', text: '待审核' },
  accepted: { color: 'green', text: '已采纳' },
  rejected: { color: 'red', text: '已退回' },
  modified: { color: 'blue', text: '已修改' },
};

export default function AiNoteDraftPage() {
  const { drafts, loading, submitting, error, load, generate, review } = useNoteDraftStore();
  const { hasPermission } = usePermission();

  const [visitId, setVisitId] = useState('');
  const [draftType, setDraftType] = useState('progress_note');
  const [context, setContext] = useState('');
  const [editingDraft, setEditingDraft] = useState<AiNoteDraft | null>(null);
  const [doctorEdit, setDoctorEdit] = useState('');

  const canGenerate = hasPermission('ai_note:generate');
  const canReview = hasPermission('ai_note:review');

  const handleLoad = () => {
    if (!visitId) { message.warning('请先输入就诊号 visitId'); return; }
    void load(visitId);
  };

  const handleGenerate = async () => {
    if (!visitId) { message.warning('请先输入就诊号 visitId'); return; }
    const draft = await generate({ visitId, draftType, context });
    if (draft) message.success('AI 病历草稿已生成，请主治医师复核');
  };

  const doReview = async (id: string, status: 'accepted' | 'rejected' | 'modified', edit?: string) => {
    await review(id, status, edit);
    if (visitId) await load(visitId);
    message.success(status === 'accepted' ? '已采纳该草稿' : status === 'rejected' ? '已退回该草稿' : '已提交修改');
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: '#0B3D6B' }}>
        <Title level={4} style={{ color: '#fff', margin: 0 }}>病历草稿生成（AI 辅助）</Title>
      </Header>
      <Content style={{ padding: 24 }}>
        {error && <Alert type="error" showIcon style={{ marginBottom: 16 }} message={error} />}

        <Card title="就诊信息与生成参数" size="small" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <Input
              placeholder="就诊号 visitId，如 V20261014001"
              value={visitId}
              onChange={(e) => setVisitId(e.target.value)}
              style={{ width: 260 }}
              allowClear
            />
            <Select
              value={draftType}
              onChange={setDraftType}
              options={DRAFT_TYPE_OPTIONS}
              style={{ width: 140 }}
            />
            <Button onClick={handleLoad}>加载历史</Button>
            <Button type="primary" loading={submitting} disabled={!canGenerate} onClick={handleGenerate}>
              AI 生成草稿
            </Button>
          </div>
          <Input.TextArea
            placeholder="病情上下文 / 主诉（可选，用于辅助生成），如：反复咳嗽咳痰 3 天，发热 1 天"
            value={context}
            onChange={(e) => setContext(e.target.value)}
            rows={2}
            style={{ marginTop: 12 }}
          />
          {!canGenerate && <Text type="secondary" style={{ fontSize: 12 }}>（当前账号无 ai_note:generate 权限，无法生成）</Text>}
        </Card>

        <Spin spinning={loading}>
          {drafts.length === 0 ? (
            <Card size="small">
              <Empty description="暂无病历草稿，请输入就诊号后点击「AI 生成草稿」" />
            </Card>
          ) : (
            drafts.map((d) => {
              const st = STATUS_TAG[d.status];
              return (
                <Card
                  key={d.id}
                  size="small"
                  style={{ marginBottom: 12 }}
                  title={
                    <span>
                      {DRAFT_TYPE_OPTIONS.find((o) => o.value === d.draftType)?.label ?? d.draftType}
                      <Tag color={st.color} style={{ marginLeft: 8 }}>{st.text}</Tag>
                      <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>{d.createdAt}</Text>
                    </span>
                  }
                >
                  <Paragraph
                    style={{ whiteSpace: 'pre-wrap', background: '#F5F8FC', padding: 12, borderRadius: 6, marginBottom: 8 }}
                  >
                    {d.generatedContent}
                  </Paragraph>
                  {d.doctorEdit && (
                    <Paragraph type="success" style={{ marginBottom: 8 }}>
                      医师修改：{d.doctorEdit}
                    </Paragraph>
                  )}
                  {d.status === 'draft' && canReview && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Button type="primary" size="small" onClick={() => void doReview(d.id, 'accepted')}>采纳</Button>
                      <Button danger size="small" onClick={() => void doReview(d.id, 'rejected')}>退回</Button>
                      <Button size="small" onClick={() => { setEditingDraft(d); setDoctorEdit(d.doctorEdit ?? ''); }}>
                        修改后采纳
                      </Button>
                    </div>
                  )}
                  {d.status === 'draft' && !canReview && (
                    <Text type="secondary" style={{ fontSize: 12 }}>（当前账号无 ai_note:review 权限，仅可查看）</Text>
                  )}
                </Card>
              );
            })
          )}
        </Spin>

        <Modal
          title="修改草稿（医师编辑）"
          open={!!editingDraft}
          onCancel={() => setEditingDraft(null)}
          onOk={async () => {
            if (editingDraft) await doReview(editingDraft.id, 'modified', doctorEdit);
            setEditingDraft(null);
          }}
          okText="提交修改"
          cancelText="取消"
        >
          <TextareaBody value={doctorEdit} onChange={setDoctorEdit} />
        </Modal>
      </Content>
    </Layout>
  );
}

function TextareaBody({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <>
      <Text type="secondary">在 AI 草稿基础上补充医师修改意见（保存后状态置为「已修改」）：</Text>
      <Input.TextArea rows={5} value={value} onChange={(e) => onChange(e.target.value)} style={{ marginTop: 8 }} />
    </>
  );
}
