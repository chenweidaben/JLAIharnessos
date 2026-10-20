/*
 * 健澜科技 jlmedaios - 多租户实体基类
 *
 * Copyright (c) 杭州健澜科技有限公司
 *
 * 【P5 多租户】所有核心业务实体继承此类，自动获得 tenantId 字段。
 * H2 ddl-auto=update 会自动在对应表上加 tenant_id 列。
 */
package com.jlmedaios.monolith.common;

import jakarta.persistence.Column;
import jakarta.persistence.MappedSuperclass;
import lombok.Getter;
import lombok.Setter;

/**
 * 多租户实体基类。
 *
 * <p>核心业务实体（Patient、Order、Encounter、LisRequest 等）继承此类，
 * 实现按 tenant_id 隔离数据。Repository 查询时应自动加 tenantId 过滤条件。</p>
 */
@Getter
@Setter
@MappedSuperclass
public abstract class TenantEntity {

    /** 租户 ID（院区/集团） */
    @Column(name = "tenant_id", length = 50)
    private String tenantId;
}
