/**
 * 健澜科技 jlmedaios - 数据飞轮 V5 页（M257-D）
 *
 * 成功病例成功路径成功方案成功经验最佳实践/失败病例不良事件根因分析改进措施防错机制/疾病-药品-检查-指南图谱不断丰富自动更新/病例数量病例质量病例标签病例检索病例复用/反馈数据在线学习模型迭代效果提升越用越准/新人快速上手历史经验避免重复犯错站在巨人肩膀/数据资产知识资产模型资产文化资产持续进化/采集→学习→改进→沉淀→再采集→越用越聪明。深海蓝 VI。
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
  success: { case: number; path: number; plan: number; experience: number; bestPractice: number };
  failure: { case: number; ae: number; rootCause: number; improvement: number; errorProof: number };
  knowledgeGraph: { disease: number; drug: number; exam: number; guideline: number; enrichment: number; autoUpdate: number };
  caseLibrary: { count: number; quality: number; tag: number; search: number; reuse: number };
  modelLearning: { feedback: number; onlineLearning: number; iterate: number; effect: number; smarter: number };
  successor: { newcomer: number; onboard: number; history: number; avoidRepeat: number; giants: number };
  asset: { data: number; knowledge: number; model: number; culture: number; evolution: number };
  flywheel: { collect: number; learn: number; improve: number; sediment: number; cycle: number };
  suggestions: string[];
}

export default function DataFlywheelV5Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/data-flywheel-v5/report");
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
        <Title level={3} style={{ color: VI.deep }}>数据飞轮 V5</Title>
        <Paragraph type="secondary">成功病例·成功路径·成功方案·成功经验·最佳实践 / 失败病例·不良事件·根因分析·改进措施·防错机制 / 疾病·药品·检查·指南图谱·不断丰富·自动更新 / 病例数量·质量·标签·检索·复用 / 反馈数据·在线学习·模型迭代·效果提升·越用越准 / 新人快速上手·历史经验·避免重复犯错·站在巨人肩膀 / 数据资产·知识资产·模型资产·文化资产·持续进化 / 采集→学习→改进→沉淀→再采集→越用越聪明</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="成功经验" value={data.success.experience} /></Card></Col>
              <Col span={6}><Card><Statistic title="失败复盘" value={data.failure.rootCause} /></Card></Col>
              <Col span={6}><Card><Statistic title="病例库" value={data.caseLibrary.count} /></Card></Col>
              <Col span={6}><Card><Statistic title="飞轮闭环率" value={`${data.flywheel.cycle}%`} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>飞轮明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "bestPractice", name: "最佳实践", value: data.success.bestPractice },
                  { key: "errorProof", name: "防错机制", value: data.failure.errorProof },
                  { key: "autoUpdate", name: "知识图谱自动更新", value: `${data.knowledgeGraph.autoUpdate}%` },
                  { key: "avoidRepeat", name: "避免重复犯错", value: `${data.successor.avoidRepeat}%` },
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
