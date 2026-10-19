/*
 * 健澜科技 jlmedaios - 固定资产 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.asset_management.repository;

import com.jlmedaios.monolith.asset_management.entity.FixedAsset;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * 固定资产 Repository。
 */
@Repository
public interface FixedAssetRepository extends JpaRepository<FixedAsset, Long> {

    /**
     * 按科室查询资产。
     *
     * @param department 科室
     * @return 资产列表
     */
    List<FixedAsset> findByDepartment(String department);

    /**
     * 按类别查询资产。
     *
     * @param category 类别
     * @return 资产列表
     */
    List<FixedAsset> findByCategory(String category);

    /**
     * 按资产编码查询资产。
     *
     * @param assetCode 资产编码
     * @return 资产
     */
    Optional<FixedAsset> findByAssetCode(String assetCode);
}
