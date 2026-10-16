/**
 * 健澜科技 jlmedaios - 病历质量 V3 页（M256-C 里程碑 v5.00.0）
 *
 * 及时完成三级查房病程记录手术记录知情同意时限/出院病案首页上级审签归档终末质控/诊断依据鉴别诊断治疗依据检查合理用药合理逻辑/1-8级电子病历闭环AI高级应用评级准备差距/首页填写主要诊断手术操作并发症漏填错填/缺陷分类缺陷率丙级率甲级率反馈整改PDCA/隐私访问修改痕迹电子签名审计水印/AI内涵时限逻辑首页质控人工复核。深海蓝 VI。
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
  running: { timely: number; threeLevel: number; progress: number; surgery: number; consent: number; deadline: number };
  final: { discharge: number; homepage: number; supervisor: number; archive: number; finalQC: number };
  content: { dxBasis: number; differential: number; treatmentBasis: number; examRational: number; medRational: number; logic: number };
  emrLevel: { level1: number; level2: number; level3: number; level4: number; level5: number; level6: number; level7: number; level8: number };
  homepage: { fillCorrect: number; primaryDx: number; operation: number; complication: number; missing: number; incorrect: number };
  defect: { category: number; defectRate: number; gradeA: number; gradeB: number; gradeC: number; feedback: number; rectification: number; pdca: number };
  security: { privacy: number; access: number; modification: number; trace: number; eSignature: number; audit: number; watermark: number };
  ai: { contentQC: number; timelyQC: number; logicQC: number; homepageQC: number; manualReview: number };
  suggestions: string[];
}

export default function RecordQualityV3Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/record-quality-v3/report");
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
        <Title level={3} style={{ color: VI.deep }}>病历质量 V3（v5.00.0 里程碑）</Title>
        <Paragraph type="secondary">及时完成·三级查房·病程·手术记录·知情同意 / 出院病案·首页·上级审签·归档·终末质控 / 诊断依据·鉴别·治疗依据·检查合理·用药合理 / EMR 1-8 级·闭环·AI 高级应用·评级准备 / 首页填写·主要诊断·手术操作·并发症·漏填错填 / 缺陷分类·缺陷率·丙级率·甲级率·PDCA / 隐私·访问·修改痕迹·电子签名·审计·水印 / AI 内涵·时限·逻辑·首页质控·人工复核</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="甲级率" value={`${data.defect.gradeA}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="缺陷率" value={`${data.defect.defectRate}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="EMR 五级" value={`${data.emrLevel.level5}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="AI 质控" value={`${data.ai.contentQC}%`} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>病历质量明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "timely", name: "及时完成率", value: `${data.running.timely}%` },
                  { key: "homepage", name: "首页正确率", value: `${data.homepage.fillCorrect}%` },
                  { key: "rectification", name: "整改率", value: `${data.defect.rectification}%` },
                  { key: "eSignature", name: "电子签名", value: `${data.security.eSignature}%` },
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
