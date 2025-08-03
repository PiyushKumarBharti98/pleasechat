import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { LogIn, UserPlus } from "lucide-react";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ChatPage from './pages/ChatPage'; // Make sure ChatPage is imported
import ProtectedRoute from './components/ProtectedRoute'; // Import the protector
import "./App.css";

function App() {
  return (
    <Router>
      {/* This outer div can be removed if you want ChatPage to be full-screen */}
      <div className="min-h-screen bg-gray-100">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <ChatPage />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
