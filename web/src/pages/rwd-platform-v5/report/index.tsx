/**
 * 健澜科技 jlmedaios - 临床研究 RWD/RWE 平台 V5 页（M269-A）
 *
 * 真实世界数据（HIS/EMR/LIS/PACS/随访/外部数据/整合/标准化）/研究设计（队列/登记/病例对照/目标试验仿真/纳排/暴露结局）/数据治理（缺失值/混杂/选择偏倚/时序/数据字典/可重复）/统计分析（描述/生存/回归/倾向评分/IPTW/敏感性分析）/研究项目（方案/伦理/注册/执行/产出/论文/转化/归档）/RWE应用（医保决策/医保目录/指南更新/上市后再评价/罕见病）/数据安全（脱敏/授权/隐私计算/数据不出院/审计）/平台指标（研究项目数/RWE论文/数据复用率/产出/效率）。深海蓝 VI。
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
  rwd: { his: number; emr: number; lis: number; pacs: number; followup: number; external: number; integration: number; standardization: number };
  design: { cohort: number; registry: number; caseControl: number; targetTrial: number; inclusion: number; exposure: number; outcome: number };
  governance: { missing: number; confounding: number; selectionBias: number; timeline: number; dictionary: number; reproducible: number };
  stats: { descriptive: number; survival: number; regression: number; propensity: number; iptw: number; sensitivity: number };
  projects: { protocol: number; ethics: number; registry: number; execution: number; output: number; paper: number; translation: number; archive: number };
  rweApplication: { insuranceDecision: number; catalog: number; guideline: number; postmarket: number; rareDisease: number };
  security: { desensitization: number; authorization: number; privacyComputation: number; neverLeave: number; audit: number };
  metrics: { projectCount: number; rwePaper: number; dataReuse: number; output: number; efficiency: number };
  suggestions: string[];
}

export default function RWDPlatformV5Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/rwd-platform-v5/report");
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
        <Title level={3} style={{ color: VI.deep }}>临床研究 RWD/RWE 平台 V5</Title>
        <Paragraph type="secondary">真实世界数据·HIS·EMR·LIS·PACS·随访·外部数据·整合·标准化 / 研究设计·队列·登记·病例对照·目标试验仿真·纳排·暴露结局 / 数据治理·缺失值·混杂·选择偏倚·时序·数据字典·可重复</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="研究项目" value={data.metrics.projectCount} /></Card></Col>
              <Col span={6}><Card><Statistic title="RWE论文" value={data.metrics.rwePaper} /></Card></Col>
              <Col span={6}><Card><Statistic title="数据复用率" value={`${data.metrics.dataReuse}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="效率" value={`${data.metrics.efficiency}%`} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>RWD 明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "his", name: "HIS数据", value: `${data.rwd.his}%` },
                  { key: "emr", name: "EMR数据", value: `${data.rwd.emr}%` },
                  { key: "followup", name: "随访数据", value: `${data.rwd.followup}%` },
                  { key: "integration", name: "整合率", value: `${data.rwd.integration}%` },
                ]}
                columns={[
                  { title: "数据源", dataIndex: "name", key: "name" },
                  { title: "完整率", dataIndex: "value", key: "value" },
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
