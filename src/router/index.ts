import { createRouter, createWebHistory, RouteRecordRaw } from "vue-router";
import HomeView from "../views/HomeView.vue";
import LoginView from "@/views/LoginView.vue";
import Error503View from "@/views/Error503View.vue";
import InvoicesView from "@/views/InvoicesView.vue";
import InvoiceView from "@/views/InvoiceView.vue";
import CustomersView from "@/views/CustomersView.vue";
import CustomerView from "@/views/CustomerView.vue";

const routes: Array<RouteRecordRaw> = [
  {
    path: "/",
    name: "Home",
    component: HomeView,
  },
  {
    path: "/login",
    name: "login",
    component: LoginView,
  },
  {
    path: "/error",
    name: "Error503",
    component: Error503View,
  },
  //GOAHEAD
  {
    path: "/goahead/invoice/all",
    name: "Invoices",
    component: InvoicesView,
    props: true,
  },
  {
    path: "/goahead/invoice/:isEdit/:invoiceId",
    name: "Invoice",
    component: InvoiceView,
    props: true,
  },
  {
    path: "/goahead/customer/all",
    name: "Customers",
    component: CustomersView,
    props: true,
  },
  {
    path: "/goahead/customer/:isEdit/:customerId",
    name: "Customer",
    component: CustomerView,
    props: true,
  },
  // {
  //   path: '/about',
  //   name: 'about',
  //   // route level code-splitting
  //   // this generates a separate chunk (about.[hash].js) for this route
  //   // which is lazy-loaded when the route is visited.
  //   component: () => import(/* webpackChunkName: "about" */ '../views/AboutView.vue')
  // }
];

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes,
});

export default router;
