/**
 * 健澜科技 jlmedaios - 互联互通标准化成熟度 V5 页（M267-C）
 *
 * 互联互通框架（四级甲等/五级乙等/六级七等/数据资源/标准化应用）/标准化（数据集/共享文档/术语字典/ICD/LOINC/SNOMED/院内字典映射）/平台与集成（ESB/CDR/EMPI/网关/FHIR/HL7 V2/API开放）/数据共享（院内跨系统/区域卫生平台/医联体/上级医院/上报）/应用成效（居民健康档案/检查检验互认/双向转诊/远程医疗）/安全隐私（等保/数据脱敏/访问审计/共享授权/隐私保护）/测评准备（自评/整改/材料/模拟测评/专家辅导/等级预测）/互认管理（检验检查结果互认/报告共享/费用节约/重复检查下降）。深海蓝 VI。
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
  framework: { level: string; label: string; dataResource: number; standardization: number };
  standardization: { dataset: number; sharedDoc: number; vocabulary: number; icd: number; loinc: number; snomed: number; mapping: number };
  platform: { esb: number; cdr: number; empi: number; gateway: number; fhir: number; hl7: number; api: number };
  dataSharing: { crossSystem: number; regional: number; alliance: number; higher: number; report: number };
  application: { ehr: number; resultReciprocal: number; referral: number; telemedicine: number };
  security: { equalProtection: number; desensitization: number; audit: number; authorization: number; privacy: number };
  prep: { selfAssessment: number; remediation: number; material: number; mock: number; expert: number; predict: number };
  reciprocal: { lab: number; imaging: number; report: number; costSaving: number; repeatedDown: number };
  metrics: { currentLevel: string; targetLevel: string; readiness: number; mappingRate: number; sharingRate: number };
  suggestions: string[];
}

export default function InteropV5Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/interop-v5/report");
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
        <Title level={3} style={{ color: VI.deep }}>互联互通标准化成熟度 V5</Title>
        <Paragraph type="secondary">互联互通框架·四级甲等·五级乙等·六级七等·数据资源·标准化应用 / 标准化·数据集·共享文档·术语字典·ICD·LOINC·SNOMED / 平台与集成·ESB·CDR·EMPI·网关·FHIR·HL7·API开放</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="当前等级" value={data.metrics.currentLevel} /></Card></Col>
              <Col span={6}><Card><Statistic title="目标等级" value={data.metrics.targetLevel} /></Card></Col>
              <Col span={6}><Card><Statistic title="准备度" value={`${data.metrics.readiness}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="映射率" value={`${data.metrics.mappingRate}%`} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>互联互通明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "esb", name: "ESB", value: `${data.platform.esb}%` },
                  { key: "cdr", name: "CDR", value: `${data.platform.cdr}%` },
                  { key: "empi", name: "EMPI", value: `${data.platform.empi}%` },
                  { key: "sharing", name: "区域共享", value: `${data.dataSharing.regional}%` },
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
