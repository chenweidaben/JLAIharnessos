/*
 * 健澜科技 jlmedaios - 患者门户用户实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.patient_portal.entity;

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
 * 患者门户用户实体。
 *
 * <p>患者门户用户，只读病历，写操作走医生端</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "patient_portal_user")
public class PatientPortalUser {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "patient_id")
    private Long patientId;

    // @Sensitive 手机号，脱敏存储
    @Column(name = "phone")
    private String phone;

    // @Sensitive 微信 OpenID，脱敏存储
    @Column(name = "wechat_open_id")
    private String wechatOpenId;

    @Column(name = "verified_status")
    @Builder.Default
    private String verifiedStatus = "UNVERIFIED";

    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    // updatedAt: 仅审计用，业务逻辑禁止修改
    @Column(name = "updated_at")
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();
}
