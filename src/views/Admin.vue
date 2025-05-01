<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
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
  images: [],
  details: '',
  location: ''
})
const editingCase = ref(null)
const successMessage = ref('')
const errorMessage = ref('')
const caseToDelete = ref(null)
const newImageFiles = ref([])
const editImageFiles = ref([])
const maxFileSize = 2 * 1024 * 1024 // 2MB
const triggerButton = ref(null)
const isLoading = ref(false) // 新增：Loading 狀態

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
      ...doc.data(),
      images: doc.data().images || []
    }))
  } catch (error) {
    console.error('載入案例失敗：', error)
    errorMessage.value = '載入案例失敗，請稍後再試'
  }
}
loadCases()

// 上傳圖片
const uploadImages = async (files) => {
  const urls = []
  for (const file of files) {
    if (file.size > maxFileSize) {
      errorMessage.value = `圖片 ${file.name} 過大，請壓縮至2MB以下`
      return null
    }
    try {
      const storagePath = `cases/${Date.now()}_${file.name}`
      const fileRef = storageRef(storage, storagePath)
      await uploadBytes(fileRef, file)
      const url = await getDownloadURL(fileRef)
      urls.push(url)
    } catch (error) {
      console.error(`圖片上傳失敗（${file.name}）：`, error)
      errorMessage.value = `圖片 ${file.name} 上傳失敗：${error.message}`
      return null
    }
  }
  return urls
}

// 新增案例
const addCase = async () => {
  isLoading.value = true // 開始 Loading
  try {
    let imageUrls = newCase.value.images
    if (newImageFiles.value.length > 0) {
      imageUrls = await uploadImages(newImageFiles.value)
      if (!imageUrls) {
        isLoading.value = false
        return
      }
    }
    await addDoc(collection(db, 'cases'), { ...newCase.value, images: imageUrls })
    successMessage.value = '案例新增成功！'
    errorMessage.value = ''
    newCase.value = { title: '', description: '', images: [], details: '', location: '' }
    newImageFiles.value = []
    loadCases()
  } catch (error) {
    console.error('新增案例失敗：', error)
    errorMessage.value = `新增案例失敗：${error.message}`
    successMessage.value = ''
  } finally {
    isLoading.value = false // 結束 Loading
  }
}

// 編輯案例
const editCase = (item) => {
  editingCase.value = { ...item }
}

const updateCase = async () => {
  if (!editingCase.value) return
  isLoading.value = true // 開始 Loading
  try {
    let imageUrls = editingCase.value.images
    if (editImageFiles.value.length > 0) {
      imageUrls = await uploadImages(editImageFiles.value)
      if (!imageUrls) {
        isLoading.value = false
        return
      }
    }
    const docRef = doc(db, 'cases', editingCase.value.id)
    await updateDoc(docRef, {
      title: editingCase.value.title,
      description: editingCase.value.description,
      images: imageUrls,
      details: editingCase.value.details,
      location: editingCase.value.location
    })
    successMessage.value = '案例更新成功！'
    errorMessage.value = ''
    editingCase.value = null
    editImageFiles.value = []
    loadCases()
  } catch (error) {
    console.error('更新案例失敗：', error)
    errorMessage.value = `更新案例失敗：${error.message}`
    successMessage.value = ''
  } finally {
    isLoading.value = false // 結束 Loading
  }
}

const cancelEdit = () => {
  editingCase.value = null
  editImageFiles.value = []
}

// 刪除案例
const confirmDelete = (item, event) => {
  caseToDelete.value = item
  triggerButton.value = event.currentTarget
}

const deleteCase = async () => {
  if (!caseToDelete.value) return
  isLoading.value = true // 開始 Loading
  if (triggerButton.value) {
    triggerButton.value.focus()
  }
  try {
    const docRef = doc(db, 'cases', caseToDelete.value.id)
    await deleteDoc(docRef)
    successMessage.value = '案例刪除成功！'
    errorMessage.value = ''
    caseToDelete.value = null
    loadCases()
  } catch (error) {
    console.error('刪除案例失敗：', error)
    errorMessage.value = `刪除案例失敗：${error.message}`
    successMessage.value = ''
  } finally {
    isLoading.value = false // 結束 Loading
  }
}

// 登出
const logout = async () => {
  try {
    await signOut(auth)
    router.push('/login')
  } catch (error) {
    console.error('登出失敗：', error)
    errorMessage.value = '登出失敗，請稍後再試'
  }
}

// 監聽模態框事件
onMounted(() => {
  const modal = document.getElementById('deleteModal')
  if (modal) {
    modal.addEventListener('shown.bs.modal', () => {
      const deleteButton = modal.querySelector('.btn-danger')
      if (deleteButton) {
        deleteButton.focus()
      }
    })
    modal.addEventListener('hidden.bs.modal', () => {
      if (triggerButton.value) {
        triggerButton.value.focus()
      }
    })
  }
})

