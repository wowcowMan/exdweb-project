<script setup>
import { useRoute } from 'vue-router'
import { computed } from 'vue'

const route = useRoute()

// 動態生成麵包屑
const breadcrumbs = computed(() => {
  const paths = route.path.split('/').filter(path => path)
  const crumbs = [{ name: '首頁', path: '/' }]
  
  paths.forEach((path, index) => {
    const fullPath = `/${paths.slice(0, index + 1).join('/')}`
    let name = path
    if (route.meta.breadcrumb) {
      name = route.meta.breadcrumb
    } else if (path === 'cases' && index === 0) {
      name = '案例'
    } else if (path === 'about') {
      name = '關於我們'
    } else if (route.params.id) {
      name = route.params.id // 假設案例 ID 作為標題，後續可替換
    }
    crumbs.push({ name, path: fullPath })
  })
  
  return crumbs
})
</script>

<template>
  <nav aria-label="breadcrumb">
    <ol class="breadcrumb">
      <li v-for="(crumb, index) in breadcrumbs" :key="crumb.path" class="breadcrumb-item" :class="{ active: index === breadcrumbs.length - 1 }">
        <router-link v-if="index < breadcrumbs.length - 1" :to="crumb.path">{{ crumb.name }}</router-link>
        <span v-else aria-current="page">{{ crumb.name }}</span>
      </li>
    </ol>
  </nav>
</template>

<style scoped>
.breadcrumb {
  background-color: #f8f9fa;
  padding: 0.5rem 1rem;
  border-radius: 5px;
}
</style>
