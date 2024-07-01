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

    <!-- LOGIN id="form-group-login"-->
    <div class="form-group color-green mb-3">
      <label for="inputLogin" class="form-label">Login</label>
      <input
        type="text"
        id="inputLogin"
        class="form-control form-control-lg"
        placeholder="Nazwa użytkownika"
        autocomplete="username"
        required
        v-model="username"
      />
    </div>

    <!-- PASSWORD -->
    <div class="form-group color-green">
      <label for="inputPassword" class="form-label">Hasło</label>
      <input
        type="password"
        id="inputPassword"
        class="form-control form-control-lg"
        placeholder="Hasło"
        autocomplete="current-password"
        required
        v-model="password"
      />
    </div>

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
