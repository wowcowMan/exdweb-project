<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { auth, db, storage } from '../firebase'
import { signOut, onAuthStateChanged } from 'firebase/auth'
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore'
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'
import Sortable from 'sortablejs'

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

// 團隊管理
const teamMembers = ref([])
const newMember = ref({
  name: '',
  position: '',
  bio: '',
  photo: '',
  experiences: [''] // 初始一個空經歷
})
const editingMember = ref(null)
const memberToDelete = ref(null)
const newMemberPhoto = ref(null)

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

// 載入團隊成員，按 order 排序
const loadTeam = async () => {
  try {
    const q = query(collection(db, 'team'), orderBy('order', 'asc'))
    const querySnapshot = await getDocs(q)
    teamMembers.value = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  } catch (error) {
    console.error('載入團隊失敗：', error)
    errorMessage.value = '載入團隊失敗，請稍後再試'
  }
}
loadTeam()

// 初始化拖曳排序
const initSortable = () => {
  const list = document.querySelector('#team-list')
  if (list) {
    new Sortable(list, {
      animation: 150,
      onEnd: async (evt) => {
        const movedItem = teamMembers.value.splice(evt.oldIndex, 1)[0]
        teamMembers.value.splice(evt.newIndex, 0, movedItem)
        // 更新 Firestore 中的 order
        try {
          isLoading.value = true
          for (let i = 0; i < teamMembers.value.length; i++) {
            const member = teamMembers.value[i]
            const docRef = doc(db, 'team', member.id)
            await updateDoc(docRef, { order: i + 1 })
          }
          successMessage.value = '團隊順序更新成功！'
          errorMessage.value = ''
        } catch (error) {
          console.error('更新順序失敗：', error)
          errorMessage.value = '更新順序失敗，請稍後再試'
          loadTeam() // 恢復原始順序
        } finally {
          isLoading.value = false
        }
      }
    })
  }
}
onMounted(() => {
  initSortable()
})

// 動態經歷管理
const addExperience = (target) => {
  target.experiences.push('')
}
const removeExperience = (target, index) => {
  target.experiences.splice(index, 1)
}

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

// 新增團隊成員
const addMember = async () => {
  isLoading.value = true
  try {
    let photoUrl = ''
    if (newMemberPhoto.value) {
      const urls = await uploadImages([newMemberPhoto.value])
      if (!urls) {
        isLoading.value = false
        return
      }
      photoUrl = urls[0]
    }
    const maxOrder = teamMembers.value.length
      ? Math.max(...teamMembers.value.map(m => m.order || 0))
      : 0
    // 過濾空經歷
    const validExperiences = newMember.value.experiences.filter(exp => exp.trim() !== '')
    await addDoc(collection(db, 'team'), {
      ...newMember.value,
      photo: photoUrl,
      order: maxOrder + 1,
      experiences: validExperiences
    })
    successMessage.value = '團隊成員新增成功！'
    errorMessage.value = ''
    newMember.value = { name: '', position: '', bio: '', photo: '', experiences: [''] }
    newMemberPhoto.value = null
    loadTeam()
  } catch (error) {
    console.error('新增團隊成員失敗：', error)
    errorMessage.value = `新增團隊成員失敗：${error.message}`
    successMessage.value = ''
  } finally {
    isLoading.value = false
  }
}

// 編輯團隊成員
const editMember = (member) => {
  editingMember.value = {
    ...member,
    experiences: member.experiences.length > 0 ? [...member.experiences] : [''] // 至少一個輸入框
  }
}

const updateMember = async () => {
  if (!editingMember.value) return
  isLoading.value = true
  try {
    let photoUrl = editingMember.value.photo
    if (newMemberPhoto.value) {
      const urls = await uploadImages([newMemberPhoto.value])
      if (!urls) {
        isLoading.value = false
        return
      }
      photoUrl = urls[0]
    }
    const docRef = doc(db, 'team', editingMember.value.id)
    // 過濾空經歷
    const validExperiences = editingMember.value.experiences.filter(exp => exp.trim() !== '')
    await updateDoc(docRef, {
      name: editingMember.value.name,
      position: editingMember.value.position,
      bio: editingMember.value.bio,
      photo: photoUrl,
      order: editingMember.value.order,
      experiences: validExperiences
    })
    successMessage.value = '團隊成員更新成功！'
    errorMessage.value = ''
    editingMember.value = null
    newMemberPhoto.value = null
    loadTeam()
  } catch (error) {
    console.error('更新團隊成員失敗：', error)
    errorMessage.value = `更新團隊成員失敗：${error.message}`
    successMessage.value = ''
  } finally {
    isLoading.value = false
  }
}

