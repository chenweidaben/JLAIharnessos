/*
 * 健澜科技 jlmedaios - PHI 敏感字段注解
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.common;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * PHI（Protected Health Information）敏感字段注解。
 *
 * <p>用法：标注在 entity 的 PHI 字段（如身份证号、手机号）上。
 * 序列化时需脱敏（如 idCard → 3301**********1234）。</p>
 */
@Target(ElementType.FIELD)
@Retention(RetentionPolicy.RUNTIME)
public @interface Sensitive {
}
