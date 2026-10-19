/*
 * 健澜科技 jlmedaios - 床位 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.his.ward.repository;

import com.jlmedaios.his.ward.entity.Bed;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * 床位 Repository。
 */
@Repository
public interface BedRepository extends JpaRepository<Bed, Long> {

    /**
     * 按状态查询床位列表。
     *
     * @param status 状态
     * @return 床位列表
     */
    List<Bed> findByStatus(String status);

    /**
     * 按床位编码查询床位。
     *
     * @param bedCode 床位编码
     * @return 床位 Optional
     */
    Optional<Bed> findByBedCode(String bedCode);
}
