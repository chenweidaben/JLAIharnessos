/**
 * 健澜科技 jlmedaios - 系统工具箱占位页（M212 A类路由修复）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { Card, Col, Empty, Layout, Row, Tag, Typography } from 'antd';
import { usePageTitle } from '@/hooks';

const { Content } = Layout;
const { Title } = Typography;

export default function ToolsPage() {
  usePageTitle('系统工具箱');
  return (
    <Layout style={{ background: '#f5f7fa' }}>
      <Content style={{ padding: 24 }}>
        <Title level={3} style={{ color: '#0A2540' }}>系统工具箱</Title>
        <Row gutter={16}>
          <Col span={8}>
            <Card title="数据工具">
              <Empty description="暂无工具" />
            </Card>
          </Col>
          <Col span={8}>
            <Card title="运维工具">
              <Empty description="暂无工具" />
            </Card>
          </Col>
          <Col span={8}>
            <Card title="安全工具">
              <Empty description={
                <span>建设中 <Tag color="blue">M212 占位</Tag></span>
              } />
            </Card>
          </Col>
        </Row>
      </Content>
    </Layout>
  );
}
