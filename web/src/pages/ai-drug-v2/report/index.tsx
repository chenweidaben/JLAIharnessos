/**
 * 健澜科技 jlmedaios - AI 药物 V2 页（M247-A）
 *
 * 靶点发现分子生成虚拟筛选ADMET合成路线/AI临床试验设计招募入组RWE/ADR信号挖掘药物基因组群体药代/处方审核DDD。深海蓝 VI。
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
  discovery: { targets: number; molecules: number; screened: number };
  clinical: { trials: number; recruited: number; rwe: number };
  safety: { adrSignals: number; pharmacogenomics: number; ddd: number };
  suggestions: string[];
}

export default function AIDrugV2Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/ai-drug-v2/report");
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
        <Title level={3} style={{ color: VI.deep }}>AI 药物研发 V2</Title>
        <Paragraph type="secondary">靶点发现·分子生成·虚拟筛选·ADMET·合成路线 / AI 临床试验设计·招募入组·RWE / ADR 信号挖掘·药物基因组·群体药代 / 处方审核·DDD</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="靶点" value={data.discovery.targets} /></Card></Col>
              <Col span={6}><Card><Statistic title="虚拟筛选" value={data.discovery.screened} /></Card></Col>
              <Col span={6}><Card><Statistic title="RWE 样本" value={data.clinical.rwe} /></Card></Col>
              <Col span={6}><Card><Statistic title="ADR 信号" value={data.safety.adrSignals} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>研发明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "molecules", name: "生成分子", value: data.discovery.molecules },
                  { key: "trials", name: "临床试验", value: data.clinical.trials },
                  { key: "recruited", name: "招募入组", value: data.clinical.recruited },
                  { key: "pharmacogenomics", name: "药物基因组", value: data.safety.pharmacogenomics },
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