onUnmounted(() => {
  const modal = document.getElementById('deleteModal')
  if (modal) {
    modal.removeEventListener('shown.bs.modal', () => {})
    modal.removeEventListener('hidden.bs.modal', () => {})
  }
})
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
        <form @submit.prevent="addCase" :class="{ 'loading-form': isLoading }">
          <div class="mb-3">
            <label for="title" class="form-label">標題</label>
            <input v-model="newCase.title" type="text" class="form-control" id="title" required :disabled="isLoading">
          </div>
          <div class="mb-3">
            <label for="image-files" class="form-label">上傳圖片（建議壓縮至500KB以下，可選多張）</label>
            <input type="file" class="form-control" id="image-files" accept="image/jpeg,image/png" multiple @change="newImageFiles = $event.target.files" :disabled="isLoading">
          </div>
          <div class="mb-3">
            <label for="image-url" class="form-label">或輸入圖片URL（以逗號分隔多個URL）</label>
            <input v-model="newCase.images" type="text" class="form-control" id="image-url" placeholder="例如：url1,url2" :disabled="isLoading">
          </div>
          <div class="mb-3">
            <label for="details" class="form-label">詳細說明</label>
            <textarea v-model="newCase.details" class="form-control" id="details" rows="4" required :disabled="isLoading"></textarea>
          </div>
          <div class="mb-3">
            <label for="location" class="form-label">地點</label>
            <input v-model="newCase.location" type="text" class="form-control" id="location" required :disabled="isLoading">
          </div>
          <div v-if="successMessage" class="alert alert-success" role="alert">
            {{ successMessage }}
          </div>
          <div v-if="errorMessage" class="alert alert-danger" role="alert">
            {{ errorMessage }}
          </div>
          <div class="text-center position-relative">
            <button type="submit" class="btn btn-primary" :disabled="isLoading">
              <span v-if="isLoading" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              {{ isLoading ? '新增中...' : '新增案例' }}
            </button>
          </div>
        </form>
      </div>
    </div>
    <!-- 編輯案例表單 -->
    <div v-if="editingCase" class="card shadow-sm mb-4">
      <div class="card-body">
        <h2 class="h4 mb-3">編輯案例</h2>
        <form @submit.prevent="updateCase" :class="{ 'loading-form': isLoading }">
          <div class="mb-3">
            <label for="edit-title" class="form-label">標題</label>
            <input v-model="editingCase.title" type="text" class="form-control" id="edit-title" required :disabled="isLoading">
          </div>
          <div class="mb-3">
            <label for="edit-description" class="form-label">描述</label>
            <textarea v-model="editingCase.description" class="form-control" id="edit-description" rows="3" required :disabled="isLoading"></textarea>
          </div>
          <div class="mb-3">
            <label for="edit-image-files" class="form-label">上傳新圖片（建議壓縮至500KB以下，可選多張）</label>
            <input type="file" class="form-control" id="edit-image-files" accept="image/jpeg,image/png" multiple @change="editImageFiles = $event.target.files" :disabled="isLoading">
          </div>
          <div class="mb-3">
            <label for="edit-image-url" class="form-label">或輸入圖片URL（以逗號分隔多個URL）</label>
            <input v-model="editingCase.images" type="text" class="form-control" id="edit-image-url" placeholder="例如：url1,url2" :disabled="isLoading">
          </div>
          <div class="mb-3">
            <label for="edit-details" class="form-label">詳細說明</label>
            <textarea v-model="editingCase.details" class="form-control" id="edit-details" rows="4" required :disabled="isLoading"></textarea>
          </div>
          <div class="mb-3">
            <label for="edit-location" class="form-label">地點</label>
            <input v-model="editingCase.location" type="text" class="form-control" id="edit-location" required :disabled="isLoading">
          </div>
          <div v-if="successMessage" class="alert alert-success" role="alert">
            {{ successMessage }}
          </div>
          <div v-if="errorMessage" class="alert alert-danger" role="alert">
            {{ errorMessage }}
          </div>
          <div class="text-center position-relative">
            <button type="submit" class="btn btn-primary me-2" :disabled="isLoading">
              <span v-if="isLoading" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              {{ isLoading ? '更新中...' : '更新案例' }}
            </button>
            <button type="button" class="btn btn-secondary" @click="cancelEdit" :disabled="isLoading">取消</button>
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
              <button class="btn btn-sm btn-outline-danger" @click="confirmDelete(item, $event)" data-bs-toggle="modal" data-bs-target="#deleteModal">刪除</button>
            </span>
          </li>
        </ul>
      </div>
    </div>
    <!-- 刪除確認模態框 -->
    <div class="modal fade" id="deleteModal" tabindex="-1" aria-labelledby="deleteModalLabel" aria-describedby="deleteModalDesc">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="deleteModalLabel">確認刪除</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="關閉"></button>
          </div>
          <div class="modal-body" id="deleteModalDesc">
            你確定要刪除案例「{{ caseToDelete?.title }}」嗎？此操作無法恢復。
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal" :disabled="isLoading">取消</button>
            <button type="button" class="btn btn-danger" @click="deleteCase" data-bs-dismiss="modal" :disabled="isLoading">
              <span v-if="isLoading" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              {{ isLoading ? '刪除中...' : '刪除' }}
            </button>
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

/* Loading 樣式 */
.loading-form {
  position: relative;
  opacity: 0.7;
  pointer-events: none; /* 禁用互動 */
}
.spinner-border {
  vertical-align: middle;
}

@media (max-width: 576px) {
  .card-body {
    padding: 1rem;
  }
  .form-label {
    font-size: 0.9rem;
  }
}
</style>
