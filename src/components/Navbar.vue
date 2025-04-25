<script setup>
// 目前無需邏輯，未來可加導覽列相關功能
import { ref } from 'vue'
const companyName = ref('台中危老重建')
const toggleName = () => {
  companyName.value = companyName.value === '台中危老重建' ? 'TC Rebuild' : '台中危老重建'
}
</script>

<template>
  <nav class="navbar navbar-expand-md navbar-dark bg-dark">
    <div class="container-fluid">
      <router-link class="navbar-brand" to="/">{{ companyName }}</router-link>
      <button
        class="navbar-toggler"
        type="button"
        data-bs-toggle="collapse"
        data-bs-target="#navbarNav"
        aria-controls="navbarNav"
        aria-expanded="false"
        aria-label="Toggle navigation"
      >
        <span class="navbar-toggler-icon"></span>
      </button>
      <div class="collapse navbar-collapse" id="navbarNav">
        <ul class="navbar-nav">
          <li class="nav-item">
            <router-link class="nav-link active" to="/">首頁</router-link>
          </li>
          <li class="nav-item">
            <router-link class="nav-link" to="/about">關於我們</router-link>
          </li>
          <li class="nav-item">
            <router-link class="nav-link" to="/">案例展示</router-link>
          </li>
          <li class="nav-item">
            <router-link class="nav-link" to="/">聯繫我們</router-link>
          </li>
        </ul>
      </div>
      <button class="btn btn-primary ms-2" @click="toggleName">切換名稱</button>
    </div>
  </nav>
</template>

<style scoped>
/* 未來可加導覽列專屬樣式 */
</style>