<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { auth, db, storage } from '../firebase'
import { signOut, onAuthStateChanged } from 'firebase/auth'
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore'
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'

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
const triggerButton = ref(null) // 儲存觸發模態框的按鈕

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
      images: doc.data().images || [doc.data().image]
    }))
  } catch (error) {
    console.error('載入案例失敗：', error)
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
      console.error('圖片上傳失敗：', error)
      errorMessage.value = '圖片上傳失敗，請稍後再試'
      return null
    }
  }
  return urls
}

// 新增案例
const addCase = async () => {
  try {
    let imageUrls = newCase.value.images
    if (newImageFiles.value.length > 0) {
      imageUrls = await uploadImages(newImageFiles.value)
      if (!imageUrls) return
    }
    await addDoc(collection(db, 'cases'), { ...newCase.value, images: imageUrls })
    successMessage.value = '案例新增成功！'
    errorMessage.value = ''
    newCase.value = { title: '', description: '', images: [], details: '', location: '' }
    newImageFiles.value = []
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
    let imageUrls = editingCase.value.images
    if (editImageFiles.value.length > 0) {
      imageUrls = await uploadImages(editImageFiles.value)
      if (!imageUrls) return
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
    errorMessage.value = '更新失敗，請稍後再試'
    successMessage.value = ''
  }
}

const cancelEdit = () => {
  editingCase.value = null
  editImageFiles.value = []
}

// 刪除案例
const confirmDelete = (item, event) => {
  caseToDelete.value = item
  triggerButton.value = event.currentTarget // 儲存觸發按鈕
}

const deleteCase = async () => {
  if (!caseToDelete.value) return
  // 先移動焦點，避免模態框關閉時焦點滯留
  if (triggerButton.value) {
    triggerButton.value.focus()
  }
  try {
    // 1. 取得案例資料以獲取 images 陣列
    const docRef = doc(db, 'cases', caseToDelete.value.id)
    const docSnap = await getDoc(docRef)
    if (!docSnap.exists()) {
      errorMessage.value = '案例不存在'
      return
    }
    const caseData = docSnap.data()
    const images = caseData.images || []

    // 2. 刪除 Storage 中的圖片
    const deletePromises = images.map(async (imageUrl) => {
      try {
        const path = decodeURIComponent(imageUrl.split('/o/')[1].split('?')[0])
        const fileRef = storageRef(storage, path)
        await deleteObject(fileRef)
        console.log(`圖片 ${path} 已刪除`)
      } catch (error) {
        console.error(`刪除圖片 ${path} 失敗:`, error)
      }
    })
    await Promise.all(deletePromises)

    // 3. 刪除 Firestore 文件
    await deleteDoc(docRef)
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

// 監聽模態框事件
onMounted(() => {
  const modal = document.getElementById('deleteModal')
  if (modal) {
    // 模態框顯示時，將焦點設置到「刪除」按鈕
    modal.addEventListener('shown.bs.modal', () => {
      const deleteButton = modal.querySelector('.btn-danger')
      if (deleteButton) {
        deleteButton.focus()
      }
    })
    // 模態框隱藏時，恢復焦點到觸發按鈕
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
        <form @submit.prevent="addCase">
          <div class="mb-3">
            <label for="title" class="form-label">標題</label>
            <input v-model="newCase.title" type="text" class="form-control" id="title" required>
          </div>
           <div class="mb-3">
            <label for="image-files" class="form-label">上傳圖片（建議壓縮至500KB以下，可選多張）</label>
            <input type="file" class="form-control" id="image-files" accept="image/jpeg,image/png" multiple @change="newImageFiles = $event.target.files">
          </div>
          <div class="mb-3">
            <label for="image-url" class="form-label">或輸入圖片URL（以逗號分隔多個URL）</label>
            <input v-model="newCase.images" type="text" class="form-control" id="image-url" placeholder="例如：url1,url2">
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
            <label for="edit-image-files" class="form-label">上傳新圖片（建議壓縮至500KB以下，可選多張）</label>
            <input type="file" class="form-control" id="edit-image-files" accept="image/jpeg,image/png" multiple @change="editImageFiles = $event.target.files">
          </div>
          <div class="mb-3">
            <label for="edit-image-url" class="form-label">或輸入圖片URL（以逗號分隔多個URL）</label>
            <input v-model="editingCase.images" type="text" class="form-control" id="edit-image-url" placeholder="例如：url1,url2">
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
              <button class="btn btn-sm btn-outline-danger" @click="confirmDelete(item, $event)" data-bs-toggle="modal" data-bs-target="#deleteModal">刪除</button>
            </span>
          </li>
        </ul>
      </div>
    </div>
    <!-- 刪除確認模態框 -->
    <div class="modal fade" id="deleteModal" tabindex="-1" aria-labelledby="deleteModalLabel">
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
