/*
 * 健澜科技 jlmedaios - 数据资产 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.data_platform.repository;

import com.jlmedaios.monolith.data_platform.entity.DataAsset;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 数据资产 Repository。
 */
@Repository
public interface DataAssetRepository extends JpaRepository<DataAsset, Long> {

    /**
     * 按类别查询数据资产。
     *
     * @param category 类别
     * @return 数据资产列表
     */
    List<DataAsset> findByCategory(String category);

    /**
     * 按敏感度查询数据资产。
     *
     * @param sensitivityLevel 敏感度
     * @return 数据资产列表
     */
    List<DataAsset> findBySensitivityLevel(String sensitivityLevel);
}
