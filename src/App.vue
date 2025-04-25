<script setup>
import Navbar from './components/Navbar.vue' // 匯入 Navbar 組件
import { ref } from 'vue'


</script>

<template>
  <div>
    <!-- Bootstrap 導覽列 -->
    <Navbar /> <!-- 使用 Navbar 組件 -->

    <router-view /> <!-- 顯示路由頁面 -->
  </div>
</template>

<style scoped>
.mt-5 {
  margin-top: 3rem;
}
</style>
