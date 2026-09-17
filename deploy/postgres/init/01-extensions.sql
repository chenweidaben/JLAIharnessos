-- ============================================================================
-- 健澜科技杠OS - PostgreSQL 扩展
-- 01-extensions.sql
--
-- 由官方 postgres:16 镜像的 docker-entrypoint-initdb.d 在首次初始化时按
-- 文件名顺序自动执行（仅对空数据目录生效一次）。
--
-- Copyright (c) 2026 健澜科技. Licensed under Apache-2.0.
-- ============================================================================

-- pgcrypto：gen_random_uuid()（PG16 内置 pgcrypto）
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- pg_trgm：中文/英文名称的模糊检索（患者姓名、药品名、诊断名）
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- unaccent：去除重音，提升检索鲁棒性
CREATE EXTENSION IF NOT EXISTS unaccent;

-- btree_gin：支持 GIN 复合索引（jsonb + 标量列）
CREATE EXTENSION IF NOT EXISTS btree_gin;

-- ----------------------------------------------------------------------------
-- pgvector（可选）：生产环境大规模语义检索推荐使用。
-- 官方 postgres:16-alpine 镜像默认不含 pgvector；若镜像未预装，此处降级为
-- NOTICE 而不中断初始化（向量列将以 jsonb 形式建立，由应用层做余弦检索）。
-- 生产可切换到 pgvector/pgvector:pg16 镜像，此扩展即可成功创建。
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS vector;
  RAISE NOTICE 'pgvector 扩展可用，语义检索可使用向量索引';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'pgvector 不可用（%），knowledge_chunks.embedding 降级为 jsonb', SQLERRM;
END $$;
