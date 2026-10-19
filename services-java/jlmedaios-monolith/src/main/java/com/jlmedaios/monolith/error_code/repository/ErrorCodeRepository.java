/*
 * 健澜科技 jlmedaios - 错误码 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.error_code.repository;

import com.jlmedaios.monolith.error_code.entity.ErrorCode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * 错误码 Repository。
 */
@Repository
public interface ErrorCodeRepository extends JpaRepository<ErrorCode, Long> {

    /**
     * 按错误码查询。
     *
     * @param code 错误码
     * @return 错误码实体
     */
    Optional<ErrorCode> findByCode(String code);
}
