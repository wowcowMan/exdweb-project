<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'

// ---------- 狀態 ----------
const route = useRoute()
const companyName = ref('地價創產一站式服務的好管家')
const isEnglish = ref(false)
const isCollapsed = ref(true)
const navbarRef = ref(null)
const isAnimating = ref(false)

// ---------- 工具函式 ----------
const expandElement = (el) => {
  return new Promise((resolve) => {
    el.classList.remove('collapse')
    el.classList.add('collapsing')
    el.style.height = '0px'

    requestAnimationFrame(() => {
      el.style.height = el.scrollHeight + 'px'
    })

    setTimeout(() => {
      el.classList.remove('collapsing')
      el.classList.add('collapse', 'show')
      el.style.height = ''
      resolve()
    }, 350)
  })
}

const collapseElement = (el) => {
  return new Promise((resolve) => {
    el.style.height = el.scrollHeight + 'px'
    el.classList.remove('collapse', 'show')
    el.classList.add('collapsing')

    void el.offsetHeight // 強制 reflow
    el.style.height = '0px'

    setTimeout(() => {
      el.classList.remove('collapsing')
      el.classList.add('collapse')
      el.style.height = ''
      resolve()
    }, 350)
  })
}

// ---------- 動作 ----------
const toggleNavbar = async () => {
  if (isAnimating.value) return // 防止動畫中重複觸發

  const el = navbarRef.value
  if (!el) return

  isAnimating.value = true
  if (isCollapsed.value) {
    await expandElement(el)
  } else {
    await collapseElement(el)
  }
  isCollapsed.value = !isCollapsed.value
  isAnimating.value = false
}

const closeNavbar = () => {
  if (!isCollapsed.value) {
    toggleNavbar()
  }
}

const toggleLanguage = () => {
  isEnglish.value = !isEnglish.value
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
      <router-link class="navbar-brand" to="/" aria-label="地價創產首頁">
        <img src="../assets/exd-logo.png" alt="公司 Logo" style="height: 40px;" />
        <span class="ms-2 d-none d-md-inline">{{ companyName }}</span>
      </router-link>

      <!-- 漢堡選單 -->
      <button
        class="navbar-toggler"
        type="button"
        @click="toggleNavbar"
        :aria-expanded="!isCollapsed"
        aria-controls="navbarNav"
        aria-label="切換導覽列"
      >
        <span class="navbar-toggler-icon"></span>
      </button>

      <!-- 收合選單 -->
      <div ref="navbarRef" class="collapse navbar-collapse" id="navbarNav">
        <ul class="navbar-nav ms-auto">
          <!-- 小螢幕顯示公司名稱 -->
          <li class="nav-item d-md-none">
            <span class="nav-link fw-bold">{{ companyName }}</span>
          </li>

          <!-- 導覽連結 -->
          <li class="nav-item" v-for="item in navItems" :key="item.path">
            <router-link
              class="nav-link"
              :class="{ active: isActive(item.path) }"
              :to="item.path"
              :aria-current="isActive(item.path) ? 'page' : null"
              @click="closeNavbar"
            >
              {{ isEnglish ? item.enName : item.name }}
            </router-link>
          </li>

          <!-- 語言切換 -->
          <li class="nav-item">
            <button class="btn btn-link nav-link" @click="toggleLanguage" aria-label="切換語言">
              {{ isEnglish ? '中文' : 'English' }}
            </button>
          </li>
        </ul>
      </div>
    </div>
  </nav>
</template>

<style scoped>
.navbar {
  padding: 1rem 0;
  background-color: #f8f9fa;
}
.navbar-brand {
  display: flex;
  align-items: center;
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
.nav-link.active {
  font-weight: bold;
  color: #007bff;
}
.btn-link {
  color: #343a40;
}
.shadow-sm {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
/* 自定義動畫 */
.collapsing {
  height: 0;
  overflow: hidden;
  transition: height 0.35s ease;
}
</style>
