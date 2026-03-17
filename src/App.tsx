import { AppProvider, useApp } from "./context";
import { Sidebar } from "./components/Sidebar";
import { MainArea } from "./components/MainArea";
import "./App.css";

function AppShell() {
  const { state, loaded } = useApp();

  if (!loaded) {
    return (
      <div className="app loading-screen">
        <span className="loading-text">Loading...</span>
      </div>
    );
  }

  return (
    <div className="app" style={{ fontSize: `${state.uiFontSize}px` }}>
      <Sidebar />
      <MainArea />
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}

export default App;
