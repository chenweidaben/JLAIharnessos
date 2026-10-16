/**
 * 健澜科技 jlmedaios - 运维管理 V3 页（M244-D）
 *
 * 服务器存储网络机房UPS空调消防/HIS-EMR-LIS-PACS/中间件数据库K8s容器微服务/Prometheus-Grafana-APM链路追踪/CI-CD蓝绿/CMDB工单SLA。深海蓝 VI。
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
  infrastructure: { server: number; storage: number; network: number; ups: number };
  systems: { his: number; emr: number; lis: number; pacs: number };
  monitoring: { prometheus: number; grafana: number; apm: number };
  cicd: { blueGreen: number; canary: number };
  cmdb: number;
  suggestions: string[];
}

export default function OpsV3Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/ops-v3/report");
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
        <Title level={3} style={{ color: VI.deep }}>运维管理 V3</Title>
        <Paragraph type="secondary">服务器·存储·网络·机房·UPS·空调·消防 / HIS·EMR·LIS·PACS·中间件·数据库·K8s·容器·微服务 / Prometheus·Grafana·APM 链路追踪 / CI-CD 蓝绿 / CMDB·工单·SLA</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="服务器" value={data.infrastructure.server} /></Card></Col>
              <Col span={6}><Card><Statistic title="存储(TB)" value={data.infrastructure.storage} /></Card></Col>
              <Col span={6}><Card><Statistic title="CMDB 配置项" value={data.cmdb} /></Card></Col>
              <Col span={6}><Card><Statistic title="蓝绿发布" value={data.cicd.blueGreen} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>运维明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "network", name: "网络设备", value: data.infrastructure.network },
                  { key: "ups", name: "UPS", value: data.infrastructure.ups },
                  { key: "apm", name: "APM", value: data.monitoring.apm },
                  { key: "canary", name: "金丝雀", value: data.cicd.canary },
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
