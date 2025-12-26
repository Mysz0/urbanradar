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

export default function App() {
  // 1. SHARED UI STATE
  const [activeTab, setActiveTab] = useState('home');
  const [statusMsg, setStatusMsg] = useState({ text: '', type: '' });
  
  // 2. LOGIC EXTRACTION (Hooks)
  const { user, loading } = useAuth();
  
  const { 
    theme, 
    setTheme, 
    isDark, 
    isAtTop, 
    isNavbarShrunk,
    appStyle,     
    setAppStyle   
  } = useTheme();
  
  const showToast = (text, type = 'success') => {
    setStatusMsg({ text, type });
    setTimeout(() => setStatusMsg({ text: '', type: '' }), 4000);
  };

  const {
    spots, unlockedSpots, visitData, spotStreaks,
    username, tempUsername, setTempUsername,
    userRole, totalPoints,
    showEmail, lastChange, customRadius, leaderboard,
    claimSpot, saveUsername, toggleEmailVisibility,
    removeSpot, updateRadius, resetTimer, addNewSpot, deleteSpotFromDB,
    updateNodeStreak
  } = useGameLogic(user, showToast);

  // High-accuracy location + proximity check (Locked to 20m in logic)
  const { userLocation, mapCenter, isNearSpot, canClaim, activeSpotId } = useGeoLocation(spots, customRadius, spotStreaks);

  // Magnetic refs for the interactive buttons
  const themeMag = useMagnetic();
  const logoutMag = useMagnetic();

  // 3. UI HELPERS - ROLE BASED
  const isAdmin = userRole === 'admin'; 
  
  const colors = {
    bg: isDark ? 'bg-[var(--theme-map-bg-dark)]' : 'bg-[var(--theme-map-bg-light)]',
    card: 'smart-glass border-white/[0.03] shadow-2xl',
    nav: 'smart-glass border-white/[0.05]',
    text: isDark ? 'text-zinc-100' : 'text-[var(--theme-text-light)]',
    glass: 'smart-glass'
  };

  const handleLogout = async () => {
    const { supabase } = await import('./supabase');
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  // 4. AUTH & LOADING SCREENS
  if (loading) return (
    <div className={`min-h-screen ${colors.bg} flex items-center justify-center`}>
      <div className="w-6 h-6 border-2 border-theme-primary border-t-transparent rounded-full animate-spin" 
           style={{ borderColor: 'rgb(var(--theme-primary))', borderTopColor: 'transparent' }} />
    </div>
  );

  if (!user) return (
    <Login theme={theme} setTheme={setTheme} isDark={isDark} colors={colors} />
  );

  return (
    <div className={`min-h-screen relative ${colors.bg} ${colors.text} pb-36 transition-all duration-700 ease-in-out`}>
      
      <Toast statusMsg={statusMsg} />

      <ThemeToggle 
        themeMag={themeMag} 
        setTheme={setTheme} 
        isDark={isDark} 
        isAtTop={isAtTop} 
      />

      <Header 
        isAdmin={isAdmin} 
        username={username} 
        email={user?.email} 
        showEmail={showEmail} 
        isDark={isDark} 
        logoutMag={logoutMag} 
        handleLogout={handleLogout} 
        streak={visitData?.streak || 0} // <--- Added this to feed your new icon
      />

      <div className="max-w-md mx-auto px-6 -mt-16 relative z-30">
        {activeTab === 'home' && (
          <HomeTab 
            isNearSpot={isNearSpot} 
            canClaim={canClaim}
            userLocation={userLocation}
            activeSpotId={activeSpotId}
            claimSpot={claimSpot}
            totalPoints={totalPoints}
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
            appStyle={appStyle}     
            setAppStyle={setAppStyle} 
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
            spotStreaks={spotStreaks}
            updateNodeStreak={updateNodeStreak}
          />
        )}
      </div>

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
