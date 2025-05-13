```vue
<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import HomeTeam from '../components/HomeTeam.vue'
import { db } from '../firebase'
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore'

// Banner 狀態
const banners = ref([])
const loadBanners = () => {
  const q = query(collection(db, 'banners'), orderBy('order', 'asc'))
  const unsubscribe = onSnapshot(q, (querySnapshot) => {
    banners.value = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  }, (error) => {
    console.error('載入 banner 失敗：', error)
  })
  return unsubscribe
}

let bannerUnsubscribe = null
onMounted(() => {
  bannerUnsubscribe = loadBanners()
})
onUnmounted(() => {
  if (bannerUnsubscribe) bannerUnsubscribe()
})
</script>

<template>
  <div class="home">
    <!-- 輪播 Banner -->
    <div id="bannerCarousel" class="carousel slide carousel-fade" data-bs-ride="carousel">
      <div class="carousel-inner">
        <div v-for="(banner, index) in banners" :key="banner.id" class="carousel-item" :class="{ active: index === 0 }">
          <img :src="banner.image" class="banner-img img-fluid d-block mx-auto" :alt="banner.title">
          <div class="carousel-caption d-none d-md-block">
            <h5 class="banner-title animate__animated animate__fadeIn">{{ banner.title }}</h5>
          </div>
        </div>
      </div>
      <button class="carousel-control-prev" type="button" data-bs-target="#bannerCarousel" data-bs-slide="prev">
        <span class="carousel-control-prev-icon" aria-hidden="true"></span>
        <span class="visually-hidden">上一張</span>
      </button>
      <button class="carousel-control-next" type="button" data-bs-target="#bannerCarousel" data-bs-slide="next">
        <span class="carousel-control-next-icon" aria-hidden="true"></span>
        <span class="visually-hidden">下一張</span>
      </button>
    </div>

    <!-- 公司使命 -->
    <section class="mission py-5 bg-light">
      <div class="container">
        <h2 class="text-center mb-4 animate__animated animate__slideInUp">我們的使命</h2>
        <p class="lead text-center animate__animated animate__slideInUp animate__delay-1s">
          我們致力於提供專業、可靠的建築與法律服務，結合建築師、律師、會計師和代書的專業知識，為客戶打造值得信賴的解決方案。
        </p>
      </div>
    </section>

    <!-- 專業團隊 -->
    <section class="team py-5 position-relative">
      <div class="container">
        <h2 class="text-center mb-5 animate__animated animate__fadeIn">我們的專業團隊</h2>
        <HomeTeam />
        <div class="text-center mt-5">
          <router-link to="/about" class="btn btn-primary btn-lg shadow shine animate__animated animate__fadeIn animate__delay-4s">
            了解更多
          </router-link>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.home {
  font-family: 'Roboto', sans-serif;
  color: #333;
}

/* Banner 樣式 */
.banner-img {
  max-width: 1920px;
  height: 60vh;
  object-fit: cover;
  aspect-ratio: 16 / 9;
}

.carousel-caption {
  background: rgba(0, 0, 0, 0.5);
  padding: 10px 20px;
  border-radius: 5px;
}

.banner-title {
  font-size: 2rem;
  font-weight: bold;
  color: #fff;
}

/* 公司使命 */
.mission {
  background-color: #f8f9fa;
}

.mission p {
  max-width: 800px;
  margin: 0 auto;
  font-size: 1.2rem;
}




.btn-primary {
  background: linear-gradient(45deg, #3498DB, #FFD700);
  border: none;
  padding: 12px 30px;
  border-radius: 25px;
  position: relative;
  overflow: hidden;
  transition: transform 0.3s ease;
}

.btn-primary:hover {
  background: linear-gradient(45deg, #2C3E50, #DAA520);
  transform: translateY(-2px);
}

.shine::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 50%;
  height: 100%;
  background: linear-gradient(to right, transparent, rgba(255, 255, 255, 0.4), transparent);
  animation: shine 6s infinite;
}
</style>
```