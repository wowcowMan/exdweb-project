```vue
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

// 條件性日誌
const debug = (...args) => {
  if (process.env.NODE_ENV === 'development') {
    console.debug(...args)
  }
}

const router = useRouter()
const activeTab = ref('cases')
const triggerButton = ref(null)

// 狀態管理
const caseItems = ref([])
const caseNewItem = ref({ title: '', description: '', images: [], details: '', location: '' })
const caseEditing = ref(null)
const caseToDelete = ref(null)
const caseImageFiles = ref([])
const caseEditImageFiles = ref([])
const caseLoading = ref(false)
const caseSuccess = ref('')
const caseError = ref('')

const memberItems = ref([])
const memberNewItem = ref({ name: '', position: '', bio: '', photo: '', experiences: [''] })
const memberEditing = ref(null)
const memberToDelete = ref(null)
const memberPhoto = ref(null)
const memberPhotoPreview = ref('')
const memberLoading = ref(false)
const memberSuccess = ref('')
const memberError = ref('')
const isSorting = ref(false)

// Banner 狀態
const bannerItems = ref([])
const bannerNewItem = ref({ title: '', image: '' })
const bannerToDelete = ref(null)
const bannerPhoto = ref(null)
const bannerPhotoPreview = ref('')
const bannerLoading = ref(false)
const bannerSuccess = ref('')
const bannerError = ref('')

// Firebase 操作
const maxFileSize = 2 * 1024 * 1024 // 2MB

const uploadImages = async (files, pathPrefix) => {
  const urls = []
  for (const file of files) {
    if (file.size > maxFileSize) {
      caseError.value = `檔案 ${file.name} 過大，請壓縮至2MB以下`
      return null
    }
    try {
      const storagePath = `${pathPrefix}/${Date.now()}_${file.name}`
      const fileRef = storageRef(storage, storagePath)
      await uploadBytes(fileRef, file)
      const url = await getDownloadURL(fileRef)
      urls.push(url)
    } catch (error) {
      caseError.value = `檔案上傳失敗：${error.message}`
      return null
    }
  }
  return urls
}

const uploadMemberPhoto = async (file, pathPrefix) => {
  if (!file) return ''
  if (file.size > maxFileSize) {
    memberError.value = `檔案 ${file.name} 過大，請壓縮至2MB以下`
    return null
  }
  try {
    const storagePath = `${pathPrefix}/${Date.now()}_${file.name}`
    const fileRef = storageRef(storage, storagePath)
    await uploadBytes(fileRef, file)
    return await getDownloadURL(fileRef)
  } catch (error) {
    memberError.value = `檔案上傳失敗：${error.message}`
    return null
  }
}

const uploadBannerPhoto = async (file, pathPrefix) => {
  if (!file) return ''
  if (file.size > maxFileSize) {
    bannerError.value = `檔案 ${file.name} 過大，請壓縮至2MB以下`
    return null
  }
  try {
    const storagePath = `${pathPrefix}/${Date.now()}_${file.name}`
    const fileRef = storageRef(storage, storagePath)
    await uploadBytes(fileRef, file)
    return await getDownloadURL(fileRef)
  } catch (error) {
    bannerError.value = `檔案上傳失敗：${error.message}`
    return null
  }
}

const deleteFile = async (url) => {
  if (!url) return
  try {
    const filePath = decodeURIComponent(url.split('/o/')[1].split('?')[0])
    const fileRef = storageRef(storage, filePath)
    await deleteObject(fileRef)
  } catch (error) {
    console.warn(`檔案刪除失敗（${url}）：`, error)
  }
}

// 案例操作
const loadCases = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'cases'))
    caseItems.value = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      images: doc.data().images || []
    }))
  } catch (error) {
    caseError.value = '載入案例失敗，請稍後再試'
  }
}
loadCases()

const addCase = async () => {
  let imageUrls = caseNewItem.value.images
  if (caseImageFiles.value.length > 0) {
    imageUrls = await uploadImages(caseImageFiles.value, 'cases')
    if (!imageUrls) return
  }
  caseLoading.value = true
  try {
    await addDoc(collection(db, 'cases'), { ...caseNewItem.value, images: imageUrls })
    caseSuccess.value = '新增成功！'
    caseError.value = ''
    caseNewItem.value = { title: '', description: '', images: [], details: '', location: '' }
    caseImageFiles.value = []
    loadCases()
  } catch (error) {
    caseError.value = `新增失敗：${error.message}`
  } finally {
    caseLoading.value = false
  }
}

const editCase = (item, event) => {
  caseEditing.value = { ...item }
  caseEditImageFiles.value = []
  triggerButton.value = event.currentTarget
  debug('editCase: triggerButton set to', triggerButton.value)
}

const updateCase = async () => {
  if (!caseEditing.value) return
  let imageUrls = Array.isArray(caseEditing.value.images) ? caseEditing.value.images : []
  if (caseEditImageFiles.value.length > 0) {
    imageUrls = await uploadImages(caseEditImageFiles.value, 'cases')
    if (!imageUrls) return
  }
  caseLoading.value = true
  try {
    const docRef = doc(db, 'cases', caseEditing.value.id)
    await updateDoc(docRef, { ...caseEditing.value, images: imageUrls })
    caseSuccess.value = '更新成功！'
    caseError.value = ''
    caseEditing.value = null
    caseEditImageFiles.value = []
    loadCases()
  } catch (error) {
    caseError.value = `更新失敗：${error.message}`
  } finally {
    caseLoading.value = false
  }
}

const cancelEdit = () => {
  caseEditing.value = null
  caseEditImageFiles.value = []
  restoreFocus('cancelEdit')
}

const confirmDelete = (item, event) => {
  caseToDelete.value = item
  triggerButton.value = event.currentTarget
  debug('confirmDelete: triggerButton set to', triggerButton.value)
}

const deleteCase = async () => {
  if (!caseToDelete.value) return
  caseLoading.value = true
  try {
    if (caseToDelete.value.images?.length) {
      for (const url of caseToDelete.value.images) {
        await deleteFile(url)
      }
    }
    const docRef = doc(db, 'cases', caseToDelete.value.id)
    await deleteDoc(docRef)
    caseSuccess.value = '刪除成功！'
    caseError.value = ''
    caseToDelete.value = null
    loadCases()
  } catch (error) {
    caseError.value = `刪除失敗：${error.message}`
  } finally {
    caseLoading.value = false
  }
}

// 成員操作
const loadTeam = () => {
  memberLoading.value = true
  const cachedData = localStorage.getItem('teamMembers')
  if (cachedData) {
    memberItems.value = JSON.parse(cachedData)
    memberLoading.value = false
  }
  const q = query(collection(db, 'team'), orderBy('order', 'asc'))
  const unsubscribe = onSnapshot(q, (querySnapshot) => {
    if (isSorting.value) return
    memberItems.value = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
    localStorage.setItem('teamMembers', JSON.stringify(memberItems.value))
    memberError.value = ''
    memberLoading.value = false
  }, (error) => {
    memberError.value = `載入團隊失敗：${error.message}`
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

const initSortable = (listId, items, collectionName, errorRef, successRef, loadingRef) => {
  const list = document.querySelector(`#${listId}`)
  if (!list) return
  const sortable = new Sortable(list, {
    animation: 150,
    handle: '.drag-handle',
    onEnd: async (evt) => {
      loadingRef.value = true
      const originalItems = [...items.value]
      const movedItem = items.value.splice(evt.oldIndex, 1)[0]
      items.value.splice(evt.newIndex, 0, movedItem)
      try {
        const updates = items.value.map((item, index) => {
          const docRef = doc(db, collectionName, item.id)
          return updateDoc(docRef, { order: index + 1 })
        })
        await Promise.all(updates)
        successRef.value = '排序更新成功！'
        errorRef.value = ''
        if (collectionName === 'team') {
          localStorage.setItem('teamMembers', JSON.stringify(items.value))
        }
      } catch (error) {
        errorRef.value = `更新排序失敗：${error.message}`
        items.value = originalItems
        if (collectionName === 'team') {
          localStorage.setItem('teamMembers', JSON.stringify(items.value))
        }
      } finally {
        loadingRef.value = false
      }
    }
  })
  return sortable
}

