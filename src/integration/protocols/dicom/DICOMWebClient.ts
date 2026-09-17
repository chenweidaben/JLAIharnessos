/**
 * 健澜科技数智医院智能体 - integration/protocols/dicom/DICOMWebClient.ts
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

/**
 * 健澜科技数智医院智能体 - DICOMweb 客户端
 *
 * 版权所有 (c) 2026 健澜科技
 * 本文件为健澜科技专有技术文档，未经授权不得复制、传播或用于其他用途。
 *
 * 实现 DICOMweb 标准（DICOM PS3.18）三类核心服务：
 * - QIDO-RS：查询（Query based on ID for DICOM Objects）
 * - WADO-RS：获取（Web Access to DICOM Objects）
 * - STOW-RS：存储（Store Over the Web）
 *
 * HTTP 基于运行时内置 fetch，不引入新的外部依赖。
 *
 * @module integration/protocols/dicom/DICOMWebClient
 */

import { AdapterError, AdapterErrorCode, AdapterErrorType } from '../../adapters/AdapterError';
import type { DICOMMetadata } from './DICOMMetadata';

/** DICOMweb 客户端配置 */
export interface DICOMWebClientConfig {
  /** DICOMweb 服务基址，如 https://orthanc.example.org/dicom-web */
  baseUrl: string;
  /** 认证 */
  auth?: {
    type: 'none' | 'basic' | 'bearer';
    username?: string;
    password?: string;
    token?: string;
  };
  /** 默认请求头 */
  defaultHeaders?: Record<string, string>;
  /** 超时（毫秒） */
  timeout?: number;
}

/** QIDO 查询参数 */
export interface QIDOQueryParams {
  PatientID?: string;
  PatientName?: string;
  PatientBirthDate?: string;
  StudyInstanceUID?: string;
  SeriesInstanceUID?: string;
  Modality?: string;
  StudyDate?: string;
  StudyDescription?: string;
  Limit?: number;
  Offset?: number;
  includefield?: string[];
}

/** 查询到的 Study 摘要 */
export interface QIDOStudy {
  studyInstanceUID: string;
  patientID?: string;
  patientName?: string;
  studyDate?: string;
  modality?: string;
  numberOfSeries?: number;
  numberOfInstances?: number;
}

/** 查询到的 Series 摘要 */
export interface QIDOSeries {
  seriesInstanceUID: string;
  studyInstanceUID: string;
  modality?: string;
  seriesNumber?: number;
  numberOfInstances?: number;
}

/** STOW 存储结果 */
export interface STOWResult {
  /** HTTP 状态码 */
  status: number;
  /** 成功存储的实例数 */
  storedCount: number;
  /** 失败信息 */
  errors?: string[];
}

/**
 * DICOMweb 客户端
 *
 * @example
 * ```typescript
 * const client = new DICOMWebClient({
 *   baseUrl: 'https://orthanc.example.org/dicom-web',
 * });
 * const studies = await client.queryStudies({ PatientID: 'P001' });
 * const instances = await client.retrieveStudy(studyUID);
 * ```
 */
export class DICOMWebClient {
  private readonly config: Required<DICOMWebClientConfig>;

  constructor(config: DICOMWebClientConfig) {
    this.config = {
      baseUrl: config.baseUrl.replace(/\/+$/, ''),
      auth: config.auth ?? { type: 'none' },
      defaultHeaders: config.defaultHeaders ?? {},
      timeout: config.timeout ?? 30000,
    };
  }

  // ============================================================
  // QIDO-RS（查询）
  // ============================================================

  /**
   * 查询 Study 列表（/studies）
   *
   * @param params - 查询参数
   * @returns Study 摘要列表
   */
  async queryStudies(params: QIDOQueryParams = {}): Promise<QIDOStudy[]> {
    const url = `${this.config.baseUrl}/studies?${this.buildQuery(params)}`;
    const data = await this.request<unknown[]>(
      'GET',
      url,
      undefined,
      'multipart/related; type="application/dicom+json"',
    );
    if (!Array.isArray(data)) return [];
    return data
      .map((item) => this.parseStudy(item as Record<string, unknown>))
      .filter((s) => s.studyInstanceUID);
  }

