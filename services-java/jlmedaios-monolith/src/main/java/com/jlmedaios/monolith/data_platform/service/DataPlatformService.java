/*
 * 健澜科技 jlmedaios - 数据中台 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.data_platform.service;

import com.jlmedaios.monolith.data_platform.entity.DataAsset;
import com.jlmedaios.monolith.data_platform.repository.DataAssetRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * 数据中台 Service。
 *
 * <p>数据资产主数据；数据资产目录+血缘追踪，生产接 DataHub/Atlas</p>
 */
@Service
@RequiredArgsConstructor
public class DataPlatformService {

    private final DataAssetRepository dataAssetRepository;

    /**
     * 数据资产目录。
     *
     * @return 数据资产列表
     */
    public List<DataAsset> assetList() {
        return dataAssetRepository.findAll();
    }

    /**
     * 按类别查询。
     *
     * @param category 类别
     * @return 数据资产列表
     */
    public List<DataAsset> byCategory(String category) {
        return dataAssetRepository.findByCategory(category);
    }

    /**
     * 资产详情。
     *
     * @param assetCode 资产编码
     * @return 数据资产
     */
    public DataAsset assetDetail(String assetCode) {
        return dataAssetRepository.findAll().stream()
                .filter(a -> assetCode.equals(a.getAssetCode()))
                .findFirst()
                .orElse(null);
    }
}
