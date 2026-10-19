/*
 * 健澜科技 jlmedaios - 护理记录实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.nursing_record.entity;

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
 * 护理记录实体。
 *
 * <p>append-only: 护理记录不可修改，只能追加新记录</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "nursing_record")
public class NursingRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "patient_id")
    private Long patientId;

    @Column(name = "ward_code")
    private String wardCode;

    // 体温单/护理记录/交班报告/入院评估/出院指导
    @Column(name = "record_type")
    private String recordType;

    @Column(name = "content_text", columnDefinition = "TEXT")
    private String contentText;

    @Column(name = "record_time")
    @Builder.Default
    private LocalDateTime recordTime = LocalDateTime.now();

    // @Sensitive 护士工号，脱敏存储
    @Column(name = "nurse_id")
    private String nurseId;

    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    // updatedAt: 仅审计用，业务逻辑禁止修改
    @Column(name = "updated_at")
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();
}
