/*
 * 健澜科技 jlmedaios - 床位 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.ward.repository;

import com.jlmedaios.monolith.ward.entity.Bed;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * 床位 Repository。
 */
@Repository
public interface BedRepository extends JpaRepository<Bed, Long> {

    /**
     * 按床位编码查询床位。
     *
     * @param bedCode 床位编码
     * @return 床位 Optional
     */
    Optional<Bed> findByBedCode(String bedCode);
}
