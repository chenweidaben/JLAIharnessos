/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 病历质控详情页 - /quality/record/:recordId
 */
import { Button, Space, Typography } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import RecordQualityCheck from '@/components/quality/RecordQualityCheck';

export default function RecordQualityDetail() {
  const navigate = useNavigate();
  return (
    <div className="animate-fade-in">
      <div className="mb-3 flex items-center justify-between">
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/quality')}>
            返回
          </Button>
          <Typography.Title level={5} className="!mb-0">
            病历在线批阅与质控
          </Typography.Title>
        </Space>
        <span className="text-xs text-ink-secondary">健澜科技 · 智枢质控 · 电子病历三级质控</span>
      </div>
      <RecordQualityCheck />
    </div>
  );
}
