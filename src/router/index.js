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
  { path: '/', component: Home },
  { path: '/about', component: About },
  { path: '/cases', component: Cases },
  { path: '/cases/:id', component: CaseDetail },
  { path: '/contact', component: Contact },
  { path: '/login', component: Login },
  { path: '/admin', component: Admin, meta: { requiresAuth: true } }
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