import React, { useState, useEffect } from 'react';
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
import StoreTab from './components/Tabs/StoreTab';
import Login from './components/Auth/Login';
import Toast from './components/UI/Toast';
import ThemeToggle from './components/UI/ThemeToggle';
import ThemeAtmosphere from './components/UI/ThemeAtmosphere';

export default function App() {
  // 1. SHARED UI STATE
  const [activeTab, setActiveTab] = useState('home');
  const [statusMsg, setStatusMsg] = useState({ text: '', type: '' });
  
  // 2. LOGIC EXTRACTION (Hooks)
  const { user, loading } = useAuth();
  
  const {
    mode,
    setMode,
    // ALIASING: mapping new names to old names so Login.jsx doesn't break
    mode: theme,
    setMode: setTheme,
    appStyle,
    setAppStyle,
    isDark,
    isAtTop,
    isNavbarShrunk
  } = useTheme();

  const showToast = (text, type = 'success') => {
    setStatusMsg({ text, type });
    setTimeout(() => setStatusMsg({ text: '', type: '' }), 4000);
  };

  const {
    spots, unlockedSpots, visitData, spotStreaks,
    username, tempUsername, setTempUsername,
    userRole, totalPoints,
    showEmail, lastChange, leaderboard,
    claimSpot, saveUsername, toggleEmailVisibility,
    removeSpot, resetTimer, addNewSpot, deleteSpotFromDB,
    updateNodeStreak,
    handleVote,
    shopItems,
    inventory,
    buyItem,
    activateItem,
    bonuses,
    customRadius,      
    claimRadius,        
    updateRadius,      
    updateClaimRadius,  
    detectionOptions,  
    claimOptions,
    fetchProfile 
  } = useGameLogic(user, showToast);

  const { userLocation, mapCenter, isNearSpot, canClaim, activeSpotId, radiusBonus } = useGeoLocation(
    user,
    spots, 
    customRadius, 
    spotStreaks, 
    claimRadius,
    bonuses?.radiusBonus || 0
  );

  const themeMag = useMagnetic();
  const logoutMag = useMagnetic();

  const isAdmin = userRole === 'admin'; 

  const handleLogout = async () => {
    const { supabase } = await import('./supabase');
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  // UPDATED: Loading screen now uses theme variables
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--theme-map-bg)]">
      <div className="w-8 h-8 border-4 border-[rgb(var(--theme-primary))] border-t-transparent rounded-full animate-spin shadow-[var(--theme-primary-glow)]" />
    </div>
  );

  if (!user) return (
    <Login theme={theme} setTheme={setTheme} isDark={isDark} />
  );

  return (
    <div className="min-h-screen relative pb-36 transition-all duration-700 ease-in-out bg-[var(--theme-map-bg)] text-[var(--theme-text-title)]">
      
      {/* 🚀 COMPLEX UI OVERLAYS (Winter frost, Sakura petals, etc.) */}
      <ThemeAtmosphere activeStyle={appStyle} />

      <Toast statusMsg={statusMsg} />

      <ThemeToggle 
        themeMag={themeMag} 
        setTheme={setMode} 
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
      />

      <main className="max-w-md mx-auto px-6 -mt-16 relative z-30">
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
            streak={visitData?.streak || 0}
            spotStreaks={spotStreaks} 
            isDark={isDark}
          />
        )}
        
        {activeTab === 'leaderboard' && (
          <LeaderboardTab leaderboard={leaderboard} username={username} spots={spots} isDark={isDark} />
        )}
        
        {activeTab === 'explore' && (
          <ExploreTab
            key={`explore-map-${bonuses?.radiusBonus}`}
            mapCenter={mapCenter} 
            userLocation={userLocation} 
            isDark={isDark} 
            spots={spots} 
            unlockedSpots={unlockedSpots}
            claimRadius={claimRadius}
            customRadius={customRadius}
            onVote={handleVote}
            radiusBonus={bonuses?.radiusBonus || 0}
          />
        )}
        
        {activeTab === 'profile' && (
          <ProfileTab 
            tempUsername={tempUsername} 
            setTempUsername={setTempUsername} 
            saveUsername={saveUsername} 
            showEmail={showEmail} 
            toggleEmailVisibility={toggleEmailVisibility} 
            isDark={isDark} 
            lastChange={lastChange}
            user={user}
            appStyle={appStyle}     
            setAppStyle={setAppStyle}
            showToast={showToast}
            visitData={visitData}
          />
        )}

        {activeTab === 'store' && (
          <StoreTab 
            totalPoints={totalPoints} 
            isDark={isDark} 
            shopItems={shopItems} 
            inventory={inventory} 
            onBuy={buyItem}
            onActivate={activateItem}
          />
        )} 

        {activeTab === 'dev' && isAdmin && (
          <AdminTab 
            spots={spots} 
            unlockedSpots={unlockedSpots} 
            claimSpot={claimSpot} 
            removeSpot={removeSpot} 
            isDark={isDark} 
            userLocation={userLocation} 
            currentRadius={customRadius} 
            updateRadius={updateRadius} 
            detectionOptions={detectionOptions}
            currentClaimRadius={claimRadius}
            updateClaimRadius={updateClaimRadius}
            claimOptions={claimOptions}
            resetTimer={resetTimer} 
            addNewSpot={addNewSpot} 
            deleteSpotFromDB={deleteSpotFromDB}
            spotStreaks={spotStreaks}
            updateNodeStreak={updateNodeStreak}
            fetchProfile={fetchProfile} 
          />
        )}
      </main>

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
          isShrunk={isNavbarShrunk} 
        />
      </div>
    </div>
  );
}
