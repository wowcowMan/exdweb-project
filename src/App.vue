<script setup>
import Navbar from './components/Navbar.vue' // 匯入 Navbar 組件
import { ref } from 'vue'
const companyName = ref('台中危老重建')
const toggleName = () => {
  companyName.value = companyName.value === '台中危老重建' ? 'TC Rebuild' : '台中危老重建'
}
</script>

<template>
  <div>
    <!-- Bootstrap 導覽列 -->
    <Navbar /> <!-- 使用 Navbar 組件 -->

    <!-- 主要內容 -->
    <div class="container mt-5">
      <h1 class="text-center">歡迎來到台中危老重建</h1>
      <p class="text-center">
        我們專注於提供專業的危老建築重建服務，打造安全、現代的居住環境。
      </p>
      <button class="btn btn-primary" @click="toggleName">切換名稱</button>
    </div>
  </div>
</template>

<style scoped>
.mt-5 {
  margin-top: 3rem;
}
</style>
