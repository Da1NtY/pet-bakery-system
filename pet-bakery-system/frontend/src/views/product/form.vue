<template>
  <div class="product-form-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <el-button link @click="$router.back()">
            <el-icon><ArrowLeft /></el-icon> 返回
          </el-button>
          <span>{{ isEdit ? '编辑商品' : '新增商品' }}</span>
        </div>
      </template>

      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="商品名称" prop="name">
              <el-input v-model="form.name" placeholder="请输入商品名称" />
            </el-form-item>
          </el-col>
          
          <el-col :span="12">
            <el-form-item label="商品编码" prop="code">
              <el-input 
                v-model="form.code" 
                placeholder="请输入商品编码"
                :disabled="isEdit"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="商品分类" prop="categoryId">
              <el-cascader
                v-model="form.categoryId"
                :options="categoryOptions"
                :props="{ value: 'id', label: 'name', checkStrictly: true }"
                placeholder="请选择分类"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          
          <el-col :span="12">
            <el-form-item label="商品类型" prop="productType">
              <el-select v-model="form.productType" placeholder="请选择类型" style="width: 100%">
                <el-option label="蛋糕" value="cake" />
                <el-option label="饼干" value="biscuit" />
                <el-option label="零食盒" value="snack_box" />
                <el-option label="定制" value="custom" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="封面图片">
          <el-upload
            class="avatar-uploader"
            action="/api/upload"
            :show-file-list="false"
            :on-success="handleCoverSuccess"
          >
            <img v-if="form.coverImage" :src="form.coverImage" class="avatar" />
            <el-icon v-else class="avatar-uploader-icon"><Plus /></el-icon>
          </el-upload>
        </el-form-item>

        <el-form-item label="商品描述">
          <el-input 
            v-model="form.description" 
            type="textarea" 
            rows="4"
            placeholder="请输入商品描述"
          />
        </el-form-item>

        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="储存方式">
              <el-select v-model="form.storageType" placeholder="请选择">
                <el-option label="冷冻" value="frozen" />
                <el-option label="冷藏" value="chilled" />
                <el-option label="常温" value="room" />
              </el-select>
            </el-form-item>
          </el-col>
          
          <el-col :span="8">
            <el-form-item label="保质期(天)">
              <el-input-number v-model="form.shelfLifeDays" :min="1" />
            </el-form-item>
          </el-col>
          
          <el-col :span="8">
            <el-form-item label="支持定制">
              <el-switch v-model="form.isCustomizable" :active-value="1" :inactive-value="0" />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- SKU规格 -->
        <el-divider>SKU规格</el-divider>
        
        <div v-for="(sku, index) in form.skus" :key="index" class="sku-item">
          <el-row :gutter="15">
            <el-col :span="6">
              <el-form-item :label="`规格${index + 1}编码`" required>
                <el-input v-model="sku.skuCode" placeholder="SKU编码" />
              </el-form-item>
            </el-col>
            
            <el-col :span="6">
              <el-form-item label="名称" required>
                <el-input v-model="sku.skuName" placeholder="如：6寸/鸡肉味" />
              </el-form-item>
            </el-col>
            
            <el-col :span="4">
              <el-form-item label="售价" required>
                <el-input-number v-model="sku.salePrice" :min="0" :precision="2" style="width: 100%" />
              </el-form-item>
            </el-col>
            
            <el-col :span="4">
              <el-form-item label="成本价">
                <el-input-number v-model="sku.costPrice" :min="0" :precision="2" style="width: 100%" />
              </el-form-item>
            </el-col>
            
            <el-col :span="4">
              <el-form-item label="库存类型">
                <el-select v-model="sku.stockType" style="width: 100%">
                  <el-option label="原料扣减" value="ingredient_deduct" />
                  <el-option label="成品库存" value="finished_goods" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
          
          <el-row :gutter="15">
            <el-col :span="6">
              <el-form-item label="规格属性">
                <el-input 
                  v-model="sku.specText" 
                  placeholder="如：尺寸:6寸,口味:鸡肉"
                  @blur="parseSpec(sku)"
                />
              </el-form-item>
            </el-col>
            
            <el-col :span="6">
              <el-form-item label="重量">
                <el-input-number v-model="sku.weightValue" :min="0" style="width: 70%" />
                <el-select v-model="sku.weightUnit" style="width: 28%; margin-left: 2%">
                  <el-option label="g" value="g" />
                  <el-option label="kg" value="kg" />
                </el-select>
              </el-form-item>
            </el-col>
            
            <el-col :span="12" style="text-align: right;">
              <el-button 
                type="danger" 
                link 
                @click="removeSku(index)"
                v-if="form.skus.length > 1"
              >
                删除规格
              </el-button>
            </el-col>
          </el-row>
          
          <el-divider v-if="index < form.skus.length - 1" />
        </div>
        
        <el-button type="primary" link @click="addSku">
          <el-icon><Plus /></el-icon> 添加规格
        </el-button>

        <!-- 商品图片 -->
        <el-divider>商品详情图</el-divider>
        
        <el-upload
          action="/api/upload"
          list-type="picture-card"
          :file-list="form.images"
          :on-success="handleImageSuccess"
          :on-remove="handleImageRemove"
        >
          <el-icon><Plus /></el-icon>
        </el-upload>
      </el-form>

      <div class="form-actions">
        <el-button @click="$router.back()">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">
          {{ isEdit ? '保存' : '创建' }}
        </el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { createProduct, updateProduct, getProductDetail } from '@/api/product'

const route = useRoute()
const router = useRouter()

