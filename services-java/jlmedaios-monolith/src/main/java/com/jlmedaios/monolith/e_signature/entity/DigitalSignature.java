/*
 * 健澜科技 jlmedaios - 电子签名实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.e_signature.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 电子签名实体。
 *
 * <p>append-only: 电子签名记录不可修改</p>
 *
 * <p>对接国密 SM2 证书 + TSA 时间戳，生产接 CA 中心</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "digital_signature")
public class DigitalSignature {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "signature_no")
    private String signatureNo;

    @Column(name = "business_type")
    private String businessType;

    @Column(name = "business_id")
    private String businessId;

    // @Sensitive 签名人工号，脱敏存储
    @Column(name = "signer_id")
    private String signerId;

    @Column(name = "sign_time")
    @Builder.Default
    private LocalDateTime signTime = LocalDateTime.now();

    @Column(name = "signature_value", columnDefinition = "TEXT")
    private String signatureValue;

    @Column(name = "cert_serial_number")
    private String certSerialNumber;

    @Column(name = "tsa_timestamp")
    private String tsaTimestamp;

    @Column(name = "hash_value")
    private String hashValue;
}