const cancelMemberEdit = () => {
  editingMember.value = null
  newMemberPhoto.value = null
}

// 刪除團隊成員
const confirmDeleteMember = (member, event) => {
  memberToDelete.value = member
  triggerButton.value = event.currentTarget
}

const deleteMember = async () => {
  if (!memberToDelete.value) return
  isLoading.value = true
  if (triggerButton.value) {
    triggerButton.value.focus()
  }
  try {
    const docRef = doc(db, 'team', memberToDelete.value.id)
    await deleteDoc(docRef)
    successMessage.value = '團隊成員刪除成功！'
    errorMessage.value = ''
    memberToDelete.value = null
    loadTeam()
  } catch (error) {
    console.error('刪除團隊成員失敗：', error)
    errorMessage.value = `刪除團隊成員失敗：${error.message}`
    successMessage.value = ''
  } finally {
    isLoading.value = false
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
  const memberModal = document.getElementById('deleteMemberModal')
  if (modal) {
    modal.addEventListener('shown.bs.modal', () => {
      const deleteButton = modal.querySelector('.btn-danger')
      if (deleteButton) deleteButton.focus()
    })
    modal.addEventListener('hidden.bs.modal', () => {
      if (triggerButton.value) triggerButton.value.focus()
    })
  }
  if (memberModal) {
    memberModal.addEventListener('shown.bs.modal', () => {
      const deleteButton = memberModal.querySelector('.btn-danger')
      if (deleteButton) deleteButton.focus()
    })
    memberModal.addEventListener('hidden.bs.modal', () => {
      if (triggerButton.value) triggerButton.value.focus()
    })
  }
})

