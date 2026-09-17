/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * AlertBanner 警报横幅组件测试
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@test-utils';
import AlertBanner from '@/components/medical/AlertBanner';
import type { Alert } from '@/types/medical';

function makeAlert(overrides?: Partial<Alert>): Alert {
  return {
    id: 'alt-1',
    type: 'critical-value',
    level: 'critical',
    title: '血钾危急值',
    content: '血钾 6.8 mmol/L，超出危急值上限',
    patientId: 'p-1',
    createdAt: '2026-09-16T08:15:00+08:00',
    acknowledged: false,
    ...overrides,
  };
}

describe('AlertBanner', () => {
  it('渲染标题和内容', () => {
    render(<AlertBanner alert={makeAlert()} />);
    expect(screen.getByText('血钾危急值')).toBeInTheDocument();
    expect(screen.getByText('血钾 6.8 mmol/L，超出危急值上限')).toBeInTheDocument();
  });

  it('危急级别为 error 类型', () => {
    render(<AlertBanner alert={makeAlert({ level: 'critical' })} />);
    expect(document.querySelector('.ant-alert-error')).toBeInTheDocument();
  });

  it('异常级别为 warning 类型', () => {
    render(<AlertBanner alert={makeAlert({ level: 'abnormal' })} />);
    expect(document.querySelector('.ant-alert-warning')).toBeInTheDocument();
  });

  it('正常级别为 info 类型', () => {
    render(<AlertBanner alert={makeAlert({ level: 'normal' })} />);
    expect(document.querySelector('.ant-alert-info')).toBeInTheDocument();
  });

  it('显示图标', () => {
    render(<AlertBanner alert={makeAlert()} />);
    expect(document.querySelector('.ant-alert-icon')).toBeInTheDocument();
  });
});
