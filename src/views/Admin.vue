<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { auth, db, storage } from '../firebase'
import { signOut, onAuthStateChanged } from 'firebase/auth'
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore'
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'


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
const caseToDelete = ref(null)
const newImageFile = ref(null)
const editImageFile = ref(null)
const maxFileSize = 2 * 1024 * 1024 // 2MB

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

// 上傳圖片
const uploadImage = async (file) => {
  if (!file) return null
  if (file.size > maxFileSize) {
    errorMessage.value = '圖片過大，請壓縮至2MB以下'
    return null
  }
  try {
    const storagePath = `cases/${Date.now()}_${file.name}`
    const fileRef = storageRef(storage, storagePath)
    await uploadBytes(fileRef, file)
    return await getDownloadURL(fileRef)
  } catch (error) {
    console.error('圖片上傳失敗：', error)
    errorMessage.value = '圖片上傳失敗，請稍後再試'
    throw error
  }
}

// 新增案例
const addCase = async () => {
  try {
    let imageUrl = newCase.value.image
    if (newImageFile.value) {
      imageUrl = await uploadImage(newImageFile.value)
      if (!imageUrl) return
    }
    await addDoc(collection(db, 'cases'), { ...newCase.value, image: imageUrl })
    successMessage.value = '案例新增成功！'
    errorMessage.value = ''
    newCase.value = { title: '', description: '', image: '', details: '', location: '' }
    newImageFile.value = null
    loadCases()
  } catch (error) {
    console.error('新增案例失敗：', error)
    errorMessage.value = '新增失敗，請稍後再試'
    successMessage.value = ''
  }
}

// 編輯案例
const editCase = (item) => {
  editingCase.value = { ...item }
}

const updateCase = async () => {
  if (!editingCase.value) return
  try {
    let imageUrl = editingCase.value.image
    if (editImageFile.value) {
      imageUrl = await uploadImage(editImageFile.value)
      if (!imageUrl) return
    }
    const docRef = doc(db, 'cases', editingCase.value.id)
    await updateDoc(docRef, {
      title: editingCase.value.title,
      description: editingCase.value.description,
      image: imageUrl,
      details: editingCase.value.details,
      location: editingCase.value.location
    })
    successMessage.value = '案例更新成功！'
    errorMessage.value = ''
    editingCase.value = null
    editImageFile.value = null
    loadCases()
  } catch (error) {
    console.error('更新案例失敗：', error)
    errorMessage.value = '更新失敗，請稍後再試'
    successMessage.value = ''
  }
}

const cancelEdit = () => {
  editingCase.value = null
  editImageFile.value = null
}

// 刪除案例
const confirmDelete = (item) => {
  caseToDelete.value = item
}

const deleteCase = async () => {
  if (!caseToDelete.value) return
  try {
    await deleteDoc(doc(db, 'cases', caseToDelete.value.id))
    successMessage.value = '案例刪除成功！'
    errorMessage.value = ''
    caseToDelete.value = null
    loadCases()
  } catch (error) {
    console.error('刪除案例失敗：', error)
    errorMessage.value = '刪除失敗，請稍後再試'
    successMessage.value = ''
  }
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
            <label for="image-file" class="form-label">上傳圖片（建議壓縮至500KB以下）</label>
            <input type="file" class="form-control" id="image-file" accept="image/jpeg,image/png" @change="newImageFile = $event.target.files[0]">
          </div>
          <div class="mb-3">
            <label for="image-url" class="form-label">或輸入圖片URL</label>
            <input v-model="newCase.image" type="url" class="form-control" id="image-url">
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
            <textarea v-model="editingCase.description" class="form-control" id="edit-description" rows="3" required></textarea>
          </div>
          <div class="mb-3">
            <label for="edit-image-file" class="form-label">上傳新圖片（建議壓縮至500KB以下）</label>
            <input type="file" class="form-control" id="edit-image-file" accept="image/jpeg,image/png" @change="editImageFile = $event.target.files[0]">
          </div>
          <div class="mb-3">
            <label for="edit-image-url" class="form-label">或輸入圖片URL</label>
            <input v-model="editingCase.image" type="url" class="form-control" id="edit-image-url">
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
          <li class="list-group-item d-flex justify-content-between align-items-center" v-for="item in cases" :key="item.id">
            {{ item.title }}
            <span>
              <router-link :to="`/cases/${item.id}`" class="btn btn-sm btn-outline-primary me-2">查看</router-link>
              <button class="btn btn-sm btn-outline-success me-2" @click="editCase(item)">編輯</button>
              <button class="btn btn-sm btn-outline-danger" @click="confirmDelete(item)" data-bs-toggle="modal" data-bs-target="#deleteModal">刪除</button>
            </span>
          </li>
        </ul>
      </div>
    </div>
    <!-- 刪除確認模態框 -->
    <div class="modal fade" id="deleteModal" tabindex="-1" aria-labelledby="deleteModalLabel" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="deleteModalLabel">確認刪除</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            你確定要刪除案例「{{ caseToDelete?.title }}」嗎？此操作無法恢復。
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">取消</button>
            <button type="button" class="btn btn-danger" @click="deleteCase" data-bs-dismiss="modal">刪除</button>
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
.list-group-item { border-radius: 5px; margin-bottom: 0.5rem; }
</style>