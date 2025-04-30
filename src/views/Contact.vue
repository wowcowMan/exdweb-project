<script setup>
import { ref } from 'vue'
import { db } from '../firebase'
import { collection, addDoc } from 'firebase/firestore'
const form = ref({
  name: '',
  email: '',
  phone: '',
  message: ''
})
const submitForm = async () => {
  try {
    await addDoc(collection(db, 'contacts'), {
      name: form.value.name,
      email: form.value.email,
      phone: form.value.phone,
      message: form.value.message,
      timestamp: new Date()
    })
    alert('表單已提交並儲存到 Firebase！')
    form.value = { name: '', email: '', phone: '', message: '' }
  } catch (error) {
    console.error('提交失敗：', error)
    alert('提交失敗，請稍後再試！')
  }
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
        <input v-model="form.phone" type="phone" class="form-control" id="phone" required>
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