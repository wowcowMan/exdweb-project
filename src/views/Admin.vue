<script setup>
import { auth } from '../firebase'
import { signOut } from 'firebase/auth'
import { useRouter } from 'vue-router'

const router = useRouter()

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
  <div class="container mt-5">
    <h1 class="text-center mb-4">管理後台</h1>
    <div class="text-center">
      <p>歡迎進入管理後台！（未來這裡可管理案例）</p>
      <button class="btn btn-primary" @click="logout">登出</button>
    </div>
  </div>
</template>
<style scoped>
.mt-5 { margin-top: 3rem; }
.mb-4 { margin-bottom: 1.5rem; }
.btn-primary { background-color: #007bff; border: none; padding: 0.5rem 1.5rem; }
</style>