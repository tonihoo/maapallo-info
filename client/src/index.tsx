import { App } from "./App";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { store } from "./store";

document.addEventListener("DOMContentLoaded", async () => {
  const appDiv = document.getElementById("app");
  if (appDiv) {
    createRoot(appDiv).render(
      <Provider store={store}>
        <App />
      </Provider>
    );
  }
});
