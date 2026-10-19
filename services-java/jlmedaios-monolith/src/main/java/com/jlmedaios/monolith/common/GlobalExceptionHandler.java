/*
 * 健澜科技 jlmedaios - 全局异常处理器
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.common;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * 全局异常处理器。
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    /**
     * 业务异常。
     *
     * @param ex 异常
     * @return 统一返回体
     */
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Result<Void>> handleBadRequest(IllegalArgumentException ex) {
        log.warn("业务异常: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Result.fail(400, ex.getMessage()));
    }

    /**
     * 兜底异常。
     *
     * @param ex 异常
     * @return 统一返回体
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Result<Void>> handleInternalError(Exception ex) {
        log.error("系统异常", ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Result.fail(500, "系统内部错误"));
    }
}
