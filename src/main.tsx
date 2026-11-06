import "core-js/actual/promise/try";
import "core-js/actual/promise/with-resolvers";
import "core-js/actual/typed-array/to-hex";
import "core-js/actual/map/get-or-insert";
import "core-js/actual/map/get-or-insert-computed";
import * as React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { getInitialLanguage, setLanguage } from "./i18n";
import "./styles/global.css";

setLanguage(getInitialLanguage());

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
