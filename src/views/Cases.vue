<script setup>
// 簡單案例清單
const cases = [
  { id: 1, title: '台中老屋翻新', description: '將 30 年老屋改造成現代住宅。' },
  { id: 2, title: '商業大樓重建', description: '提升結構安全，新增現代設施。' }
]
</script>
<template>
  <div class="container mt-5">
    <h1 class="text-center">案例展示</h1>
    <div class="row">
      <div class="col-md-6" v-for="item in cases" :key="item.id">
        <div class="card mb-3">
          <div class="card-body">
            <h5 class="card-title">{{ item.title }}</h5>
            <p class="card-text">{{ item.description }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<style scoped>
.mt-5 { margin-top: 3rem; }
.mb-3 { margin-bottom: 1rem; }
</style>