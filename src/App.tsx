import React, { Suspense } from "react";
import ReactDOM from "react-dom/client";
import { Toaster } from 'sonner';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { Outlet, RouterProvider, createRouter, createRoute, createRootRoute } from "@tanstack/react-router";

import '@material-design-icons/font/outlined.css';
import "./global.css";
import "./App.css";

import { AppContextProvider } from "./contexts/AppContext";

import Pad from "./pages/Pad";
import PadHeader from "./components/PadHeader";

const rootRoute = createRootRoute({
  component: () => {
    return (
      <div className="app-container mx-auto">
        <PadHeader />
        <Suspense fallback={<div>Loading...</div>}>
          <Outlet />
        </Suspense>
      </div>
    );
  },
  staleTime: Infinity,
});

const PadRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: Pad,
});

const router = createRouter({
  routeTree: rootRoute.addChildren([
    PadRoute,
  ]),
});

const queryClient = new QueryClient();

function App() {
  return <QueryClientProvider client={queryClient}>
    <AppContextProvider>
      <Toaster
        position="top-center"
        toastOptions={{
          unstyled: true,
          style: {
            boxShadow: `inset 0 0 0 1px rgba(255, 255, 255, 0.1)`,
            userSelect: 'none',
            WebkitUserSelect: 'none',
            MozUserSelect: 'none',
            cursor: 'default',
          },
          classNames: {
            toast: 'text-[#dedede] text-[12px] leading-[16px] bg-[#181818] rounded-lg z-10 pointer-events-none p-3 flex justify-between items-center space-x-2 pointer-events-auto',
            title: 'text-[14px] leading-[16px]',
            description: 'text-text-secondary',
            actionButton: 'bg-[#2C2C2C66] p-1 px-2 rounded-md',
            cancelButton: 'bg-[#2C2C2C66] p-1 px-2 rounded-md',
            closeButton: 'bg-[#2C2C2C66] p-1 px-2 rounded-md',
          },
        }} />
      <RouterProvider router={router} />
    </AppContextProvider>
  </QueryClientProvider>;
}

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error('Failed to find the root element');

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
