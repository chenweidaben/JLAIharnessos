/*
 * 健澜科技 jlmedaios - 错误码 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.error_code.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.error_code.entity.ErrorCode;
import com.jlmedaios.monolith.error_code.service.ErrorCodeService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 错误码 Controller。
 *
 * <p>所有模块统一使用错误码，禁止硬编码错误消息</p>
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/error-code")
public class ErrorCodeController {

    private final ErrorCodeService errorCodeService;

    /**
     * 查询错误码。
     *
     * @param code 错误码
     * @return Result<ErrorCode>
     */
    @GetMapping("/{code}")
    public Result<ErrorCode> getByCode(@PathVariable String code) {
        return errorCodeService.getByCode(code)
                .map(Result::ok)
                .orElseGet(() -> Result.ok(null));
    }
}
