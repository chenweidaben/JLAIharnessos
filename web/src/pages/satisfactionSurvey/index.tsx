/**
 * 健澜科技 jlmedaios - 满意度调查页（M63-A）
 * 患者 4 维度 5 分制问卷 + 管理员科室排名表。
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect } from 'react';
import { Alert, Button, Card, Layout, List, Rate, Table, Typography } from 'antd';
import { usePermission } from '@/router/guards';
import { useSatisfactionStore } from '@/store/satisfactionSurveyStore';

const { Header, Content } = Layout;
const { Title } = Typography;

export default function SatisfactionSurveyPage() {
  const { dbUp, ranks, overallAvg, loading, error, checkHealth, loadRanking } = useSatisfactionStore();
  usePermission();
  useEffect(() => { void checkHealth().then(() => loadRanking()); }, [checkHealth, loadRanking]);

  if (dbUp === false) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Header><Title level={4} style={{ color: '#fff' }}>满意度调查</Title></Header>
        <Content style={{ padding: 24, opacity: 0.4 }}><Alert type="error" showIcon message="数据库连接异常" /></Content>
      </Layout>
    );
  }
  if (dbUp === null) return null;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header><Title level={4} style={{ color: '#fff' }}>患者满意度调查</Title></Header>
      <Content style={{ padding: 24 }}>
        {error && <Alert type="error" showIcon style={{ marginBottom: 16 }} message={error} />}
        <Card title={`科室满意度排名（整体均分 ${overallAvg}）`} style={{ marginBottom: 16 }}>
          <Table
            rowKey="department"
            loading={loading}
            dataSource={ranks}
            pagination={false}
            columns={[
              { title: '科室', dataIndex: 'department' },
              { title: '均分', dataIndex: 'avg', render: (v: number) => <Rate disabled allowHalf value={v} /> },
              { title: '问卷数', dataIndex: 'count' },
            ]}
          />
        </Card>
        <Card title="患者问卷示例（4 维度 5 分制）">
          <List>
            {['医疗', '护理', '后勤', '环境'].map((d) => (
              <List.Item key={d}><span>{d}</span><Rate defaultValue={5} /></List.Item>
            ))}
            <List.Item><Button type="primary" onClick={() => loadRanking()}>提交并刷新</Button></List.Item>
          </List>
        </Card>
      </Content>
    </Layout>
  );
}
