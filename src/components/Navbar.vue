<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const companyName = ref('地價創產一站式服務的好管家')
const isEnglish = ref(false)

const toggleLanguage = () => {
  isEnglish.value = !isEnglish.value
  companyName.value = isEnglish.value ? 'Taichung Rebuild' : '台中危老重建'
}

const navItems = [
  { name: '首頁', path: '/', enName: 'Home' },
  { name: '關於我們', path: '/about', enName: 'About' },
  { name: '案例展示', path: '/cases', enName: 'Cases' },
  { name: '聯繫我們', path: '/contact', enName: 'Contact' }
]

const isActive = computed(() => (path) => route.path === path)
</script>

<template>
  <nav class="navbar navbar-expand-md navbar-light bg-light shadow-sm">
    <div class="container">
      <router-link class="navbar-brand" to="/">
        <img src="../assets/exd-logo.png" alt="公司 Logo" style="height: 40px;" />
        <span class="ms-2">{{ companyName }}</span>
      </router-link>
      <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
        <span class="navbar-toggler-icon"></span>
      </button>
      <div class="collapse navbar-collapse" id="navbarNav">
        <ul class="navbar-nav ms-auto">
          <li class="nav-item" v-for="item in navItems" :key="item.path">
            <router-link class="nav-link" :class="{ active: isActive(item.path) }" :to="item.path">
              {{ isEnglish ? item.enName : item.name }}
            </router-link>
          </li>
          <li class="nav-item">
            <button class="btn btn-link nav-link" @click="toggleLanguage">
              {{ isEnglish ? '中文' : 'English' }}
            </button>
          </li>
        </ul>
      </div>
    </div>
  </nav>
</template>

<style scoped>
.navbar { padding: 1rem 0; }
.navbar-brand { display: flex; align-items: center; }
.nav-link.active { font-weight: bold; color: #007bff; }
.shadow-sm { box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); }
.navbar {
  background-color: #f8f9fa; /* 淺灰背景 */
}
.navbar-brand span {
  font-size: 1.5rem;
  font-weight: bold;
  color: #343a40;
}
.nav-link {
  color: #343a40;
  transition: color 0.3s;
}
.nav-link:hover {
  color: #007bff;
}
.btn-link {
  color: #343a40;
}
</style>