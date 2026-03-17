import { AppProvider } from "./context";
import { Sidebar } from "./components/Sidebar";
import { MainArea } from "./components/MainArea";
import "./App.css";

function App() {
  return (
    <AppProvider>
      <div className="app">
        <Sidebar />
        <MainArea />
      </div>
    </AppProvider>
  );
}

export default App;
