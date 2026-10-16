/**
 * 健澜科技 jlmedaios - 药物临床试验 GCP V5 页（M269-B）
 *
 * 试验项目（I-IV期/BE/研究者发起IIT/立项/合同/启动会）/受试者管理（筛选/知情同意/入组/随机/退出/随访/依从性）/数据采集（EDC/eCRF/源数据核对/数据质疑/锁库/稽查轨迹）/安全性（AE/SAE/不良反应/快速报告/安全监查/DSMB）/药品管理（试验药/对照药/接收/储存/分发/回收/计数）/监查稽查（CRA监查/SDV/稽查/偏离/整改/关闭中心）/伦理合规（伦理审查/知情同意/保险/利益冲突/GCP合规）/GCP指标（在研项目/入组速度/数据质疑率/SAE报告及时率/产出）。深海蓝 VI。
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
  projects: { phase1: number; phase2: number; phase3: number; be: number; iit: number; initiation: number; contract: number; kickoff: number };
  subjects: { screen: number; consent: number; enrollment: number; randomization: number; withdrawal: number; followup: number; adherence: number };
  edc: { edc: number; ecrf: number; sourceVerif: number; query: number; lock: number; auditTrail: number };
  safety: { ae: number; sae: number; adverse: number; rapidReport: number; monitoring: number; dsmb: number };
  drug: { trialDrug: number; control: number; receipt: number; storage: number; dispense: number; return: number; counting: number };
  monitoring: { cra: number; sdv: number; audit: number; deviation: number; remediation: number; closeCenter: number };
  ethics: { review: number; consent: number; insurance: number; conflict: number; gcp: number };
  metrics: { activeProject: number; enrollmentRate: number; queryRate: number; saeTimeliness: number; output: number };
  suggestions: string[];
}

export default function GCPV5Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/gcp-v5/report");
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
        <Title level={3} style={{ color: VI.deep }}>药物临床试验 GCP V5</Title>
        <Paragraph type="secondary">试验项目·I-IV期·BE·IIT·立项·合同·启动会 / 受试者管理·筛选·知情同意·入组·随机·退出·随访·依从性 / 数据采集·EDC·eCRF·源数据核对·数据质疑·锁库·稽查轨迹</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="在研项目" value={data.metrics.activeProject} /></Card></Col>
              <Col span={6}><Card><Statistic title="入组率" value={`${data.metrics.enrollmentRate}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="质疑率" value={`${data.metrics.queryRate}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="SAE及时率" value={`${data.metrics.saeTimeliness}%`} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>GCP 明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "project", name: "BE试验", value: data.projects.be },
                  { key: "subject", name: "入组人数", value: data.subjects.enrollment },
                  { key: "edc", name: "EDC使用率", value: `${data.edc.edc}%` },
                  { key: "safety", name: "SAE例数", value: data.safety.sae },
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
