<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'

const activeTab = ref('company')
const teamMembers = ref([])
const errorMessage = ref('')
const isLoading = ref(false)
const expandedMembers = ref({})

const loadTeam = () => {
  isLoading.value = true
  const q = query(collection(db, 'team'), orderBy('order', 'asc'))
  const unsubscribe = onSnapshot(q, (querySnapshot) => {
    teamMembers.value = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      experiences: doc.data().experiences || []
    }))
    errorMessage.value = ''
    isLoading.value = false
  }, (error) => {
    console.error('載入團隊失敗：', error)
    errorMessage.value = '載入團隊資料失敗，請稍後重試'
    isLoading.value = false
  })
  return unsubscribe
}

const toggleExpand = (memberId) => {
  expandedMembers.value[memberId] = !expandedMembers.value[memberId]
}

let unsubscribe = null
onMounted(() => {
  unsubscribe = loadTeam()
})
onUnmounted(() => {
  if (unsubscribe) unsubscribe()
})
</script>

<template>
  <div class="container mt-5">
    <h1 class="text-center mb-4">關於我們</h1>

    <!-- 標籤頁 -->
    <ul class="nav nav-tabs mb-4" role="tablist">
      <li class="nav-item">
        <button class="nav-link" :class="{ active: activeTab === 'company' }" @click="activeTab = 'company'" role="tab" aria-selected="activeTab === 'company'">公司介紹</button>
      </li>
      <li class="nav-item">
        <button class="nav-link" :class="{ active: activeTab === 'team' }" @click="activeTab = 'team'" role="tab" aria-selected="activeTab === 'team'">團隊介紹</button>
      </li>
      <li class="nav-item">
        <button class="nav-link" :class="{ active: activeTab === 'business' }" @click="activeTab = 'business'" role="tab" aria-selected="activeTab === 'business'">業務介紹</button>
      </li>
    </ul>

    <!-- 標籤內容 -->
    <div class="tab-content">
      <!-- 公司介紹 -->
      <div v-if="activeTab === 'company'" class="tab-pane fade show active" role="tabpanel">
        <div class="card shadow-sm">
          <div class="card-body">
            <h2 class="h4 mb-3">公司介紹</h2>
            <p>我們是一家專注於危老重建的專業公司，成立於 2010 年，致力於為客戶提供全案執行服務。我們的使命是打造安全、永續的居住與商業空間，結合創新設計與高效施工，實現客戶的願景。</p>
            <p>憑藉 15 年以上行業經驗，我們已成功完成超過 50 個危老重建項目，涵蓋住宅與商辦，獲得客戶一致好評。未來，我們將繼續秉持專業與熱情，推動城市更新。</p>
          </div>
        </div>
      </div>

      <!-- 團隊介紹 -->
      <div v-if="activeTab === 'team'" class="tab-pane fade show active" role="tabpanel">
        <div class="card shadow-sm">
          <div class="card-body">
            <h2 class="h4 mb-4">團隊介紹</h2>
            <div v-if="isLoading" class="alert alert-info" role="alert">
              正在載入團隊資料...
            </div>
            <div v-else-if="errorMessage" class="alert alert-danger d-flex align-items-center" role="alert">
              <span class="me-2">{{ errorMessage }}</span>
              <button class="btn btn-outline-danger btn-sm" @click="loadTeam">重試</button>
            </div>
            <div v-else-if="teamMembers.length === 0" class="alert alert-info" role="alert">
              目前尚無團隊成員資料
            </div>
            <div v-else class="row">
              <article v-for="(member, index) in teamMembers" :key="member.id" class="col-12 mb-4 animate__animated animate__fadeInUp" :class="`animate__delay-${index}s`">
                <div class="card shadow-sm">
                  <div class="card-body p-0">
                    <div class="row g-0">
                      <!-- 窄欄 -->
                      <div class="col-md-5 narrow-column bg-light d-flex flex-column p-3">
                        <!-- 第一列：頭像 + 名字/職位 -->
                        <div class="d-flex align-items-center mb-3">
                          <img :src="member.photo" :alt="`團隊成員 ${member.name} 的照片`" class="rounded-circle me-md-3 img-fluid" style="width: 80px; height: 80px; object-fit: contain; object-position: top; background-color: #fff;">
                          <div class="d-flex flex-column">
                            <h5 class="card-title mb-1">{{ member.name }}</h5>
                            <span class="text-muted position-title">{{ member.position }}</span>
                          </div>
                        </div>
                        <hr class="divider">
                        <!-- 第二列：經歷 -->
                        <div class="experience-container d-md-flex" :class="{ expanded: expandedMembers[member.id] }">
                          <h6 class="mb-3 ms-1 col-lg-1 writing-mode-vertical">相關經歷</h6>
                          <div class="col" :class="{ 'scroll-wrapper pe-2': expandedMembers[member.id] }" :id="`experiences-${member.id}`">
                            <ul class="list-unstyled">
                              <li v-for="(exp, index) in member.experiences" :key="index" class="mb-2" v-show="index < 3 || expandedMembers[member.id]">
                                {{ exp }}
                              </li>
                            </ul>
                            <button v-if="member.experiences.length > 3" class="btn btn-link p-0" :aria-expanded="expandedMembers[member.id]" :aria-controls="`experiences-${member.id}`" @click="toggleExpand(member.id)">
                              {{ expandedMembers[member.id] ? '收合' : '更多' }}
                            </button>
                          </div>
                        </div>
                      </div>
                      <!-- 寬欄 -->
                      <div class="col-md-7 wide-column bg-white p-3">
                        <h3 class="h5 mb-3">簡介</h3>
                        <p class="card-text mb-0">{{ member.bio }}</p>
                      </div>
                    </div>
                  </div>
                  <!-- <hr class="divider m-0"> -->
                </div>
              </article>
            </div>
          </div>
        </div>
      </div>

      <!-- 業務介紹 -->
      <div v-if="activeTab === 'business'" class="tab-pane fade show active" role="tabpanel">
        <div class="card shadow-sm">
          <div class="card-body">
            <h2 class="h4 mb-3">業務介紹</h2>
            <p>我們的業務核心為危老重建，提供全案執行服務，從前期評估、規劃設計到施工管理，一站式解決客戶需求。我們專注於住宅與商辦項目，確保每個項目兼顧安全性、美觀與功能性。</p>
            <p>合作方式以全案執行為主，與客戶共同制定專屬方案，整合建築師、工程師與法務團隊，確保進度透明、品質卓越。立即聯繫我們，開啟您的危老重建之旅！</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.card {
  border: none;
  border-radius: 10px;
  overflow: hidden;
}

