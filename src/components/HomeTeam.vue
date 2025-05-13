<script setup>
import { ref, onMounted } from 'vue'

const teamMembers = ref([
  {
    title: '建築師',
    description: '專業設計建築結構，打造安全與美觀兼具的空間。',
    image: 'https://picsum.photos/600?random=1',
    alt: '建築師卡片背景'
  },
  {
    title: '律師',
    description: '提供法律諮詢與訴訟服務，捍衛您的權益。',
    image: 'https://picsum.photos/600?random=2',
    alt: '律師卡片背景'
  },
  {
    title: '會計師',
    description: '專業財務管理與稅務規劃，助您財富增值。',
    image: 'https://picsum.photos/600?random=3',
    alt: '會計師卡片背景'
  },
  {
    title: '代書',
    description: '處理不動產交易與法律文件，確保交易順利。',
    image: 'https://picsum.photos/600?random=4',
    alt: '代書卡片背景'
  }
])

onMounted(() => {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('enter')
          observer.unobserve(entry.target)
        }
      })
    },
    { threshold: 0.3 }
  )

  document.querySelectorAll('.card').forEach((card) => observer.observe(card))
})
</script>

<template>
  <div class="team-container">
    <div
      class="card"
      v-for="(member, index) in teamMembers"
      :key="index"
      :class="[
        `card-${index}`,
        {
          'top-left': index === 0,
          'top-right': index === 1,
          'bottom-left': index === 2,
          'bottom-right': index === 3
        }
      ]"
    >
      <div
        class="card-image"
        :style="{ backgroundImage: `url(${member.image})` }"
        :alt="member.alt"
      ></div>
      <div class="card-content">
        <h3 class="card-title">{{ member.title }}</h3>
        <p class="card-description">{{ member.description }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.team-container {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

@media (max-width: 768px) {
  .team-container {
    grid-template-columns: 1fr;
  }
}

.card {
  opacity: 0;
  transform: translateY(50px);
  transition: transform 0.6s ease, opacity 0.6s ease;
  position: relative;
  aspect-ratio: 1 / 1;
  overflow: hidden;
  display: flex;
  align-items: flex-end;
  border-radius: 4rem;
  background-color: #000;
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
  border: none;
}

/* base enter class when intersected */
.card.enter {
  opacity: 1;
  transform: translateX(0) translateY(0);
}

/* ========== 寬螢幕進場動畫 ========== */
@media (min-width: 769px) {
  .top-left {
    transform: translate(-100px, -100px);
  }
  .top-right {
    transform: translate(100px, -100px);
  }
  .bottom-left {
    transform: translate(-100px, 100px);
  }
  .bottom-right {
    transform: translate(100px, 100px);
  }
}

/* ========== 窄螢幕進場動畫 ========== */
@media (max-width: 768px) {
  .card-0 {
    transform: translateX(-100px);
  }
  .card-1 {
    transform: translateX(100px);
  }
  .card-2 {
    transform: translateX(-100px);
  }
  .card-3 {
    transform: translateX(100px);
  }

  .card {
    border-radius: 2rem !important;
  }
}

/* 卡片內容樣式 */
.card-image {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
  transition: transform 0.5s ease;
  z-index: 0;
}

.card:hover .card-image {
  transform: scale(1.1);
}

.card-content {
  position: absolute;
  top: 80%;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 1;
  color: white;
  padding: 1rem;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.6), transparent);
}

.card-title {
  font-size: 2rem;
  font-weight: bold;
  width: 100%;
  margin: 0;
  position: relative;
  display: inline-block;
}

.card-title::after {
  content: '';
  position: absolute;
  left: 0;
  bottom: -4px;
  height: 2px;
  width: 50%;
  background-color: white;
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 0.3s ease;
}

.card:hover .card-title::after {
  transform: scaleX(1);
}

.card-description {
  opacity: 0;
  max-height: 0;
  transition: opacity 0.3s ease, max-height 0.3s ease;
  margin-top: 0.5rem;
  font-size: 1rem;
}

.card:hover .card-content {
  top: 50%;
  transition: 0.3s ease;
}

.card:hover .card-description {
  opacity: 1;
  max-height: 100px;
}
</style>