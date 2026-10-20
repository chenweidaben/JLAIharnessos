/*
 * 健澜科技 jlmedaios - 检验申请实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.lis.entity;

import com.jlmedaios.monolith.common.TenantEntity;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 检验申请实体。
 *
 * <p>TODO: 对接 LIS 系统 HL7 v2.x / FHIR R4 接口。</p>
 * <p>P5 多租户：继承 TenantEntity，自动获得 tenantId 字段。</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "lis_request", indexes = {
        @Index(name = "idx_lis_patient", columnList = "patient_id"),
        @Index(name = "idx_lis_test_code", columnList = "test_code"),
        @Index(name = "idx_lis_status", columnList = "status"),
        @Index(name = "idx_lis_tenant", columnList = "tenant_id")
})
public class LisRequest extends TenantEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "patient_id")
    private Long patientId;

    @Column(name = "test_code")
    private String testCode;

    @Column(name = "test_name")
    private String testName;

    @Column(name = "status")
    @Builder.Default
    private String status = "REQUESTED";

    @Column(name = "result_value")
    private String resultValue;
}
