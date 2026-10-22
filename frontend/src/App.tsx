import { BrowserRouter, Route, Routes } from "react-router";
import Auth from "./pages/Auth";
import Home from "./pages/Home";
import Conversation from "./pages/Conversation";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/" element={<Home />} />
        <Route path="/conversation/:id" element={<Conversation />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
