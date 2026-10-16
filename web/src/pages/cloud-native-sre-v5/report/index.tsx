/**
 * 健澜科技 jlmedaios - 云原生 SRE 深化 V5 页（M260-C）
 *
 * 可用性延迟正确性覆盖率错误预算燃尽率/Metrics Logs Traces Profiling全链路告警分级/HPA VPA KEDA队列伸缩预测扩容容量规划/故障注入演练爆炸半径韧性验证恢复时间/蓝绿金丝雀滚动特性开关回滚变更审计/资源利用率成本分摊闲置识别预留实例成本优化/同城双活异地多活数据同步RPO RTO故障切换/MTTR MTBF可用性错误预算消耗事故数恢复时间。深海蓝 VI。
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
  slo: { availability: number; latency: number; correctness: number; coverage: number; errorBurnRate: number };
  observability: { metrics: number; logs: number; traces: number; profiling: number; fullTrace: number; alertTier: number };
  scaling: { hpa: number; vpa: number; keda: number; queue: number; predictive: number; capacity: number };
  chaos: { faultInjection: number; blastRadius: number; resilience: number; recovery: number };
  release: { blueGreen: number; canary: number; rolling: number; featureFlag: number; rollback: number; changeAudit: number };
  cost: { utilization: number; allocation: number; idle: number; reservedInstance: number; optimize: number };
  dr: { sameCity: number; multiSite: number; dataSync: number; rpo: number; rto: number; failover: number };
  sreMetrics: { mttr: number; mtbf: number; availability: number; budgetConsumption: number; incident: number; recovery: number };
  suggestions: string[];
}

export default function CloudNativeSREV5Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/cloud-native-sre-v5/report");
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
        <Title level={3} style={{ color: VI.deep }}>云原生 SRE 深化 V5</Title>
        <Paragraph type="secondary">可用性·延迟·正确性·覆盖率·错误预算燃尽率 / Metrics·Logs·Traces·Profiling·全链路·告警分级 / HPA·VPA·KEDA·队列伸缩·预测扩容·容量规划 / 故障注入·爆炸半径·韧性验证·恢复时间 / 蓝绿·金丝雀·滚动·特性开关·回滚·变更审计 / 资源利用率·成本分摊·闲置识别·预留实例·成本优化</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="可用性" value={`${data.slo.availability}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="MTTR" value={data.sreMetrics.mttr} suffix="分钟" /></Card></Col>
              <Col span={6}><Card><Statistic title="MTBF" value={data.sreMetrics.mtbf} suffix="小时" /></Card></Col>
              <Col span={6}><Card><Statistic title="RTO" value={data.dr.rto} suffix="分钟" /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>SRE 明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "hpa", name: "HPA 弹性", value: `${data.scaling.hpa}%` },
                  { key: "chaos", name: "混沌演练", value: data.chaos.faultInjection },
                  { key: "cost", name: "资源利用率", value: `${data.cost.utilization}%` },
                  { key: "failover", name: "故障切换", value: `${data.dr.failover}%` },
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
