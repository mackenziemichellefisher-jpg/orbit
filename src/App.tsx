import { useEffect, useState } from "react";
import { Orbit } from "lucide-react";
import { AppProvider } from "./store";
import { useAuth } from "./auth";
import { supabase } from "@/lib/supabase";
import { AuthScreen } from "./components/AuthScreen";
import { Onboarding } from "./components/Onboarding";
import { TabBar } from "./components/TabBar";
import { PoolsTab } from "./components/PoolsTab";
import { MapTab } from "./components/MapTab";
import { FeedTab } from "./components/FeedTab";
import { ProfileTab } from "./components/ProfileTab";
import { RollModal } from "./components/RollModal";
import type { TabKey } from "./types";

function App() {
  const { user, loading } = useAuth();
  const [tab, setTab] = useState<TabKey>("feed");
  const [rollOpen, setRollOpen] = useState(false);
  const [profileReady, setProfileReady] = useState(false);
  const [checkingProfile, setCheckingProfile] = useState(false);

  useEffect(() => {
    if (!user) {
      setProfileReady(false);
      return;
    }
    let mounted = true;
    setCheckingProfile(true);
    supabase.from("profiles").select("id").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (mounted) {
        setProfileReady(Boolean(data));
        setCheckingProfile(false);
      }
    });
    return () => { mounted = false; };
  }, [user]);

  if (loading || (user && checkingProfile)) {
    return (
      <div className="min-h-screen cosmic-bg flex items-center justify-center">
        <div className="text-center">
          <div className="logo-stage scale-90">
            <div className="logo-mark"><Orbit size={28} /></div>
          </div>
          <p className="text-sm font-semibold text-[var(--text-muted)] mt-2">Charting your orbit...</p>
        </div>
      </div>
    );
  }

  if (!user) return <AuthScreen />;
  if (!profileReady) return <Onboarding onComplete={() => setProfileReady(true)} />;

  return (
    <AppProvider>
      <div className="min-h-screen cosmic-bg text-[var(--text-primary)] max-w-md mx-auto relative">
        {tab === "feed" && <FeedTab />}
        {tab === "map" && <MapTab />}
        {tab === "pools" && <PoolsTab />}
        {tab === "profile" && <ProfileTab />}
        <TabBar active={tab} onChange={setTab} onRoll={() => setRollOpen(true)} />
        <RollModal open={rollOpen} onClose={() => setRollOpen(false)} />
      </div>
    </AppProvider>
  );
}

export default App;
