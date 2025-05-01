<script setup>
import { ref, onMounted } from 'vue'
import { db } from '../firebase'
import { collection, getDocs } from 'firebase/firestore'
// 簡單案例清單
const cases = ref([])

onMounted(async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'cases'))
    cases.value = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  } catch (error) {
    console.error('讀取案例失敗：', error)
  }
})
</script>
<template>
<div class="container mt-5">
    <h1 class="text-center mb-4">案例展示</h1>
    <div class="row">
      <div class="col-md-4" v-for="item in cases" :key="item.id">
        <div class="card mb-4 shadow-sm hover-lift">
          <img :src="item.images[0] || 'https://via.placeholder.com/300'" class="card-img-top" alt="案例圖片" style="height: 200px; object-fit: cover;">
          <div class="card-body">
            <h5 class="card-title">{{ item.title }}</h5>
            <p class="card-text">{{ item.description }}</p>
            <router-link :to="`/cases/${item.id}`" class="btn btn-primary">查看詳情</router-link>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<style scoped>
.mt-5 { margin-top: 3rem; }
.mb-4 { margin-bottom: 1.5rem; }
.card { border: none; border-radius: 10px; overflow: hidden; }
.shadow-sm { box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); }
.hover-lift { transition: transform 0.3s, box-shadow 0.3s; }
.hover-lift:hover { transform: translateY(-5px); box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2); }
.card-title { color: #343a40; }
.card-text { color: #6c757d; }

@media (max-width: 576px) {
  .card-body {
    padding: 1rem;
  }
  .form-label {
    font-size: 0.9rem;
  }
}
</style>