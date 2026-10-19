/*
 * 健澜科技 jlmedaios - 收费 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.charge.repository;

import com.jlmedaios.monolith.charge.entity.Charge;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 收费 Repository。
 */
@Repository
public interface ChargeRepository extends JpaRepository<Charge, Long> {

    /**
     * 按挂号 ID 查询收费列表。
     *
     * @param registerId 挂号 ID
     * @return 收费列表
     */
    List<Charge> findByRegisterId(Long registerId);
}
