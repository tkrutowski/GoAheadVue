<template>
  <Dialog
    modal
    :closable="false"
    :show-header="false"
    :show-footer="false"
    style="border-top-right-radius: 6px"
  >
    <div class="loading-content">
      <p class="mb-5">LOADING<span class="loading-dots">...</span></p>
    </div>
  </Dialog>
</template>

<style scoped>
.loading-content {
  height: 40px;
  text-align: center;
  font-size: 30px;
  font-weight: bold;
  padding-bottom: 16px;
  padding-top: 16px;
  margin: 0;
  background: transparent !important;
  color: #268c73 !important;
  border-top-right-radius: 6px;
  border-top-left-radius: 6px;
}
.p-dialog-content {
  background: transparent !important;
  color: #268c73 !important;
  padding-bottom: 16px;
  padding-top: 16px;
  margin: auto;
}

.loading-dots {
  animation: loading 1s infinite;
  opacity: 1;
  display: inline-block;
}

@keyframes loading {
  0%,
  100% {
    opacity: 0;
  }
  50% {
    opacity: 1;
  }
}
</style>
