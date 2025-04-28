<script setup>
import { ref } from 'vue'
const form = ref({
  name: '',
  email: '',
  phone: '',
  message: ''
})
const submitForm = () => {
  console.log('表單提交：', form.value)
  alert('表單已提交！請查看控制台。')
  form.value = { name: '', email: '', message: '' } // 重置表單
}
</script>
<template>
  <div class="container mt-5">
    <h1 class="text-center">聯繫我們</h1>
    <p class="text-center">電話：(04) 1234-5678 | 電子郵件：contact@tc-rebuild.com</p>
    <form @submit.prevent="submitForm" class="mt-4">
      <div class="mb-3">
        <label for="name" class="form-label">姓名</label>
        <input v-model="form.name" type="text" class="form-control" id="name" required>
      </div>
      <div class="mb-3">
        <label for="email" class="form-label">電子郵件</label>
        <input v-model="form.email" type="email" class="form-control" id="email" required>
      </div>
      <div class="mb-3">
        <label for="message" class="form-label">電話</label>
        <input v-model="form.email" type="phone" class="form-control" id="phone" required>
      </div>
      <div class="mb-3">
        <label for="message" class="form-label">訊息</label>
        <textarea v-model="form.message" class="form-control" id="message" rows="4" required></textarea>
      </div>
      <button type="submit" class="btn btn-primary">提交</button>
    </form>
  </div>
</template>
<style scoped>
.mt-5 { margin-top: 3rem; }
.mt-4 { margin-top: 1.5rem; }
.mb-3 { margin-bottom: 1rem; }
</style>