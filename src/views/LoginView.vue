<script setup lang="ts">
import { useAuthorizationStore } from "@/stores/authorization";
import { onMounted, ref } from "vue";
import OfficeButton from "@/components/OfficeButton.vue";
import router from "@/router";
const authorizationStore = useAuthorizationStore();

const username = ref<string>("");
const password = ref<string>("");

onMounted(() => {
  console.log("MOUNTED");
  authorizationStore.loginError = false;
});
async function login() {
  let result = await authorizationStore.login(username.value, password.value);

  if (result) {
    //TODO załadować karty kredytowe i inne
    // router.back();
    goBack();
  }
}
function goBack(): void {
  let history: string[] | [] = JSON.parse(
    localStorage.getItem("navigationHistory") || "[]"
  );
  let lastAddress = history[history.length - 1];
  if (lastAddress && (lastAddress === "/error" || lastAddress === "/login")) {
    history = history.slice(-25);
    history = history.filter((item) => item !== lastAddress); // Usuń ostatnią odwiedzoną stronę
    localStorage.setItem("navigationHistory", JSON.stringify(history));
  }

  if (history.length > 0) router.replace(history[history.length - 1]);
  else router.replace("/");
}
</script>
<template>
  <!--  <div class="bg-office">-->
  <form class="login-form mb-5 mt-1 mt-md-5" @submit.prevent="login()">
    <h2 class="mb-5 color-green text-center">Logowanie</h2>

    <!-- ERROR -->
    <div v-if="authorizationStore.loginError">
      <p id="error">Niestety podałeś niewłaściwy login lub hasło.</p>
    </div>

    <!-- USERNAME -->
    <FloatLabel class="">
      <InputText
          id="username"
          v-model="username"
          class="w-full"
          autocomplete="username"
          required
      />
      <label for="username">Login</label>
    </FloatLabel>

    <!-- PASSWORD -->
    <FloatLabel class="mt-9">
      <Password
          id="password"
          v-model="password"
          toggle-mask
          required
          class="w-full text-yellow-400"
          autocomplete="current-password"
          :input-style="{'width':'100%'}"
          :feedback="false"

      />
      <label for="password" class="w-full">Hasło</label>
    </FloatLabel>

    <!-- BUTTON -->
    <office-button
      text="zaloguj się"
      class="btn mt-3 mb-1"
      style="width: 100%"
      btn-type="ahead"
      type="submit"
      :disabled="authorizationStore.btnDisabled"
      :is-busy-icon="authorizationStore.busyIcon"
      >Zaloguj się
    </office-button>
    <p class="text-right mb-4">
      <router-link class="color-gray link" to="/forgot-password"
        >Nie pamiętam hasła</router-link
      >
    </p>
  </form>
</template>
<style scoped>
#error {
  color: red;
}

/* unvisited link */
.link:link {
  color: #a29a8e;
}

/* visited link */
.link:visited {
  color: #a29a8e;
}

/* mouse over link */
.link:hover {
  color: #268c73;
  text-decoration: none;
}

.login-form {
  max-width: 400px;
  margin: auto;
  margin-top: 200px;
}
</style>