watch(activeTab, (newTab) => {
  if (newTab === 'members') {
    setTimeout(() => initSortable('team-list', memberItems, 'team', memberError, memberSuccess, memberLoading), 0)
  } else if (newTab === 'banners') {
    setTimeout(() => initSortable('banner-list', bannerItems, 'banners', bannerError, bannerSuccess, bannerLoading), 0)
  }
  if (memberPhoto.value) {
    URL.revokeObjectURL(memberPhotoPreview.value)
    memberPhotoPreview.value = ''
    memberPhoto.value = null
  }
  if (bannerPhoto.value) {
    URL.revokeObjectURL(bannerPhotoPreview.value)
    bannerPhotoPreview.value = ''
    bannerPhoto.value = null
  }
})

const addExperience = (target) => {
  target.experiences.push('')
}

const removeExperience = (target, index) => {
  target.experiences.splice(index, 1)
}

const addMember = async () => {
  let photoUrl = ''
  if (memberPhoto.value) {
    photoUrl = await uploadMemberPhoto(memberPhoto.value, 'member-photo')
    if (!photoUrl) return
  }
  memberLoading.value = true
  try {
    const maxOrder = memberItems.value.length ? Math.max(...memberItems.value.map(m => m.order || 0)) : 0
    const validExperiences = memberNewItem.value.experiences.filter(exp => exp.trim() !== '')
    await addDoc(collection(db, 'team'), {
      ...memberNewItem.value,
      photo: photoUrl,
      order: maxOrder + 1,
      experiences: validExperiences
    })
    memberSuccess.value = '新增成功！'
    memberError.value = ''
    memberNewItem.value = { name: '', position: '', bio: '', photo: '', experiences: [''] }
    memberPhoto.value = null
    memberPhotoPreview.value = ''
  } catch (error) {
    memberError.value = `新增失敗：${error.message}`
  } finally {
    memberLoading.value = false
  }
}