onUnmounted(() => {
  const modal = document.getElementById('deleteModal')
  const memberModal = document.getElementById('deleteMemberModal')
  if (modal) {
    modal.removeEventListener('shown.bs.modal', () => {})
    modal.removeEventListener('hidden.bs.modal', () => {})
  }
  if (memberModal) {
    memberModal.removeEventListener('shown.bs.modal', () => {})
    memberModal.removeEventListener('hidden.bs.modal', () => {})
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

    <!-- 新增團隊成員表單 -->
    <div class="card shadow-sm mb-4">
      <div class="card-body">
        <h2 class="h4 mb-3">新增團隊成員</h2>
        <form @submit.prevent="addMember" :class="{ 'loading-form': isLoading }">
          <div class="mb-3">
            <label for="member-name" class="form-label">姓名</label>
            <input v-model="newMember.name" type="text" class="form-control" id="member-name" required :disabled="isLoading">
          </div>
          <div class="mb-3">
            <label for="member-position" class="form-label">職位</label>
            <input v-model="newMember.position" type="text" class="form-control" id="member-position" required :disabled="isLoading">
          </div>
          <div class="mb-3">
            <label for="member-bio" class="form-label">簡介</label>
            <textarea v-model="newMember.bio" class="form-control" id="member-bio" rows="4" required :disabled="isLoading"></textarea>
          </div>
          <div class="mb-3">
            <label for="member-photo" class="form-label">頭像（建議壓縮至500KB以下）</label>
            <input type="file" class="form-control" id="member-photo" accept="image/jpeg,image/png" @change="newMemberPhoto = $event.target.files[0]" :disabled="isLoading">
          </div>
          <div class="mb-3">
            <label class="form-label">相關經歷</label>
            <div v-for="(exp, index) in newMember.experiences" :key="index" class="input-group mb-2">
              <textarea v-model="newMember.experiences[index]" class="form-control" :id="`member-exp-${index}`" rows="2" placeholder="例如：2010-2015 ABC 公司，專案經理" :disabled="isLoading"></textarea>
              <button type="button" class="btn btn-outline-danger" @click="removeExperience(newMember, index)" :disabled="isLoading || newMember.experiences.length === 1">−</button>
            </div>
            <button type="button" class="btn btn-outline-primary" @click="addExperience(newMember)" :disabled="isLoading">+ 新增經歷</button>
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
              {{ isLoading ? '新增中...' : '新增成員' }}
            </button>
          </div>
        </form>
      </div>
    </div>
    
    <!-- 編輯團隊成員表單 -->
    <div v-if="editingMember" class="card shadow-sm mb-4">
      <div class="card-body">
        <h2 class="h4 mb-3">編輯團隊成員</h2>
        <form @submit.prevent="updateMember" :class="{ 'loading-form': isLoading }">
          <div class="mb-3">
            <label for="edit-member-name" class="form-label">姓名</label>
            <input v-model="editingMember.name" type="text" class="form-control" id="edit-member-name" required :disabled="isLoading">
          </div>
          <div class="mb-3">
            <label for="edit-member-position" class="form-label">職位</label>
            <input v-model="editingMember.position" type="text" class="form-control" id="edit-member-position" required :disabled="isLoading">
          </div>
          <div class="mb-3">
            <label for="edit-member-bio" class="form-label">簡介</label>
            <textarea v-model="editingMember.bio" class="form-control" id="edit-member-bio" rows="4" required :disabled="isLoading"></textarea>
          </div>
          <div class="mb-3">
            <label for="edit-member-photo" class="form-label">頭像（建議壓縮至500KB以下）</label>
            <input type="file" class="form-control" id="edit-member-photo" accept="image/jpeg,image/png" @change="newMemberPhoto = $event.target.files[0]" :disabled="isLoading">
          </div>
          <div class="mb-3">
            <label class="form-label">相關經歷</label>
            <div v-for="(exp, index) in editingMember.experiences" :key="index" class="input-group mb-2">
              <textarea v-model="editingMember.experiences[index]" class="form-control" :id="`edit-member-exp-${index}`" rows="2" placeholder="例如：2010-2015 ABC 公司，專案經理" :disabled="isLoading"></textarea>
              <button type="button" class="btn btn-outline-danger" @click="removeExperience(editingMember, index)" :disabled="isLoading || editingMember.experiences.length === 1">−</button>
            </div>
            <button type="button" class="btn btn-outline-primary" @click="addExperience(editingMember)" :disabled="isLoading">+ 新增經歷</button>
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
              {{ isLoading ? '更新中...' : '更新成員' }}
            </button>
            <button type="button" class="btn btn-secondary" @click="cancelMemberEdit" :disabled="isLoading">取消</button>
          </div>
        </form>
      </div>
    </div>
    
    <!-- 團隊成員列表 -->
    <div class="card shadow-sm mb-4">
      <div class="card-body">
        <h2 class="h4 mb-3">現有團隊成員</h2>
        <div v-if="successMessage" class="alert alert-success" role="alert">
          {{ successMessage }}
        </div>
        <div v-if="errorMessage" class="alert alert-danger" role="alert">
          {{ errorMessage }}
        </div>
        <ul class="list-group" id="team-list">
          <li class="list-group-item d-flex justify-content-between align-items-center" v-for="member in teamMembers" :key="member.id">
            <span class="drag-handle me-3" style="cursor: move;">☰</span>
            {{ member.name }} ({{ member.position }})
            <span>
              <button class="btn btn-sm btn-outline-success me-2" @click="editMember(member)">編輯</button>
              <button class="btn btn-sm btn-outline-danger" @click="confirmDeleteMember(member, $event)" data-bs-toggle="modal" data-bs-target="#deleteMemberModal">刪除</button>
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
    <!-- 刪除團隊成員模態框 -->
    <div class="modal fade" id="deleteMemberModal" tabindex="-1" aria-labelledby="deleteMemberModalLabel" aria-describedby="deleteMemberModalDesc">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="deleteMemberModalLabel">確認刪除</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="關閉"></button>
          </div>
          <div class="modal-body" id="deleteMemberModalDesc">
            你確定要刪除團隊成員「{{ memberToDelete?.name }}」嗎？此操作無法恢復。
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal" :disabled="isLoading">取消</button>
            <button type="button" class="btn btn-danger" @click="deleteMember" data-bs-dismiss="modal" :disabled="isLoading">
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
