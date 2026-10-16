/**
 * 健澜科技 jlmedaios - 医院机器人与自动化 V5 页（M268-B）
 *
 * 物流机器人（药品/标本/耗材/被服/餐食/调度/电梯联动）/消毒机器人（紫外线/雾化/物表/环境采样/无人区/定时）/服务机器人（导诊/咨询/送物/引路/随访/语音交互）/手术机器人（腔镜/骨科/神经/消融/规划/操作记录）/康复机器人（上肢/下肢/外骨骼/手功能/步态/训练数据）/机器人调度（Fleet/任务队列/充电/避让/人工接管/异常）/自动化场景（药房自动发药/检验标本分拣/档案/CT摆位）/机器人指标（任务量/节省人力/故障率/利用率/满意度）。深海蓝 VI。
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
  logistics: { drug: number; specimen: number; supply: number; linen: number; meal: number; dispatch: number; elevator: number };
  disinfection: { uv: number; nebulizer: number; surface: number; sampling: number; unmanned: number; scheduled: number };
  service: { guide: number; consult: number; deliver: number; navigation: number; followup: number; voice: number };
  surgical: { laparoscopic: number; orthopedic: number; neuro: number; ablation: number; planning: number; record: number };
  rehab: { upper: number; lower: number; exoskeleton: number; hand: number; gait: number; training: number };
  fleet: { fleet: number; taskQueue: number; charging: number; collision: number; manualTakeover: number; exception: number };
  automation: { pharmacy: number; labSorting: number; archive: number; ctPositioning: number };
  metrics: { taskVolume: number; laborSaved: number; faultRate: number; utilization: number; satisfaction: number };
  suggestions: string[];
}

export default function HospitalRobotV5Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/hospital-robot-v5/report");
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
        <Title level={3} style={{ color: VI.deep }}>医院机器人与自动化 V5</Title>
        <Paragraph type="secondary">物流机器人·药品·标本·耗材·被服·餐食·调度·电梯联动 / 消毒机器人·紫外线·雾化·物表·环境采样·无人区·定时 / 服务机器人·导诊·咨询·送物·引路·随访·语音交互</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="任务量" value={data.metrics.taskVolume} /></Card></Col>
              <Col span={6}><Card><Statistic title="节省人力" value={`${data.metrics.laborSaved}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="故障率" value={`${data.metrics.faultRate}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="利用率" value={`${data.metrics.utilization}%`} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>机器人明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "logistics", name: "物流机器人", value: data.logistics.specimen },
                  { key: "disinfect", name: "消毒机器人", value: data.disinfection.uv },
                  { key: "service", name: "服务机器人", value: data.service.guide },
                  { key: "surgical", name: "手术机器人", value: data.surgical.laparoscopic },
                ]}
                columns={[
                  { title: "类型", dataIndex: "name", key: "name" },
                  { title: "任务量", dataIndex: "value", key: "value" },
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
