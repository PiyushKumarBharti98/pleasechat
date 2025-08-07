//import React from 'react';
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ChatPage from './pages/ChatPage';
import LandingPage from './pages/LandingPage'; 
import ProtectedRoute from './components/ProtectedRoute';
import PublicRoute from './components/PublicRoute'; 

function App() {
  return (
    <Router>
      {/* The outer div is removed to allow pages to control their own full-screen backgrounds */}
      <Routes>
        {/* Public Routes: Accessible only when logged out */}
        <Route
          path="/"
          element={
            <PublicRoute>
              <LandingPage />
            </PublicRoute>
          }
        />
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <RegisterPage />
            </PublicRoute>
          }
        />

        {/* Protected Route: Accessible only when logged in */}
        <Route
          path="/chat"
          element={
            <ProtectedRoute>
              <ChatPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
