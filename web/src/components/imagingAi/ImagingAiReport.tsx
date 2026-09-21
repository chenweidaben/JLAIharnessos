/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * DAMO-RADAR「AI 辅诊报告」组合组件：
 * 头部(模型/版本/模式/免责声明) + 左侧18器官导航 + 右侧146发现列表 + 底部医师复核。
 * 加载态 / 错误边界 / 离线降级空态齐备（推理服务不可用时展示内置 demo，不白屏）。
 * 既用于独立路由 /imaging/ai/report/:studyUid?，也内嵌患者360 影像 tab。
 */
import { ReloadOutlined } from '@ant-design/icons';
import { Alert, Card, Col, Row, Spin, Tag, Typography } from 'antd';
import { useEffect, useMemo, useState } from 'react';

import { EmptyState } from '@/components/common';
import { usePermission } from '@/router/guards';
import { useAuthStore } from '@/store/authStore';
import { useImagingAiStore } from '@/store/imagingAiStore';

import AiReportHeader from './AiReportHeader';
import FindingList from './FindingList';
import OrganNav from './OrganNav';
import ReviewPanel from './ReviewPanel';

const { Text } = Typography;

interface ImagingAiReportProps {
  /** 检查实例 UID；缺省时使用内置 demo 病例 */
  studyUid?: string;
  /** 内嵌模式（患者360 内）：精简边距 */
  embedded?: boolean;
}

export default function ImagingAiReport({ studyUid, embedded = false }: ImagingAiReportProps) {
  const { hasPermission } = usePermission();
  const user = useAuthStore((s) => s.user);
  // 权限码（契约 §4）：查看 imaging:view（路由层已控）；复核签名 imaging:ai:review
  const canReview = hasPermission('imaging:ai:review');

  const catalog = useImagingAiStore((s) => s.catalog);
  const phase = useImagingAiStore((s) => s.phase);
  const loadingProgress = useImagingAiStore((s) => s.loadingProgress);
  const result = useImagingAiStore((s) => s.result);
  const job = useImagingAiStore((s) => s.job);
  const errorMsg = useImagingAiStore((s) => s.errorMsg);
  const reviewReceipt = useImagingAiStore((s) => s.reviewReceipt);
  const submitting = useImagingAiStore((s) => s.reviewSubmitting);
  const ensureCatalog = useImagingAiStore((s) => s.ensureCatalog);
  const loadReport = useImagingAiStore((s) => s.loadReport);
  const submitReview = useImagingAiStore((s) => s.submitReview);

  const [selectedOrgan, setSelectedOrgan] = useState<string | null>(null);

  useEffect(() => {
    void ensureCatalog();
    const uid = studyUid ?? `STUDY-DEMO-${Date.now().toString(36).toUpperCase()}`;
    void loadReport(uid);
  }, [studyUid, ensureCatalog, loadReport]);

  const organs = useMemo(() => catalog?.organs.map((o) => o.key) ?? [], [catalog]);

  const filteredFindings = useMemo(() => {
    if (!result) return [];
    if (!selectedOrgan) return result.findings;
    return result.findings.filter((f) => f.organ_zh === selectedOrgan);
  }, [result, selectedOrgan]);

  /* ---------------- 加载态 ---------------- */
  if (phase === 'loading' || phase === 'idle') {
    return (
      <div data-testid="ai-loading" className="flex h-64 flex-col items-center justify-center gap-3">
        <Spin size="large" />
        <Text type="secondary">DAMO-RADAR 正在分析腹部增强 CT … {loadingProgress}%</Text>
      </div>
    );
  }

  /* ---------------- 错误 / 降级态：展示内置空态而非白屏 ---------------- */
  if (phase === 'error' || !result) {
    return (
      <div data-testid="ai-error" style={{ padding: embedded ? 0 : 24 }}>
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 12 }}
          message="AI 推理服务暂不可用"
          description={errorMsg || '已降级为内置演示数据，请联系运维检查 radar-inference 服务。'}
        />
        <EmptyState description="暂无可展示的 AI 辅诊结果，请稍后重试" />
      </div>
    );
  }

  const positiveCount = result.summary.positive_count;

  return (
    <div data-testid="imaging-ai-report" className={embedded ? '' : 'p-4'}>
      <AiReportHeader result={result} />

      <Row gutter={[12, 12]} style={{ marginTop: 12 }}>
        <Col xs={24} md={5} lg={4}>
          <Card size="small" title="器官导航（18）" styles={{ body: { padding: 4 } }}>
            <OrganNav
              organs={organs}
              findings={result.findings}
              selected={selectedOrgan}
              onSelect={setSelectedOrgan}
            />
          </Card>
        </Col>
        <Col xs={24} md={19} lg={20}>
          <Card
            size="small"
            title={
              <span>
                发现列表（{filteredFindings.length}）
                <Tag color="blue" style={{ marginLeft: 8 }}>
                  阳性 {positiveCount}
                </Tag>
                {selectedOrgan && (
                  <Tag
                    color="geekblue"
                    closable
                    onClose={() => setSelectedOrgan(null)}
                    style={{ marginLeft: 6 }}
                  >
                    {selectedOrgan}
                  </Tag>
                )}
              </span>
            }
            extra={
              <ReloadOutlined
                onClick={() => {
                  const uid = studyUid ?? `STUDY-DEMO-${Date.now().toString(36).toUpperCase()}`;
                  void loadReport(uid);
                }}
                style={{ cursor: 'pointer' }}
              />
            }
          >
            <div style={{ maxHeight: 560, overflowY: 'auto' }}>
              <FindingList findings={filteredFindings} threshold={result.positive_threshold} />
            </div>
          </Card>
        </Col>
      </Row>

      <div style={{ marginTop: 12 }}>
        <ReviewPanel
          jobId={job?.job_id ?? 'unknown-job'}
          canReview={canReview}
          submitting={submitting}
          receipt={reviewReceipt}
          defaultSignerName={user?.realName ?? ''}
          defaultSignerId={user?.id ?? ''}
          onSubmit={(body) => submitReview(job?.job_id ?? 'unknown-job', body)}
        />
      </div>
    </div>
  );
}
