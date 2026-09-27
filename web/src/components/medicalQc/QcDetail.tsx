/**
 * 健澜科技 jlmedaios - 病历质控详情组件（M2-B）
 *
 * 规则检查 / AI 辅助检查、缺陷清单、质控医师签名通过或退回、
 * 作者整改重提、历史质控签名链。
 *
 * 医疗严谨：AI 仅辅助；存在阻断/主要缺陷时通过须显式确认并写明临床理由；
 * 质控人不得为作者本人（后端强制）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */

import { useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Descriptions,
  Drawer,
  Empty,
  List,
  Space,
  Tag,
  Typography,
} from 'antd';
import { useMedicalQcStore } from '@/store/medicalQcStore';
import { useAuthStore } from '@/store/authStore';
import type { QcIssueDto } from '@/types/medicalQc';

const SEVERITY_COLOR: Record<string, string> = {
  block: 'red',
  major: 'orange',
  minor: 'default',
};
const SEVERITY_LABEL: Record<string, string> = {
  block: '阻断',
  major: '主要',
  minor: '次要',
};

function IssueItem({ issue }: { issue: QcIssueDto }) {
  return (
    <List.Item data-testid="qc-issue-item">
      <Space wrap size={6} className="w-full">
        <Tag color={SEVERITY_COLOR[issue.severity]}>{SEVERITY_LABEL[issue.severity]}</Tag>
        <Tag color={issue.source === 'ai' ? 'purple' : 'blue'}>
          {issue.source === 'ai' ? 'AI 辅助' : '规则'}
        </Tag>
        {issue.section ? <Tag>{issue.section}</Tag> : null}
        <Typography.Text>{issue.message}</Typography.Text>
        <Typography.Text type="secondary" className="text-xs">
          {issue.ruleId}
        </Typography.Text>
      </Space>
    </List.Item>
  );
}

