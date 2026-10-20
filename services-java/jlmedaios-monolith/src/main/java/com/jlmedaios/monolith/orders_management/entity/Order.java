/*
 * 健澜科技 jlmedaios - 医嘱实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.orders_management.entity;

import com.jlmedaios.monolith.common.TenantEntity;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * 医嘱实体。
 *
 * <p>append-only: 医嘱不可修改，执行/停止留痕</p>
 * <p>P5 多租户：继承 TenantEntity，自动获得 tenantId 字段。</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "order", indexes = {
        @Index(name = "idx_order_no", columnList = "order_no"),
        @Index(name = "idx_order_patient", columnList = "patient_id"),
        @Index(name = "idx_order_status", columnList = "status"),
        @Index(name = "idx_order_doctor", columnList = "doctor_id"),
        @Index(name = "idx_order_tenant", columnList = "tenant_id")
})
public class Order extends TenantEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "order_no")
    private String orderNo;

    // @Sensitive 患者 ID，脱敏存储
    @Column(name = "patient_id")
    private String patientId;

    @Column(name = "order_type")
    private String orderType;

    @Column(name = "order_content", columnDefinition = "TEXT")
    private String orderContent;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(name = "status")
    @Builder.Default
    private String status = "CREATED";

    // @Sensitive 医生工号，脱敏存储
    @Column(name = "doctor_id")
    private String doctorId;
}
