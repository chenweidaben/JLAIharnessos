/**
 * 健澜科技 jlmedaios - 病历质控质量监控大盘前端页（M474-D，M474 收官，V14，EMR 深化四模块）
 *
 * 深海蓝VI：四栏实时数据卡片（今日已审/今日待审/本周通过率/预警数）+ 实时事件列表。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Layout, List, Row, Spin, Tag, Typography } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Board {
  todayReviewed: number;
  todayPending: number;
  weekPassRate: number;
  alertCount: number;
}

interface Event {
  action: string;
  count: number;
}

export default function EmrQcMonitorBoardPage() {
  const [loading, setLoading] = useState(true);
  const [board, setBoard] = useState<Board>({ todayReviewed: 0, todayPending: 0, weekPassRate: 0, alertCount: 0 });
  const [stats, setStats] = useState<Event[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-qc-monitor-board", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          if (!cancelled) {
            setBoard(data?.board ?? { todayReviewed: 0, todayPending: 0, weekPassRate: 0, alertCount: 0 });
            setStats(data?.stats ?? []);
          }
        }
      } catch {
        // graceful
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>病历质控质量监控大盘</Title>
        <Spin spinning={loading}>
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={6}>
              <Card>
                <Text type="secondary">今日已审</Text>
                <Title level={2} style={{ color: VI.accent, margin: 0 }}>{board.todayReviewed}</Title>
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Text type="secondary">今日待审</Text>
                <Title level={2} style={{ color: "#fa8c16", margin: 0 }}>{board.todayPending}</Title>
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Text type="secondary">本周通过率</Text>
                <Title level={2} style={{ color: "#52c41a", margin: 0 }}>{board.weekPassRate}%</Title>
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Text type="secondary">预警数</Text>
                <Title level={2} style={{ color: "#f5222d", margin: 0 }}>{board.alertCount}</Title>
              </Card>
            </Col>
          </Row>
          <Card title="实时事件统计（按次数降序）" headStyle={{ background: VI.mid, color: "#fff" }}>
            <List
              dataSource={stats}
              renderItem={(item: Event) => (
                <List.Item>
                  <Tag color="blue">{item.action}</Tag>
                  <Text strong style={{ marginLeft: 12 }}>{item.count} 次</Text>
                </List.Item>
              )}
            />
          </Card>
        </Spin>
      </Content>
    </Layout>
  );
}