const editMember = (member, event) => {
  memberEditing.value = {
    ...member,
    experiences: member.experiences.length > 0 ? [...member.experiences] : ['']
  }
  memberPhotoPreview.value = member.photo || ''
  triggerButton.value = event.currentTarget
  debug('editMember: triggerButton set to', triggerButton.value)
}

const updateMember = async () => {
  if (!memberEditing.value) return
  let photoUrl = memberEditing.value.photo
  const oldPhotoUrl = memberEditing.value.photo
  if (memberPhoto.value) {
    photoUrl = await uploadMemberPhoto(memberPhoto.value, 'member-photo')
    if (!photoUrl) return
    if (oldPhotoUrl && oldPhotoUrl !== photoUrl) {
      await deleteFile(oldPhotoUrl)
    }
  }
  memberLoading.value = true
  try {
    const validExperiences = memberEditing.value.experiences.filter(exp => exp.trim() !== '')
    const docRef = doc(db, 'team', memberEditing.value.id)
    await updateDoc(docRef, {
      ...memberEditing.value,
      photo: photoUrl,
      experiences: validExperiences
    })
    memberSuccess.value = '更新成功！'
    memberError.value = ''
    memberEditing.value = null
    memberPhoto.value = null
    memberPhotoPreview.value = ''
  } catch (error) {
    memberError.value = `更新失敗：${error.message}`
  } finally {
    memberLoading.value = false
  }
}

const cancelMemberEdit = () => {
  memberEditing.value = null
  memberPhoto.value = null
  memberPhotoPreview.value = ''
  restoreFocus('cancelMemberEdit')
}

const confirmDeleteMember = (member, event) => {
  memberToDelete.value = member
  triggerButton.value = event.currentTarget
  debug('confirmDeleteMember: triggerButton set to', triggerButton.value)
}