  /**
   * 查询 Series 列表（/studies/{uid}/series）
   *
   * @param studyInstanceUID - Study UID
   * @param params - 查询参数
   */
  async querySeries(studyInstanceUID: string, params: QIDOQueryParams = {}): Promise<QIDOSeries[]> {
    const url = `${this.config.baseUrl}/studies/${encodeURIComponent(studyInstanceUID)}/series?${this.buildQuery(params)}`;
    const data = await this.request<unknown[]>(
      'GET',
      url,
      undefined,
      'multipart/related; type="application/dicom+json"',
    );
    if (!Array.isArray(data)) return [];
    return data.map((item) => this.parseSeries(studyInstanceUID, item as Record<string, unknown>));
  }

  // ============================================================
  // WADO-RS（获取）
  // ============================================================

  /**
   * 获取 Study 下所有实例元数据（/studies/{uid}/metadata）
   *
   * @param studyInstanceUID - Study UID
   * @returns 元数据数组
   */
  async retrieveStudyMetadata(studyInstanceUID: string): Promise<DICOMMetadata[]> {
    const url = `${this.config.baseUrl}/studies/${encodeURIComponent(studyInstanceUID)}/metadata`;
    const data = await this.request<unknown[]>(
      'GET',
      url,
      undefined,
      'multipart/related; type="application/dicom+json"',
    );
    if (!Array.isArray(data)) return [];
    return data.map((item) => this.jsonToMetadata(item as Record<string, unknown>));
  }

  /**
   * 获取单个 Study 的实例列表 URL（WADO-RS）
   *
   * @param studyInstanceUID - Study UID
   * @returns 实例 URL 列表
   */
  async retrieveStudyInstances(studyInstanceUID: string): Promise<string[]> {
    const url = `${this.config.baseUrl}/studies/${encodeURIComponent(studyInstanceUID)}`;
    // WADO-RS 返回 multipart，这里仅返回 URL，实际拉取由 Viewer 完成
    return [url];
  }

  /**
   * 获取单个实例的像素数据 URL
   *
   * @param studyInstanceUID - Study UID
   * @param seriesInstanceUID - Series UID
   * @param sopInstanceUID - Instance UID
   * @returns WADO-RS 实例 URL
   */
  getInstanceUrl(
    studyInstanceUID: string,
    seriesInstanceUID: string,
    sopInstanceUID: string,
  ): string {
    return `${this.config.baseUrl}/studies/${encodeURIComponent(studyInstanceUID)}/series/${encodeURIComponent(seriesInstanceUID)}/instances/${encodeURIComponent(sopInstanceUID)}`;
  }

  // ============================================================
  // STOW-RS（存储）
  // ============================================================

  /**
   * 存储 DICOM 文件（STOW-RS）
   *
   * @param studyInstanceUID - 目标 Study UID（可选，默认 /studies）
   * @param files - DICOM 文件 Buffer 列表
   * @returns 存储结果
   */
  async storeInstances(studyInstanceUID: string | undefined, files: Buffer[]): Promise<STOWResult> {
    const endpoint = studyInstanceUID
      ? `${this.config.baseUrl}/studies/${encodeURIComponent(studyInstanceUID)}`
      : `${this.config.baseUrl}/studies`;

    // 构建 multipart/related body
    const boundary = `----jianlan${Date.now().toString(16)}`;
    const parts: Buffer[] = [];
    for (const file of files) {
      parts.push(
        Buffer.from(
          `\r\n--${boundary}\r\nContent-Type: application/dicom\r\nContent-Length: ${file.length}\r\n\r\n`,
        ),
      );
      parts.push(file);
    }
    parts.push(Buffer.from(`\r\n--${boundary}--\r\n`));
    const body = Buffer.concat(parts);

    const headers = this.buildHeaders();
    headers['Content-Type'] = `multipart/related; type="application/dicom"; boundary=${boundary}`;

    const resp = await fetch(endpoint, {
      method: 'POST',
      headers,
      body,
      signal: AbortSignal.timeout(this.config.timeout),
    });

    return {
      status: resp.status,
      storedCount: resp.ok ? files.length : 0,
      errors: resp.ok ? undefined : [`STOW-RS 失败（HTTP ${resp.status}）`],
    };
  }

  // ============================================================
  // 内部工具
  // ============================================================

