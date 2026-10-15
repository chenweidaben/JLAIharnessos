/**
 * 健澜科技杠OS - 新员工入职向导页（M134-A + M155-D）
 *
 * 「后继者站在巨人肩膀上」——新员工登录后进入本页，一屏看清：
 *   1. 整体入职进度条（第1天 → 第3月）；
 *   2. 智慧度成长对比（入职基线 vs 当前估值）；
 *   3. 按阶段折叠的任务清单，每条任务动词开头、可验收。
 *
 * M155-D「真帮人，不能烦人」：
 *   4. 右下角新手引导浮层——按入职天数只给「此刻该看的 1~3 步」，
 *      超过 90 天不出现；每步可「去看看 / 完成这步 / 跳过 / 不再提示本阶段」；
 *   5. 快捷键面板——按 Ctrl+/ 呼出，按当前岗位给出真正用得上的快捷键。
 *
 * 【用户体验深化】
 *  - 进入页自动拉取 GET /api/v1/user/onboarding，不要求员工选科室/选岗位；
 *  - 进度条用深海蓝主色，已完成任务打勾、未完成灰显，一眼知道下一步做什么；
 *  - 浮层默认收起为一个小气泡，不挡病历/医嘱主操作；点「不再提示本阶段」后
 *    写入 localStorage，本次入职周期内不再弹同一阶段；
 *  - 阶段按时间轴纵向排列（第1天 → 第1周 → 第1月 → 第3月），不堆卡片。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';
import {
  Alert,
  App as AntdApp,
  Button,
  Card,
  Col,
  Divider,
  Drawer,
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
  QuestionCircleOutlined,
  CloseOutlined,
} from '@ant-design/icons';

import PageContainer from '@/components/common/PageContainer';
import { get, put } from '@/api';

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

/** M155-D：此刻该看的一步 */
interface GuideStep {
  stepId: string;
  stage: OnboardingStageKey;
  title: string;
  description: string;
  target: string;
  highlight: string;
  skippable: boolean;
  dismissable: boolean;
}

/** M155-D：快捷键 */
interface Shortcut {
  key: string;
  label: string;
  page: string;
  when: string;
}

/** M155-D：个性化首页配置 */
interface HomepageConfig {
  userId: string;
  role: string;
  roleLabel: string;
  welcome: string;
  widgets: { key: string; title: string; visible: boolean; order: number }[];
  shortcuts: Shortcut[];
  showGuide: boolean;
  dismissedStages: OnboardingStageKey[];
}

interface OnboardingView {
  staffId: string;
  deptCode: string;
  deptName: string;
  realName: string;
  role: string;
  daysSinceJoin: number;
  guide: Guide;
  progress: Progress;
  currentSteps: GuideStep[];
  homepage: HomepageConfig;
  shortcuts: Shortcut[];
}

/** 深海蓝 VI 主色（与全站一致） */
const SEA_BLUE = '#0A4D8C';
/** 智慧度成长用的辅助色（暖橙，与深海蓝形成对比） */
const WARM_ORANGE = '#E8833A';

