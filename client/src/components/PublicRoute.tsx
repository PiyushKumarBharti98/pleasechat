import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { Navigate } from 'react-router-dom';

interface PublicRouteProps {
    children: React.ReactElement;
}

const PublicRoute: React.FC<PublicRouteProps> = ({ children }) => {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        // Show a loading indicator while checking auth status
        return <div>Loading...</div>;
    }

    // If the user is logged in, redirect them away from the public page to the chat page
    if (user) {
        return <Navigate to="/chat" replace />;
    }

    // If the user is not logged in, render the public page (e.g., Landing, Login)
    return children;
};

export default PublicRoute;
