/**
 * 健澜科技 jlmedaios - 医院 OS 底座 V5 页（M257-A）
 *
 * 服务注册配置中心API网关服务发现熔断限流链路追踪/K8s容器镜像Helm服务网格弹性伸缩多环境/模型服务GPU调度推理优化模型路由多模型管理/实时数仓流批一体数据湖仓CDC数据订阅/临床中台管理中台AI中台数据中台技术中台/医生门户护士门户患者门户管理者门户统一认证/监控日志链路指标告警SLO全链路追踪/多活异地多活备份灾备故障转移业务连续性。深海蓝 VI。
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
  microservice: { registry: number; config: number; apiGateway: number; discovery: number; circuitBreaker: number; rateLimit: number; tracing: number };
  cloudNative: { k8s: number; container: number; helm: number; mesh: number; autoscale: number; multiEnv: number };
  aiNative: { modelService: number; gpuSchedule: number; inferenceOptimize: number; modelRoute: number; multiModel: number };
  dataNative: { realTimeWarehouse: number; streamBatch: number; lakehouse: number; cdc: number; dataSubscribe: number };
  midplatform: { clinical: number; mgmt: number; ai: number; data: number; tech: number };
  portal: { doctor: number; nurse: number; patient: number; admin: number; unifiedAuth: number };
  observability: { monitor: number; log: number; tracing: number; metrics: number; alert: number; slo: number; fullTrace: number };
  dr: { multiActive: number; dr: number; backup: number; failover: number; bcp: number };
  suggestions: string[];
}

export default function HospitalOSV5Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/hospital-os-v5/report");
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
        <Title level={3} style={{ color: VI.deep }}>医院 OS 底座 V5</Title>
        <Paragraph type="secondary">服务注册·配置中心·API 网关·服务发现·熔断·限流·链路追踪 / K8s·容器·Helm·服务网格·弹性伸缩·多环境 / 模型服务·GPU 调度·推理优化·模型路由·多模型 / 实时数仓·流批一体·数据湖仓·CDC·数据订阅 / 临床·管理·AI·数据·技术五中台 / 医生·护士·患者·管理者门户·统一认证 / 监控·日志·链路·指标·告警·SLO·全链路 / 多活·异地·备份·灾备·故障转移·业务连续性</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="微服务注册" value={data.microservice.registry} /></Card></Col>
              <Col span={6}><Card><Statistic title="K8s 集群" value={data.cloudNative.k8s} /></Card></Col>
              <Col span={6}><Card><Statistic title="GPU 调度" value={`${data.aiNative.gpuSchedule}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="BCP" value={`${data.dr.bcp}%`} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>OS 底座明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "apiGateway", name: "API 网关", value: data.microservice.apiGateway },
                  { key: "multiModel", name: "多模型", value: data.aiNative.multiModel },
                  { key: "fiveMidplatform", name: "五中台", value: `${data.midplatform.clinical + data.midplatform.mgmt + data.midplatform.ai + data.midplatform.data + data.midplatform.tech}` },
                  { key: "slo", name: "SLO 达成", value: `${data.observability.slo}%` },
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
