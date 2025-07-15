import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { LogIn, UserPlus } from "lucide-react";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import "./App.css";

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center">
        <div className="space-x-4 mb-8">
          <Link to="/login" className="text-blue-500 hover:text-blue-700">
            <LogIn className="w-8 h-8" />
          </Link>
          <Link to="/register" className="text-green-500 hover:text-green-700">
            <UserPlus className="w-8 h-8" />
          </Link>
        </div>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/" element={<LoginPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