const deleteMember = async () => {
  if (!memberToDelete.value) return
  memberLoading.value = true
  try {
    if (memberToDelete.value.photo) {
      await deleteFile(memberToDelete.value.photo)
    }
    const docRef = doc(db, 'team', memberToDelete.value.id)
    await deleteDoc(docRef)
    memberSuccess.value = '刪除成功！'
    memberError.value = ''
    memberToDelete.value = null
  } catch (error) {
    memberError.value = `刪除失敗：${error.message}`
  } finally {
    memberLoading.value = false
  }
}

// Banner 操作
const loadBanners = () => {
  bannerLoading.value = true
  const q = query(collection(db, 'banners'), orderBy('order', 'asc'))
  const unsubscribe = onSnapshot(q, (querySnapshot) => {
    bannerItems.value = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
    bannerError.value = ''
    bannerLoading.value = false
  }, (error) => {
    bannerError.value = `載入 banner 失敗：${error.message}`
    bannerLoading.value = false
  })
  return unsubscribe
}

onMounted(() => {
  loadBanners()
})

const addBanner = async () => {
  let imageUrl = ''
  if (bannerPhoto.value) {
    imageUrl = await uploadBannerPhoto(bannerPhoto.value, 'banners')
    if (!imageUrl) return
  }
  bannerLoading.value = true
  try {
    const maxOrder = bannerItems.value.length ? Math.max(...bannerItems.value.map(b => b.order || 0)) : 0
    await addDoc(collection(db, 'banners'), {
      title: bannerNewItem.value.title,
      image: imageUrl,
      order: maxOrder + 1
    })
    bannerSuccess.value = '新增成功！'
    bannerError.value = ''
    bannerNewItem.value = { title: '', image: '' }
    bannerPhoto.value = null
    bannerPhotoPreview.value = ''
  } catch (error) {
    bannerError.value = `新增失敗：${error.message}`
  } finally {
    bannerLoading.value = false
  }
}

const confirmDeleteBanner = (banner, event) => {
  bannerToDelete.value = banner
  triggerButton.value = event.currentTarget
  debug('confirmDeleteBanner: triggerButton set to', triggerButton.value)
}

const deleteBanner = async () => {
  if (!bannerToDelete.value) return
  bannerLoading.value = true
  try {
    if (bannerToDelete.value.image) {
      await deleteFile(bannerToDelete.value.image)
    }
    const docRef = doc(db, 'banners', bannerToDelete.value.id)
    await deleteDoc(docRef)
    bannerSuccess.value = '刪除成功！'
    bannerError.value = ''
    bannerToDelete.value = null
  } catch (error) {
    bannerError.value = `刪除失敗：${error.message}`
  } finally {
    bannerLoading.value = false
  }
}

const handleBannerPhotoChange = (event) => {
  bannerPhoto.value = event.target.files[0]
  bannerPhotoPreview.value = bannerPhoto.value ? URL.createObjectURL(bannerPhoto.value) : ''
}

// 監聽用戶狀態
onAuthStateChanged(auth, (user) => {
  if (!user) router.push('/login')
})

// 統一焦點還原
const restoreFocus = (context) => {
  if (triggerButton.value) {
    debug(`${context}: Restoring focus to trigger button`, triggerButton.value)
    triggerButton.value.focus()
  } else {
    const header = document.querySelector('h1')
    if (header) {
      header.setAttribute('tabindex', '-1')
      header.focus()
      debug(`${context}: Falling back to header`, header)
    } else {
      debug(`${context}: No trigger button or fallback found`)
    }
  }
}

