/*
 * 健澜科技 jlmedaios - 区块链存证记录实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.blockchain_evidence.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 区块链存证记录实体。
 *
 * <p>append-only: 区块链存证记录不可修改；生产接 Hyperledger Fabric/长安链，H2 下 mock；病历 append-only+哈希链+CA 签章</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "blockchain_record")
public class BlockchainRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "record_hash")
    private String recordHash;

    @Column(name = "business_type")
    private String businessType;

    @Column(name = "business_id")
    private String businessId;

    @Column(name = "timestamp")
    @Builder.Default
    private LocalDateTime timestamp = LocalDateTime.now();

    @Column(name = "block_height")
    private Long blockHeight;

    @Column(name = "status")
    @Builder.Default
    private String status = "CONFIRMED";
}
