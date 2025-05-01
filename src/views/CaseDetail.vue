<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { db } from '../firebase'
import { doc, getDoc } from 'firebase/firestore'

const route = useRoute()
const caseId = route.params.id
const selectedCase = ref({ images: [] })

onMounted(async () => {
  try {
    const docRef = doc(db, 'cases', caseId)
    const docSnap = await getDoc(docRef)
    if (docSnap.exists()) {
      const data = docSnap.data()
      selectedCase.value = {
        id: docSnap.id,
        ...data,
        images: data.images || (data.image ? [data.image] : [])
      }
      // 預載圖片
      selectedCase.value.images.forEach(url => {
        const img = new Image()
        img.src = url
      })
      // console.log('Case data:', selectedCase.value)
      // console.log('Images:', selectedCase.value.images)
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
    <div v-if="selectedCase.id" class="card shadow-sm">
      <!-- 輪播 -->
      <div v-if="selectedCase.images && selectedCase.images.length > 0" id="caseCarousel" class="carousel slide mb-3"
        data-bs-ride="carousel">
        <!-- 輪播指示器 -->
        <div class="carousel-indicators">
          <button
            v-for="(image, index) in selectedCase.images"
            :key="'indicator-' + index"
            type="button"
            data-bs-target="#caseCarousel"
            :data-bs-slide-to="index"
            :class="{ active: index === 0 }"
            :aria-current="index === 0 ? 'true' : 'false'"
            :aria-label="'Slide ' + (index + 1)"
          ></button>
        </div>
        <!-- 輪播圖片 -->
        <div class="carousel-inner">
          <div
            class="carousel-item"
            v-for="(image, index) in selectedCase.images"
            :key="'item-' + index"
            :class="{ active: index === 0 }"
          >
            <img :src="image" class="d-block" alt="`案例 ${case.title} `" loading="lazy">
          </div>
        </div>
        <!-- 箭頭 -->
        <button v-if="selectedCase.images.length > 1" class="carousel-control-prev" type="button"
          data-bs-target="#caseCarousel" data-bs-slide="prev">
          <span class="carousel-control-prev-icon" aria-hidden="true"></span>
          <span class="visually-hidden">Previous</span>
        </button>
        <button v-if="selectedCase.images.length > 1" class="carousel-control-next" type="button"
          data-bs-target="#caseCarousel" data-bs-slide="next">
          <span class="carousel-control-next-icon" aria-hidden="true"></span>
          <span class="visually-hidden">Next</span>
        </button>
      </div>
      <img v-else src="https://via.placeholder.com/800x600" class="img-fluid mb-3" alt="無圖片">
      <div class="card-body">
        <p class="card-text text-center">{{ selectedCase.description }}</p>
        <p class="card-text text-center"><strong>詳細說明：</strong> {{ selectedCase.details }}</p>
        <p class="card-text text-center"><strong>地點：</strong> {{ selectedCase.location }}</p>
        <router-link to="/cases" class="btn btn-primary">返回案例清單</router-link>
      </div>
    </div>
    <div v-else>
      <p class="text-center">找不到該案例！</p>
      <router-link to="/cases" class="btn btn-primary">返回案例清單</router-link>
    </div>
  </div>
</template>

<style scoped>
.mt-5 {
  margin-top: 3rem;
}
.mb-4 {
  margin-bottom: 1.5rem;
}
.card {
  border: none;
  border-radius: 10px;
  overflow: hidden;
  max-width: 800px;
  margin: auto;
}
.shadow-sm {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}
.card-body {
  padding: 2rem;
}
.card-text {
  color: #6c757d;
}
.btn-primary {
  background-color: #007bff;
  border: none;
  padding: 0.5rem 1.5rem;
}
.carousel {
  width: 100%;
  max-width: 800px;
  margin: auto;
}
.carousel-inner {
  width: 100%;
  aspect-ratio: 4 / 3;
  overflow: hidden;
}
.carousel-item {
  width: 100%;
  height: 100%;
}
.carousel-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
}
.img-fluid {
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
}
.carousel-item {
  transition: opacity 0.7s ease, transform 0.7s ease;
}

</style>
