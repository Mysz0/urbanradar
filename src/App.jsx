import React, { useState } from 'react';
import 'leaflet/dist/leaflet.css';

// MODULAR IMPORTS
import { useMagnetic } from './hooks/useMagnetic';
import { useAuth } from './hooks/useAuth';
import { useTheme } from './hooks/useTheme';
import { useGeoLocation } from './hooks/useGeoLocation';
import { useGameLogic } from './hooks/useGameLogic';

// COMPONENT IMPORTS
import Header from './components/Layout/Header';
import Navbar from './components/Layout/Navbar';
import HomeTab from './components/Tabs/HomeTab';
import ExploreTab from './components/Tabs/ExploreTab';
import LeaderboardTab from './components/Tabs/LeaderboardTab';
import ProfileTab from './components/Tabs/ProfileTab';
import AdminTab from './components/Tabs/AdminTab';
import Login from './components/Auth/Login';
import Toast from './components/UI/Toast';
import ThemeToggle from './components/UI/ThemeToggle';

const ADMIN_UID = import.meta.env.VITE_ADMIN_UID;

export default function App() {
  // 1. SHARED UI STATE
  const [activeTab, setActiveTab] = useState('home');
  const [statusMsg, setStatusMsg] = useState({ text: '', type: '' });
  
  // 2. LOGIC EXTRACTION (Hooks)
  const { user, loading } = useAuth();
  const { theme, setTheme, isDark, isAtTop, isNavbarShrunk } = useTheme();
  
  const showToast = (text, type = 'success') => {
    setStatusMsg({ text, type });
    setTimeout(() => setStatusMsg({ text: '', type: '' }), 4000);
  };

  const {
    spots, unlockedSpots, visitData, spotStreaks,
    username, tempUsername, setTempUsername,
    showEmail, lastChange, customRadius, leaderboard,
    claimSpot, saveUsername, toggleEmailVisibility,
    removeSpot, updateRadius, resetTimer, addNewSpot, deleteSpotFromDB
  } = useGameLogic(user, showToast);

  // High-accuracy location + proximity check
  // ADDED: canClaim (for the 10m check)
  const { userLocation, mapCenter, isNearSpot, canClaim, activeSpotId } = useGeoLocation(spots, customRadius);

  // Magnetic refs for the interactive buttons
  const themeMag = useMagnetic();
  const logoutMag = useMagnetic();

  // 3. UI HELPERS
  const isAdmin = user?.id === ADMIN_UID;
  const colors = {
    bg: isDark ? 'bg-[#09090b]' : 'bg-[#f0f4f2]',
    card: isDark ? 'bg-zinc-900/40 border-white/[0.03] shadow-2xl' : 'bg-white/70 border-emerald-200/50 shadow-md shadow-emerald-900/5',
    nav: isDark ? 'bg-zinc-900/80 border-white/[0.05]' : 'bg-white/95 border-emerald-200/60',
    text: isDark ? 'text-zinc-100' : 'text-zinc-900',
    glass: isDark ? 'bg-white/[0.02] backdrop-blur-xl border-white/[0.05]' : 'bg-white/40 backdrop-blur-xl border-white/20'
  };

  const handleLogout = async () => {
    const { supabase } = await import('./supabase');
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  // 4. AUTH & LOADING SCREENS
  if (loading) return (
    <div className={`min-h-screen ${colors.bg} flex items-center justify-center`}>
      <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!user) return (
    <Login theme={theme} setTheme={setTheme} isDark={isDark} colors={colors} />
  );

  return (
    <div className={`min-h-screen relative ${colors.bg} ${colors.text} pb-36 transition-colors duration-500`}>
      
      {/* Visual Feedback Layer */}
      <Toast statusMsg={statusMsg} />

      {/* THEME TOGGLE */}
      <ThemeToggle 
        themeMag={themeMag} 
        setTheme={setTheme} 
        isDark={isDark} 
        isAtTop={isAtTop} 
      />

      {/* USER HEADER */}
      <Header 
        isAdmin={isAdmin} 
        username={username} 
        email={user?.email} 
        showEmail={showEmail} 
        isDark={isDark} 
        logoutMag={logoutMag} 
        handleLogout={handleLogout} 
      />

      {/* Main Content Sections */}
      <div className="max-w-md mx-auto px-6 -mt-16 relative z-30">
        {activeTab === 'home' && (
          <HomeTab 
            isNearSpot={isNearSpot} 
            canClaim={canClaim}       // ADDED: For the 10m logic
            userLocation={userLocation} // ADDED: For distance display
            activeSpotId={activeSpotId}
            claimSpot={claimSpot}
            totalPoints={unlockedSpots.reduce((sum, id) => {
              const basePoints = spots[id]?.points || 0;
              const multiplier = (visitData?.streak || 0) > 1 ? 1.1 : 1.0;
              return sum + Math.round(basePoints * multiplier);
            }, 0)} 
            foundCount={unlockedSpots.length} 
            unlockedSpots={unlockedSpots} 
            spots={spots} 
            colors={colors} 
            streak={visitData?.streak || 0}
            spotStreaks={spotStreaks} 
          />
        )}
        
        {activeTab === 'leaderboard' && (
          <LeaderboardTab leaderboard={leaderboard} username={username} colors={colors} />
        )}
        
        {activeTab === 'explore' && (
          <ExploreTab 
            mapCenter={mapCenter} 
            userLocation={userLocation} 
            isDark={isDark} 
            spots={spots} 
            unlockedSpots={unlockedSpots}
            radius={customRadius}
            colors={colors} 
          />
        )}
        
        {activeTab === 'profile' && (
          <ProfileTab 
            tempUsername={tempUsername} 
            setTempUsername={setTempUsername} 
            saveUsername={saveUsername} 
            showEmail={showEmail} 
            toggleEmailVisibility={toggleEmailVisibility} 
            colors={colors} 
            isDark={isDark} 
            lastChange={lastChange}
            user={user}
          />
        )}
        
        {activeTab === 'dev' && isAdmin && (
          <AdminTab 
            spots={spots} 
            unlockedSpots={unlockedSpots} 
            claimSpot={claimSpot} 
            removeSpot={removeSpot} 
            isDark={isDark} 
            colors={colors} 
            userLocation={userLocation} 
            currentRadius={customRadius} 
            updateRadius={updateRadius} 
            resetTimer={resetTimer} 
            addNewSpot={addNewSpot} 
            deleteSpotFromDB={deleteSpotFromDB} 
          />
        )}
      </div>

      {/* DYNAMIC BOTTOM NAVIGATION WRAPPER */}
      <div className={`
        fixed bottom-8 left-0 right-0 z-[5000] px-8
        transition-all duration-700 cubic-bezier(0.16, 1, 0.3, 1)
        ${isNavbarShrunk 
          ? 'translate-y-[150%] opacity-0 scale-95 pointer-events-none' 
          : 'translate-y-0 opacity-100 scale-100 pointer-events-auto'}
      `}>
        <Navbar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          isAdmin={isAdmin} 
          colors={colors}
          isShrunk={isNavbarShrunk} 
        />
      </div>
    </div>
  );
}
