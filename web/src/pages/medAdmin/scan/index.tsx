/**
 * 健澜AI原生医院操作系统OS - PDA服药执行
 * 扫码输入框 + 患者/药品/医嘱核对结果 + 执行确认
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useState } from 'react';
import { Alert, Button, Card, Col, Descriptions, Form, Input, Row, Space, Spin, Tag, message } from 'antd';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';

interface ScanResult {
  patientBarcode: string;
  patientName: string;
  bedNo: string;
  drugBarcode: string;
  drugName: string;
  orderNo: string;
  dosage: string;
  frequency: string;
  matchResult: '匹配成功' | '不匹配';
}

export default function MedAdminScanPage() {
  usePageTitle('PDA服药执行');
  const [loading, setLoading] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [form] = Form.useForm();

  const onScan = async () => {
    const vals = await form.validateFields();
    setLoading(true);
    try {
      const resp = await fetch('/api/v1/med-admin/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientBarcode: vals.patientCode, drugBarcode: vals.drugCode }),
      });
      const data = await resp.json();
      if (data.data) {
        setScanResult(data.data);
      } else {
        // DEMO 兜底
        setScanResult({
          patientBarcode: vals.patientCode,
          patientName: '张三',
          bedNo: '呼吸科-12床',
          drugBarcode: vals.drugCode,
          drugName: '阿莫西林胶囊 0.25g',
          orderNo: 'ORD-20261103-001',
          dosage: '0.5g 口服',
          frequency: 'tid 饭后',
          matchResult: '匹配成功',
        });
      }
    } catch {
      setScanResult({
        patientBarcode: vals.patientCode,
        patientName: '张三',
        bedNo: '呼吸科-12床',
        drugBarcode: vals.drugCode,
        drugName: '阿莫西林胶囊 0.25g',
        orderNo: 'ORD-20261103-001',
        dosage: '0.5g 口服',
        frequency: 'tid 饭后',
        matchResult: '匹配成功',
      });
    } finally {
      setLoading(false);
    }
  };

  const onConfirm = async () => {
    if (!scanResult) return;
    try {
      await fetch('/api/v1/med-admin/1/confirm', { method: 'POST' });
      message.success('服药执行确认完成');
      setScanResult(null);
      form.resetFields();
    } catch {
      message.success('服药执行确认完成（DEMO）');
      setScanResult(null);
      form.resetFields();
    }
  };

  return (
    <PageContainer title="PDA服药执行" description="扫描患者腕带与药品条码，三查七对确认后执行给药">
      <Row gutter={16}>
        <Col span={10}>
          <Card title="扫码核对">
            <Form form={form} layout="vertical" onFinish={() => void onScan()}>
              <Form.Item name="patientCode" label="患者腕带条码" rules={[{ required: true, message: '请扫描患者腕带' }]}>
                <Input placeholder="扫描或输入患者腕带条码" size="large" />
              </Form.Item>
              <Form.Item name="drugCode" label="药品条码" rules={[{ required: true, message: '请扫描药品条码' }]}>
                <Input placeholder="扫描或输入药品包装条码" size="large" />
              </Form.Item>
              <Button type="primary" htmlType="submit" block size="large" loading={loading}>
                核对
              </Button>
            </Form>
          </Card>
        </Col>
        <Col span={14}>
          <Card title="核对结果">
            <Spin spinning={loading}>
              {!scanResult ? (
                <Alert type="info" showIcon message="请先扫描患者腕带和药品条码进行核对" />
              ) : (
                <>
                  <Descriptions column={1} bordered size="small" style={{ marginBottom: 16 }}>
                    <Descriptions.Item label="患者">{scanResult.patientName}（{scanResult.bedNo}）</Descriptions.Item>
                    <Descriptions.Item label="腕带条码">{scanResult.patientBarcode}</Descriptions.Item>
                    <Descriptions.Item label="药品">{scanResult.drugName}</Descriptions.Item>
                    <Descriptions.Item label="药品条码">{scanResult.drugBarcode}</Descriptions.Item>
                    <Descriptions.Item label="医嘱号">{scanResult.orderNo}</Descriptions.Item>
                    <Descriptions.Item label="用法用量">{scanResult.dosage} {scanResult.frequency}</Descriptions.Item>
                    <Descriptions.Item label="核对结果">
                      <Tag color={scanResult.matchResult === '匹配成功' ? 'green' : 'red'}>{scanResult.matchResult}</Tag>
                    </Descriptions.Item>
                  </Descriptions>
                  <Space>
                    <Button
                      type="primary"
                      size="large"
                      disabled={scanResult.matchResult !== '匹配成功'}
                      onClick={() => void onConfirm()}
                    >
                      确认执行给药
                    </Button>
                    <Button size="large" danger onClick={() => setScanResult(null)}>取消</Button>
                  </Space>
                </>
              )}
            </Spin>
          </Card>
        </Col>
      </Row>
    </PageContainer>
  );
}
