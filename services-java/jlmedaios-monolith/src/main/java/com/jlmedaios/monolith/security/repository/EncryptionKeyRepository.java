/*
 * 健澜科技 jlmedaios - 加密密钥 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.security.repository;

import com.jlmedaios.monolith.security.entity.EncryptionKey;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 加密密钥 Repository。
 */
@Repository
public interface EncryptionKeyRepository extends JpaRepository<EncryptionKey, Long> {

    /**
     * 按状态查询密钥列表。
     *
     * @param status 状态
     * @return 密钥列表
     */
    List<EncryptionKey> findByStatus(String status);

    /**
     * 按用途查询密钥列表。
     *
     * @param keyPurpose 密钥用途
     * @return 密钥列表
     */
    List<EncryptionKey> findByKeyPurpose(String keyPurpose);
}
