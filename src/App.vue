<script setup>
import HelloWorld from './components/HelloWorld.vue'
</script>

<template>
  <!-- <div>
    <a href="https://vite.dev" target="_blank">
      <img src="/vite.svg" class="logo" alt="Vite logo" />
    </a>
    <a href="https://vuejs.org/" target="_blank">
      <img src="./assets/vue.svg" class="logo vue" alt="Vue logo" />
    </a>
  </div>
  <HelloWorld msg="Vite + Vue" /> -->
  <div>
    <!-- Bootstrap 導覽列 -->
    <nav class="navbar navbar-expand-lg navbar-dark bg-dark">
      <div class="container-fluid">
        <a class="navbar-brand" href="#">台中危老重建</a>
        <button
          class="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav"
          aria-controls="navbarNav"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="navbarNav">
          <ul class="navbar-nav">
            <li class="nav-item">
              <a class="nav-link active" href="#">首頁</a>
            </li>
            <li class="nav-item">
              <a class="nav-link" href="#">關於我們</a>
            </li>
            <li class="nav-item">
              <a class="nav-link" href="#">案例展示</a>
            </li>
            <li class="nav-item">
              <a class="nav-link" href="#">聯繫我們</a>
            </li>
          </ul>
        </div>
      </div>
    </nav>

    <!-- 主要內容 -->
    <div class="container mt-5">
      <h1 class="text-center">歡迎來到台中危老重建</h1>
      <p class="text-center">
        我們專注於提供專業的危老建築重建服務，打造安全、現代的居住環境。
      </p>
    </div>
  </div>
</template>

<style scoped>
.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}
.logo.vue:hover {
  filter: drop-shadow(0 0 2em #42b883aa);
}
</style>
