/**
 * 健澜科技 jlmedaios - 组织架构占位页（M212 A类路由修复）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { Card, Empty, Layout, Typography, Tag } from 'antd';
import { usePageTitle } from '@/hooks';

const { Content } = Layout;
const { Title } = Typography;

export default function OrganizationPage() {
  usePageTitle('组织架构');
  return (
    <Layout style={{ background: '#f5f7fa' }}>
      <Content style={{ padding: 24 }}>
        <Title level={3} style={{ color: '#0A2540' }}>组织架构</Title>
        <Card>
          <Empty description={
            <span>
              组织架构功能建设中 <Tag color="blue">M212 占位</Tag>
            </span>
          } />
        </Card>
      </Content>
    </Layout>
  );
}
