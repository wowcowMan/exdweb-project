import { createRouter, createWebHistory } from 'vue-router'
import { auth } from '../firebase'
import Home from '../views/Home.vue'
import About from '../views/About.vue'
import Cases from '../views/Cases.vue'
import CaseDetail from '../views/CaseDetail.vue'
import Contact from '../views/Contact.vue'
import Login from '../views/Login.vue'
import Admin from '../views/Admin.vue'

const routes = [
  { path: '/',
    name:'Home',
    component: Home,
    meta: { breadcrumb: '首頁' }
  },
  {
    path: '/about',
    name: 'About',
    component: About,
    meta: { breadcrumb: '關於我們' }
  },
  {
    path: '/cases',
    name: 'Cases',
    component: Cases,
    meta: { breadcrumb: '案例' }
  },
  {
    path: '/cases/:id',
    name: 'CaseDetail',
    component: CaseDetail,
    meta: { breadcrumb: '案例詳情' }
  },
  { path: '/contact',
    name: 'Contact',
    component: Contact,
    meta: { breadcrumb: '聯絡我們'}
  },
  { path: '/login',
    name: 'Login',
    component: Login,
    meta: { breadcrumb: '登入' }
  },
  {
    path: '/admin',
    name: 'Admin',
    component: Admin,
    meta: { breadcrumb: '管理後台', requiresAuth: true }
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth)
  const isAuthenticated = auth.currentUser

  if (requiresAuth && !isAuthenticated) {
    next('/login')
  } else {
    next()
  }
})

export default router