/*
 * 健澜科技 jlmedaios - 患者主索引实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.empi.entity;

import com.jlmedaios.monolith.common.Sensitive;
import com.jlmedaios.monolith.common.TenantEntity;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 患者主索引实体。
 *
 * <p>PHI 字段（idCard/phone）已加 @Sensitive 注解，序列化时需脱敏。</p>
 * <p>P5 多租户：继承 TenantEntity，自动获得 tenantId 字段。</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "empi_patient", indexes = {
        @Index(name = "idx_patient_name", columnList = "name"),
        @Index(name = "idx_patient_id_card", columnList = "id_card"),
        @Index(name = "idx_patient_phone", columnList = "phone"),
        @Index(name = "idx_patient_tenant", columnList = "tenant_id")
})
public class Patient extends TenantEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long empiId;

    @Column(name = "name")
    private String name;

    @Column(name = "gender")
    private String gender;

    // @Sensitive 标记 PHI 字段，序列化时需脱敏
    @Sensitive
    @Column(name = "id_card")
    private String idCard;

    // @Sensitive 标记 PHI 字段，序列化时需脱敏
    @Sensitive
    @Column(name = "phone")
    private String phone;

    @Column(name = "create_time")
    @Builder.Default
    private LocalDateTime createTime = LocalDateTime.now();
}
