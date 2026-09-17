/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 工作台仪表盘 - 待办事项列表
 */

import { useMemo, useState } from 'react';
import { CheckOutlined, ClockCircleOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { clsx } from 'clsx';
import type { TodoType, TodoPriority } from '@/types/dashboard';
import { useDashboardStore } from '@/store/dashboardStore';

type TodoFilter = 'all' | TodoType;

const todoTypeConfig: Record<TodoType, { icon: string; label: string; color: string }> = {
  prescription: { icon: '💊', label: '待审处方', color: '#13C2C2' },
  medical_record: { icon: '📋', label: '待签病历', color: '#FA8C16' },
  critical_value: { icon: '⚠️', label: '危急值', color: '#F5222D' },
  consultation: { icon: '👥', label: '待会诊', color: '#722ED1' },
  other: { icon: '📌', label: '其他', color: '#8C8C8C' },
};

const priorityConfig: Record<TodoPriority, { label: string; className: string }> = {
  urgent: { label: '紧急', className: 'bg-red-100 text-red-700 border-red-200' },
  high: { label: '高', className: 'bg-orange-100 text-orange-700 border-orange-200' },
  medium: { label: '中', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  low: { label: '低', className: 'bg-gray-100 text-gray-600 border-gray-200' },
};

export const TodoList: React.FC = () => {
  const todos = useDashboardStore((s) => s.data.todos);
  const markTodoDone = useDashboardStore((s) => s.markTodoDone);
  const markTodoIgnored = useDashboardStore((s) => s.markTodoIgnored);
  const [filter, setFilter] = useState<TodoFilter>('all');

  const pendingTodos = useMemo(() => todos.filter((t) => !t.done), [todos]);

  const filteredTodos = useMemo(() => {
    const list = filter === 'all' ? pendingTodos : pendingTodos.filter((t) => t.type === filter);
    // 优先级排序：紧急 > 高 > 中 > 低
    const order: Record<TodoPriority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
    return [...list].sort((a, b) => order[a.priority] - order[b.priority]);
  }, [pendingTodos, filter]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: pendingTodos.length };
    (Object.keys(todoTypeConfig) as TodoType[]).forEach((k) => {
      c[k] = pendingTodos.filter((t) => t.type === k).length;
    });
    return c;
  }, [pendingTodos]);

  const filters: { key: TodoFilter; label: string }[] = [
    { key: 'all', label: '全部' },
    { key: 'prescription', label: '待审处方' },
    { key: 'medical_record', label: '待签病历' },
    { key: 'critical_value', label: '危急值' },
    { key: 'consultation', label: '待会诊' },
    { key: 'other', label: '其他' },
  ];

  return (
    <div className="flex flex-col rounded-xl bg-white shadow-sm border border-gray-100 h-full">
      {/* 头部 */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-50">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold text-gray-800">待办事项</h3>
          {pendingTodos.length > 0 && (
            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white">
              {pendingTodos.length}
            </span>
          )}
        </div>
        <span className="text-xs text-gray-400">{pendingTodos.length} 项待处理</span>
      </div>

      {/* 分类 Tab */}
      <div className="flex gap-1 overflow-x-auto px-3 py-2 border-b border-gray-50">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={clsx(
              'flex shrink-0 items-center gap-1 rounded-md px-2.5 py-1 text-xs transition-all whitespace-nowrap',
              filter === f.key
                ? 'bg-[#0A4D8C] text-white'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700',
            )}
          >
            {f.label}
            {counts[f.key]! > 0 && (
              <span
                className={clsx(
                  'rounded-full px-1 text-[10px]',
                  filter === f.key ? 'bg-white/25' : 'bg-gray-100 text-gray-500',
                )}
              >
                {counts[f.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 待办列表 */}
      <div className="flex-1 overflow-y-auto max-h-[420px]">
        {filteredTodos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <CheckCircleOutlined className="text-4xl mb-2 text-green-400" />
            <p className="text-sm">暂无待办事项</p>
            <p className="text-xs mt-1">所有任务都已处理完毕</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {filteredTodos.map((todo) => {
              const tc = todoTypeConfig[todo.type];
              const pc = priorityConfig[todo.priority];
              const isUrgent = todo.priority === 'urgent' && !todo.done;
              return (
                <li
                  key={todo.id}
                  className={clsx(
                    'group flex items-start gap-3 px-5 py-3 transition-colors hover:bg-gray-50',
                    isUrgent && 'bg-red-50/40',
                  )}
                >
                  {/* 类型图标 */}
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-base"
                    style={{ backgroundColor: `${tc.color}15` }}
                  >
                    {tc.icon}
                  </span>

                  {/* 内容 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-800 truncate">
                        {todo.title}
                      </span>
                      {/* 优先级标签 */}
                      <span
                        className={clsx(
                          'shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-medium',
                          pc.className,
                        )}
                      >
                        {pc.label}
                      </span>
                      {isUrgent && (
                        <span className="shrink-0 h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                      )}
                    </div>
                    <div className="mt-0.5 text-xs text-gray-400">
                      {todo.patientName !== '—' && (
                        <span>
                          {todo.patientName} · {todo.bedNumber} · {todo.department}
                        </span>
                      )}
                    </div>
                    {todo.description && (
                      <div className="mt-0.5 text-xs text-gray-400 truncate">
                        {todo.description}
                      </div>
                    )}
                    <div className="mt-1 flex items-center gap-3">
                      <span className="flex items-center gap-1 text-xs text-orange-500">
                        <ClockCircleOutlined /> {todo.deadline}
                      </span>
                    </div>
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex shrink-0 flex-col gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={() => markTodoDone(todo.id)}
                      className="flex items-center gap-1 rounded bg-[#0A4D8C] px-2 py-0.5 text-xs text-white hover:bg-[#083d6f]"
                    >
                      <CheckOutlined /> 处理
                    </button>
                    <button
                      onClick={() => markTodoIgnored(todo.id)}
                      className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500 hover:bg-gray-200"
                    >
                      忽略
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default TodoList;
