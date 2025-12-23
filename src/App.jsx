import React, { useState, useEffect } from 'react';
import { MapPin, Trophy, User, Home, Compass, LogOut, Save, Navigation } from 'lucide-react';
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
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState('');
  const [tempUsername, setTempUsername] = useState('');
  const [activeTab, setActiveTab] = useState('home');
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const initApp = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        fetchProfile(session.user.id);
      }
      setLoading(false);
    };

    const fetchProfile = async (userId) => {
      const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (data) {
        setUnlockedSpots(data.unlocked_spots || []);
        setUsername(data.username || '');
        setTempUsername(data.username || '');
      }
    };

    initApp();
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  const saveUsername = async () => {
    setIsSaving(true);
    const cleanedUsername = tempUsername.replace('@', '').trim();
    const { error } = await supabase.from('profiles').upsert({ id: user.id, username: cleanedUsername });
    if (!error) { setUsername(cleanedUsername); alert("Profile Updated!"); }
    setIsSaving(false);
  };

  const openInMaps = (lat, lng) => {
    const url = `http://maps.apple.com/?daddr=${lat},${lng}`;
    window.open(url, '_blank');
  };

  const totalPoints = unlockedSpots.reduce((sum, id) => sum + (SPOTS[id]?.points || 0), 0);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-900 text-emerald-500 font-black">LOADING...</div>;

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white p-6 text-center">
        <div className="w-20 h-20 bg-emerald-500 rounded-3xl flex items-center justify-center mb-6 shadow-2xl rotate-3"><MapPin size={40} /></div>
        <h1 className="text-5xl font-black mb-6 italic">SPOT<span className="text-emerald-500">HUNT</span></h1>
        <button onClick={() => supabase.auth.signInWithOAuth({ provider: 'github', options: { redirectTo: window.location.origin } })}
          className="bg-white text-black px-10 py-4 rounded-2xl font-black shadow-xl">LOGIN WITH GITHUB</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-32">
      {/* FIXED HEADER - Increased padding to prevent overlap */}
      <div className="bg-slate-900 text-white p-8 pt-16 pb-20 rounded-b-[48px] shadow-2xl">
        <div className="max-w-md mx-auto flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-black tracking-tight uppercase text-emerald-500">
              {username ? `@${username}` : 'New Hunter'}
            </h1>
            <p className="text-slate-400 text-xs font-mono opacity-80 mt-1">{user.email}</p>
          </div>
          <button onClick={() => supabase.auth.signOut()} className="p-3 bg-slate-800 rounded-2xl text-slate-400"><LogOut size={20}/></button>
        </div>
      </div>

      <div className="max-w-md mx-auto px-6 -mt-12">
        {activeTab === 'home' && (
          <div className="space-y-8">
            {/* STATS CARD - Added clear internal padding */}
            <div className="bg-white rounded-[32px] p-8 shadow-xl border border-slate-100 flex justify-between items-center">
              <div>
                <p className="text-5xl font-black text-slate-900 leading-none">{totalPoints}</p>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Points</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-slate-900 leading-none">{unlockedSpots.length}</p>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Found</p>
              </div>
            </div>

            <h2 className="text-lg font-black text-slate-900 uppercase">Recent Activity</h2>
            <div className="space-y-3">
              {unlockedSpots.length === 0 ? (
                <div className="bg-slate-100 rounded-3xl p-10 text-center border-2 border-dashed border-slate-200">
                  <p className="text-slate-400 font-bold text-xs uppercase">No spots claimed yet</p>
                </div>
              ) : (
                [...unlockedSpots].reverse().map(id => (
                  <div key={id} className="bg-white p-5 rounded-3xl flex items-center gap-4 border border-slate-100 shadow-sm">
                    <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center"><Trophy size={20}/></div>
                    <div>
                      <p className="font-black text-slate-800 text-sm uppercase">{SPOTS[id].name}</p>
                      <p className="text-xs font-bold text-emerald-500">+{SPOTS[id].points} PTS</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'explore' && (
          <div className="space-y-4 pt-4">
            <h2 className="text-xl font-black text-slate-900 uppercase">Available Spots</h2>
            {Object.values(SPOTS).map(spot => {
              const found = unlockedSpots.includes(spot.id);
              return (
                <div key={spot.id} className={`p-6 rounded-[32px] border-2 transition-all ${found ? 'bg-emerald-50 border-emerald-200 opacity-60' : 'bg-white border-white shadow-md'}`}>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${found ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                        {found ? <Trophy size={20}/> : <Compass size={20}/>}
                      </div>
                      <div>
                        <p className="font-black text-slate-900 uppercase text-sm">{spot.name}</p>
                        <p className="text-xs font-bold text-slate-400">{spot.points} POINTS</p>
                      </div>
                    </div>
                    {!found && (
                      <button 
                        onClick={() => openInMaps(spot.lat, spot.lng)}
                        className="bg-slate-900 text-white p-3 rounded-2xl active:scale-90 transition-transform"
                      >
                        <Navigation size={20}/>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="space-y-6 pt-4">
            <div className="bg-white p-8 rounded-[32px] shadow-lg border border-slate-100">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 block">Edit Username</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400 text-lg">@</span>
                <input type="text" value={tempUsername} onChange={(e) => setTempUsername(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 pl-10 pr-4 font-black text-slate-800 focus:border-emerald-500 focus:outline-none"/>
              </div>
              <button onClick={saveUsername} disabled={isSaving}
                className="w-full mt-4 bg-slate-900 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2">
                <Save size={18}/> SAVE CHANGES
              </button>
            </div>
          </div>
        )}
      </div>

      {/* NAV BAR */}
      <nav className="fixed bottom-8 left-6 right-6 bg-slate-900 rounded-[32px] p-2 shadow-2xl z-50">
        <div className="flex justify-around items-center">
          <button onClick={() => setActiveTab('home')} className={`p-4 rounded-2xl ${activeTab === 'home' ? 'bg-emerald-500 text-white' : 'text-slate-500'}`}><Home size={24}/></button>
          <button onClick={() => setActiveTab('explore')} className={`p-4 rounded-2xl ${activeTab === 'explore' ? 'bg-emerald-500 text-white' : 'text-slate-500'}`}><Compass size={24}/></button>
          <button onClick={() => setActiveTab('profile')} className={`p-4 rounded-2xl ${activeTab === 'profile' ? 'bg-emerald-500 text-white' : 'text-slate-500'}`}><User size={24}/></button>
        </div>
      </nav>
    </div>
  );
}
