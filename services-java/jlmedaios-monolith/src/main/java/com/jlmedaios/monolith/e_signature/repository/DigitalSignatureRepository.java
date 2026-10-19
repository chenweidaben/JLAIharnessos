/*
 * 健澜科技 jlmedaios - 电子签名 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.e_signature.repository;

import com.jlmedaios.monolith.e_signature.entity.DigitalSignature;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 电子签名 Repository。
 */
@Repository
public interface DigitalSignatureRepository extends JpaRepository<DigitalSignature, Long> {

    /**
     * 按业务 ID 查询签名记录。
     *
     * @param businessId 业务 ID
     * @return 签名记录列表
     */
    List<DigitalSignature> findByBusinessId(String businessId);

    /**
     * 按签名人 ID 查询签名记录。
     *
     * @param signerId 签名人 ID
     * @return 签名记录列表
     */
    List<DigitalSignature> findBySignerId(String signerId);
}
