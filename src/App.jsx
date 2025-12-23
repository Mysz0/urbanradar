import React, { useState, useEffect } from 'react';
import { MapPin, Trophy, User, Home, Map, LogIn, LogOut, ChevronRight } from 'lucide-react';
import { supabase } from './supabase'; 

const SPOTS = {
  'spot-001': { id: 'spot-001', name: 'Central Park Fountain', lat: 40.7829, lng: -73.9654, radius: 100, points: 50 },
  'spot-002': { id: 'spot-002', name: 'Brooklyn Bridge', lat: 40.7061, lng: -73.9969, radius: 100, points: 75 },
  'spot-003': { id: 'spot-003', name: 'Times Square', lat: 40.7580, lng: -73.9855, radius: 100, points: 100 },
  'spot-004': { id: 'spot-004', name: 'Empire State Building', lat: 40.7484, lng: -73.9857, radius: 100, points: 150 },
  'spot-005': { id: 'spot-005', name: 'Statue of Liberty', lat: 40.6892, lng: -74.0445, radius: 100, points: 200 },
};

export default function App() {
  const [unlockedSpots, setUnlockedSpots] = useState([]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('home');
  const [loading, setLoading] = useState(true);

  // 1. Initialize Auth and Load Data
  useEffect(() => {
    const initApp = async () => {
      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      handleUserSession(session);
      setLoading(false);
    };

    const handleUserSession = async (session) => {
      if (session?.user) {
        setUser(session.user);
        // Fetch progress from 'profiles' table
        const { data, error } = await supabase
          .from('profiles')
          .select('unlocked_spots')
          .eq('id', session.user.id)
          .single();
        
        if (data) {
          setUnlockedSpots(data.unlocked_spots || []);
        } else if (error && error.code === 'PGRST116') {
          // If profile doesn't exist yet, we'll create it on the first "Find"
          setUnlockedSpots([]);
        }
      } else {
        setUser(null);
      }
    };

    initApp();

    // Listen for Login/Logout changes
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      handleUserSession(session);
    });

    // Check for NFC Scan in URL (?spot=spot-001)
    const params = new URLSearchParams(window.location.search);
    const spotId = params.get('spot');
    if (spotId) verifyAndUnlock(spotId);

    return () => authListener.subscription.unsubscribe();
  }, []);

  // 2. Core Scavenger Hunt Logic
  const verifyAndUnlock = async (spotId) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      alert("Please log in first to claim this spot!");
      return;
    }

    setIsVerifying(true);
    try {
      const position = await new Promise((res, rej) => 
        navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true })
      );
      
      const spot = SPOTS[spotId];
      if (!spot) throw new Error("Invalid Spot");

      // Simple Distance Check
      const dist = Math.sqrt(
        Math.pow(position.coords.latitude - spot.lat, 2) + 
        Math.pow(position.coords.longitude - spot.lng, 2)
      ) * 111320;

      if (dist <= spot.radius) {
        // Prevent duplicates
        if (!unlockedSpots.includes(spotId)) {
          const newSpots = [...unlockedSpots, spotId];
          const newPoints = newSpots.reduce((sum, id) => sum + (SPOTS[id]?.points || 0), 0);

          // CRITICAL: Save to Supabase Profiles Table
          const { error } = await supabase
            .from('profiles')
            .upsert({ 
              id: session.user.id, 
              unlocked_spots: newSpots, 
              total_points: newPoints 
            });

          if (error) throw error;
          
          setUnlockedSpots(newSpots);
          alert(`🎉 SUCCESS! You found ${spot.name}!`);
        } else {
          alert("You've already claimed this location!");
        }
      } else {
        alert(`Too far! You are roughly ${Math.round(dist)} meters away.`);
      }
    } catch (err) {
      console.error(err);
      alert("Verification failed. Make sure GPS is on.");
    } finally {
      setIsVerifying(false);
    }
  };

  const totalPoints = unlockedSpots.reduce((sum, id) => sum + (SPOTS[id]?.points || 0), 0);

  // 3. Loading State
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
    </div>
  );

  // 4. LOGIN SCREEN (Show this if user is null)
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white p-6">
        <div className="w-20 h-20 bg-emerald-500 rounded-3xl flex items-center justify-center mb-6 rotate-3 shadow-2xl shadow-emerald-500/20">
          <MapPin size={40} />
        </div>
        <h1 className="text-4xl font-bold mb-2 tracking-tight">SpotHunt</h1>
        <p className="mb-8 opacity-60 text-center max-w-[280px]">
          Discover secret locations in the real world. Sign in to save your progress.
        </p>
        <button 
          onClick={() => supabase.auth.signInWithOAuth({ 
            provider: 'github',
            options: { redirectTo: window.location.origin }
          })}
          className="bg-white text-black px-10 py-4 rounded-2xl font-bold flex items-center gap-3 active:scale-95 transition-all shadow-xl"
        >
          <LogIn size={20}/> Login with GitHub
        </button>
      </div>
    );
  }

  // 5. MAIN APP UI (Show this if user is logged in)
  return (
    <div className="min-h-screen bg-slate-50 pb-32">
      {/* Header */}
      <div className="bg-slate-900 text-white p-6 pt-12 rounded-b-[40px] shadow-lg">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Explorer</h1>
            <p className="text-emerald-400 text-xs font-mono opacity-80">{user.email}</p>
          </div>
          <button 
            onClick={() => supabase.auth.signOut()} 
            className="p-3 bg-slate-800 rounded-2xl text-slate-400 hover:text-white"
          >
            <LogOut size={20}/>
          </button>
        </div>
      </div>

      <div className="max-w-md mx-auto px-6 -mt-8">
        {activeTab === 'home' && (
          <div className="space-y-6">
            <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100 flex justify-between items-center">
              <div>
                <p className="text-5xl font-black text-slate-900">{totalPoints}</p>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Total Points</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-slate-900">{unlockedSpots.length}/{Object.keys(SPOTS).length}</p>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Found</p>
              </div>
            </div>

            <h2 className="text-xl font-bold text-slate-800 px-1">Your Journey</h2>
            <div className="space-y-3">
              {unlockedSpots.length === 0 ? (
                <div className="bg-slate-200/50 border-2 border-dashed border-slate-300 rounded-3xl p-10 text-center">
                  <p className="text-slate-500 font-medium italic">No spots found yet. Go exploring!</p>
                </div>
              ) : (
                unlockedSpots.map(id => (
                  <div key={id} className="bg-white p-4 rounded-2xl flex items-center justify-between border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center text-white">
                        <Trophy size={20} />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{SPOTS[id].name}</p>
                        <p className="text-xs text-emerald-600 font-bold">+{SPOTS[id].points} PTS</p>
                      </div>
                    </div>
                    <ChevronRight className="text-slate-300" />
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'map' && (
          <div className="pt-6 space-y-4">
            <h2 className="text-xl font-bold text-slate-800 px-1">Location Hints</h2>
            {Object.values(SPOTS).map(spot => {
              const found = unlockedSpots.includes(spot.id);
              return (
                <div key={spot.id} className={`p-5 rounded-3xl border-2 transition-all ${found ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-100'}`}>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${found ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                        {found ? <MapPin size={18}/> : <span className="font-black">?</span>}
                      </div>
                      <p className={`font-bold ${found ? 'text-slate-800' : 'text-slate-300'}`}>
                        {found ? spot.name : "Unknown Location"}
                      </p>
                    </div>
                    <span className="text-xs font-black text-slate-400">{spot.points} PTS</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Navigation Bar */}
      <nav className="fixed bottom-8 left-6 right-6 bg-slate-900 rounded-[32px] p-2 shadow-2xl z-50">
        <div className="flex justify-around items-center">
          <button 
            onClick={() => setActiveTab('home')} 
            className={`p-4 rounded-2xl transition-all ${activeTab === 'home' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/40 scale-110' : 'text-slate-500'}`}
          >
            <Home size={24}/>
          </button>
          <button 
            onClick={() => setActiveTab('map')} 
            className={`p-4 rounded-2xl transition-all ${activeTab === 'map' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/40 scale-110' : 'text-slate-500'}`}
          >
            <Map size={24}/>
          </button>
        </div>
      </nav>

      {/* Verification Loading Overlay */}
      {isVerifying && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm flex flex-col items-center justify-center z-[100] text-white">
          <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-6"></div>
          <p className="font-black text-2xl tracking-[0.2em] animate-pulse">VERIFYING GPS</p>
        </div>
      )}
    </div>
  );
}