export default function QcDetail() {
  const {
    currentId, detail, checkResult, checking, submitting,
    openRecord, runCheck, review, resubmit,
  } = useMedicalQcStore();
  const currentUserId = useAuthStore((s) => s.user?.id);

  const [comment, setComment] = useState('');
  const [acknowledge, setAcknowledge] = useState(false);

  const open = Boolean(currentId);
  const onClose = () => {
    useMedicalQcStore.setState({ currentId: null, detail: null, checkResult: null });
    setComment('');
    setAcknowledge(false);
  };

  const record = detail?.record ?? null;
  const hardIssues = (checkResult?.rule.issues ?? []).filter((i) => i.severity !== 'minor');
  const isAuthor = Boolean(record?.authorId && currentUserId === record.authorId);
  const canResubmit = record?.status === 'returned' && isAuthor;
  const passBlocked = hardIssues.length > 0 && (!acknowledge || !comment.trim());

  const basePayload = () => ({
    level: detail?.nextLevel ?? 1,
    comment: comment.trim() || null,
    issues: checkResult?.issues ?? [],
    aiAssisted: (checkResult?.ai.issues.length ?? 0) > 0,
    aiModel: checkResult?.ai.model || null,
  });

  const handlePass = async () => {
    const ok = await review({
      ...basePayload(),
      decision: 'pass',
      acknowledgeIssues: acknowledge,
    });
    if (ok) onClose();
  };
  const handleReturn = async () => {
    const ok = await review({ ...basePayload(), decision: 'return' });
    if (ok) onClose();
  };
  const handleResubmit = async () => {
    const ok = await resubmit();
    if (ok) {
      if (currentId) await openRecord(currentId);
    }
  };

  return (
    <Drawer
      title="病历质控处理"
      width={920}
      open={open}
      onClose={onClose}
      destroyOnClose
      extra={
        <Space>
          <Button loading={checking} onClick={() => void runCheck(false)}>
            规则检查
          </Button>
          <Button loading={checking} type="primary" ghost onClick={() => void runCheck(true)}>
            AI 辅助检查
          </Button>
        </Space>
      }
    >
      {record && detail ? (
        <Space direction="vertical" size={16} className="w-full">
          <Descriptions bordered size="small" column={2} data-testid="qc-descriptions">
            <Descriptions.Item label="标题" span={2}>{record.title}</Descriptions.Item>
            <Descriptions.Item label="类型">{record.recordType}</Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag>{record.status}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="患者">
              {detail.patient ? `${detail.patient.nameMasked}（${detail.patient.mrn}）` : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="科室">{detail.visit.department}</Descriptions.Item>
            <Descriptions.Item label="版本">{record.version}</Descriptions.Item>
            <Descriptions.Item label="质控评分">
              {record.qualityScore ?? '-'}
            </Descriptions.Item>
          </Descriptions>

          <Card size="small" title="病历正文">
            <Typography.Paragraph
              className="max-h-56 overflow-auto whitespace-pre-wrap"
              data-testid="qc-plain-text"
            >
              {record.plainText || JSON.stringify(record.content, null, 2)}
            </Typography.Paragraph>
          </Card>

          {checkResult?.ai.error ? (
            <Alert
              type="warning"
              showIcon
              data-testid="qc-ai-error"
              message={`AI 辅助不可用：${checkResult.ai.error}`}
              description="规则引擎结果不受影响，可继续完成质控。"
            />
          ) : null}

          <Card
            size="small"
            title={
              checkResult
                ? `质控检查结果（规则评分 ${checkResult.score}，共 ${checkResult.issues.length} 项）`
                : '质控检查结果（请先运行规则检查 / AI 辅助检查）'
            }
            data-testid="qc-issues-card"
          >
            {checkResult ? (
              checkResult.issues.length > 0 ? (
                <List
                  size="small"
                  dataSource={checkResult.issues}
                  renderItem={(issue) => <IssueItem issue={issue} />}
                />
              ) : (
                <Empty description="未发现缺陷，建议质控通过" />
              )
            ) : (
              <Empty description="尚未运行检查" />
            )}
          </Card>

          {hardIssues.length > 0 ? (
            <Alert
              type="error"
              showIcon
              data-testid="qc-hard-alert"
              message={`存在 ${hardIssues.length} 项阻断/主要缺陷`}
              description="如经临床判断仍需通过，须勾选确认并在质控意见中写明临床理由；否则应退回整改。"
            />
          ) : null}

          <Card size="small" title="质控意见与签名">
            <Space direction="vertical" className="w-full" size={12}>
              <textarea
                className="w-full rounded border border-gray-300 p-2"
                rows={3}
                placeholder="请填写质控意见（退回须说明整改要求；带缺陷通过须写明临床理由）"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                data-testid="qc-comment"
              />
              {hardIssues.length > 0 ? (
                <Checkbox
                  checked={acknowledge}
                  onChange={(e) => setAcknowledge(e.target.checked)}
                  data-testid="qc-acknowledge"
                >
                  我已知悉上述阻断/主要缺陷，并经临床判断确认处理
                </Checkbox>
              ) : null}
              <Space>
                <Button
                  type="primary"
                  danger
                  loading={submitting}
                  disabled={!comment.trim()}
                  onClick={() => void handleReturn()}
                >
                  退回整改
                </Button>
                <Button
                  type="primary"
                  loading={submitting}
                  disabled={passBlocked}
                  onClick={() => void handlePass()}
                  data-testid="qc-pass-btn"
                >
                  质控通过（{detail.nextLevel} 级）
                </Button>
                {canResubmit ? (
                  <Button loading={submitting} onClick={() => void handleResubmit()} data-testid="qc-resubmit-btn">
                    整改后重新提交
                  </Button>
                ) : null}
              </Space>
              {isAuthor && record.status !== 'returned' ? (
                <Typography.Text type="warning" className="text-xs" data-testid="qc-self-warn">
                  您是该病历作者，不能质控本人病历，请由其他医师处理。
                </Typography.Text>
              ) : null}
            </Space>
          </Card>

          <Card size="small" title={`历史质控记录（${detail.reviews.length}）`}>
            <List
              size="small"
              dataSource={detail.reviews}
              renderItem={(r) => (
                <List.Item>
                  <Space wrap>
                    <Tag color={r.decision === 'pass' ? 'green' : 'volcano'}>
                      {r.decision === 'pass' ? `L${r.reviewLevel} 通过` : '退回'}
                    </Tag>
                    <span>{new Date(r.createdAt).toLocaleString('zh-CN', { hour12: false })}</span>
                    <Typography.Text type="secondary" className="text-xs">
                      规则 {r.ruleIssueCount} / AI {r.aiIssueCount}
                    </Typography.Text>
                    {r.comment ? <Typography.Text className="text-xs">{r.comment}</Typography.Text> : null}
                  </Space>
                </List.Item>
              )}
            />
          </Card>
        </Space>
      ) : null}
    </Drawer>
  );
}