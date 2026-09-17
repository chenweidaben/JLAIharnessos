/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 质控规则配置页 - /quality/rules
 */
import { Button, Space, Typography } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import RuleConfig from '@/components/quality/RuleConfig';

export default function QualityRulesPage() {
  const navigate = useNavigate();
  return (
    <div className="animate-fade-in">
      <div className="mb-4 flex items-center justify-between">
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/quality')}>
            返回
          </Button>
          <Typography.Title level={5} className="!mb-0">
            质控规则配置中心
          </Typography.Title>
        </Space>
        <span className="text-xs text-ink-secondary">规则版本管理 · 模板库 · 灰度生效</span>
      </div>
      <RuleConfig />
    </div>
  );
}
