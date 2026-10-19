/*
 * 健澜科技 jlmedaios - 统一返回体 Result<T>
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.his.charge.common;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 统一返回体。
 *
 * @param <T> 数据类型
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Result<T> {

    private int code;
    private String message;
    private T data;

    /**
     * 成功返回。
     *
     * @param data 数据
     * @param <T>  数据类型
     * @return Result
     */
    public static <T> Result<T> ok(T data) {
        return new Result<>(200, "success", data);
    }

    /**
     * 失败返回。
     *
     * @param code 错误码
     * @param msg  错误消息
     * @param <T>  数据类型
     * @return Result
     */
    public static <T> Result<T> fail(int code, String msg) {
        return new Result<>(code, msg, null);
    }
}
