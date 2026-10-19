/*
 * 健澜科技 jlmedaios - 错误码 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.error_code.service;

import com.jlmedaios.monolith.error_code.entity.ErrorCode;
import com.jlmedaios.monolith.error_code.repository.ErrorCodeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Optional;

/**
 * 错误码 Service。
 *
 * <p>所有模块统一使用错误码，禁止硬编码错误消息</p>
 */
@Service
@RequiredArgsConstructor
public class ErrorCodeService {

    private final ErrorCodeRepository errorCodeRepository;

    /**
     * 根据 code 返回完整错误信息。
     *
     * @param code 错误码
     * @return 错误码实体
     */
    public Optional<ErrorCode> getByCode(String code) {
        return errorCodeRepository.findByCode(code);
    }
}
