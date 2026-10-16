/**
 * 健澜科技 jlmedaios - AI 教学助手 V5 页（M259-B）
 *
 * 教学查房病例讨论小讲课教学计划个性化带教/考站设计SP标准化病人AI评分反馈技能评估/轮转考勤月报年度考核结业考核导师评价/知识库指南图谱问答病例库AI答疑/学习时长掌握度薄弱点推荐内容学习曲线/学生评教同行评教教学比赛教学成果持续改进/带教效率考核公平学习提升满意度通过率。深海蓝 VI。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import {
  Card,
  Col,
  Layout,
  List,
  Row,
  Spin,
  Statistic,
  Table,
  Typography,
} from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Result {
  timeRange: string;
  teaching: { rounds: number; caseDiscussion: number; lecture: number; plan: number; personalized: number };
  osce: { station: number; sp: number; aiScore: number; feedback: number; skill: number };
  residency: { rotation: number; attendance: number; monthly: number; annual: number; graduation: number; mentorEval: number };
  knowledge: { kb: number; guideline: number; graph: number; qa: number; caseLibrary: number; aiAnswer: number };
  learning: { time: number; mastery: number; weakness: number; recommendation: number; curve: number };
  evaluation: { student: number; peer: number; competition: number; outcome: number; continuous: number };
  aiMetrics: { mentorEfficiency: number; fairness: number; improvement: number; satisfaction: number; pass: number };
  suggestions: string[];
}

export default function TeachingAIV5Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/teaching-ai-v5/report");
        if (!cancelled) setData(resp);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>AI 教学助手 V5</Title>
        <Paragraph type="secondary">教学查房·病例讨论·小讲课·教学计划·个性化带教 / OSCE 考站·SP 标准化病人·AI 评分·反馈·技能评估 / 轮转·考勤·月报·年度考核·结业考核·导师评价 / 知识库·指南图谱·问答·病例库·AI 答疑 / 学习时长·掌握度·薄弱点·推荐内容·学习曲线</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="教学查房" value={data.teaching.rounds} /></Card></Col>
              <Col span={6}><Card><Statistic title="OSCE 考站" value={data.osce.station} /></Card></Col>
              <Col span={6}><Card><Statistic title="通过率" value={`${data.aiMetrics.pass}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="满意度" value={`${data.aiMetrics.satisfaction}%`} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>教学明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "aiAnswer", name: "AI 答疑率", value: `${data.knowledge.aiAnswer}%` },
                  { key: "mastery", name: "掌握度", value: `${data.learning.mastery}%` },
                  { key: "studentEval", name: "学生评教", value: `${data.evaluation.student}%` },
                  { key: "fairness", name: "考核公平", value: `${data.aiMetrics.fairness}%` },
                ]}
                columns={[
                  { title: "项目", dataIndex: "name", key: "name" },
                  { title: "数值", dataIndex: "value", key: "value" },
                ]}
              />
            </Card>

            <Card title={<Text strong style={{ color: VI.deep }}>改进建议</Text>}>
              <List
                size="small"
                dataSource={data.suggestions}
                renderItem={(s) => <List.Item><Text>{s}</Text></List.Item>}
              />
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
