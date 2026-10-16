/**
 * 健澜科技 jlmedaios - MLOps 模型工程 V5 页（M260-A）
 *
 * 模型仓库版本血缘审批上线下线模型卡/数据准备特征工程训练评估对比自动实验追踪/在线推理批量推理边缘推理灰度AB回滚/准确率漂移数据漂移延迟吞吐资源异常告警/特征仓库特征服务训练-服务一致性特征监控/偏见公平可解释审计合规责任模型风险/数据不出院联合建模隐私计算跨院协作/模型迭代频率上线周期漂移检测推理成本业务收益。深海蓝 VI。
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
  modelRepo: { repo: number; version: number; lineage: number; approval: number; online: number; offline: number; modelCard: number };
  training: { dataPrep: number; featureEng: number; train: number; eval: number; compare: number; autoExperiment: number };
  deployment: { onlineInference: number; batchInference: number; edgeInference: number; canary: number; ab: number; rollback: number };
  monitoring: { accuracy: number; drift: number; dataDrift: number; latency: number; throughput: number; resource: number; alert: number };
  feature: { repo: number; service: number; trainServeConsistency: number; monitor: number };
  governance: { bias: number; fairness: number; explainability: number; audit: number; compliance: number; liability: number; risk: number };
  federated: { noDataLeave: number; jointModeling: number; privacy: number; crossHospital: number };
  aiMetrics: { iterationFrequency: number; cycle: number; driftDetection: number; inferenceCost: number; value: number };
  suggestions: string[];
}

export default function MLOpsV5Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/mlops-v5/report");
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
        <Title level={3} style={{ color: VI.deep }}>MLOps 模型工程 V5</Title>
        <Paragraph type="secondary">模型仓库·版本·血缘·审批·上线下线·模型卡 / 数据准备·特征工程·训练·评估·对比·自动实验 / 在线推理·批量推理·边缘推理·灰度·AB·回滚 / 准确率漂移·数据漂移·延迟·吞吐·资源·告警 / 特征仓库·特征服务·训练-服务一致性 / 偏见·公平·可解释·审计·合规·责任 / 数据不出院·联合建模·隐私计算·跨院协作</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="在线模型" value={data.modelRepo.online} /></Card></Col>
              <Col span={6}><Card><Statistic title="准确率" value={`${data.monitoring.accuracy}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="漂移检测" value={`${data.aiMetrics.driftDetection}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="业务收益" value={`${data.aiMetrics.value}%`} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>模型明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "version", name: "模型版本", value: data.modelRepo.version },
                  { key: "lineage", name: "血缘追溯", value: `${data.modelRepo.lineage}%` },
                  { key: "federated", name: "联邦学习", value: data.federated.crossHospital },
                  { key: "iteration", name: "迭代频率", value: `${data.aiMetrics.iterationFrequency}次/月` },
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
