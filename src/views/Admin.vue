<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { auth, db, storage } from '../firebase'
import { signOut, onAuthStateChanged } from 'firebase/auth'
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, orderBy, onSnapshot } from 'firebase/firestore'
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import Sortable from 'sortablejs'

// 簡單防抖函數
const debounce = (fn, delay) => {
  let timeoutId
  return (...args) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }
}

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
const caseSuccessMessage = ref('')
const caseErrorMessage = ref('')
const caseToDelete = ref(null)
const newImageFiles = ref([])
const editImageFiles = ref([])
const maxFileSize = 2 * 1024 * 1024 // 2MB
const triggerButton = ref(null)
const caseLoading = ref(false)

// 團隊管理
const teamMembers = ref([])
const newMember = ref({
  name: '',
  position: '',
  bio: '',
  photo: '',
  experiences: ['']
})
const editingMember = ref(null)
const memberToDelete = ref(null)
const newMemberPhoto = ref(null)
const photoPreview = ref('')
const memberSuccessMessage = ref('')
const memberErrorMessage = ref('')
const memberLoading = ref(false)
const isSorting = ref(false)

// 標籤頁狀態
const activeTab = ref('cases')

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
    caseErrorMessage.value = '載入案例失敗，請稍後再試'
  }
}
loadCases()

// 載入團隊成員
const loadTeam = () => {
  memberLoading.value = true
  const cachedData = localStorage.getItem('teamMembers')
  if (cachedData) {
    teamMembers.value = JSON.parse(cachedData)
    memberLoading.value = false
  }
  const q = query(collection(db, 'team'), orderBy('order', 'asc'))
  const unsubscribe = onSnapshot(q, (querySnapshot) => {
    if (isSorting.value) return
    teamMembers.value = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
    localStorage.setItem('teamMembers', JSON.stringify(teamMembers.value))
    memberErrorMessage.value = ''
    memberLoading.value = false
  }, (error) => {
    console.error('載入團隊失敗：', error)
    memberErrorMessage.value = `載入團隊失敗：${error.message}`
    memberLoading.value = false
  })
  return unsubscribe
}

let unsubscribe = null
onMounted(() => {
  unsubscribe = loadTeam()
})
onUnmounted(() => {
  if (unsubscribe) unsubscribe()
})

// 初始化拖曳排序
const initSortable = () => {
  const list = document.querySelector('#team-list')
  if (!list) return
  new Sortable(list, {
    animation: 150,
    handle: '.drag-handle',
    onEnd: async (evt) => {
      isSorting.value = true
      const originalMembers = [...teamMembers.value]
      const movedItem = teamMembers.value.splice(evt.oldIndex, 1)[0]
      teamMembers.value.splice(evt.newIndex, 0, movedItem)
      try {
        memberLoading.value = true
        const updates = teamMembers.value.map((member, index) => {
          const docRef = doc(db, 'team', member.id)
          return updateDoc(docRef, { order: index + 1 })
        })
        await Promise.all(updates)
        memberSuccessMessage.value = '團隊順序更新成功！'
        memberErrorMessage.value = ''
        localStorage.setItem('teamMembers', JSON.stringify(teamMembers.value))
      } catch (error) {
        console.error('更新順序失敗：', error)
        memberErrorMessage.value = `更新順序失敗：${error.message || '未知錯誤'}`
        teamMembers.value = originalMembers
        localStorage.setItem('teamMembers', JSON.stringify(teamMembers.value))
      } finally {
        memberLoading.value = false
        isSorting.value = false
      }
    }
  })
}

// 監聽標籤切換以初始化 Sortable
watch(activeTab, (newTab) => {
  if (newTab === 'members') {
    setTimeout(() => initSortable(), 0)
  }
  if (newMemberPhoto.value) {
    URL.revokeObjectURL(photoPreview.value)
    photoPreview.value = ''
    newMemberPhoto.value = null
  }
})

// 動態經歷管理
const addExperience = (target) => {
  target.experiences.push('')
}
const removeExperience = (target, index) => {
  target.experiences.splice(index, 1)
}

// 上傳單張成員照片
const uploadMemberPhoto = async (file) => {
  if (!file) return ''
  if (file.size > maxFileSize) {
    memberErrorMessage.value = `照片 ${file.name} 過大，請壓縮至2MB以下`
    return null
  }
  try {
    const storagePath = `member-photo/${Date.now()}_${file.name}`
    const fileRef = storageRef(storage, storagePath)
    await uploadBytes(fileRef, file)
    const url = await getDownloadURL(fileRef)
    return url
  } catch (error) {
    console.error(`照片上傳失敗（${file.name}）：`, error)
    memberErrorMessage.value = `照片上傳失敗：${error.message}`
    return null
  }
}

