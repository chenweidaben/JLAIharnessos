/**
 * 健澜科技 jlmedaios - 消化系统疾病管理 V5 页（M265-A）
 *
 * 胃镜肠镜息肉早癌筛查ESD/EMR镇静麻醉质控/病毒性肝炎脂肪肝肝硬化肝癌肝性脑病人工肝/胆囊炎胆结石胰腺炎ERCP/EUS胰腺癌黄疸/克罗恩溃疡性结肠炎生物制剂随访营养/IBS功能性消化不良胃食管反流心理因素/呕血红便便血急诊内镜止血输血/肠内营养肠外营养短肠吞咽营养评估/早癌检出率息肉切除率再出血率死亡率满意度。深海蓝 VI。
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
  endoscopy: { gastroscopy: number; colonoscopy: number; polyp: number; earlyCancer: number; esd: number; emr: number; sedation: number; qc: number };
  liver: { viralHepatitis: number; fattyLiver: number; cirrhosis: number; hcc: number; hepaticEncephalopathy: number; artificialLiver: number };
  pancreaticobiliary: { cholecystitis: number; gallstone: number; pancreatitis: number; ercp: number; eus: number; pancreaticCancer: number; jaundice: number };
  ibd: { crohn: number; uc: number; biologic: number; followup: number; nutrition: number };
  functional: { ibs: number; fd: number; gerd: number; psychosomatic: number };
  bleeding: { hematemesis: number; melena: number; hematochezia: number; urgentEndoscopy: number; hemostasis: number; transfusion: number };
  nutrition: { enteral: number; parenteral: number; shortBowel: number; swallow: number; assessment: number };
  metrics: { earlyCancerDetection: number; polypPolypectomy: number; rebleed: number; mortality: number; satisfaction: number };
  suggestions: string[];
}

export default function GastroenterologyV5Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/gastroenterology-v5/report");
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
        <Title level={3} style={{ color: VI.deep }}>消化系统疾病管理 V5</Title>
        <Paragraph type="secondary">胃镜·肠镜·息肉·早癌筛查·ESD/EMR·镇静麻醉·质控 / 病毒性肝炎·脂肪肝·肝硬化·肝癌·肝性脑病·人工肝 / 胆囊炎·胆结石·胰腺炎·ERCP·EUS·胰腺癌·黄疸 / 克罗恩·溃疡性结肠炎·生物制剂·随访·营养</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="早癌检出率" value={`${data.metrics.earlyCancerDetection}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="息肉切除率" value={`${data.metrics.polypPolypectomy}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="再出血率" value={`${data.metrics.rebleed}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="满意度" value={`${data.metrics.satisfaction}%`} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>消化明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "gastroscopy", name: "胃镜", value: data.endoscopy.gastroscopy },
                  { key: "colonoscopy", name: "肠镜", value: data.endoscopy.colonoscopy },
                  { key: "cirrhosis", name: "肝硬化", value: data.liver.cirrhosis },
                  { key: "ercp", name: "ERCP", value: data.pancreaticobiliary.ercp },
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
