<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { auth } from '../firebase'
import { onAuthStateChanged, signOut } from 'firebase/auth'

const router = useRouter()
const isLoggedIn = ref(false)

onAuthStateChanged(auth, (user) => {
  isLoggedIn.value = !!user
})

const logout = async () => {
  try {
    await signOut(auth)
    router.push('/login')
  } catch (error) {
    console.error('登出失敗：', error)
  }
}
</script>
<template>
  <footer class="bg-light py-4 mt-auto shadow-sm">
    <div class="container">
      <div class="row">
        <div class="col-md-6">
          <p class="mb-0">&copy; 2025 台中危老重建. All Rights Reserved.</p>
          <p class="mb-0">電話：(04) 1234-5678 | 電子郵件：contact@tc-rebuild.com</p>
          <div class="mt-2">
            <a href="https://www.facebook.com/profile.php?id=61569297489525" target="_blank" class="me-2"><i class="bi bi-facebook"></i></a>
          </div>
        </div>
        <div class="col-md-6 text-md-end">
          <router-link v-if="!isLoggedIn" to="/login" class="btn btn-link">管理員登入</router-link>
          <div v-else>
            <router-link to="/admin" class="btn btn-link">後台</router-link>
            <button class="btn btn-link" @click="logout">登出</button>
          </div>
        </div>
      </div>
    </div>
  </footer>
</template>
<style scoped>
.bg-light {
  background-color: #f8f9fa;
}

.py-4 {
  padding-top: 1.5rem;
  padding-bottom: 1.5rem;
}

.mt-auto {
  margin-top: auto;
}

.shadow-sm {
  box-shadow: 0 -2px 4px rgba(0, 0, 0, 0.1);
}

.btn-link {
  color: #343a40;
  text-decoration: none;
}

.btn-link:hover {
  color: #007bff;
}
</style>