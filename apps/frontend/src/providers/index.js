"use client";

import ReduxProvider from "./ReduxProvider";
import ReactQueryProvider from "./ReactQueryProvider";
import AuthLoader from "@/components/AuthLoader";
import SettingsFavicon from "@/components/SettingsFavicon";
import { Toaster } from "react-hot-toast";

export default function Providers({ children }) {
  return (
    <ReduxProvider>
      <ReactQueryProvider>
        <SettingsFavicon />
        <Toaster position="top-right" />
        <AuthLoader>{children}</AuthLoader>
      </ReactQueryProvider>
    </ReduxProvider>
  );
}
