/**
 * 健澜科技 jlmedaios - 新手医生孵化与导师匹配 V13 页（M298-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Col, Layout, Progress, Row, Spin, Statistic, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Mentor {
  doctorId: string;
  name: string;
  dept: string;
  score: number;
}

interface Plan {
  newDoctorId: string;
  mentorId: string;
  mentorName: string;
  experienceCount: number;
  totalMinutes: number;
}

interface Resp {
  mentor: Mentor | null;
  plan: Plan | null;
}

export default function MentorMatchPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/mentor-match?dept=cardio");
        if (!cancelled) setData(resp);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);
  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1024, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>导师匹配</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && data.mentor && data.plan && (
          <>
            <Card title="为您匹配的导师">
              <Row gutter={16}>
                <Col span={12}>
                  <Statistic title="导师" value={data.mentor.name} />
                </Col>
                <Col span={12}>
                  <Statistic title="导师贡献分" value={data.mentor.score} />
                </Col>
              </Row>
              <Button type="primary" style={{ marginTop: 16 }}>接受导师</Button>
            </Card>
            <Card title="入职学习计划" style={{ marginTop: 16 }}>
              <Statistic title="待学经验数" value={data.plan.experienceCount} />
              <Statistic title="预估学习时长（分钟）" value={data.plan.totalMinutes} style={{ marginTop: 16 }} />
              <Progress percent={0} style={{ marginTop: 16 }} />
            </Card>
          </>
        )}
        {!loading && (!data || !data.mentor) && (
          <Card>
            <Tag>暂无同科室导师</Tag>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
