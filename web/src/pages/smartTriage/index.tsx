/**
 * 健澜科技 jlmedaios - 智能导诊/预问诊页面（M3-P）
 *
 * 患者端：智能导诊 + 预问诊；
 * 医护端：预问诊报告查看与采用。
 *
 * 健康门禁：BFF/DB 断链时明确提示，不冒充结果；全屏水印。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { useEffect, useState } from 'react';
import {
  Alert, Button, Card, Space, Tabs, Typography, Watermark, Spin,
} from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { useSmartTriageStore } from '@/store/smartTriageStore';
import { useAuthStore } from '@/store/authStore';
import { TriagePanel } from '@/components/smartTriage/TriagePanel';
import { PreliminaryForm } from '@/components/smartTriage/PreliminaryForm';
import { PreliminaryReportView } from '@/components/smartTriage/PreliminaryReportView';

const { Text } = Typography;

export default function SmartTriagePage() {
  const {
    healthOk, healthMsg, checking, checkHealth,
    currentSession,
  } = useSmartTriageStore();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('triage');
  const [chosen, setChosen] = useState<{ sessionId: string; dept: string } | null>(null);

  useEffect(() => {
    void checkHealth();
  }, [checkHealth]);

  const isStaff = user?.roles?.some((r) =>
    ['admin', 'doctor', 'nurse'].includes(String(r)),
  );

  if (checking && !healthOk) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>
          <Text type="secondary">正在检查系统状态...</Text>
        </div>
      </div>
    );
  }

  if (!healthOk) {
    return (
      <Watermark content={['健澜科技', 'jlmedaios']}>
        <Alert
          type="error"
          showIcon
          style={{ margin: 24 }}
          data-testid="triage-offline"
          message="系统暂时不可用"
          description={
            <Space direction="vertical">
              <Text>{healthMsg || '无法连接智能导诊服务'}</Text>
              <Text type="secondary">
                智能导诊与预问诊需要在线服务，系统不会以缓存或假数据冒充结果。
              </Text>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => void checkHealth()}
              >
                重新连接
              </Button>
            </Space>
          }
        />
      </Watermark>
    );
  }

  return (
    <Watermark content={['健澜科技', 'jlmedaios']}>
      <Space direction="vertical" style={{ width: '100%', padding: 16 }} size="middle">
        <Card size="small" data-testid="triage-header">
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <Space direction="vertical" size={0}>
              <Text strong style={{ fontSize: 16 }}>
                智能导诊与预问诊
              </Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                症状智能分析 · 科室推荐 · 预问诊报告
              </Text>
            </Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => void checkHealth()}
            >
              刷新
            </Button>
          </Space>
        </Card>

        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          data-testid="triage-tabs"
          items={[
            {
              key: 'triage',
              label: '智能导诊',
              children: (
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                  <TriagePanel
                    onChosen={(sessionId, dept) => {
                      setChosen({ sessionId, dept });
                      setActiveTab('preliminary');
                    }}
                  />
                </Space>
              ),
            },
            {
              key: 'preliminary',
              label: '预问诊',
              children: (
                <PreliminaryForm
                  triageSessionId={chosen?.sessionId ?? currentSession?.id ?? null}
                  targetDepartment={chosen?.dept ?? currentSession?.chosenDepartment ?? null}
                />
              ),
            },
            ...(isStaff
              ? [
                {
                  key: 'reports',
                  label: '预问诊报告（医护）',
                  children: <PreliminaryReportView />,
                },
              ]
              : []),
          ]}
        />
      </Space>
    </Watermark>
  );
}
