/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * DAMO-RADAR 报告头部：model / 版本 / 模式 / 生成时间 / 免责声明横幅；
 * mode=demo 时叠加「演示数据」水印。
 */
import { ExperimentOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { Alert, Badge, Descriptions, Tag, Typography } from 'antd';
import dayjs from 'dayjs';

import type { RadarResult } from '@/types/imagingAi';

const { Text } = Typography;

interface AiReportHeaderProps {
  result: RadarResult;
}

export default function AiReportHeader({ result }: AiReportHeaderProps) {
  const isDemo = result.mode === 'demo';
  return (
    <div data-testid="ai-report-header" style={{ position: 'relative' }}>
      {isDemo && (
        <div
          data-testid="demo-watermark"
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 42,
            fontWeight: 700,
            letterSpacing: 8,
            color: 'rgba(250, 84, 28, 0.10)',
            transform: 'rotate(-18deg)',
            userSelect: 'none',
            zIndex: 0,
          }}
        >
          演示数据
        </div>
      )}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <Descriptions
          size="small"
          column={{ xs: 1, sm: 2, md: 4 }}
          style={{ background: '#fafafa', padding: '12px 16px', borderRadius: 6 }}
        >
          <Descriptions.Item label="模型">
            <Text strong>{result.model}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="版本">
            <Tag color="geekblue">{result.model_version}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="运行模式">
            {isDemo ? (
              <Badge
                color="orange"
                text={<span><ExperimentOutlined /> 演示(demo)</span>}
              />
            ) : (
              <Badge color="green" text="生产(production)" />
            )}
          </Descriptions.Item>
          <Descriptions.Item label="生成时间">
            {dayjs(result.generated_at).format('YYYY-MM-DD HH:mm:ss')}
          </Descriptions.Item>
          <Descriptions.Item label="危急 / 重要 / 阳性">
            <Text style={{ color: '#cf1322' }}>{result.summary.critical_count}</Text> /{' '}
            <Text style={{ color: '#d46b08' }}>{result.summary.major_count}</Text> /{' '}
            {result.summary.positive_count}
          </Descriptions.Item>
          <Descriptions.Item label="studyUid">{result.study_uid}</Descriptions.Item>
        </Descriptions>
        <Alert
          type="warning"
          showIcon
          icon={<SafetyCertificateOutlined />}
          style={{ marginTop: 12 }}
          message="AI 第二阅片，需放射科医师复核"
          description={result.disclaimer}
        />
      </div>
    </div>
  );
}
