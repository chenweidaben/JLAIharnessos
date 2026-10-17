/**
 * 健澜科技 jlmedaios - 低采纳率规则自动复训提示 V12 页（M294-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Col, Layout, List, Row, Spin, Statistic, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Task {
  taskId: string;
  ruleId: string;
  ruleName: string;
  currentRate: number;
  suggestion: string;
  urgent: boolean;
}

interface Summary {
  totalTasks: number;
  avgRate: number;
  urgentCount: number;
}

interface RetrainResp {
  tasks: Task[];
  summary: Summary;
}

export default function RetrainTasksPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<RetrainResp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<RetrainResp>("/api/v1/retrain-tasks");
        if (!cancelled) setData(resp);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);
  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>复训任务</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <>
            <Row gutter={16}>
              <Col span={8}><Card><Statistic title="总任务" value={data.summary.totalTasks} /></Card></Col>
              <Col span={8}><Card><Statistic title="平均采纳率" value={`${data.summary.avgRate}%`} /></Card></Col>
              <Col span={8}><Card><Statistic title="紧急" value={data.summary.urgentCount} /></Card></Col>
            </Row>
            <Card title="任务列表（按紧急度）" style={{ marginTop: 16 }}>
              <List
                dataSource={data.tasks}
                renderItem={(t) => (
                  <List.Item
                    actions={[<Button key="c" size="small" type="primary">完成</Button>]}
                  >
                    <List.Item.Meta
                      title={
                        <span>
                          {t.ruleName}
                          <Tag color={t.urgent ? "red" : "orange"} style={{ marginLeft: 8 }}>
                            {t.urgent ? "紧急" : "常规"}
                          </Tag>
                          <Tag color="blue" style={{ marginLeft: 8 }}>{t.currentRate}%</Tag>
                        </span>
                      }
                      description={t.suggestion}
                    />
                  </List.Item>
                )}
              />
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
