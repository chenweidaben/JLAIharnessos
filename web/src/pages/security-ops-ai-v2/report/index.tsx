/**
 * 健澜科技 jlmedaios - 安全运营智能化 V2 页（M235-D）
 *
 * SIEM日志/UEBA/异常检测/SOC事件响应/溯源取证/威胁情报/零信任/数据分类分级DLP/等保密评/容灾。深海蓝 VI。
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
  siem: { logs: number; ueba: number; anomaly: number };
  soc: { incidents: number; response: number; forensics: number };
  intel: { feeds: number };
  zeroTrust: { identity: number; device: number; data: number };
  dlp: { classified: number; blocked: number };
  compliance: { mlps: number; rating: number };
  suggestions: string[];
}

export default function SecurityOpsAIV2Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/security-ops-ai-v2/report");
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
        <Title level={3} style={{ color: VI.deep }}>安全运营智能化 V2</Title>
        <Paragraph type="secondary">SIEM·UEBA·异常检测 / SOC 事件响应·溯源取证 / 威胁情报 / 零信任 / 数据分类分级 DLP / 等保密评·容灾</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="SIEM 日志" value={data.siem.logs} /></Card></Col>
              <Col span={6}><Card><Statistic title="SOC 事件" value={data.soc.incidents} /></Card></Col>
              <Col span={6}><Card><Statistic title="零信任身份" value={data.zeroTrust.identity} /></Card></Col>
              <Col span={6}><Card><Statistic title="DLP 拦截" value={data.dlp.blocked} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>安全运营明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "ueba", name: "UEBA", value: data.siem.ueba },
                  { key: "intel", name: "威胁情报源", value: data.intel.feeds },
                  { key: "classified", name: "数据分级", value: data.dlp.classified },
                  { key: "mlps", name: "等保等级", value: data.compliance.mlps },
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
