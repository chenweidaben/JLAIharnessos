/**
 * 健澜科技杠OS - 新员工入职向导页（M134-A）
 *
 * 「后继者站在巨人肩膀上」——新员工登录后进入本页，一屏看清：
 *   1. 整体入职进度条（第1天 → 第3月）；
 *   2. 智慧度成长对比（入职基线 vs 当前估值）；
 *   3. 按阶段折叠的任务清单，每条任务动词开头、可验收。
 *
 * 【用户体验深化】
 *  - 进入页自动拉取 GET /api/v1/user/onboarding，不要求员工选科室/选岗位；
 *  - 进度条用深海蓝主色，已完成任务打勾、未完成灰显，一眼知道下一步做什么；
 *  - 智慧度对比用双柱条（基线 vs 当前），让新员工看见成长，而非只看缺口；
 *  - 阶段按时间轴纵向排列（第1天 → 第1周 → 第1月 → 第3月），不堆卡片。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useCallback, useEffect, useState, type ReactElement } from 'react';
import {
  Alert,
  App as AntdApp,
  Card,
  Col,
  Divider,
  List,
  Progress,
  Row,
  Space,
  Spin,
  Tag,
  Typography,
} from 'antd';
import {
  CheckCircleFilled,
  ClockCircleOutlined,
  ExperimentOutlined,
  RocketOutlined,
  SmileOutlined,
} from '@ant-design/icons';

import PageContainer from '@/components/common/PageContainer';
import { get } from '@/api';

/* ------------------------------------------------------------------ */
/* 类型（与 BFF onboardingAggregator 对齐）                             */
/* ------------------------------------------------------------------ */

type OnboardingStageKey = 'day1' | 'week1' | 'month1' | 'month3';

interface OnboardingTask {
  taskId: string;
  title: string;
  description: string;
  estimatedHours: number;
}

interface OnboardingStage {
  stageKey: OnboardingStageKey;
  title: string;
  goal: string;
  tasks: OnboardingTask[];
}

interface Guide {
  staffId: string;
  role: string;
  roleLabel: string;
  welcome: string;
  stages: OnboardingStage[];
  totalTasks: number;
}

interface StageProgress {
  stageKey: OnboardingStageKey;
  completed: number;
  total: number;
}

interface Progress {
  staffId: string;
  completedTasks: number;
  totalTasks: number;
  percent: number;
  currentStage: OnboardingStageKey;
  stages: StageProgress[];
  wisdomBaseline: number;
  wisdomCurrent: number;
}

interface OnboardingView {
  staffId: string;
  deptCode: string;
  deptName: string;
  realName: string;
  guide: Guide;
  progress: Progress;
}

/** 深海蓝 VI 主色（与全站一致） */
const SEA_BLUE = '#0A4D8C';
/** 智慧度成长用的辅助色（暖橙，与深海蓝形成对比） */
const WARM_ORANGE = '#E8833A';

/** 阶段图标映射（时间轴节点） */
const STAGE_ICON: Record<OnboardingStageKey, ReactElement> = {
  day1: <RocketOutlined style={{ color: SEA_BLUE }} />,
  week1: <ClockCircleOutlined style={{ color: SEA_BLUE }} />,
  month1: <ExperimentOutlined style={{ color: SEA_BLUE }} />,
  month3: <SmileOutlined style={{ color: SEA_BLUE }} />,
};

