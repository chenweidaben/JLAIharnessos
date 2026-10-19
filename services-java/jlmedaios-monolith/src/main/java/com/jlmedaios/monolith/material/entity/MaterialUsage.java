/*
 * 健澜科技 jlmedaios - 耗材消耗记录实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.material.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 耗材消耗记录实体。
 *
 * <p>append-only: 耗材消耗记录不可修改</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "material_usage")
public class MaterialUsage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "patient_id")
    private Long patientId;

    @Column(name = "encounter_id")
    private Long encounterId;

    @Column(name = "material_code")
    private String materialCode;

    @Column(name = "quantity")
    private Integer quantity;

    @Column(name = "used_time")
    @Builder.Default
    private LocalDateTime usedTime = LocalDateTime.now();

    @Column(name = "dept_code")
    private String deptCode;
}
