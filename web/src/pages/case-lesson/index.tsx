/**
 * 健澜科技 jlmedaios - Doctor MUSE 个人经验沉淀闭环 V9 页（M291-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Layout, List, Row, Spin, Statistic, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title, Paragraph } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface CaseRow {
  id: string;
  doctorId: string;
  patientCase: string;
  diagnosis: string;
  outcome: string;
  success: boolean;
  tag: string;
}

interface Legacy {
  doctorId: string;
  total: number;
  successCount: number;
  failCount: number;
  topConditions: string[];
}

export default function CaseLessonPage() {
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState<CaseRow[]>([]);
  const [legacy, setLegacy] = useState<Legacy | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [r, l] = await Promise.all([
          get<{ results: CaseRow[] }>("/api/v1/agent/case-lesson"),
          get<Legacy>("/api/v1/agent/doctor-legacy/d-001"),
        ]);
        if (!cancelled) {
          setList(r.results);
          setLegacy(l);
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
        <Title level={3} style={{ color: VI.deep }}>医生案例遗产</Title>
        <Paragraph type="secondary">成功绿·失败红·按诊断检索</Paragraph>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && legacy && (
          <>
            <Row gutter={16}>
              <Col span={6}><Card><Statistic title="总案例" value={legacy.total} /></Card></Col>
              <Col span={6}><Card><Statistic title="成功" value={legacy.successCount} /></Card></Col>
              <Col span={6}><Card><Statistic title="失败" value={legacy.failCount} /></Card></Col>
              <Col span={6}><Card title="高频诊断">{legacy.topConditions.join("、")}</Card></Col>
            </Row>
            <Card title="案例库" style={{ marginTop: 16 }}>
              <List
                dataSource={list}
                renderItem={(c) => (
                  <List.Item>
                    <List.Item.Meta
                      title={`${c.diagnosis}（${c.patientCase}）`}
                      description={`${c.outcome} · tag=${c.tag}`}
                    />
                    <Tag color={c.success ? "green" : "red"}>{c.success ? "成功" : "失败"}</Tag>
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
