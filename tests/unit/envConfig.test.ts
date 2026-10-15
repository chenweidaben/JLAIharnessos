/**
 * MEDMUSE BFF 环境配置解析（parseEnv 纯函数）单测。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { describe, expect, it } from 'bun:test';

import {
  DEFAULT_LLM_API_ENDPOINT,
  DEFAULT_LLM_API_KEY,
  DEFAULT_LLM_MODEL,
  DEFAULT_PORT,
  parseEnv,
} from '@/bff/config/env.js';

describe('parseEnv（环境变量纯函数解析）', () => {
  it('空输入时全部回退安全默认值', () => {
    const cfg = parseEnv({});
    expect(cfg.llmApiEndpoint).toBe(DEFAULT_LLM_API_ENDPOINT);
    expect(cfg.llmApiKey).toBe(DEFAULT_LLM_API_KEY);
    expect(cfg.llmModel).toBe(DEFAULT_LLM_MODEL);
    expect(cfg.port).toBe(DEFAULT_PORT);
    expect(cfg.databaseUrl).toBe('');
    expect(cfg.demoMode).toBe(false);
    expect(cfg.nodeEnv).toBe('development');
  });

  it('显式值被正确读取', () => {
    const cfg = parseEnv({
      LLM_API_ENDPOINT: 'https://llm.internal.example.com/v1/',
      LLM_API_KEY: 'sk-prod-test',
      LLM_MODEL: 'medmuse-70b',
      PORT: '9090',
      DATABASE_URL: 'postgres://u:p@db:5432/jlmedaios',
      DEMO_MODE: '1',
      NODE_ENV: 'production',
    });
    // 末尾斜杠应被剥离
    expect(cfg.llmApiEndpoint).toBe('https://llm.internal.example.com/v1');
    expect(cfg.llmApiKey).toBe('sk-prod-test');
    expect(cfg.llmModel).toBe('medmuse-70b');
    expect(cfg.port).toBe(9090);
    expect(cfg.databaseUrl).toBe('postgres://u:p@db:5432/jlmedaios');
    expect(cfg.demoMode).toBe(true);
    expect(cfg.nodeEnv).toBe('production');
  });

  it('兼容旧变量名作为回退（LLM_BASE_URL / MEDMUSE_*）', () => {
    const cfg = parseEnv({
      LLM_BASE_URL: 'https://legacy/v1',
      MEDMUSE_MODEL_API_KEY: 'sk-legacy',
      MEDMUSE_MODEL_NAME: 'legacy-model',
    });
    expect(cfg.llmApiEndpoint).toBe('https://legacy/v1');
    expect(cfg.llmApiKey).toBe('sk-legacy');
    expect(cfg.llmModel).toBe('legacy-model');
  });

  it('LLM_API_ENDPOINT 优先于旧变量名', () => {
    const cfg = parseEnv({
      LLM_API_ENDPOINT: 'https://new/v1',
      LLM_BASE_URL: 'https://old/v1',
    });
    expect(cfg.llmApiEndpoint).toBe('https://new/v1');
  });

  it('端口：非法值回退默认，缺省回退 HTTP_PORT', () => {
    expect(parseEnv({ PORT: 'not-a-port' }).port).toBe(DEFAULT_PORT);
    expect(parseEnv({ PORT: '0' }).port).toBe(DEFAULT_PORT);
    expect(parseEnv({ PORT: '70000' }).port).toBe(DEFAULT_PORT);
    expect(parseEnv({ PORT: '8443' }).port).toBe(8443);
    expect(parseEnv({ HTTP_PORT: '7777' }).port).toBe(7777);
    // PORT 优先于 HTTP_PORT
    expect(parseEnv({ PORT: '1111', HTTP_PORT: '2222' }).port).toBe(1111);
  });

  it('DEMO_MODE 真值/假值写法', () => {
    expect(parseEnv({ DEMO_MODE: '1' }).demoMode).toBe(true);
    expect(parseEnv({ DEMO_MODE: 'true' }).demoMode).toBe(true);
    expect(parseEnv({ DEMO_MODE: 'TRUE' }).demoMode).toBe(true);
    expect(parseEnv({ DEMO_MODE: 'yes' }).demoMode).toBe(true);
    expect(parseEnv({ DEMO_MODE: '0' }).demoMode).toBe(false);
    expect(parseEnv({ DEMO_MODE: 'false' }).demoMode).toBe(false);
    expect(parseEnv({}).demoMode).toBe(false);
  });
});
