/*
 * 健澜科技 jlmedaios - API 契约实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.api_contract.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * API 契约实体。
 *
 * <p>API 契约主数据；生产接 Swagger/OpenAPI 3.0，H2 下 mock</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "api_contract")
public class ApiContract {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "contract_code")
    private String contractCode;

    @Column(name = "module_name")
    private String moduleName;

    @Column(name = "method")
    private String method;

    @Column(name = "path")
    private String path;

    @Column(name = "request_schema_json", columnDefinition = "TEXT")
    private String requestSchemaJSON;

    @Column(name = "response_schema_json", columnDefinition = "TEXT")
    private String responseSchemaJSON;

    @Column(name = "version")
    private String version;

    @Column(name = "status")
    @Builder.Default
    private String status = "DRAFT";
}
