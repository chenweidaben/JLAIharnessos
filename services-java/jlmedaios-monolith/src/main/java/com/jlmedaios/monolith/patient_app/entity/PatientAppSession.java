/*
 * 健澜科技 jlmedaios - 患者 APP 会话实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.patient_app.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 患者 APP 会话实体。
 *
 * <p>append-only: 患者 APP 会话不可修改；患者端 BFF，生产接微信小程序/APP</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "patient_app_session")
public class PatientAppSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "session_id")
    private String sessionId;

    // @Sensitive 患者 ID，脱敏存储
    @Column(name = "patient_id")
    private String patientId;

    @Column(name = "app_version")
    private String appVersion;

    @Column(name = "login_device")
    private String loginDevice;

    @Column(name = "last_active_time")
    @Builder.Default
    private LocalDateTime lastActiveTime = LocalDateTime.now();

    @Column(name = "status")
    @Builder.Default
    private String status = "ACTIVE";
}
