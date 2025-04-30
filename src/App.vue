<script setup>
import Navbar from './components/Navbar.vue' // 匯入 Navbar 組件
import Footer from './components/Footer.vue'
import { ref } from 'vue'


</script>

<template>
  <div>
    <!-- Bootstrap 導覽列 -->
    <Navbar /> <!-- 使用 Navbar 組件 -->

    <main class="flex-grow-1">
      <router-view />
    </main>

    <Footer />
  </div>
</template>

<style scoped>
.min-vh-100 { min-height: 100vh; }
.flex-grow-1 { flex-grow: 1; }
</style>
