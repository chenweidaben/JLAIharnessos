/**
 * 健澜科技 jlmedaios - 智能导诊面板（M3-P）
 *
 * 症状输入 → 规则引擎推荐科室 → 患者确认科室。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { useState } from 'react';
import {
  Card, Input, Button, Space, Tag, Typography, Alert, Spin, Empty,
} from 'antd';
import {
  MedicineBoxOutlined, ReloadOutlined,
} from '@ant-design/icons';
import { useSmartTriageStore } from '@/store/smartTriageStore';

const { Text } = Typography;
const { TextArea } = Input;

interface Props {
  onChosen?: (sessionId: string, department: string) => void;
}

export function TriagePanel({ onChosen }: Props) {
  const {
    submitting, currentSession, recommendations,
    startTriage, chooseDepartment,
  } = useSmartTriageStore();
  const [symptoms, setSymptoms] = useState('');
  const [chosen, setChosen] = useState<string | null>(null);

  const handleStart = async () => {
    setChosen(null);
    await startTriage({ symptoms });
  };

  const handleChoose = async (dept: string) => {
    if (!currentSession) return;
    setChosen(dept);
    await chooseDepartment(currentSession.id, dept);
    onChosen?.(currentSession.id, dept);
  };

  const completed = currentSession?.status === 'completed';

  return (
    <Card
      title={
        <Space>
          <MedicineBoxOutlined />
          <span>智能导诊</span>
        </Space>
      }
      extra={
        <Button
          size="small"
          icon={<ReloadOutlined />}
          onClick={() => {
            setSymptoms('');
            setChosen(null);
            useSmartTriageStore.getState().reset();
          }}
        >
          重新导诊
        </Button>
      }
    >
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <div>
          <Text type="secondary">请描述您的症状，系统将为您推荐合适的科室：</Text>
          <TextArea
            data-testid="triage-symptoms"
            rows={3}
            value={symptoms}
            placeholder="例如：头痛发烧 3 天，伴有咳嗽、咽痛"
            onChange={(e) => setSymptoms(e.target.value)}
            style={{ marginTop: 8 }}
          />
        </div>

        <Button
          type="primary"
          data-testid="triage-start"
          loading={submitting}
          disabled={!symptoms.trim()}
          onClick={handleStart}
          block
        >
          开始智能导诊
        </Button>

        {submitting && (
          <div style={{ textAlign: 'center' }}>
            <Spin tip="正在分析症状..." />
          </div>
        )}

        {recommendations.length > 0 && !completed && (
          <div data-testid="triage-recommendations">
            <Text strong>推荐科室：</Text>
            <Space direction="vertical" style={{ width: '100%', marginTop: 8 }}>
              {recommendations.map((r, idx) => (
                <Card
                  key={r.department}
                  size="small"
                  data-testid={`dept-card-${idx}`}
                  style={{
                    borderColor: idx === 0 ? '#1677ff' : undefined,
                    borderWidth: idx === 0 ? 2 : 1,
                  }}
                >
                  <Space direction="vertical" style={{ width: '100%' }} size={4}>
                    <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                      <Space>
                        <Text strong>{r.department}</Text>
                        {idx === 0 && <Tag color="blue">首选</Tag>}
                      </Space>
                      <Tag color={r.confidence >= 0.8 ? 'green' : 'orange'}>
                        匹配度 {Math.round(r.confidence * 100)}%
                      </Tag>
                    </Space>
                    <Text type="secondary" style={{ fontSize: 12 }}>{r.reason}</Text>
                    <Button
                      size="small"
                      type={idx === 0 ? 'primary' : 'default'}
                      data-testid={`choose-dept-${idx}`}
                      onClick={() => handleChoose(r.department)}
                      block
                    >
                      选择 {r.department}
                    </Button>
                  </Space>
                </Card>
              ))}
            </Space>
          </div>
        )}

        {completed && chosen && (
          <Alert
            type="success"
            showIcon
            data-testid="triage-done"
            message={`已为您选择：${currentSession?.chosenDepartment ?? chosen}`}
            description="请继续填写预问诊信息，帮助医生提前了解您的病情。"
          />
        )}

        {!recommendations.length && !submitting && currentSession === null && (
          <Empty description="请输入症状开始导诊" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        )}
      </Space>
    </Card>
  );
}

export default TriagePanel;
