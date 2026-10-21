/**
 * 健澜科技 jlmedaios - 健康教育（M620，P12 患者侧深度）
 *
 * 三甲流程：分类筛选 Tag → 文章 Card 网格 → 详情 Modal（标题/摘要/正文）。
 * 权限码 healthEdu:view。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { useEffect, useState } from 'react';
import {
  Alert,
  Avatar,
  Button,
  Card,
  Col,
  List,
  Modal,
  Row,
  Space,
  Spin,
  Tag,
  Typography,
} from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

import { PageContainer } from '@/components/common';
import DemoModeBanner from '@/components/common/DemoModeBanner';
import { usePageTitle } from '@/hooks';
import { usePermission } from '@/router/guards';
import { useHealthEducationM620Store } from '@/store/healthEducationM620Store';
import {
  ARTICLE_CATEGORIES,
  type HealthArticle,
} from '@/services/api/healthEducationM620';

export default function HealthEducationM620Page() {
  usePageTitle('健康教育');
  const { hasPermission } = usePermission();
  const canView = hasPermission('healthEdu:view');

  const { items, category, loading, error, demo, load } = useHealthEducationM620Store();
  const [active, setActive] = useState<HealthArticle | null>(null);

  useEffect(() => {
    void load(category || undefined);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <PageContainer
      title="健康教育"
      description="权威健康宣教文章库（按病种/主题分类）"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}
      {!canView && (
        <Alert type="warning" showIcon style={{ marginBottom: 12 }} message="当前账号缺少 healthEdu:view 权限" />
      )}

      <Card size="small" style={{ marginBottom: 16 }}>
        <Space>
          <Tag
            color={!category ? 'blue' : 'default'}
            style={{ cursor: 'pointer' }}
            onClick={() => void load('')}
          >
            全部
          </Tag>
          {ARTICLE_CATEGORIES.map((c) => (
            <Tag
              key={c}
              color={category === c ? 'blue' : 'default'}
              style={{ cursor: 'pointer' }}
              onClick={() => void load(c)}
            >
              {c}
            </Tag>
          ))}
        </Space>
      </Card>

      <Spin spinning={loading}>
        <Row gutter={[16, 16]}>
          {items.map((a) => (
            <Col xs={24} sm={12} lg={8} key={a.id}>
              <Card size="small" hoverable onClick={() => setActive(a)}>
                <List.Item.Meta
                  avatar={<Avatar shape="square" size="small">{a.category.slice(0, 1)}</Avatar>}
                  title={a.title}
                  description={
                    <span>
                      <Tag color="cyan">{a.category}</Tag>
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        {dayjs(a.publishedAt).format('YYYY-MM-DD')} · {a.author}
                      </Typography.Text>
                    </span>
                  }
                />
                <Typography.Paragraph
                  ellipsis={{ rows: 2 }}
                  style={{ marginTop: 8, marginBottom: 8 }}
                >
                  {a.summary}
                </Typography.Paragraph>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  <EyeOutlined /> {a.views}
                </Typography.Text>
              </Card>
            </Col>
          ))}
        </Row>
      </Spin>

      <Modal
        open={active != null}
        title={active?.title}
        footer={<Button onClick={() => setActive(null)}>关闭</Button>}
        onCancel={() => setActive(null)}
        width={640}
      >
        {active && (
          <>
            <Tag color="cyan">{active.category}</Tag>
            <Typography.Text type="secondary" style={{ marginLeft: 8 }}>
              {active.author} · {dayjs(active.publishedAt).format('YYYY-MM-DD')}
            </Typography.Text>
            <Typography.Paragraph style={{ marginTop: 12 }}>{active.summary}</Typography.Paragraph>
            <Typography.Paragraph>{active.content}</Typography.Paragraph>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
