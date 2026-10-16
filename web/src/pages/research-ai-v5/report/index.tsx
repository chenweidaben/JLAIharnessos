/**
 * 健澜科技 jlmedaios - AI 科研助手 V5 页（M259-A）
 *
 * AI检索摘要对比引用管理研究空白识别写作辅助/选题假设样本量纳排标准干预对照随机化/描述统计推断统计回归Meta分析样本量功效/IMRaD方法结果讨论图表英文润色投稿选择/国自然标书立项依据研究基础技术路线预算/查重伦理数据可重复利益冲突学术规范/采纳率效率提升发表数中标率用户满意度。深海蓝 VI。
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
  literature: { aiSearch: number; abstract: number; compare: number; citation: number; gap: number; writing: number };
  design: { topic: number; hypothesis: number; sampleSize: number; eligibility: number; intervention: number; randomization: number };
  statistics: { descriptive: number; inferential: number; regression: number; meta: number; samplePower: number };
  paper: { imrad: number; method: number; result: number; discussion: number; chart: number; englishPolish: number; journalChoice: number };
  grant: { nsfc: number; basis: number; foundation: number; techRoute: number; budget: number };
  integrity: { plagiarism: number; ethics: number; reproducibility: number; coi: number };
  aiMetrics: { adoption: number; efficiency: number; publication: number; awardRate: number; satisfaction: number };
  suggestions: string[];
}

export default function ResearchAIV5Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/research-ai-v5/report");
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
        <Title level={3} style={{ color: VI.deep }}>AI 科研助手 V5</Title>
        <Paragraph type="secondary">AI 检索·摘要·对比·引用管理·研究空白·写作辅助 / 选题·假设·样本量·纳排标准·干预对照·随机化 / 描述统计·推断统计·回归·Meta·样本量功效 / IMRaD·方法·结果·讨论·图表·英文润色·投稿选择 / 国自然标书·立项依据·研究基础·技术路线·预算 / 查重·伦理·数据可重复·利益冲突·学术规范</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="AI 检索" value={data.literature.aiSearch} /></Card></Col>
              <Col span={6}><Card><Statistic title="发表数" value={data.aiMetrics.publication} /></Card></Col>
              <Col span={6}><Card><Statistic title="中标率" value={`${data.aiMetrics.awardRate}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="满意度" value={`${data.aiMetrics.satisfaction}%`} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>科研明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "nsfc", name: "国自然标书", value: data.grant.nsfc },
                  { key: "writing", name: "论文写作辅助", value: data.literature.writing },
                  { key: "meta", name: "Meta 分析", value: data.statistics.meta },
                  { key: "english", name: "英文润色", value: data.paper.englishPolish },
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