  /**
   * 构建查询字符串
   */
  private buildQuery(params: QIDOQueryParams): string {
    const usp = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined) continue;
      if (Array.isArray(value)) {
        usp.set(key, value.join(','));
      } else {
        usp.set(key, String(value));
      }
    }
    return usp.toString();
  }

  /**
   * 构建请求头
   */
  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = { ...this.config.defaultHeaders };
    const auth = this.config.auth;
    if (auth) {
      if (auth.type === 'basic' && auth.username && auth.password) {
        const cred = Buffer.from(`${auth.username}:${auth.password}`).toString('base64');
        headers.Authorization = `Basic ${cred}`;
      } else if (auth.type === 'bearer' && auth.token) {
        headers.Authorization = `Bearer ${auth.token}`;
      }
    }
    return headers;
  }

  /**
   * 执行请求
   */
  private async request<T>(
    method: string,
    url: string,
    body?: unknown,
    accept?: string,
  ): Promise<T> {
    const headers = this.buildHeaders();
    if (accept) {
      headers.Accept = accept;
    } else {
      headers.Accept = 'application/dicom+json';
    }

    let resp: Response;
    try {
      resp = await fetch(url, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(this.config.timeout),
      });
    } catch (error) {
      throw new AdapterError(
        AdapterErrorType.TIMEOUT,
        AdapterErrorCode.REQUEST_TIMEOUT,
        `DICOMweb 请求失败: ${error instanceof Error ? error.message : String(error)}`,
        { retryable: true },
      );
    }

    if (!resp.ok) {
      throw new AdapterError(
        AdapterErrorType.CONNECTION,
        AdapterErrorCode.SERVICE_UNAVAILABLE,
        `DICOMweb 请求失败（HTTP ${resp.status}）`,
        { retryable: true },
      );
    }

    const text = await resp.text();
    // QIDO/WADO 元数据返回 JSON
    return (text ? JSON.parse(text) : []) as T;
  }

  /**
   * 从 DICOM JSON 中提取字符串值
   */
  private jsonValue(item: Record<string, unknown>, tag: string): string | undefined {
    const entry = item[tag] as { Value?: unknown[] } | undefined;
    const v = entry?.Value?.[0];
    if (v === undefined || v === null) return undefined;
    // eslint-disable-next-line @typescript-eslint/no-base-to-string -- DICOM 原值可能是对象，按字符串兜底读取
    return String(v);
  }

  /**
   * 解析 Study
   */
  private parseStudy(item: Record<string, unknown>): QIDOStudy {
    return {
      studyInstanceUID: this.jsonValue(item, '0020000D') ?? '',
      patientID: this.jsonValue(item, '00100020'),
      patientName: this.jsonValue(item, '00100010'),
      studyDate: this.jsonValue(item, '00080020'),
      modality: this.jsonValue(item, '00080060'),
      numberOfSeries: Number(this.jsonValue(item, '00201206') ?? 0),
      numberOfInstances: Number(this.jsonValue(item, '00201208') ?? 0),
    };
  }

  /**
   * 解析 Series
   */
  private parseSeries(studyInstanceUID: string, item: Record<string, unknown>): QIDOSeries {
    return {
      seriesInstanceUID: this.jsonValue(item, '0020000E') ?? '',
      studyInstanceUID,
      modality: this.jsonValue(item, '00080060'),
      seriesNumber: Number(this.jsonValue(item, '00200011') ?? 0),
      numberOfInstances: Number(this.jsonValue(item, '00201209') ?? 0),
    };
  }

  /**
   * 将 DICOM JSON 转换为 DICOMMetadata
   */
  private jsonToMetadata(item: Record<string, unknown>): DICOMMetadata {
    return {
      isPart10: true,
      explicitVR: true,
      patientName: this.jsonValue(item, '00100010'),
      patientID: this.jsonValue(item, '00100020'),
      patientBirthDate: this.jsonValue(item, '00100030'),
      patientSex: this.jsonValue(item, '00100040'),
      studyInstanceUID: this.jsonValue(item, '0020000D'),
      seriesInstanceUID: this.jsonValue(item, '0020000E'),
      studyDate: this.jsonValue(item, '00080020'),
      modality: this.jsonValue(item, '00080060'),
      bodyPartExamined: this.jsonValue(item, '00180015'),
      instanceNumber: Number(this.jsonValue(item, '00200013') ?? 0),
      rows: Number(this.jsonValue(item, '00280010') ?? 0),
      columns: Number(this.jsonValue(item, '00280011') ?? 0),
      elements: [],
    };
  }
}
