<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { db } from '../firebase'
import { doc, getDoc } from 'firebase/firestore'

const route = useRoute()
const caseId = route.params.id // 從 URL 取得案例 ID
const selectedCase = ref({})


// 模擬案例資料（從後端獲取）
onMounted(async () => {
  try {
    const docRef = doc(db, 'cases', caseId)
    const docSnap = await getDoc(docRef)
    if (docSnap.exists()) {
      selectedCase.value = { id: docSnap.id, ...docSnap.data() }
    } else {
      console.error('案例不存在')
    }
  } catch (error) {
    console.error('讀取案例失敗：', error)
  }
})
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