// 模態框事件
onMounted(() => {
  const modals = ['deleteModal', 'deleteMemberModal', 'editCaseModal', 'editMemberModal', 'deleteBannerModal']
  modals.forEach(id => {
    const modal = document.getElementById(id)
    if (modal) {
      modal.addEventListener('shown.bs.modal', () => {
        const primaryButton = modal.querySelector('.btn-primary') || modal.querySelector('.btn-danger')
        if (primaryButton) {
          primaryButton.focus()
          debug(`Modal ${id}: Focused on button`, primaryButton)
        }
      })
      modal.addEventListener('hide.bs.modal', debounce(() => {
        const activeElement = document.activeElement
        if (modal.contains(activeElement)) {
          debug(`Modal ${id}: Active element inside modal`, activeElement)
          restoreFocus(`Modal ${id} hide`)
        }
      }, 100))
      modal.addEventListener('hidden.bs.modal', debounce(() => {
        const activeElement = document.activeElement
        if (modal.contains(activeElement)) {
          console.warn(`Modal ${id}: Focus still inside modal after hide`, activeElement)
          restoreFocus(`Modal ${id} hidden`)
        }
        setTimeout(() => {
          restoreFocus(`Modal ${id} hidden delayed`)
          const buttons = modal.querySelectorAll('button')
          buttons.forEach(btn => btn.setAttribute('tabindex', '-1'))
        }, 200)
        if (id === 'editMemberModal' && memberPhoto.value) {
          URL.revokeObjectURL(memberPhotoPreview.value)
          memberPhotoPreview.value = ''
          memberPhoto.value = null
        }
        if (id === 'deleteBannerModal' && bannerPhoto.value) {
          URL.revokeObjectURL(bannerPhotoPreview.value)
          bannerPhotoPreview.value = ''
          bannerPhoto.value = null
        }
        caseEditing.value = null
        memberEditing.value = null
        triggerButton.value = null
      }, 100))
    }
  })
})

onUnmounted(() => {
  const modals = ['deleteModal', 'deleteMemberModal', 'editCaseModal', 'editMemberModal', 'deleteBannerModal']
  modals.forEach(id => {
    const modal = document.getElementById(id)
    if (modal) {
      modal.removeEventListener('shown.bs.modal', () => {})
      modal.removeEventListener('hide.bs.modal', () => {})
      modal.removeEventListener('hidden.bs.modal', () => {})
    }
  })
})

const logout = async () => {
  try {
    await signOut(auth)
    router.push('/login')
  } catch (error) {
    caseError.value = '登出失敗，請稍後再試'
  }
}

const handlePhotoChange = (event) => {
  memberPhoto.value = event.target.files[0]
  memberPhotoPreview.value = memberPhoto.value ? URL.createObjectURL(memberPhoto.value) : memberEditing.value?.photo || ''
}
</script>

