/**
 * 健澜科技 jlmedaios - 语音电子病历工作站页面（M2-C，真实 BFF）
 *
 * 语音口述 → ASR + 医疗后处理 → 医师复核编辑 / 确认用药 → 转病历并本人签名。
 * 健康门禁：BFF/DB 不可用时显式 Alert + Watermark，阻断写操作。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */

import { useEffect, useState } from 'react';
import {
  Alert,
  Col,
  Layout,
  Row,
  Spin,
  Tag,
  Typography,
  Watermark,
} from 'antd';
import { AudioOutlined } from '@ant-design/icons';
import { useVoiceMedicalStore } from '@/store/voiceMedicalStore';
import DemoModeBanner from '@/components/common/DemoModeBanner';
import DictationPanel from '@/components/voiceMedical/DictationPanel';
import DictationList from '@/components/voiceMedical/DictationList';
import TranscriptReview from '@/components/voiceMedical/TranscriptReview';

const { Header, Content } = Layout;

const watermarkText = ['健澜科技', '语音病历', 'jlmedaios'];

export default function VoiceMedicalPage() {
  const dbUp = useVoiceMedicalStore((s) => s.dbUp);
  const healthChecking = useVoiceMedicalStore((s) => s.healthChecking);
  const checkHealth = useVoiceMedicalStore((s) => s.checkHealth);
  const loadDictations = useVoiceMedicalStore((s) => s.loadDictations);
  const error = useVoiceMedicalStore((s) => s.error);
  const clearError = useVoiceMedicalStore((s) => s.clearError);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void (async () => {
      const up = await checkHealth();
      if (up) await loadDictations();
      setReady(true);
    })();
  }, [checkHealth, loadDictations]);

  const onRefresh = async () => {
    clearError();
    const up = await checkHealth();
    if (up) await loadDictations();
  };

  return (
    <Watermark content={watermarkText}>
      <Layout className="min-h-screen bg-ink-bg">
        <Header className="flex items-center justify-between bg-jl-primary px-6 shadow-card">
          <div className="flex items-center gap-3">
            <AudioOutlined className="text-2xl text-white" />
            <Typography.Title level={4} className="!mb-0 !text-white">
              语音电子病历工作站
            </Typography.Title>
            <span className="hidden text-sm text-white/70 md:block">
              语音转写 · 医疗后处理 · 医师复核签名
            </span>
          </div>
          <Tag color={dbUp ? 'green' : 'red'} data-testid="voice-health-tag">
            {dbUp ? 'BFF/DB 正常 (up)' : 'BFF/DB 不可用'}
          </Tag>
        </Header>
        <Content className="p-4">
          <DemoModeBanner />
          <Spin spinning={!ready || healthChecking}>
            {!dbUp ? (
              <Alert
                data-testid="voice-offline-alert"
                type="error"
                showIcon
                banner
                message="无法连接 BFF 或数据库，语音病历工作站不可用"
                description="请检查数据库服务；恢复后点击刷新重新探活。系统不会以缓存或假数据冒充转写结果。"
                action={
                  <button
                    type="button"
                    className="ant-btn ant-btn-default"
                    onClick={() => void onRefresh()}
                  >
                    刷 新
                  </button>
                }
              />
            ) : (
              <div data-testid="voice-content">
                {error && (
                  <Alert
                    className="mb-2"
                    type="error"
                    showIcon
                    data-testid="voice-error-alert"
                    message={error}
                    closable
                    onClose={clearError}
                  />
                )}
                <Row gutter={16}>
                  <Col xs={24} md={9}>
                    <DictationPanel />
                    <div className="mt-3">
                      <DictationList />
                    </div>
                  </Col>
                  <Col xs={24} md={15}>
                    <TranscriptReview />
                  </Col>
                </Row>
              </div>
            )}
          </Spin>
        </Content>
      </Layout>
    </Watermark>
  );
}
