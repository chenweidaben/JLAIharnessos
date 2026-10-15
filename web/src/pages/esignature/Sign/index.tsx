/**
 * 健澜科技 jlmedaios - 电子签名手写板（M138-B · 电子签名）
 *
 * 【新业务场景】电子签名（法律效力留痕）
 *   覆盖三类临床签署场景：病历签名 / 处方签名 / 手术同意书签名。
 *
 * 交互：选择单据类型 → 填写单据 id → 在画布上手写签名 → 清空重签 → 提交。
 *   提交时画布导出 PNG（base64 data URL）随 POST /api/v1/esignature/sign 上送，
 *   由 BFF 封存 SHA-256 指纹并记录签署时间与来源 IP；提交成功后可一键验签。
 *
 * 视觉：深海蓝 VI（主色 #0A2A5E，辅色 #1E5BA8，浅底 #F4F7FB）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 */
import { Button, Card, message, Select, Space, Typography, Input, Tag } from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import { get, post } from '../../../api/client';

const { Title, Text, Paragraph } = Typography;

/** 深海蓝 VI 色板 */
const VI = {
  deepSea: '#0A2A5E',
  accent: '#1E5BA8',
  bg: '#F4F7FB',
  line: '#D6E0EE',
};

type DocType = 'medical_record' | 'prescription' | 'surgical_consent';

const DOC_TYPE_LABEL: Record<DocType, string> = {
  medical_record: '病历签名',
  prescription: '处方签名',
  surgical_consent: '手术同意书签名',
};

export default function SignPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const [docType, setDocType] = useState<DocType>('medical_record');
  const [docId, setDocId] = useState<string>('');
  const [hasInk, setHasInk] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [signedId, setSignedId] = useState<string>('');
  const [verifyResult, setVerifyResult] = useState<boolean | null>(null);

  /** 初始化画布尺寸与白底 */
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = rect.width * ratio;
    canvas.height = 280 * ratio;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(ratio, ratio);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, 280);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = VI.deepSea;
  }, []);

  useEffect(() => {
    setupCanvas();
  }, [setupCanvas]);

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    drawing.current = true;
    const { x, y } = pos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = pos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasInk(true);
  };

  const end = () => {
    drawing.current = false;
  };

  const clear = () => {
    setupCanvas();
    setHasInk(false);
    setVerifyResult(null);
  };

  /** 提交签名：画布导出 PNG → POST 封存 */
  const submit = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!hasInk) {
      message.warning('请先在签名板上手写签名');
      return;
    }
    if (!docId.trim()) {
      message.warning('请填写被签单据 id');
      return;
    }
    setSubmitting(true);
    try {
      const signatureData = canvas.toDataURL('image/png');
      const resp = await post<{ signature: { id: string } }>('/api/v1/esignature/sign', {
        documentType: docType,
        documentId: docId.trim(),
        signatureData,
      });
      setSignedId(resp.signature.id);
      setVerifyResult(null);
      message.success('签名成功，已留存电子证据');
    } catch (err) {
      message.error(err instanceof Error ? err.message : '签名提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  /** 一键验签 */
  const verify = async () => {
    if (!signedId) return;
    try {
      const resp = await get<{ valid: boolean }>(`/api/v1/esignature/verify/${signedId}`);
      setVerifyResult(resp.valid);
    } catch {
      message.error('验签请求失败');
    }
  };

  return (
    <div style={{ padding: 24, background: VI.bg, minHeight: '100vh' }}>
      <Card style={{ maxWidth: 880, margin: '0 auto', borderTop: `3px solid ${VI.deepSea}` }}>
        <Title level={3} style={{ color: VI.deepSea, marginBottom: 4 }}>
          电子签名
        </Title>
        <Paragraph type="secondary" style={{ marginBottom: 16 }}>
          【新业务场景】病历 / 处方 / 手术同意书手写签署。签名将封存 SHA-256 指纹并记录签署时间与来源 IP，作为电子证据长期留存。
        </Paragraph>

        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Space wrap>
            <Text strong>单据类型：</Text>
            <Select<DocType>
              value={docType}
              style={{ width: 220 }}
              onChange={(v) => setDocType(v)}
              options={(Object.keys(DOC_TYPE_LABEL) as DocType[]).map((k) => ({
                value: k,
                label: DOC_TYPE_LABEL[k],
              }))}
            />
            <Text strong>单据 id：</Text>
            <Input
              placeholder="如病历/处方/同意书 id"
              value={docId}
              onChange={(e) => setDocId(e.target.value)}
              style={{ width: 280 }}
            />
            <Tag color="blue">{DOC_TYPE_LABEL[docType]}</Tag>
          </Space>

          <div
            style={{
              border: `1px dashed ${VI.line}`,
              borderRadius: 8,
              background: '#fff',
              overflow: 'hidden',
            }}
          >
            <canvas
              ref={canvasRef}
              style={{ width: '100%', height: 280, touchAction: 'none', cursor: 'crosshair' }}
              onPointerDown={start}
              onPointerMove={move}
              onPointerUp={end}
              onPointerLeave={end}
            />
          </div>

          <Space>
            <Button onClick={clear}>清空重签</Button>
            <Button type="primary" loading={submitting} onClick={submit} style={{ background: VI.deepSea }}>
              提交签名
            </Button>
            {signedId && (
              <Button onClick={verify}>验证本次签名</Button>
            )}
          </Space>

          {signedId && (
            <Paragraph style={{ marginBottom: 0 }}>
              <Text type="secondary">签名编号：</Text>
              <Text code>{signedId}</Text>
              {verifyResult !== null && (
                <Tag color={verifyResult ? 'success' : 'error'} style={{ marginLeft: 8 }}>
                  {verifyResult ? '有效（未篡改）' : '无效或已作废'}
                </Tag>
              )}
            </Paragraph>
          )}
        </Space>
      </Card>
    </div>
  );
}
