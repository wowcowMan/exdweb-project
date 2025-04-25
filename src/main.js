import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'
// 引入 Bootstrap CSS 和 JS
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap'

const app = createApp(App)
app.use(router)
app.mount('#app')
