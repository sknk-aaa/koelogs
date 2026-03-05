import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { fetchBeginnerMissionGate } from "./beginnerMissionGate";

type GateState = "loading" | "completed" | "blocked";

export default function RequireBeginnerMissionsCompleted() {
  const { me } = useAuth();
  const [state, setState] = useState<GateState>("loading");

  useEffect(() => {
    let cancelled = false;

    if (!me) {
      setState("blocked");
      return () => {
        cancelled = true;
      };
    }

    setState("loading");
    void (async () => {
      const gate = await fetchBeginnerMissionGate();
      if (cancelled) return;
      setState(gate?.completed ? "completed" : "blocked");
    })();

    return () => {
      cancelled = true;
    };
  }, [me]);

  if (state === "loading") {
    return <div style={{ padding: 16, opacity: 0.7 }}>Loading...</div>;
  }

  if (state === "blocked") {
    return <Navigate to="/mypage" replace />;
  }

  return <Outlet />;
}