const formRef = ref()
const submitting = ref(false)
const categoryOptions = ref([])

const isEdit = ref(!!route.query.id)

const form = reactive({
  id: null,
  name: '',
  code: '',
  categoryId: null,
  productType: 'cake',
  coverImage: '',
  description: '',
  storageType: 'frozen',
  shelfLifeDays: 3,
  isCustomizable: 0,
  status: 1,
  skus: [{
    skuCode: '',
    skuName: '',
    salePrice: 0,
    costPrice: 0,
    stockType: 'ingredient_deduct',
    specJson: {},
    specText: '',
    weightValue: null,
    weightUnit: 'g'
  }],
  images: []
})

const rules = {
  name: [{ required: true, message: '请输入商品名称', trigger: 'blur' }],
  code: [{ required: true, message: '请输入商品编码', trigger: 'blur' }],
  categoryId: [{ required: true, message: '请选择分类', trigger: 'change' }],
  productType: [{ required: true, message: '请选择类型', trigger: 'change' }]
}

const parseSpec = (sku) => {
  if (!sku.specText) {
    sku.specJson = {}
    return
  }
  
  const spec = {}
  sku.specText.split(',').forEach(item => {
    const [key, value] = item.split(':')
    if (key && value) {
      spec[key.trim()] = value.trim()
    }
  })
  sku.specJson = spec
}

const addSku = () => {
  form.skus.push({
    skuCode: '',
    skuName: '',
    salePrice: 0,
    costPrice: 0,
    stockType: 'ingredient_deduct',
    specJson: {},
    specText: '',
    weightValue: null,
    weightUnit: 'g'
  })
}

const removeSku = (index) => {
  form.skus.splice(index, 1)
}

const handleCoverSuccess = (res) => {
  form.coverImage = res.url
}

const handleImageSuccess = (res, file) => {
  form.images.push({
    name: file.name,
    url: res.url,
    imageUrl: res.url,
    imageType: 'detail'
  })
}

const handleImageRemove = (file, fileList) => {
  form.images = fileList
}

const handleSubmit = async () => {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  
  // 验证SKU
  for (const sku of form.skus) {
    if (!sku.skuCode || !sku.skuName) {
      ElMessage.warning('请完善SKU信息')
      return
    }
  }
  
  submitting.value = true
  try {
    const data = {
      name: form.name,
      code: form.code,
      categoryId: Array.isArray(form.categoryId) 
        ? form.categoryId[form.categoryId.length - 1] 
        : form.categoryId,
      productType: form.productType,
      coverImage: form.coverImage,
      description: form.description,
      storageType: form.storageType,
      shelfLifeDays: form.shelfLifeDays,
      isCustomizable: form.isCustomizable,
      skus: form.skus.map(sku => ({
        skuCode: sku.skuCode,
        skuName: sku.skuName,
        salePrice: sku.salePrice,
        costPrice: sku.costPrice,
        stockType: sku.stockType,
        specJson: sku.specJson,
        weightValue: sku.weightValue,
        weightUnit: sku.weightUnit
      })),
      images: form.images
    }
    
    if (isEdit.value) {
      await updateProduct(form.id, data)
      ElMessage.success('更新成功')
    } else {
      await createProduct(data)
      ElMessage.success('创建成功')
    }
    
    router.push('/product')
  } catch (error) {
    console.error(error)
  } finally {
    submitting.value = false
  }
}

const loadData = async () => {
  if (!isEdit.value) return
  
  try {
    const res = await getProductDetail(route.query.id)
    Object.assign(form, {
      id: res.id,
      name: res.name,
      code: res.code,
      categoryId: res.category_id,
      productType: res.product_type,
      coverImage: res.cover_image,
      description: res.description,
      storageType: res.storage_type,
      shelfLifeDays: res.shelf_life_days,
      isCustomizable: res.is_customizable,
      skus: res.skus?.map(sku => ({
        ...sku,
        specText: Object.entries(sku.spec_json || {}).map(([k, v]) => `${k}:${v}`).join(',')
      })) || [],
      images: res.images?.map(img => ({
        ...img,
        url: img.image_url
      })) || []
    })
  } catch (error) {
    console.error(error)
  }
}

// 加载分类
const loadCategories = async () => {
  const { getCategoryTree } = await import('@/api/category')
  try {
    categoryOptions.value = await getCategoryTree()
  } catch (error) {
    console.error(error)
  }
}

onMounted(() => {
  loadCategories()
  loadData()
})
</script>

<style scoped lang="scss">
.product-form-page {
  .card-header {
    display: flex;
    align-items: center;
    gap: 15px;
    font-weight: bold;
  }
  
  .avatar-uploader {
    :deep(.el-upload) {
      border: 1px dashed var(--el-border-color);
      border-radius: 6px;
      cursor: pointer;
      position: relative;
      overflow: hidden;
      transition: var(--el-transition-duration-fast);
      
      &:hover {
        border-color: var(--el-color-primary);
      }
    }
  }
  
  .avatar-uploader-icon {
    font-size: 28px;
    color: #8c939d;
    width: 178px;
    height: 178px;
    text-align: center;
    line-height: 178px;
  }
  
  .avatar {
    width: 178px;
    height: 178px;
    display: block;
    object-fit: cover;
  }
  
  .sku-item {
    background: #f5f7fa;
    padding: 20px;
    margin-bottom: 15px;
    border-radius: 4px;
  }
  
  .form-actions {
    margin-top: 30px;
    text-align: center;
    padding-top: 20px;
    border-top: 1px solid #e4e7ed;
  }
}
</style>