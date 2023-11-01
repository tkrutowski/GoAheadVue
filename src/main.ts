/* eslint-disable vue/multi-word-component-names */
import { createApp, markRaw } from "vue";
import App from "./App.vue";
import type { Router } from "vue-router";
import router from "./router";
import { createPinia } from "pinia";
import PrimeVue from "primevue/config";
import "primeicons/primeicons.css";
import "primeflex/primeflex.css";
import "primevue/resources/themes/lara-light-blue/theme.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap";
import "@/assets/css/main.css";
import "bootstrap-icons/font/bootstrap-icons.css";

import ToastService from "primevue/toastservice";

import Button from "primevue/button";
import Calendar from "primevue/calendar";
import Card from "primevue/card";
import Checkbox from "primevue/checkbox";
import Column from "primevue/column";
import ColumnGroup from "primevue/columngroup";
// import ConfirmDialog from 'primevue/confirmdialog';
// import ConfirmPopup from 'primevue/confirmpopup';
// import ConfirmationService from 'primevue/confirmationservice';
import ContextMenu from "primevue/contextmenu";
import DataTable from "primevue/datatable";
import DataViewLayoutOptions from "primevue/dataviewlayoutoptions";
import Dialog from "primevue/dialog";
import DialogService from "primevue/dialogservice";
import Divider from "primevue/divider";
import Dropdown from "primevue/dropdown";
// import DynamicDialog from 'primevue/dynamicdialog';
import InlineMessage from "primevue/inlinemessage";
import InputSwitch from "primevue/inputswitch";
import InputText from "primevue/inputtext";
import InputMask from "primevue/inputmask";
import InputNumber from "primevue/inputnumber";
import Listbox from "primevue/listbox";
import Menu from "primevue/menu";
import Menubar from "primevue/menubar";
import Message from "primevue/message";
import Paginator from "primevue/paginator";
import Panel from "primevue/panel";
import PanelMenu from "primevue/panelmenu";
import Password from "primevue/password";
import ProgressBar from "primevue/progressbar";
import ProgressSpinner from "primevue/progressspinner";
import Rating from "primevue/rating";
import RadioButton from "primevue/radiobutton";
import Row from "primevue/row";
import SelectButton from "primevue/selectbutton";
import Slider from "primevue/slider";
import Sidebar from "primevue/sidebar";
import TabMenu from "primevue/tabmenu";
import Textarea from "primevue/textarea";
import Toast from "primevue/toast";
import Toolbar from "primevue/toolbar";
import Tooltip from "primevue/tooltip";
import AutoComplete from "primevue/autocomplete";

declare module "pinia" {
  export interface PiniaCustomProperties {
    router: Router;
  }
}

const pinia = createPinia();

pinia.use(({ store }) => {
  store.router = markRaw(router);
});

const app = createApp(App);

app.use(pinia);
app.use(router);
app.use(PrimeVue);
app.use(ToastService);

app.directive("tooltip", Tooltip);

app.component("AutoComplete", AutoComplete);
app.component("Button", Button);
app.component("Calendar", Calendar);
app.component("Card", Card);
app.component("Checkbox", Checkbox);
app.component("Column", Column);
app.component("ColumnGroup", ColumnGroup);
// app.component('ConfirmDialog', ConfirmDialog);
// app.component('ConfirmPopup', ConfirmPopup);
app.component("ContextMenu", ContextMenu);
app.component("DataTable", DataTable);
app.component("DataView", DataView);
app.component("DataViewLayoutOptions", DataViewLayoutOptions);
app.component("Dialog", Dialog);
app.component("Divider", Divider);
app.component("Dropdown", Dropdown);
app.component("Image", Image);
app.component("InlineMessage", InlineMessage);
app.component("InputMask", InputMask);
app.component("InputNumber", InputNumber);
app.component("InputSwitch", InputSwitch);
app.component("InputText", InputText);
app.component("Listbox", Listbox);
app.component("Menu", Menu);
app.component("Menubar", Menubar);
app.component("Message", Message);
app.component("Paginator", Paginator);
app.component("Panel", Panel);
app.component("PanelMenu", PanelMenu);
app.component("Password", Password);
app.component("ProgressBar", ProgressBar);
app.component("ProgressSpinner", ProgressSpinner);
app.component("RadioButton", RadioButton);
app.component("Rating", Rating);
app.component("Row", Row);
app.component("SelectButton", SelectButton);
app.component("Slider", Slider);
app.component("Sidebar", Sidebar);
app.component("TabMenu", TabMenu);
app.component("Textarea", Textarea);
app.component("Toast", Toast);
app.component("Toolbar", Toolbar);

app.mount("#app");
