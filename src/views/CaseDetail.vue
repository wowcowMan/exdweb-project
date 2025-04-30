<script setup>
import { ref } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const caseId = route.params.id // 從 URL 取得案例 ID

// 模擬案例資料（未來可從後端獲取）
const cases = [
  {
    id: 1,
    title: '台中老屋翻新',
    description: '將 30 年老屋改造成現代住宅，保留傳統元素，融入現代設計。',
    image: 'https://picsum.photos/300/200/?random=01',
    details: '此項目耗時 6 個月，包含結構加固、內部重新設計，以及節能設施安裝。',
    location: '台中市西區'
  },
  {
    id: 2,
    title: '商業大樓重建',
    description: '提升結構安全，新增現代設施，符合最新建築規範。',
    image: 'https://picsum.photos/300/200/?random=02',
    details: '項目包括地下停車場擴建、電梯現代化，以及外牆翻新，總工期 12 個月。',
    location: '台中市北區'
  }
]

// 查找對應案例
const selectedCase = ref(cases.find(item => item.id === parseInt(caseId)) || {})
</script>
<template>
  <div class="container mt-5">
    <h1 class="text-center">{{ selectedCase.title || '案例未找到' }}</h1>
    <div v-if="selectedCase.id">
      <img :src="selectedCase.image" class="img-fluid mb-3" alt="案例圖片" style="max-height: 400px; object-fit: cover;">
      <p class="text-center">{{ selectedCase.description }}</p>
      <p class="text-center"><strong>詳細說明：</strong> {{ selectedCase.details }}</p>
      <p class="text-center"><strong>地點：</strong> {{ selectedCase.location }}</p>
      <router-link to="/cases" class="btn btn-primary">返回案例清單</router-link>
    </div>
    <div v-else>
      <p class="text-center">找不到該案例！</p>
      <router-link to="/cases" class="btn btn-primary">返回案例清單</router-link>
    </div>
  </div>
</template>
<style scoped>
.mt-5 { margin-top: 3rem; }
.mb-3 { margin-bottom: 1rem; }
.img-fluid { width: 100%; }
</style>