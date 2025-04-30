<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { auth, db } from '../firebase'
import { signOut, onAuthStateChanged } from 'firebase/auth'
import { collection, addDoc, getDocs, doc, updateDoc } from 'firebase/firestore'

const router = useRouter()
const cases = ref([])
const newCase = ref({
  title: '',
  description: '',
  image: '',
  details: '',
  location: ''
})
const editingCase = ref(null)

const successMessage = ref('')
const errorMessage = ref('')

// 監聽用戶狀態
onAuthStateChanged(auth, (user) => {
  if (!user) router.push('/login')
})

// 載入案例列表
const loadCases = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'cases'))
    cases.value = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  } catch (error) {
    console.error('載入案例失敗：', error)
  }
}
loadCases()

// 新增案例
const addCase = async () => {
  try {
    await addDoc(collection(db, 'cases'), newCase.value)
    successMessage.value = '案例新增成功！'
    errorMessage.value = ''
    newCase.value = { title: '', description: '', image: '', details: '', location: '' }
    loadCases()
  } catch (error) {
    console.error('新增案例失敗：', error)
    errorMessage.value = '新增失敗，請稍後再試'
    successMessage.value = ''
  }
}

const editCase = (item) => {
  editingCase.value = { ...item }
}
const updateCase = async () => {
  if (!editingCase.value) return
  try {
    const docRef = doc(db, 'cases', editingCase.value.id)
    await updateDoc(docRef, {
      title: editingCase.value.title,
      description: editingCase.value.description,
      image: editingCase.value.image,
      details: editingCase.value.details,
      location: editingCase.value.location
    })
    successMessage.value = '案例更新成功！'
    errorMessage.value = ''
    editingCase.value = null
    loadCases()
  } catch (error) {
    console.error('更新案例失敗：', error)
    errorMessage.value = '更新失敗，請稍後再試'
    successMessage.value = ''
  }
}
const cancelEdit = () => {
  editingCase.value = null
}

// 登出
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
    <div class="text-center mb-4">
      <button class="btn btn-primary" @click="logout">登出</button>
    </div>
    <!-- 新增案例表單 -->
    <div class="card shadow-sm mb-4">
      <div class="card-body">
        <h2 class="h4 mb-3">新增案例</h2>
        <form @submit.prevent="addCase">
          <div class="mb-3">
            <label for="title" class="form-label">標題</label>
            <input v-model="newCase.title" type="text" class="form-control" id="title" required>
          </div>
          <div class="mb-3">
            <label for="description" class="form-label">描述</label>
            <textarea v-model="newCase.description" class="form-control" id="description" rows="3" required></textarea>
          </div>
          <div class="mb-3">
            <label for="image" class="form-label">圖片 URL</label>
            <input v-model="newCase.image" type="url" class="form-control" id="image" required>
          </div>
          <div class="mb-3">
            <label for="details" class="form-label">詳細說明</label>
            <textarea v-model="newCase.details" class="form-control" id="details" rows="4" required></textarea>
          </div>
          <div class="mb-3">
            <label for="location" class="form-label">地點</label>
            <input v-model="newCase.location" type="text" class="form-control" id="location" required>
          </div>
          <div v-if="successMessage" class="alert alert-success" role="alert">
            {{ successMessage }}
          </div>
          <div v-if="errorMessage" class="alert alert-danger" role="alert">
            {{ errorMessage }}
          </div>
          <div class="text-center">
            <button type="submit" class="btn btn-primary">新增案例</button>
          </div>
        </form>
      </div>
    </div>
    <!-- 編輯案例表單 -->
    <div v-if="editingCase" class="card shadow-sm mb-4">
      <div class="card-body">
        <h2 class="h4 mb-3">編輯案例</h2>
        <form @submit.prevent="updateCase">
          <div class="mb-3">
            <label for="edit-title" class="form-label">標題</label>
            <input v-model="editingCase.title" type="text" class="form-control" id="edit-title" required>
          </div>
          <div class="mb-3">
            <label for="edit-description" class="form-label">描述</label>
            <textarea v-model="editingCase.description" class="form-control" id="edit-description" rows="3"
              required></textarea>
          </div>
          <div class="mb-3">
            <label for="edit-image" class="form-label">圖片 URL</label>
            <input v-model="editingCase.image" type="url" class="form-control" id="edit-image" required>
          </div>
          <div class="mb-3">
            <label for="edit-details" class="form-label">詳細說明</label>
            <textarea v-model="editingCase.details" class="form-control" id="edit-details" rows="4" required></textarea>
          </div>
          <div class="mb-3">
            <label for="edit-location" class="form-label">地點</label>
            <input v-model="editingCase.location" type="text" class="form-control" id="edit-location" required>
          </div>
          <div v-if="successMessage" class="alert alert-success" role="alert">
            {{ successMessage }}
          </div>
          <div v-if="errorMessage" class="alert alert-danger" role="alert">
            {{ errorMessage }}
          </div>
          <div class="text-center">
            <button type="submit" class="btn btn-primary me-2">更新案例</button>
            <button type="button" class="btn btn-secondary" @click="cancelEdit">取消</button>
          </div>
        </form>
      </div>
    </div>
    <!-- 案例列表 -->
    <div class="card shadow-sm">
      <div class="card-body">
        <h2 class="h4 mb-3">現有案例</h2>
        <ul class="list-group">
          <li class="list-group-item d-flex justify-content-between align-items-center" v-for="item in cases"
            :key="item.id">
            {{ item.title }}
            <span>
              <router-link :to="`/cases/${item.id}`" class="btn btn-sm btn-outline-primary me-2">查看</router-link>
              <button class="btn btn-sm btn-outline-secondary" @click="editCase(item)">編輯</button>
            </span>
          </li>
        </ul>
      </div>
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
}

.shadow-sm {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.card-body {
  padding: 2rem;
}

.btn-primary {
  background-color: #007bff;
  border: none;
  padding: 0.5rem 1.5rem;
}

.list-group-item {
  border-radius: 5px;
  margin-bottom: 0.5rem;
}
</style>