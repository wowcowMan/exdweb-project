<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { auth } from '../firebase'
import { signInWithEmailAndPassword } from 'firebase/auth'

const router = useRouter()
const email = ref('')
const password = ref('')
const errorMessage = ref('')

const login = async () => {
  try {
    await signInWithEmailAndPassword(auth, email.value, password.value)
    router.push('/admin')
  } catch (error) {
    console.error('登入失敗：', error)
    errorMessage.value = '登入失敗，請檢查郵件或密碼'
  }
}
</script>
<template>
  <div class="container mt-5">
    <h1 class="text-center mb-4">管理員登入</h1>
    <div class="row justify-content-center">
      <div class="col-md-6">
        <div class="card shadow-sm">
          <div class="card-body">
            <form @submit.prevent="login">
              <div class="mb-3">
                <label for="email" class="form-label">電子郵件</label>
                <input v-model="email" type="email" class="form-control" id="email" required>
              </div>
              <div class="mb-3">
                <label for="password" class="form-label">密碼</label>
                <input v-model="password" type="password" class="form-control" id="password" required>
              </div>
              <div v-if="errorMessage" class="alert alert-danger" role="alert">
                {{ errorMessage }}
              </div>
              <div class="text-center">
                <button type="submit" class="btn btn-primary">登入</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<style scoped>
.mt-5 { margin-top: 3rem; }
.mb-4 { margin-bottom: 1.5rem; }
.card { border: none; border-radius: 10px; }
.shadow-sm { box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); }
.card-body { padding: 2rem; }
.btn-primary { background-color: #007bff; border: none; padding: 0.5rem 1.5rem; }
</style>