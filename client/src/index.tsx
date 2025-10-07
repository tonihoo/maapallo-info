import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { App } from "./App";
import { store } from "./store";

document.addEventListener("DOMContentLoaded", () => {
  const appDiv = document.getElementById("app");
  if (appDiv) {
    createRoot(appDiv).render(
      <Provider store={store}>
        <App />
      </Provider>
    );
  }
});