.shadow-sm {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.nav-tabs .nav-link {
  color: #007bff;
  font-weight: 500;
}

.nav-tabs .nav-link.active {
  color: #0056b3;
  border-color: #007bff;
}

.alert {
  border-radius: 8px;
  margin-bottom: 1.5rem;
}

.rounded-circle {
  border: 2px solid #e9ecef;
}

.card-title {
  font-size: 1.25rem;
  font-weight: 600;
}

.card-text {
  font-size: 0.9rem;
  line-height: 1.6;
}

.position-title {
  font-size: 0.9rem;
  white-space: nowrap;
  color: #6c757d;
}

.btn-link {
  font-size: 0.9rem;
  color: #007bff;
  text-decoration: none;
}

.btn-link:hover {
  color: #0056b3;
}

.list-unstyled li {
  font-size: 0.85rem;
  line-height: 1.5;
}

.writing-mode-vertical {
  writing-mode: vertical-rl;
  text-orientation: mixed;
}

.scroll-wrapper {
  max-height: 150px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #888 #f1f1f1;
}

.scroll-wrapper::-webkit-scrollbar {
  width: 6px;
}

.scroll-wrapper::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.scroll-wrapper::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 3px;
}

.scroll-wrapper::-webkit-scrollbar-thumb:hover {
  background: #555;
}


@media (max-width: 767px) {
  .narrow-column {
    border-right: none;
    border-bottom: 1px solid #e9ecef;
  }
  .d-flex.align-items-center {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
  .rounded-circle {
    margin-bottom: 1rem;
    margin-right: 0;
  }
  .d-flex.flex-column {
    /* align-items: center; */
  }
  .writing-mode-vertical {
    writing-mode: horizontal-tb;
  }
}
</style>
