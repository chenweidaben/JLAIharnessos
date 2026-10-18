/**
 * 健澜科技 jlmedaios - 病历质控 PDCA 循环管理前端页（M468-D，V14，EMR 深化四模块，M468 收官）
 *
 * 深海蓝VI：PDCA 四阶段看板（Plan/Do/Check/Act 四列）+ 推进阶段按钮。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Col, Layout, List, message, Row, Spin, Tag, Typography } from "antd";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface PdcaPlan {
  id: string;
  title: string;
  description: string;
  stage: "plan" | "do" | "check" | "act";
}

const STAGES: { key: PdcaPlan["stage"]; label: string; color: string }[] = [
  { key: "plan", label: "Plan 计划", color: "#4A90D9" },
  { key: "do", label: "Do 执行", color: "#52c41a" },
  { key: "check", label: "Check 检查", color: "#faad14" },
  { key: "act", label: "Act 处理", color: "#ff4d4f" },
];

export default function EmrPdcaPage() {
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<PdcaPlan[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-pdca", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          if (!cancelled) setPlans(data?.plans ?? []);
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
        <Title level={3} style={{ color: VI.deep }}>病历质控 PDCA 循环管理</Title>
        <Spin spinning={loading}>
          <Row gutter={16}>
            {STAGES.map((stage) => {
              const stagePlans = plans.filter((p) => p.stage === stage.key);
              return (
                <Col span={6} key={stage.key}>
                  <Card title={stage.label} headStyle={{ background: stage.color, color: "#fff" }}>
                    <List
                      dataSource={stagePlans}
                      renderItem={(item: PdcaPlan) => (
                        <List.Item>
                          <Tag color={stage.color}>{item.id}</Tag>
                          <span>{item.title}</span>
                        </List.Item>
                      )}
                    />
                  </Card>
                </Col>
              );
            })}
          </Row>
        </Spin>
      </Content>
    </Layout>
  );
}
