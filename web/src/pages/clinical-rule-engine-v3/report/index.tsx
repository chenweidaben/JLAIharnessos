/**
 * 健澜科技 jlmedaios - 临床规则引擎 V3 页（M255-D）
 *
 * 诊断标准鉴别治疗指南用药检查规则/适应证禁忌相互作用剂量特殊人群配伍给药顺序/适应证禁忌注意事项正常值临床意义检查间隔/入径标准路径步骤变异出径费用规则/早期预警危急值感染跌倒VTE药物阈值规则/规则配置版本测试发布回滚/规则条目分类来源审核维护/触发拦截采纳误报优化闭环。深海蓝 VI。
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
  disease: { diagnostic: number; differential: number; guideline: number; treatment: number };
  medication: { indication: number; contraindication: number; interaction: number; dose: number; population: number; compatibility: number };
  exam: { indication: number; caution: number; normalValue: number; clinicalMeaning: number; interval: number };
  pathway: { entry: number; step: number; variance: number; exit: number; cost: number };
  alert: { earlyWarning: number; critical: number; infection: number; fall: number; vte: number; medication: number };
  engine: { configure: number; version: number; test: number; publish: number; rollback: number };
  ruleBase: { entry: number; category: number; source: number; review: number; maintenance: number };
  effect: { trigger: number; block: number; adoption: number; falsePositive: number; optimize: number; closedLoop: number };
  suggestions: string[];
}

export default function ClinicalRuleEngineV3Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/clinical-rule-engine-v3/report");
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
        <Title level={3} style={{ color: VI.deep }}>临床规则引擎 V3</Title>
        <Paragraph type="secondary">诊断标准·鉴别·治疗指南·用药·检查规则 / 适应证·禁忌·相互作用·剂量·特殊人群·配伍 / 适应证·注意事项·正常值·临床意义·检查间隔 / 入径标准·路径步骤·变异·出径·费用规则 / 早期预警·危急值·感染·跌倒·VTE·药物阈值 / 规则配置·版本·测试·发布·回滚 / 规则条目·分类·来源·审核·维护 / 触发·拦截·采纳·误报·优化·闭环</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="规则条目" value={data.ruleBase.entry} /></Card></Col>
              <Col span={6}><Card><Statistic title="触发次数" value={data.effect.trigger} /></Card></Col>
              <Col span={6}><Card><Statistic title="采纳率" value={`${data.effect.adoption}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="闭环率" value={`${data.effect.closedLoop}%`} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>规则引擎明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "medicationIndication", name: "用药适应证", value: data.medication.indication },
                  { key: "pathwayStep", name: "路径步骤", value: data.pathway.step },
                  { key: "version", name: "规则版本", value: data.engine.version },
                  { key: "falsePositive", name: "误报率", value: `${data.effect.falsePositive}%` },
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