// 上傳多張案例圖片
const uploadImages = async (files) => {
  const urls = []
  for (const file of files) {
    if (file.size > maxFileSize) {
      caseErrorMessage.value = `圖片 ${file.name} 過大，請壓縮至2MB以下`
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
      caseErrorMessage.value = `圖片 ${file.name} 上傳失敗：${error.message}`
      return null
    }
  }
  return urls
}

// 刪除 Storage 照片
const deleteStoragePhoto = async (url) => {
  if (!url) return
  try {
    const filePath = decodeURIComponent(url.split('/o/')[1].split('?')[0])
    const fileRef = storageRef(storage, filePath)
    await deleteObject(fileRef)
  } catch (error) {
    console.warn(`照片刪除失敗（${url}）：`, error)
  }
}

// 新增案例
const addCase = async () => {
  caseLoading.value = true
  try {
    let imageUrls = newCase.value.images
    if (newImageFiles.value.length > 0) {
      imageUrls = await uploadImages(newImageFiles.value)
      if (!imageUrls) {
        caseLoading.value = false
        return
      }
    }
    await addDoc(collection(db, 'cases'), { ...newCase.value, images: imageUrls })
    caseSuccessMessage.value = '案例新增成功！'
    caseErrorMessage.value = ''
    newCase.value = { title: '', description: '', images: [], details: '', location: '' }
    newImageFiles.value = []
    loadCases()
  } catch (error) {
    console.error('新增案例失敗：', error)
    caseErrorMessage.value = `新增案例失敗：${error.message}`
    caseSuccessMessage.value = ''
  } finally {
    caseLoading.value = false
  }
}

// 編輯案例
const editCase = (item, event) => {
  editingCase.value = { ...item }
  editImageFiles.value = []
  triggerButton.value = event.currentTarget
  console.debug('editCase: triggerButton set to', triggerButton.value)
}