/** 「不再提示本阶段」localStorage 前缀（按 staffId 隔离） */
const DISMISS_KEY_PREFIX = 'jl.onboarding.dismissed.';

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
  /** 浮层当前展示到第几步（currentSteps 下标） */
  const [stepIdx, setStepIdx] = useState(0);
  /** 浮层是否展开（false = 收起为小气泡） */
  const [overlayOpen, setOverlayOpen] = useState(true);
  /** 快捷键面板是否打开 */
  const [shortcutOpen, setShortcutOpen] = useState(false);
  /** 已被本地「不再提示」的阶段 */
  const [dismissed, setDismissed] = useState<OnboardingStageKey[]>([]);

  /** 拉取本人入职向导 + 进度 */
  const refresh = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const data = await get<OnboardingView>('/api/v1/user/onboarding');
      setView(data);
      setStepIdx(0);
      // 读本地「不再提示」
      try {
        const key = DISMISS_KEY_PREFIX + data.staffId;
        const raw = localStorage.getItem(key);
        if (raw) setDismissed(JSON.parse(raw) as OnboardingStageKey[]);
      } catch {
        /* 本地存储不可用时静默，不阻断引导 */
      }
    } catch (e) {
      message.error(e instanceof Error ? e.message : '入职向导加载失败');
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /** 全局快捷键：Ctrl+/ 呼出/收起快捷键面板 */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        setShortcutOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  /** 当前可展示的引导步（过滤掉本地已「不再提示」的阶段） */
  const visibleSteps = useMemo<GuideStep[]>(() => {
    if (!view) return [];
    return view.currentSteps.filter((s) => !dismissed.includes(s.stage));
  }, [view, dismissed]);

  /** 把某阶段写入「不再提示」 */
  const dismissStage = useCallback(
    (stage: OnboardingStageKey) => {
      setDismissed((prev) => {
        const next = prev.includes(stage) ? prev : [...prev, stage];
        if (view) {
          try {
            localStorage.setItem(DISMISS_KEY_PREFIX + view.staffId, JSON.stringify(next));
          } catch {
            /* ignore */
          }
        }
        return next;
      });
      message.success('好的，本阶段不再提示');
    },
    [message, view],
  );

  /** 标记一步完成 → PUT → 刷新进度 */
  const completeStep = useCallback(
    async (step: GuideStep) => {
      try {
        await put<{ progress: Progress }>(`/api/v1/user/onboarding/complete/${step.stepId}`);
        message.success(`已完成「${step.title}」`);
        // 跳到下一步或收起浮层
        setStepIdx((i) => {
          if (i + 1 >= visibleSteps.length) {
            setOverlayOpen(false);
            return i;
          }
          return i + 1;
        });
        void refresh();
      } catch (e) {
        message.error(e instanceof Error ? e.message : '完成状态更新失败');
      }
    },
    [message, refresh, visibleSteps.length],
  );

  if (loading || !view) {
    return (
      <PageContainer title="我的入职向导" description="前 90 天路线图，跟着 Personal Agent 一步步走">
        <div style={{ textAlign: 'center', padding: 48 }}>
          <Spin size="large" />
        </div>
      </PageContainer>
    );
  }

  const { guide, progress, realName, deptName, homepage, shortcuts } = view;
  const wisdomDelta = progress.wisdomCurrent - progress.wisdomBaseline;
  const currentStep = visibleSteps[stepIdx];

  return (
    <PageContainer
      title="我的入职向导"
      description={`${realName} · ${deptName} · ${guide.roleLabel}岗 · 前 90 天路线图`}
      extra={
        <Button
          icon={<QuestionCircleOutlined />}
          onClick={() => setShortcutOpen(true)}
        >
          快捷键 (Ctrl+/)
        </Button>
      }
    >
      {/* 个性化欢迎语（M155-D） */}
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16, borderColor: SEA_BLUE }}
        message={homepage.welcome}
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

      {/* M155-D：新手引导浮层（右下角气泡，不挡主操作） */}
      {currentStep && overlayOpen && (
        <div
          style={{
            position: 'fixed',
            right: 24,
            bottom: 24,
            width: 360,
            maxWidth: 'calc(100vw - 48px)',
            background: '#fff',
            borderRadius: 12,
            boxShadow: '0 8px 32px rgba(10,77,140,0.18)',
            border: `1px solid ${SEA_BLUE}`,
            padding: 16,
            zIndex: 1000,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Tag color={SEA_BLUE}>{stageTitleOf(currentStep.stage)}</Tag>
            <Button
              type="text"
              size="small"
              icon={<CloseOutlined />}
              onClick={() => setOverlayOpen(false)}
            />
          </div>
          <Typography.Title level={5} style={{ marginTop: 8, marginBottom: 4 }}>
            {currentStep.title}
          </Typography.Title>
          <Typography.Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 12 }}>
            {currentStep.description}
          </Typography.Paragraph>
          <Space wrap>
            <Button type="primary" onClick={() => void completeStep(currentStep)}>
              完成这步
            </Button>
            {currentStep.skippable && (
              <Button
                onClick={() =>
                  setStepIdx((i) => (i + 1 >= visibleSteps.length ? i : i + 1))
                }
              >
                跳过
              </Button>
            )}
            {currentStep.dismissable && (
              <Button type="link" onClick={() => dismissStage(currentStep.stage)}>
                不再提示本阶段
              </Button>
            )}
          </Space>
          {visibleSteps.length > 1 && (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {stepIdx + 1} / {visibleSteps.length}
            </Typography.Text>
          )}
        </div>
      )}

      {/* 浮层收起后：一个小气泡可重新展开 */}
      {!overlayOpen && currentStep && (
        <Button
          type="primary"
          shape="circle"
          size="large"
          icon={<RocketOutlined />}
          style={{ position: 'fixed', right: 24, bottom: 24, zIndex: 1000, background: SEA_BLUE }}
          onClick={() => setOverlayOpen(true)}
        />
      )}

      {/* M155-D：快捷键面板 Drawer */}
      <Drawer
        title="快捷键面板"
        placement="right"
        open={shortcutOpen}
        onClose={() => setShortcutOpen(false)}
        width={360}
      >
        <Typography.Paragraph type="secondary">
          按岗位排好的高频快捷键，记住 3 个就能省一半重复点击。
        </Typography.Paragraph>
        <List
          dataSource={shortcuts}
          renderItem={(sc) => (
            <List.Item>
              <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                <Typography.Text>{sc.label}</Typography.Text>
                <kbd
                  style={{
                    background: '#F0F4F8',
                    border: '1px solid #D0D8E0',
                    borderRadius: 4,
                    padding: '2px 8px',
                    fontFamily: 'monospace',
                    color: SEA_BLUE,
                  }}
                >
                  {sc.key}
                </kbd>
              </Space>
            </List.Item>
          )}
        />
      </Drawer>
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