export default function UserOnboardingPage(): ReactElement {
  const { message } = AntdApp.useApp();
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<OnboardingView | null>(null);

  /** 拉取本人入职向导 + 进度 */
  const refresh = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const data = await get<OnboardingView>('/api/v1/user/onboarding');
      setView(data);
    } catch (e) {
      message.error(e instanceof Error ? e.message : '入职向导加载失败');
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (loading || !view) {
    return (
      <PageContainer title="我的入职向导" description="前 90 天路线图，跟着 Personal Agent 一步步走">
        <div style={{ textAlign: 'center', padding: 48 }}>
          <Spin size="large" />
        </div>
      </PageContainer>
    );
  }

  const { guide, progress, realName, deptName } = view;
  const wisdomDelta = progress.wisdomCurrent - progress.wisdomBaseline;

  return (
    <PageContainer
      title="我的入职向导"
      description={`${realName} · ${deptName} · ${guide.roleLabel}岗 · 前 90 天路线图`}
    >
      {/* 欢迎语：第一屏温度 */}
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16, borderColor: SEA_BLUE }}
        message={guide.welcome}
      />

      {/* 顶部：总进度条 + 智慧度成长对比 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Card title={<Space><RocketOutlined style={{ color: SEA_BLUE }} />整体入职进度</Space>}>
            <Progress
              percent={progress.percent}
              strokeColor={SEA_BLUE}
              size={['100%', 24]}
            />
            <Space size="large" style={{ marginTop: 8 }}>
              <Typography.Text type="secondary">
                已完成 {progress.completedTasks} / {progress.totalTasks} 项任务
              </Typography.Text>
              <Tag color={SEA_BLUE}>当前阶段：{stageTitleOf(progress.currentStage)}</Tag>
            </Space>
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card title={<Space><ExperimentOutlined style={{ color: SEA_BLUE }} />智慧度成长对比</Space>}>
            <Row gutter={16}>
              <Col span={12}>
                <Typography.Text type="secondary">入职基线</Typography.Text>
                <Progress
                  type="dashboard"
                  percent={progress.wisdomBaseline}
                  size={110}
                  strokeColor="#B0BEC5"
                  format={(p) => `${p ?? 0}`}
                />
              </Col>
              <Col span={12}>
                <Typography.Text type="secondary">当前估值</Typography.Text>
                <Progress
                  type="dashboard"
                  percent={progress.wisdomCurrent}
                  size={110}
                  strokeColor={WARM_ORANGE}
                  format={(p) => `${p ?? 0}`}
                />
              </Col>
            </Row>
            <Divider style={{ margin: '12px 0' }} />
            <Typography.Text>
              较入职基线 <b style={{ color: WARM_ORANGE }}>+{wisdomDelta}</b> 分
              ，继续保持！
            </Typography.Text>
          </Card>
        </Col>
      </Row>

      {/* 阶段任务清单：按时间轴纵向排列 */}
      {guide.stages.map((stage) => {
        const stageProg = progress.stages.find((s) => s.stageKey === stage.stageKey);
        const completed = stageProg?.completed ?? 0;
        const total = stageProg?.total ?? stage.tasks.length;
        return (
          <Card
            key={stage.stageKey}
            style={{ marginTop: 16 }}
            title={
              <Space>
                {STAGE_ICON[stage.stageKey]}
                <b>{stage.title}</b>
                <Typography.Text type="secondary" style={{ fontWeight: 400 }}>
                  {stage.goal}
                </Typography.Text>
              </Space>
            }
            extra={
              <Tag color={completed === total ? SEA_BLUE : 'default'}>
                {completed} / {total}
              </Tag>
            }
          >
            <List
              dataSource={stage.tasks}
              renderItem={(task, idx) => {
                const done = idx < completed;
                return (
                  <List.Item>
                    <Space align="start" style={{ width: '100%' }}>
                      {done ? (
                        <CheckCircleFilled style={{ color: SEA_BLUE, marginTop: 4 }} />
                      ) : (
                        <ClockCircleOutlined style={{ color: '#B0BEC5', marginTop: 4 }} />
                      )}
                      <div style={{ flex: 1, opacity: done ? 0.6 : 1 }}>
                        <Typography.Text strong={!done}>{task.title}</Typography.Text>
                        <br />
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                          {task.description}
                        </Typography.Text>
                      </div>
                      <Tag>{task.estimatedHours}h</Tag>
                    </Space>
                  </List.Item>
                );
              }}
            />
          </Card>
        );
      })}
    </PageContainer>
  );
}

/** 阶段键 → 中文标题（与后端 STAGE_TITLE 对齐） */
function stageTitleOf(key: OnboardingStageKey): string {
  switch (key) {
    case 'day1':
      return '第 1 天';
    case 'week1':
      return '第 1 周';
    case 'month1':
      return '第 1 月';
    case 'month3':
      return '第 3 月';
    default:
      return key;
  }
}
