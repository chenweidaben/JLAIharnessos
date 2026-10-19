/*
 * 健澜科技 jlmedaios - 护理医嘱实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.nursing.entity;

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
 * 护理医嘱实体。
 *
 * <p>append-only: 本记录创建后不可修改，只能新增修订记录</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "nursing_order")
public class NursingOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "patient_id")
    private Long patientId;

    @Column(name = "nursing_type")
    private String nursingType;

    @Column(name = "content")
    private String content;

    @Column(name = "status")
    @Builder.Default
    private String status = "PENDING";

    @Column(name = "nurse_name")
    private String nurseName;

    // updatedAt: 仅审计用，业务逻辑禁止修改
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
