/**
 * 健澜AI原生医院操作系统OS - 工作台「我的待办」页（M134-D · 用户体验深化）
 *
 * 进入即拉取 GET /api/v1/user/todos：BFF 已按当前角色聚合、并按紧急程度排序
 * （最重要的在最上面），前端只负责「一眼看清今天最该做什么」：
 *   - 紧急度配色角标：紧急=红、高=橙、常规=蓝，置顶项无需找；
 *   - 每条待办带数量角标 + 直达按钮，点击卡片即跳进对应业务页闭环；
 *   - 深海蓝 VI，空态/加载态兜底。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useCallback, useEffect, useState, type ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  App as AntdApp,
  Badge,
  Button,
  Card,
  Col,
  Empty,
  Row,
  Spin,
  Tag,
  Typography,
} from 'antd';
import {
  ArrowRightOutlined,
  BellOutlined,
  CalendarOutlined,
  EditOutlined,
  FileDoneOutlined,
  FileSearchOutlined,
  SafetyOutlined,
  SwapOutlined,
  WarningOutlined,
} from '@ant-design/icons';

import PageContainer from '@/components/common/PageContainer';
import { get } from '@/api';

/* ------------------------------------------------------------------ */
/* 类型（与 BFF todoAggregator 对齐）                                    */
/* ------------------------------------------------------------------ */

type TodoPriority = 'urgent' | 'high' | 'normal';

interface Todo {
  id: string;
  staffId: string;
  title: string;
  desc: string;
  count: number;
  priority: TodoPriority;
  priorityLabel: string;
  icon: string;
  target: string;
}

interface TodoView {
  staffId: string;
  role: string;
  total: number;
  todos: Todo[];
}

/** 深海蓝 VI 主色 */
const SEA_BLUE = '#0A4D8C';

/** 紧急度 → 标签配色（用户体验深化：红=立即处理，橙=今日闭环，蓝=择时处理） */
const PRIORITY_COLOR: Record<TodoPriority, string> = {
  urgent: 'red',
  high: 'orange',
  normal: 'blue',
};

/** BFF 图标键 → 深海蓝 VI 图标组件（保持 BFF 纯数据，前端本地映射） */
const ICON_MAP: Record<string, ReactElement> = {
  'calendar-check': <CalendarOutlined />,
  edit: <EditOutlined />,
  audit: <FileSearchOutlined />,
  bell: <BellOutlined />,
  swap: <SwapOutlined />,
  warning: <WarningOutlined />,
  'file-done': <FileDoneOutlined />,
  shield: <SafetyOutlined />,
};

export default function UserTodosPage(): ReactElement {
  const { message } = AntdApp.useApp();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<TodoView>({ staffId: '', role: '', total: 0, todos: [] });

  /** 拉取本人工作台待办（BFF 已按紧急度排序） */
  const refresh = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const data = await get<TodoView>('/api/v1/user/todos');
      setView(data);
    } catch (e) {
      message.error(e instanceof Error ? e.message : '待办加载失败');
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (loading) {
    return (
      <PageContainer title="我的待办" description="按紧急程度聚合，最重要的在最上面">
        <div style={{ textAlign: 'center', padding: 48 }}>
          <Spin size="large" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="我的待办" description="今日待办按紧急程度排序，点击卡片直达处理">
      {/* 顶部概要：一眼看清今天还压着几件事 */}
      <div style={{ marginBottom: 16 }}>
        <Tag color="blue">
          共 <Typography.Text strong>{view.total}</Typography.Text> 项待办
        </Tag>
        <Tag color="default">按紧急度排序 · 高优先置顶</Tag>
      </div>

      {view.todos.length === 0 ? (
        <Card>
          <Empty description="暂无待办，今天可以喘口气" />
        </Card>
      ) : (
        <Row gutter={[16, 16]}>
          {view.todos.map((todo) => {
            const icon = ICON_MAP[todo.icon] ?? <FileDoneOutlined />;
            return (
              <Col xs={24} sm={12} lg={8} key={todo.id}>
                <Badge count={todo.count} offset={[-12, 12]} color={SEA_BLUE}>
                  {/* 用户体验深化：整卡可点、悬停上浮，点击直达对应业务页 */}
                  <Card
                    hoverable
                    onClick={() => navigate(todo.target)}
                    style={{ height: '100%', borderTop: `3px solid ${SEA_BLUE}` }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 22, color: SEA_BLUE }}>{icon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Typography.Text strong style={{ fontSize: 15 }}>
                            {todo.title}
                          </Typography.Text>
                          <Tag color={PRIORITY_COLOR[todo.priority]} style={{ marginInlineEnd: 0 }}>
                            {todo.priorityLabel}
                          </Tag>
                        </div>
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                          {todo.desc}
                        </Typography.Text>
                      </div>
                    </div>
                    <div style={{ marginTop: 12, textAlign: 'right' }}>
                      <Button type="link" size="small" style={{ padding: 0, color: SEA_BLUE }}>
                        去处理 <ArrowRightOutlined />
                      </Button>
                    </div>
                  </Card>
                </Badge>
              </Col>
            );
          })}
        </Row>
      )}
    </PageContainer>
  );
}