const updateCase = async () => {
  if (!editingCase.value) return
  caseLoading.value = true
  try {
    let imageUrls = editingCase.value.images
    if (editImageFiles.value.length > 0) {
      imageUrls = await uploadImages(editImageFiles.value)
      if (!imageUrls) {
        caseLoading.value = false
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
    caseSuccessMessage.value = '案例更新成功！'
    caseErrorMessage.value = ''
    editingCase.value = null
    editImageFiles.value = []
    loadCases()
  } catch (error) {
    console.error('更新案例失敗：', error)
    caseErrorMessage.value = `更新案例失敗：${error.message}`
    caseSuccessMessage.value = ''
  } finally {
    caseLoading.value = false
  }
}

const cancelEdit = () => {
  editingCase.value = null
  editImageFiles.value = []
  // 顯式還原焦點
  if (triggerButton.value) {
    console.debug('cancelEdit: Restoring focus to trigger button', triggerButton.value)
    triggerButton.value.focus()
  }
}

// 刪除案例
const confirmDelete = (item, event) => {
  caseToDelete.value = item
  triggerButton.value = event.currentTarget
  console.debug('confirmDelete: triggerButton set to', triggerButton.value)
}

const deleteCase = async () => {
  if (!caseToDelete.value) return
  caseLoading.value = true
  try {
    const docRef = doc(db, 'cases', caseToDelete.value.id)
    await deleteDoc(docRef)
    caseSuccessMessage.value = '案例刪除成功！'
    caseErrorMessage.value = ''
    caseToDelete.value = null
    loadCases()
  } catch (error) {
    console.error('刪除案例失敗：', error)
    caseErrorMessage.value = `刪除案例失敗：${error.message}`
    caseSuccessMessage.value = ''
  } finally {
    caseLoading.value = false
  }
}

// 新增團隊成員
const addMember = async () => {
  memberLoading.value = true
  try {
    let photoUrl = ''
    if (newMemberPhoto.value) {
      photoUrl = await uploadMemberPhoto(newMemberPhoto.value)
      if (!photoUrl) {
        memberLoading.value = false
        return
      }
    }
    const maxOrder = teamMembers.value.length
      ? Math.max(...teamMembers.value.map(m => m.order || 0))
      : 0
    const validExperiences = newMember.value.experiences.filter(exp => exp.trim() !== '')
    await addDoc(collection(db, 'team'), {
      ...newMember.value,
      photo: photoUrl,
      order: maxOrder + 1,
      experiences: validExperiences
    })
    memberSuccessMessage.value = '團隊成員新增成功！'
    memberErrorMessage.value = ''
    newMember.value = { name: '', position: '', bio: '', photo: '', experiences: [''] }
    newMemberPhoto.value = null
    photoPreview.value = ''
    loadTeam()
  } catch (error) {
    console.error('新增團隊成員失敗：', error)
    memberErrorMessage.value = `新增團隊成員失敗：${error.message}`
    memberSuccessMessage.value = ''
  } finally {
    memberLoading.value = false
  }
}

// 編輯團隊成員
const editMember = (member, event) => {
  editingMember.value = {
    ...member,
    experiences: member.experiences.length > 0 ? [...member.experiences] : ['']
  }
  photoPreview.value = member.photo || ''
  triggerButton.value = event.currentTarget
  console.debug('editMember: triggerButton set to', triggerButton.value)
}

const updateMember = async () => {
  if (!editingMember.value) return
  memberLoading.value = true
  try {
    let photoUrl = editingMember.value.photo
    const oldPhotoUrl = editingMember.value.photo
    if (newMemberPhoto.value) {
      photoUrl = await uploadMemberPhoto(newMemberPhoto.value)
      if (!photoUrl) {
        memberLoading.value = false
        return
      }
      if (oldPhotoUrl && oldPhotoUrl !== photoUrl) {
        await deleteStoragePhoto(oldPhotoUrl)
      }
    }
    const docRef = doc(db, 'team', editingMember.value.id)
    const validExperiences = editingMember.value.experiences.filter(exp => exp.trim() !== '')
    await updateDoc(docRef, {
      name: editingMember.value.name,
      position: editingMember.value.position,
      bio: editingMember.value.bio,
      photo: photoUrl,
      order: editingMember.value.order,
      experiences: validExperiences
    })
    memberSuccessMessage.value = '團隊成員更新成功！'
    memberErrorMessage.value = ''
    editingMember.value = null
    newMemberPhoto.value = null
    photoPreview.value = ''
    loadTeam()
  } catch (error) {
    console.error('更新團隊成員失敗：', error)
    memberErrorMessage.value = `更新團隊成員失敗：${error.message}`
    memberSuccessMessage.value = ''
  } finally {
    memberLoading.value = false
  }
}

const cancelMemberEdit = () => {
  editingMember.value = null
  newMemberPhoto.value = null
  photoPreview.value = ''
  // 顯式還原焦點
  if (triggerButton.value) {
    console.debug('cancelMemberEdit: Restoring focus to trigger button', triggerButton.value)
    triggerButton.value.focus()
  }
}

// 刪除團隊成員
const confirmDeleteMember = (member, event) => {
  memberToDelete.value = member
  triggerButton.value = event.currentTarget
  console.debug('confirmDeleteMember: triggerButton set to', triggerButton.value)
}

const deleteMember = async () => {
  if (!memberToDelete.value) return
  memberLoading.value = true
  try {
    if (memberToDelete.value.photo) {
      await deleteStoragePhoto(memberToDelete.value.photo)
    }
    const docRef = doc(db, 'team', memberToDelete.value.id)
    await deleteDoc(docRef)
    memberSuccessMessage.value = '團隊成員刪除成功！'
    memberErrorMessage.value = ''
    memberToDelete.value = null
    loadTeam()
  } catch (error) {
    console.error('刪除團隊成員失敗：', error)
    memberErrorMessage.value = `刪除團隊成員失敗：${error.message}`
    memberSuccessMessage.value = ''
  } finally {
    memberLoading.value = false
  }
}

// 登出
const logout = async () => {
  try {
    await signOut(auth)
    router.push('/login')
  } catch (error) {
    console.error('登出失敗：', error)
    caseErrorMessage.value = '登出失敗，請稍後再試'
  }
}

// 照片預覽
const handlePhotoChange = (event) => {
  newMemberPhoto.value = event.target.files[0]
  if (newMemberPhoto.value) {
    photoPreview.value = URL.createObjectURL(newMemberPhoto.value)
  } else {
    photoPreview.value = editingMember.value?.photo || ''
  }
}

// 模態框事件
onMounted(() => {
  const modals = ['deleteModal', 'deleteMemberModal', 'editCaseModal', 'editMemberModal']
  modals.forEach(id => {
    const modal = document.getElementById(id)
    if (modal) {
      modal.addEventListener('shown.bs.modal', () => {
        const primaryButton = modal.querySelector('.btn-primary')
        if (primaryButton) {
          primaryButton.focus()
          console.debug(`Modal ${id}: Focused on primary button`, primaryButton)
        } else {
          const deleteButton = modal.querySelector('.btn-danger')
          if (deleteButton) {
            deleteButton.focus()
            console.debug(`Modal ${id}: Focused on delete button`, deleteButton)
          }
        }
      })
      modal.addEventListener('hide.bs.modal', debounce(() => {
        // 在模態框開始關閉時，移除內部焦點
        const activeElement = document.activeElement
        if (modal.contains(activeElement)) {
          console.debug(`Modal ${id}: Active element inside modal`, activeElement)
          if (triggerButton.value) {
            console.debug(`Modal ${id}: Moving focus to trigger button`, triggerButton.value)
            triggerButton.value.focus()
          } else {
            const header = document.querySelector('h1')
            if (header) {
              header.setAttribute('tabindex', '-1')
              header.focus()
              console.debug(`Modal ${id}: Moving focus to header`, header)
            }
          }
        }
      }, 100))
      modal.addEventListener('hidden.bs.modal', debounce(() => {
        // 確認焦點已移出模態框
        const activeElement = document.activeElement
        if (modal.contains(activeElement)) {
          console.warn(`Modal ${id}: Focus still inside modal after hide`, activeElement)
          const header = document.querySelector('h1')
          if (header) {
            header.setAttribute('tabindex', '-1')
            header.focus()
            console.debug(`Modal ${id}: Forcing focus to header`, header)
          }
        }
        // 延遲還原焦點，確保動畫完成
        setTimeout(() => {
          if (triggerButton.value) {
            console.debug(`Modal ${id}: Restoring focus to trigger button`, triggerButton.value)
            triggerButton.value.focus()
          } else {
            const logoutButton = document.querySelector('[data-testid="logout-button"]')
            if (logoutButton) {
              console.debug(`Modal ${id}: Falling back to logout button`, logoutButton)
              logoutButton.focus()
            } else {
              const header = document.querySelector('h1')
              if (header) {
                header.setAttribute('tabindex', '-1')
                header.focus()
                console.debug(`Modal ${id}: Falling back to header`, header)
              } else {
                console.warn(`Modal ${id}: No trigger button or fallback found for focus restoration`)
              }
            }
          }
          // 禁用模態框內按鈕的焦點
          const buttons = modal.querySelectorAll('button')
          buttons.forEach(btn => btn.setAttribute('tabindex', '-1'))
        }, 300)
        // 清理照片預覽和其他狀態
        if (newMemberPhoto.value) {
          URL.revokeObjectURL(photoPreview.value)
          photoPreview.value = ''
          newMemberPhoto.value = null
        }
        editingCase.value = null
        editingMember.value = null
        triggerButton.value = null
      }, 100))
    }
  })
})

onUnmounted(() => {
  const modals = ['deleteModal', 'deleteMemberModal', 'editCaseModal', 'editMemberModal']
  modals.forEach(id => {
    const modal = document.getElementById(id)
    if (modal) {
      modal.removeEventListener('shown.bs.modal', () => {})
      modal.removeEventListener('hide.bs.modal', () => {})
      modal.removeEventListener('hidden.bs.modal', () => {})
    }
  })
})
</script>

<template>
  <div class="container mt-5">
    <h1 class="text-center mb-4">管理後台</h1>
    <div class="text-center mb-4">
      <button class="btn btn-primary" data-testid="logout-button" @click="logout">登出</button>
    </div>

    <!-- 標籤頁導航 -->
    <ul class="nav nav-tabs mb-4" role="tablist">
      <li class="nav-item" role="presentation">
        <button class="nav-link" :class="{ active: activeTab === 'cases' }" @click="activeTab = 'cases'" role="tab" aria-selected="true" id="cases-tab" aria-controls="cases">案例管理</button>
      </li>
      <li class="nav-item" role="presentation">
        <button class="nav-link" :class="{ active: activeTab === 'members' }" @click="activeTab = 'members'" role="tab" aria-selected="false" id="members-tab" aria-controls="members">成員管理</button>
      </li>
    </ul>

    <!-- 案例管理 -->
    <div v-show="activeTab === 'cases'" id="cases" role="tabpanel" aria-labelledby="cases-tab">
      <!-- 新增案例表單 -->
      <div class="card shadow-sm mb-4">
        <div class="card-body">
          <h2 class="h4 mb-3">新增案例</h2>
          <form @submit.prevent="addCase" :class="{ 'loading-form': caseLoading }">
            <div class="mb-3">
              <label for="title" class="form-label">標題</label>
              <input v-model="newCase.title" type="text" class="form-control" id="title" required :disabled="caseLoading">
            </div>
            <div class="mb-3">
              <label for="image-files" class="form-label">上傳圖片（建議壓縮至500KB以下，可選多張）</label>
              <input type="file" class="form-control" id="image-files" accept="image/jpeg,image/png" multiple @change="newImageFiles = $event.target.files" :disabled="caseLoading" aria-label="上傳案例圖片">
            </div>
            <div class="mb-3">
              <label for="image-url" class="form-label">或輸入圖片URL（以逗號分隔多個URL）</label>
              <input v-model="newCase.images" type="text" class="form-control" id="image-url" placeholder="例如：url1,url2" :disabled="caseLoading">
            </div>
            <div class="mb-3">
              <label for="details" class="form-label">詳細說明</label>
              <textarea v-model="newCase.details" class="form-control" id="details" rows="4" required :disabled="caseLoading"></textarea>
            </div>
            <div class="mb-3">
              <label for="location" class="form-label">地點</label>
              <input v-model="newCase.location" type="text" class="form-control" id="location" required :disabled="caseLoading">
            </div>
            <div v-if="caseSuccessMessage" class="alert alert-success" role="alert">
              {{ caseSuccessMessage }}
            </div>
            <div v-if="caseErrorMessage" class="alert alert-danger" role="alert">
              {{ caseErrorMessage }}
            </div>
            <div class="text-center">
              <button type="submit" class="btn btn-primary" :disabled="caseLoading">
                <span v-if="caseLoading" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                {{ caseLoading ? '新增中...' : '新增案例' }}
              </button>
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
                <button class="btn btn-sm btn-outline-success me-2" @click="editCase(item, $event)" data-bs-toggle="modal" data-bs-target="#editCaseModal">編輯</button>
                <button class="btn btn-sm btn-outline-danger" @click="confirmDelete(item, $event)" data-bs-toggle="modal" data-bs-target="#deleteModal">刪除</button>
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <!-- 成員管理 -->
    <div v-show="activeTab === 'members'" id="members" role="tabpanel" aria-labelledby="members-tab">
      <!-- 新增成員表單 -->
      <div class="card shadow-sm mb-4">
        <div class="card-body">
          <h2 class="h4 mb-3">新增團隊成員</h2>
          <form @submit.prevent="addMember" :class="{ 'loading-form': memberLoading }">
            <div class="mb-3">
              <label for="member-name" class="form-label">姓名</label>
              <input v-model="newMember.name" type="text" class="form-control" id="member-name" required :disabled="memberLoading">
            </div>
            <div class="mb-3">
              <label for="member-position" class="form-label">職位</label>
              <input v-model="newMember.position" type="text" class="form-control" id="member-position" required :disabled="memberLoading">
            </div>
            <div class="mb-3">
              <label for="member-bio" class="form-label">簡介</label>
              <textarea v-model="newMember.bio" class="form-control" id="member-bio" rows="4" required :disabled="memberLoading"></textarea>
            </div>
            <div class="mb-3">
              <label for="member-photo" class="form-label">頭像（建議壓縮至500KB以下）</label>
              <input type="file" class="form-control" id="member-photo" accept="image/jpeg,image/png" @change="handlePhotoChange" :disabled="memberLoading" aria-label="上傳成員頭像">
              <img v-if="photoPreview" :src="photoPreview" alt="頭像預覽" class="img-fluid mt-2" style="max-width: 150px; max-height: 150px;">
            </div>
            <div class="mb-3">
              <label class="form-label">相關經歷</label>
              <div v-for="(exp, index) in newMember.experiences" :key="index" class="input-group mb-2">
                <textarea v-model="newMember.experiences[index]" class="form-control" :id="`member-exp-${index}`" rows="2" placeholder="例如：2010-2015 ABC 公司，專案經理" :disabled="memberLoading"></textarea>
                <button type="button" class="btn btn-outline-danger" @click="removeExperience(newMember, index)" :disabled="memberLoading || newMember.experiences.length === 1">−</button>
              </div>
              <button type="button" class="btn btn-outline-primary" @click="addExperience(newMember)" :disabled="memberLoading">+ 新增經歷</button>
            </div>
            <div v-if="memberSuccessMessage" class="alert alert-success" role="alert">
              {{ memberSuccessMessage }}
            </div>
            <div v-if="memberErrorMessage" class="alert alert-danger" role="alert">
              {{ memberErrorMessage }}
            </div>
            <div class="text-center">
              <button type="submit" class="btn btn-primary" :disabled="memberLoading">
                <span v-if="memberLoading" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                {{ memberLoading ? '新增中...' : '新增成員' }}
              </button>
            </div>
          </form>
        </div>
      </div>
      <!-- 成員列表 -->
      <div class="card shadow-sm">
        <div class="card-body">
          <h2 class="h4 mb-3">現有團隊成員</h2>
          <ul class="list-group" id="team-list">
            <li class="list-group-item d-flex justify-content-between align-items-center" v-for="member in teamMembers" :key="member.id">
              <span class="drag-handle me-3" style="cursor: move;">☰</span>
              {{ member.name }} ({{ member.position }})
              <span>
                <button class="btn btn-sm btn-outline-success me-2" @click="editMember(member, $event)" data-bs-toggle="modal" data-bs-target="#editMemberModal">編輯</button>
                <button class="btn btn-sm btn-outline-danger" @click="confirmDeleteMember(member, $event)" data-bs-toggle="modal" data-bs-target="#deleteMemberModal">刪除</button>
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <!-- 編輯案例模態框 -->
    <div class="modal fade" id="editCaseModal" tabindex="-1" aria-labelledby="editCaseModalLabel" aria-describedby="editCaseModalDesc" aria-modal="true" role="dialog">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="editCaseModalLabel">編輯案例</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="關閉"></button>
          </div>
          <div class="modal-body" id="editCaseModalDesc" v-if="editingCase">
            <form @submit.prevent="updateCase" :class="{ 'loading-form': caseLoading }">
              <div class="mb-3">
                <label for="edit-title" class="form-label">標題</label>
                <input v-model="editingCase.title" type="text" class="form-control" id="edit-title" required :disabled="caseLoading">
              </div>
              <div class="mb-3">
                <label for="edit-description" class="form-label">描述</label>
                <textarea v-model="editingCase.description" class="form-control" id="edit-description" rows="3" required :disabled="caseLoading"></textarea>
              </div>
              <div class="mb-3">
                <label for="edit-image-files" class="form-label">上傳新圖片（建議壓縮至500KB以下，可選多張）</label>
                <input type="file" class="form-control" id="edit-image-files" accept="image/jpeg,image/png" multiple @change="editImageFiles = $event.target.files" :disabled="caseLoading" aria-label="上傳新案例圖片">
              </div>
              <div class="mb-3">
                <label for="edit-image-url" class="form-label">或輸入圖片URL（以逗號分隔多個URL）</label>
                <input v-model="editingCase.images" type="text" class="form-control" id="edit-image-url" placeholder="例如：url1,url2" :disabled="caseLoading">
              </div>
              <div class="mb-3">
                <label for="edit-details" class="form-label">詳細說明</label>
                <textarea v-model="editingCase.details" class="form-control" id="edit-details" rows="4" required :disabled="caseLoading"></textarea>
              </div>
              <div class="mb-3">
                <label for="edit-location" class="form-label">地點</label>
                <input v-model="editingCase.location" type="text" class="form-control" id="edit-location" required :disabled="caseLoading">
              </div>
              <div v-if="caseSuccessMessage" class="alert alert-success" role="alert">
                {{ caseSuccessMessage }}
              </div>
              <div v-if="caseErrorMessage" class="alert alert-danger" role="alert">
                {{ caseErrorMessage }}
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal" :disabled="caseLoading" @click="cancelEdit">取消</button>
            <button type="button" class="btn btn-primary" @click="updateCase" data-bs-dismiss="modal" :disabled="caseLoading">
              <span v-if="caseLoading" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              {{ caseLoading ? '更新中...' : '更新案例' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 編輯成員模態框 -->
    <div class="modal fade" id="editMemberModal" tabindex="-1" aria-labelledby="editMemberModalLabel" aria-describedby="editMemberModalDesc" aria-modal="true" role="dialog">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="editMemberModalLabel">編輯團隊成員</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="關閉"></button>
          </div>
          <div class="modal-body" id="editMemberModalDesc" v-if="editingMember">
            <form @submit.prevent="updateMember" :class="{ 'loading-form': memberLoading }">
              <div class="mb-3">
                <label for="edit-member-name" class="form-label">姓名</label>
                <input v-model="editingMember.name" type="text" class="form-control" id="edit-member-name" required :disabled="memberLoading">
              </div>
              <div class="mb-3">
                <label for="edit-member-position" class="form-label">職位</label>
                <input v-model="editingMember.position" type="text" class="form-control" id="edit-member-position" required :disabled="memberLoading">
              </div>
              <div class="mb-3">
                <label for="edit-member-bio" class="form-label">簡介</label>
                <textarea v-model="editingMember.bio" class="form-control" id="edit-member-bio" rows="4" required :disabled="memberLoading"></textarea>
              </div>
              <div class="mb-3">
                <label for="edit-member-photo" class="form-label">頭像（建議壓縮至500KB以下）</label>
                <input type="file" class="form-control" id="edit-member-photo" accept="image/jpeg,image/png" @change="handlePhotoChange" :disabled="memberLoading" aria-label="上傳新成員頭像">
                <img v-if="photoPreview" :src="photoPreview" alt="頭像預覽" class="img-fluid mt-2" style="max-width: 150px; max-height: 150px;">
              </div>
              <div class="mb-3">
                <label class="form-label">相關經歷</label>
                <div v-for="(exp, index) in editingMember.experiences" :key="index" class="input-group mb-2">
                  <textarea v-model="editingMember.experiences[index]" class="form-control" :id="`edit-member-exp-${index}`" rows="2" placeholder="例如：2010-2015 ABC 公司，專案經理" :disabled="memberLoading"></textarea>
                  <button type="button" class="btn btn-outline-danger" @click="removeExperience(editingMember, index)" :disabled="memberLoading || editingMember.experiences.length === 1">−</button>
                </div>
                <button type="button" class="btn btn-outline-primary" @click="addExperience(editingMember)" :disabled="memberLoading">+ 新增經歷</button>
              </div>
              <div v-if="memberSuccessMessage" class="alert alert-success" role="alert">
                {{ memberSuccessMessage }}
              </div>
              <div v-if="memberErrorMessage" class="alert alert-danger" role="alert">
                {{ memberErrorMessage }}
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal" :disabled="memberLoading" @click="cancelMemberEdit">取消</button>
            <button type="button" class="btn btn-primary" @click="updateMember" data-bs-dismiss="modal" :disabled="memberLoading">
              <span v-if="memberLoading" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              {{ memberLoading ? '更新中...' : '更新成員' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 刪除確認模態框 -->
    <div class="modal fade" id="deleteModal" tabindex="-1" aria-labelledby="deleteModalLabel" aria-describedby="deleteModalDesc" aria-modal="true" role="dialog">
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
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal" :disabled="caseLoading">取消</button>
            <button type="button" class="btn btn-danger" @click="deleteCase" data-bs-dismiss="modal" :disabled="caseLoading">
              <span v-if="caseLoading" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              {{ caseLoading ? '刪除中...' : '刪除' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 刪除成員模態框 -->
    <div class="modal fade" id="deleteMemberModal" tabindex="-1" aria-labelledby="deleteMemberModalLabel" aria-describedby="deleteMemberModalDesc" aria-modal="true" role="dialog">
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
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal" :disabled="memberLoading">取消</button>
            <button type="button" class="btn btn-danger" @click="deleteMember" data-bs-dismiss="modal" :disabled="memberLoading">
              <span v-if="memberLoading" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              {{ memberLoading ? '刪除中...' : '刪除' }}
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
.nav-tabs { border-bottom: 2px solid #dee2e6; }
.nav-tabs .nav-link { color: #495057; font-weight: 500; }
.nav-tabs .nav-link.active { color: #007bff; border-color: #007bff; }
.loading-form { opacity: 0.7; pointer-events: none; }
.spinner-border { vertical-align: middle; }

@media (max-width: 576px) {
  .card-body { padding: 1rem; }
  .form-label { font-size: 0.9rem; }
  .modal-lg { max-width: 90%; }
}
</style>
