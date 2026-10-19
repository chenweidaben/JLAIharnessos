/*
 * 健澜科技 jlmedaios - 电子病历文档实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.emr.entity;

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
 * 电子病历文档实体。
 *
 * <p>append-only: 病历内容一旦生成不可修改，只能追加 review 记录</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "emr_document")
public class EmrDocument {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "patient_id")
    private Long patientId;

    @Column(name = "visit_type")
    private String visitType;

    @Column(name = "dept_code")
    private String deptCode;

    @Column(name = "doctor_id")
    private String doctorId;

    @Column(name = "main_diagnosis")
    private String mainDiagnosis;

    @Column(name = "doc_type")
    private String docType;

    // 不可修改，只能新增 review 记录
    @Column(name = "content_text", columnDefinition = "TEXT")
    private String contentText;

    // 本条记录 SHA-256 哈希
    @Column(name = "append_hash")
    private String appendHash;

    // 前一记录哈希，区块链式链接
    @Column(name = "prev_hash")
    private String prevHash;

    @Column(name = "sign_status")
    @Builder.Default
    private String signStatus = "UNSIGNED";

    @Column(name = "sign_by")
    private String signBy;

    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    // updatedAt: 仅审计用，业务逻辑禁止修改
    @Column(name = "updated_at")
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();
}
