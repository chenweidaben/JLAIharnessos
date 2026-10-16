/**
 * 健澜科技 jlmedaios - 检验检查 V4 页（M251-D）
 *
 * 申请采样标识运送接收标本处理不合格/仪器试剂室内质控室间质评SOP条码LIS/结果审核危急值解释发布修改记录/急诊24h优先快速绿色通道床旁POCT/细菌培养鉴定药敏院感血培养/PCR基因测序质谱伴随诊断/电子报告自助微信互认解读趋势图。深海蓝 VI。
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
  preAnalytic: { request: number; sample: number; reject: number };
  intraAnalytic: { instrument: number; reagent: number; iqc: number; eqa: number };
  postAnalytic: { review: number; critical: number; release: number; modify: number };
  emergency: { priority: number; fastTrack: number; poct: number };
  microbiology: { culture: number; id: number; sensitivity: number; bloodCulture: number };
  molecular: { pcr: number; sequencing: number; mass: number; companion: number };
  suggestions: string[];
}

export default function LaboratoryV4Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/laboratory-v4/report");
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
        <Title level={3} style={{ color: VI.deep }}>检验检查 V4</Title>
        <Paragraph type="secondary">申请·采样·标识·运送·不合格 / 仪器·试剂·室内质控·室间质评·LIS / 结果审核·危急值·解释·发布 / 急诊·24h·优先·快速·POCT / 细菌培养·鉴定·药敏·血培养 / PCR·基因测序·质谱·伴随诊断 / 电子报告·自助·微信·互认·趋势图</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="检验申请" value={data.preAnalytic.request} /></Card></Col>
              <Col span={6}><Card><Statistic title="室内质控" value={`${data.intraAnalytic.iqc}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="危急值" value={data.postAnalytic.critical} /></Card></Col>
              <Col span={6}><Card><Statistic title="PCR" value={data.molecular.pcr} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>检验明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "reject", name: "标本不合格", value: data.preAnalytic.reject },
                  { key: "eqa", name: "室间质评", value: `${data.intraAnalytic.eqa}%` },
                  { key: "fastTrack", name: "急诊快通道", value: data.emergency.fastTrack },
                  { key: "bloodCulture", name: "血培养", value: data.microbiology.bloodCulture },
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
