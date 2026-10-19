/*
 * 健澜科技 jlmedaios - 挂号 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.reg.repository;

import com.jlmedaios.monolith.reg.entity.Register;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * 挂号 Repository。
 */
@Repository
public interface RegisterRepository extends JpaRepository<Register, Long> {
}