<template>
  <div class="container mt-5">
    <h1 class="text-center mb-4">管理後台</h1>
    <div class="text-center mb-4">
      <button class="btn btn-primary" data-testid="logout-button" @click="logout">登出</button>
    </div>

    <ul class="nav nav-tabs mb-4" role="tablist">
      <li class="nav-item" role="presentation">
        <button class="nav-link" :class="{ active: activeTab === 'cases' }" @click="activeTab = 'cases'" role="tab" aria-selected="true" id="cases-tab" aria-controls="cases">案例管理</button>
      </li>
      <li class="nav-item" role="presentation">
        <button class="nav-link" :class="{ active: activeTab === 'members' }" @click="activeTab = 'members'" role="tab" aria-selected="false" id="members-tab" aria-controls="members">成員管理</button>
      </li>
      <li class="nav-item" role="presentation">
        <button class="nav-link" :class="{ active: activeTab === 'banners' }" @click="activeTab = 'banners'" role="tab" aria-selected="false" id="banners-tab" aria-controls="banners">Banner 管理</button>
      </li>
    </ul>

    <!-- 案例管理 -->
    <div v-show="activeTab === 'cases'" id="cases" role="tabpanel" aria-labelledby="cases-tab">
      <div class="card shadow-sm mb-4">
        <div class="card-body">
          <h2 class="h4 mb-3">新增案例</h2>
          <form @submit.prevent="addCase" :class="{ 'loading-form': caseLoading }">
            <div class="mb-3">
              <label for="title" class="form-label">標題</label>
              <input v-model="caseNewItem.title" type="text" class="form-control" id="title" required :disabled="caseLoading">
            </div>
            <div class="mb-3">
              <label for="image-files" class="form-label">上傳圖片（建議壓縮至500KB以下，可選多張）</label>
              <input type="file" class="form-control" id="image-files" accept="image/jpeg,image/png" multiple @change="caseImageFiles = $event.target.files" :disabled="caseLoading" aria-label="上傳案例圖片">
            </div>
            <div class="mb-3">
              <label for="image-url" class="form-label">或輸入圖片URL（以逗號分隔多個URL）</label>
              <input v-model="caseNewItem.images" type="text" class="form-control" id="image-url" placeholder="例如：url1,url2" :disabled="caseLoading">
            </div>
            <div class="mb-3">
              <label for="details" class="form-label">詳細說明</label>
            </div>
            <div class="mb-3">
              <label for="location" class="form-label">地點</label>
              <input v-model="caseNewItem.location" type="text" class="form-control" id="location" required :disabled="caseLoading">
            </div>
            <div v-if="caseSuccess" class="alert alert-success" role="alert">{{ caseSuccess }}</div>
            <div v-if="caseError" class="alert alert-danger" role="alert">{{ caseError }}</div>
            <div class="text-center">
              <button type="submit" class="btn btn-primary" :disabled="caseLoading">
                <span v-if="caseLoading" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                {{ caseLoading ? '新增中...' : '新增案例' }}
              </button>
            </div>
          </form>
        </div>
      </div>
      <div class="card shadow-sm">
        <div class="card-body">
          <h2 class="h4 mb-3">現有案例</h2>
          <ul class="list-group">
            <li class="list-group-item d-flex justify-content-between align-items-center" v-for="item in caseItems" :key="item.id">
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
      <div class="card shadow-sm mb-4">
        <div class="card-body">
          <h2 class="h4 mb-3">新增團隊成員</h2>
          <form @submit.prevent="addMember" :class="{ 'loading-form': memberLoading }">
            <div class="mb-3">
              <label for="member-name" class="form-label">姓名</label>
              <input v-model="memberNewItem.name" type="text" class="form-control" id="member-name" required :disabled="memberLoading">
            </div>
            <div class="mb-3">
              <label for="member-position" class="form-label">職位</label>
              <input v-model="memberNewItem.position" type="text" class="form-control" id="member-position" required :disabled="memberLoading">
            </div>
            <div class="mb-3">
              <label for="member-bio" class="form-label">簡介</label>
              <textarea v-model="memberNewItem.bio" class="form-control" id="member-bio" rows="4" required :disabled="memberLoading"></textarea>
            </div>
            <div class="mb-3">
              <label for="member-photo" class="form-label">頭像（建議壓縮至500KB以下）</label>
              <input type="file" class="form-control" id="member-photo" accept="image/jpeg,image/png" @change="handlePhotoChange" :disabled="memberLoading" aria-label="上傳成員頭像">
              <img v-if="memberPhotoPreview" :src="memberPhotoPreview" alt="頭像預覽" class="img-fluid mt-2" style="max-width: 150px; max-height: 150px;">
            </div>
            <div class="mb-3">
              <label class="form-label">相關經歷</label>
              <div v-for="(exp, index) in memberNewItem.experiences" :key="index" class="input-group mb-2">
                <textarea v-model="memberNewItem.experiences[index]" class="form-control" :id="`member-exp-${index}`" rows="2" placeholder="例如：2010-2015 ABC 公司，專案經理" :disabled="memberLoading"></textarea>
                <button type="button" class="btn btn-outline-danger" @click="removeExperience(memberNewItem, index)" :disabled="memberLoading || memberNewItem.experiences.length === 1">−</button>
              </div>
              <button type="button" class="btn btn-outline-primary" @click="addExperience(memberNewItem)" :disabled="memberLoading">+ 新增經歷</button>
            </div>
            <div v-if="memberSuccess" class="alert alert-success" role="alert">{{ memberSuccess }}</div>
            <div v-if="memberError" class="alert alert-danger" role="alert">{{ memberError }}</div>
            <div class="text-center">
              <button type="submit" class="btn btn-primary" :disabled="memberLoading">
                <span v-if="memberLoading" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                {{ memberLoading ? '新增中...' : '新增成員' }}
              </button>
            </div>
          </form>
        </div>
      </div>
      <div class="card shadow-sm">
        <div class="card-body">
          <h2 class="h4 mb-3">現有團隊成員</h2>
          <ul class="list-group" id="team-list">
            <li class="list-group-item d-flex justify-content-between align-items-center" v-for="member in memberItems" :key="member.id">
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

    <!-- Banner 管理 -->
    <div v-show="activeTab === 'banners'" id="banners" role="tabpanel" aria-labelledby="banners-tab">
      <div class="card shadow-sm mb-4">
        <div class="card-body">
          <h2 class="h4 mb-3">新增 Banner</h2>
          <form @submit.prevent="addBanner" :class="{ 'loading-form': bannerLoading }">
            <div class="mb-3">
              <label for="banner-title" class="form-label">標題</label>
              <input v-model="bannerNewItem.title" type="text" class="form-control" id="banner-title" required :disabled="bannerLoading">
            </div>
            <div class="mb-3">
              <label for="banner-photo" class="form-label">Banner 圖片（建議 9:16 比例，例如 1080x1920px，2MB 以內）</label>
              <input type="file" class="form-control" id="banner-photo" accept="image/jpeg,image/png" @change="handleBannerPhotoChange" :disabled="bannerLoading" aria-label="上傳 Banner 圖片">
              <img v-if="bannerPhotoPreview" :src="bannerPhotoPreview" alt="Banner 預覽" class="img-fluid mt-2" style="max-width: 150px;">
            </div>
            <div v-if="bannerSuccess" class="alert alert-success" role="alert">{{ bannerSuccess }}</div>
            <div v-if="bannerError" class="alert alert-danger" role="alert">{{ bannerError }}</div>
            <div class="text-center">
              <button type="submit" class="btn btn-primary" :disabled="bannerLoading">
                <span v-if="bannerLoading" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                {{ bannerLoading ? '新增中...' : '新增 Banner' }}
              </button>
            </div>
          </form>
        </div>
      </div>
      <div class="card shadow-sm">
        <div class="card-body">
          <h2 class="h4 mb-3">現有 Banner</h2>
          <ul class="list-group" id="banner-list">
            <li class="list-group-item d-flex justify-content-between align-items-center" v-for="banner in bannerItems" :key="banner.id">
              <span class="drag-handle me-3" style="cursor: move;">☰</span>
              {{ banner.title }}
              <span>
                <img :src="banner.image" alt="Banner 預覽" class="me-2" style="max-width: 50px;">
                <button class="btn btn-sm btn-outline-danger" @click="confirmDeleteBanner(banner, $event)" data-bs-toggle="modal" data-bs-target="#deleteBannerModal">刪除</button>
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
          <div class="modal-body" id="editCaseModalDesc" v-if="caseEditing">
            <form @submit.prevent="updateCase" :class="{ 'loading-form': caseLoading }">
              <div class="mb-3">
                <label for="edit-title" class="form-label">標題</label>
                <input v-model="caseEditing.title" type="text" class="form-control" id="edit-title" required :disabled="caseLoading">
              </div>
              <div class="mb-3">
                <label for="edit-description" class="form-label">描述</label>
                <textarea v-model="caseEditing.description" class="form-control" id="edit-description" rows="3" required :disabled="caseLoading"></textarea>
              </div>
              <div class="mb-3">
                <label for="edit-image-files" class="form-label">上傳新圖片（建議壓縮至500KB以下，可選多張）</label>
                <input type="file" class="form-control" id="edit-image-files" accept="image/jpeg,image/png" multiple @change="caseEditImageFiles = $event.target.files" :disabled="caseLoading" aria-label="上傳新案例圖片">
              </div>
              <div class="mb-3">
                <label for="edit-image-url" class="form-label">或輸入圖片URL（以逗號分隔多個URL）</label>
                <input v-model="caseEditing.images" type="text" class="form-control" id="edit-image-url" placeholder="例如：url1,url2" :disabled="caseLoading">
              </div>
              <div class="mb-3">
                <label for="edit-details" class="form-label">詳細說明</label>
                <textarea v-model="caseEditing.details" class="form-control" id="edit-details" rows="4" required :disabled="caseLoading"></textarea>
              </div>
              <div class="mb-3">
                <label for="edit-location" class="form-label">地點</label>
                <input v-model="caseEditing.location" type="text" class="form-control" id="edit-location" required :disabled="caseLoading">
              </div>
              <div v-if="caseSuccess" class="alert alert-success" role="alert">{{ caseSuccess }}</div>
              <div v-if="caseError" class="alert alert-danger" role="alert">{{ caseError }}</div>
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
          <div class="modal-body" id="editMemberModalDesc" v-if="memberEditing">
            <form @submit.prevent="updateMember" :class="{ 'loading-form': memberLoading }">
              <div class="mb-3">
                <label for="edit-member-name" class="form-label">姓名</label>
                <input v-model="memberEditing.name" type="text" class="form-control" id="edit-member-name" required :disabled="memberLoading">
              </div>
              <div class="mb-3">
                <label for="edit-member-position" class="form-label">職位</label>
                <input v-model="memberEditing.position" type="text" class="form-control" id="edit-member-position" required :disabled="memberLoading">
              </div>
              <div class="mb-3">
                <label for="edit-member-bio" class="form-label">簡介</label>
                <textarea v-model="memberEditing.bio" class="form-control" id="edit-member-bio" rows="4" required :disabled="memberLoading"></textarea>
              </div>
              <div class="mb-3">
                <label for="edit-member-photo" class="form-label">頭像（建議壓縮至500KB以下）</label>
                <input type="file" class="form-control" id="edit-member-photo" accept="image/jpeg,image/png" @change="handlePhotoChange" :disabled="memberLoading" aria-label="上傳新成員頭像">
                <img v-if="memberPhotoPreview" :src="memberPhotoPreview" alt="頭像預覽" class="img-fluid mt-2" style="max-width: 150px; max-height: 150px;">
              </div>
              <div class="mb-3">
                <label class="form-label">相關經歷</label>
                <div v-for="(exp, index) in memberEditing.experiences" :key="index" class="input-group mb-2">
                  <textarea v-model="memberEditing.experiences[index]" class="form-control" :id="`edit-member-exp-${index}`" rows="2" placeholder="例如：2010-2015 ABC 公司，專案經理" :disabled="memberLoading"></textarea>
                  <button type="button" class="btn btn-outline-danger" @click="removeExperience(memberEditing, index)" :disabled="memberLoading || memberEditing.experiences.length === 1">−</button>
                </div>
                <button type="button" class="btn btn-outline-primary" @click="addExperience(memberEditing)" :disabled="memberLoading">+ 新增經歷</button>
              </div>
              <div v-if="memberSuccess" class="alert alert-success" role="alert">{{ memberSuccess }}</div>
              <div v-if="memberError" class="alert alert-danger" role="alert">{{ memberError }}</div>
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

    <!-- 刪除案例模態框 -->
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

    <!-- 刪除 Banner 模態框 -->
    <div class="modal fade" id="deleteBannerModal" tabindex="-1" aria-labelledby="deleteBannerModalLabel" aria-describedby="deleteBannerModalDesc" aria-modal="true" role="dialog">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="deleteBannerModalLabel">確認刪除</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="關閉"></button>
          </div>
          <div class="modal-body" id="deleteBannerModalDesc">
            你確定要刪除 Banner「{{ bannerToDelete?.title }}」嗎？此操作無法恢復。
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal" :disabled="bannerLoading">取消</button>
            <button type="button" class="btn btn-danger" @click="deleteBanner" data-bs-dismiss="modal" :disabled="bannerLoading">
              <span v-if="bannerLoading" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              {{ bannerLoading ? '刪除中...' : '刪除' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.loading-form { opacity: 0.7; pointer-events: none; }
.spinner-border { vertical-align: middle; }
</style>
```