import React from 'react';
import { Link } from 'react-router-dom'; // Use Link for internal navigation

const LandingPage: React.FC = () => {
    
    return (
        // The main container with a black background and default text styles
        <div className="bg-black text-gray-200 font-['Inter'] w-screen overflow-x-hidden">

            {/* Header Navigation */}
            <header className="absolute top-0 left-0 w-full z-20 p-4 sm:p-6">
                <div className="container mx-auto flex justify-between items-center">
                    {/* Logo */}
                    <Link to="/" className="font-['Goldman-Regular'] text-2xl font-bold tracking-wider text-white">
                        PleaseChat
                    </Link>
                    
                    {/* Navigation Buttons */}
                    <div className="flex items-center space-x-2 sm:space-x-4">
                        <Link to="/login" className="px-4 py-2 text-sm font-medium text-white rounded-lg hover:text-[#F91880] transition-colors">
                            Login
                        </Link>
                        <Link to="/register" className="px-4 py-2 text-sm font-bold text-white bg-[#F91880] rounded-lg hover:bg-[#d8126e] transition-colors">
                            Register
                        </Link>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main>
                {/* Hero Section */}
                <section className="relative min-h-screen flex items-center justify-center overflow-hidden text-center">
                    
                    {/* Background Image & Gradient Overlay */}
                    <div className="absolute inset-0 z-0">
                        {/* Thematic background image */}
                        <img 
                             src="https://images.unsplash.com/photo-1531746790731-6c087fecd65a?q=80&w=2500&auto=format&fit=crop" 
                             alt="Abstract network connections"
                             className="w-full h-full object-cover opacity-20"
                             onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                        {/* Gradient overlays */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black to-transparent"></div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
                        <div className="absolute bottom-0 w-full h-1/2 bg-gradient-to-t from-[#f91880]/20 via-transparent to-transparent"></div>
                    </div>

                    {/* Content */}
                    <div className="relative z-10 container mx-auto px-4">
                        <h1 className="font-['Goldman-Regular'] text-5xl sm:text-7xl md:text-8xl font-bold text-white leading-tight tracking-wide">
                            <span className="text-[#F91880]">Real-time Chat</span>
                            <br/>
                            For Modern Teams
                        </h1>
                        <p className="mt-6 max-w-2xl mx-auto text-base sm:text-lg text-gray-400">
                            High-impact visuals, bold UI, and metrics that prove results. Experience the next generation of team communication.
                        </p>
                        <div className="mt-10">
                            <Link to="/register" className="px-8 py-4 font-bold text-white bg-[#F91880] rounded-lg hover:bg-[#d8126e] transition-transform duration-300 transform hover:scale-105 inline-block">
                                Start Connecting Now
                            </Link>
                        </div>
                    </div>
                </section>

                {/* Features Section */}
                <section className="py-20 sm:py-32 bg-black">
                    <div className="container mx-auto px-4">
                        <div className="text-center mb-12 sm:mb-16">
                            <h2 className="font-['Goldman-Regular'] text-3xl sm:text-4xl font-bold text-white">Built for Performance & <span className="text-[#F91880]">Connection</span></h2>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {/* Feature 1: Instant Sync */}
                            <div className="bg-zinc-900/50 p-8 rounded-xl border border-zinc-800 backdrop-blur-sm">
                                <h3 className="font-['Goldman-Regular'] text-xl font-bold text-[#F91880]">Instant Sync</h3>
                                <p className="mt-3 text-gray-400">
                                    Leveraging a high-performance socket architecture, messages are delivered instantly across all devices.
                                </p>
                            </div>
                            
                            {/* Feature 2: Live Presence */}
                            <div className="bg-zinc-900/50 p-8 rounded-xl border border-zinc-800 backdrop-blur-sm">
                                <h3 className="font-['Goldman-Regular'] text-xl font-bold text-[#F91880]">Live Presence</h3>
                                <p className="mt-3 text-gray-400">
                                    Our Redis-backed presence system lets you see who's online in real-time, making it easy to connect at the right moment.
                                </p>
                            </div>
                            
                            {/* Feature 3: Secure by Design */}
                            <div className="bg-zinc-900/50 p-8 rounded-xl border border-zinc-800 backdrop-blur-sm">
                                <h3 className="font-['Goldman-Regular'] text-xl font-bold text-[#F91880]">Secure by Design</h3>
                                <p className="mt-3 text-gray-400">
                                    With JWT-based authentication and secure protocols, your conversations are protected and private.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="bg-black border-t border-zinc-800/50 py-8">
                <div className="container mx-auto text-center text-gray-500">
                    <p>&copy; 2025 PleaseChat. All rights reserved.</p>
                </div>
            </footer>

        </div>
    );
};

export default LandingPage;
