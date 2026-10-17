/**
 * 健澜科技 jlmedaios - 跨角色经验复用与学习飞轮 V9 页（M291-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Layout, List, Row, Spin, Statistic, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title, Paragraph } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface LessonRow {
  id: string;
  sourceRole: string;
  targetRole: string;
  condition: string;
  lesson: string;
  sourceCnt: number;
}

interface Flywheel {
  transferCount: number;
  targetRoleCount: number;
  highTransferCount: number;
}

export default function LearningFlywheelPage() {
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState<LessonRow[]>([]);
  const [flywheel, setFlywheel] = useState<Flywheel | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [l, f] = await Promise.all([
          get<LessonRow[]>("/api/v1/agent/lessons?targetRole=nurse"),
          get<Flywheel>("/api/v1/agent/flywheel"),
        ]);
        if (!cancelled) {
          setList(l);
          setFlywheel(f);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);
  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>学习飞轮</Title>
        <Paragraph type="secondary">医生经验 → 护士/药师/管理者</Paragraph>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && flywheel && (
          <>
            <Row gutter={16}>
              <Col span={8}><Card><Statistic title="累计转译" value={flywheel.transferCount} /></Card></Col>
              <Col span={8}><Card><Statistic title="受益角色数" value={flywheel.targetRoleCount} /></Card></Col>
              <Col span={8}><Card><Statistic title="高复用经验(≥3次)" value={flywheel.highTransferCount} /></Card></Col>
            </Row>
            <Card title="护士适用经验" style={{ marginTop: 16 }}>
              <List
                dataSource={list}
                renderItem={(l) => (
                  <List.Item>
                    <List.Item.Meta
                      title={`${l.condition}`}
                      description={`${l.lesson}（${l.sourceRole} → ${l.targetRole}）`}
                    />
                    <Tag color="blue">来源×{l.sourceCnt}</Tag>
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
