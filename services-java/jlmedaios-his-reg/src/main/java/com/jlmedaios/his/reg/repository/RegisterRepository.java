/*
 * 健澜科技 jlmedaios - 挂号记录 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.his.reg.repository;

import com.jlmedaios.his.reg.entity.Register;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * 挂号记录 Repository。
 */
@Repository
public interface RegisterRepository extends JpaRepository<Register, Long> {
}
