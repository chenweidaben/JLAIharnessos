/**
 * 健澜科技 jlmedaios - 电子病历分级评价 0-8 级 V5 页（M267-B）
 *
 * 评级框架（0-8级/数据集中/流程闭环/数据治理/智慧医疗/数据应用）/电子病历应用（EMR率/结构化率/闭环率/移动查房/移动护理）/数据质量（主索引/术语/数据标准/完整性/一致性/及时性）/闭环管理（医嘱闭环/输血闭环/检验闭环/检查闭环/手术闭环）/智慧应用（CDSS/影像AI/病历AI/合理用药/质控AI）/评级准备（自评/差距分析/整改计划/证据材料/模拟评审）/评级指标（39个评级要求/得分/等级预测/优先级/改造任务）/评级后持续（高等级保持/新功能/再评级/标杆院对标）。深海蓝 VI。
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
  framework: { grade: number; label: string; dataCentralization: number; workflowClosedloop: number; dataGovernance: number; smartCare: number; dataApplication: number };
  emrAdoption: { emrRate: number; structuredRate: number; closedLoopRate: number; mobileRounds: number; mobileNursing: number };
  dataQuality: { mpi: number; vocabulary: number; standard: number; completeness: number; consistency: number; timeliness: number };
  closedLoop: { order: number; transfusion: number; lab: number; radiology: number; surgery: number };
  smart: { cdss: number; imagingAI: number; recordAI: number; medRationale: number; qcAI: number };
  prep: { selfAssessment: number; gapAnalysis: number; remediation: number; evidence: number; mockReview: number };
  indicators: { req39: number; score: number; gradePredict: number; priority: number; task: number };
  postGrade: { maintenance: number; newFeature: number; rebenchmark: number; benchmark: number };
  metrics: { currentGrade: number; targetGrade: number; gap: number; readiness: number; estimatedTime: string };
  suggestions: string[];
}

export default function EMRGradeV5Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/emr-grade-v5/report");
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
        <Title level={3} style={{ color: VI.deep }}>电子病历分级评价 0-8 级 V5</Title>
        <Paragraph type="secondary">评级框架·0-8级·数据集中·流程闭环·数据治理·智慧医疗·数据应用 / 电子病历应用·EMR率·结构化率·闭环率·移动查房·移动护理 / 数据质量·主索引·术语·数据标准·完整性·一致性</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="当前等级" value={`${data.metrics.currentGrade}级`} /></Card></Col>
              <Col span={6}><Card><Statistic title="目标等级" value={`${data.metrics.targetGrade}级`} /></Card></Col>
              <Col span={6}><Card><Statistic title="差距" value={`${data.metrics.gap}级`} /></Card></Col>
              <Col span={6}><Card><Statistic title="准备度" value={`${data.metrics.readiness}%`} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>EMR 明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "emr", name: "EMR 率", value: `${data.emrAdoption.emrRate}%` },
                  { key: "structured", name: "结构化率", value: `${data.emrAdoption.structuredRate}%` },
                  { key: "closedLoop", name: "闭环率", value: `${data.emrAdoption.closedLoopRate}%` },
                  { key: "cdss", name: "CDSS", value: `${data.smart.cdss}%` },
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
