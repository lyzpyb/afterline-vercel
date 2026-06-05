import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Phone, PhoneOff, PhoneCall } from "lucide-react";

const CALLER = {
  id: "1",
  name: "沈彦希",
  role: "篮球队学长",
  image: "https://s3plus.meituan.net/mcopilot-pub/nocode-task/chenyanbo/ujnj6kjw27ro1feytk76v2lr4ztv2r/ep1_60s.jpg",
};

const Call = () => {
  const navigate = useNavigate();
  const { dramaId } = useParams();

  // Vibration + ringtone
  useEffect(() => {
    if (navigator.vibrate) {
      const id = setInterval(() => navigator.vibrate([400, 200, 400]), 1200);
      return () => { clearInterval(id); navigator.vibrate(0); };
    }
  }, []);

  useEffect(() => {
    // iOS 17 原版 Opening 铃声
    const audio = new Audio(
      "https://s3plus.meituan.net/mcopilot-pub/nocode-task/chenyanbo/zmmsqqlhctcgy35orqmrgi6rams2o2/Opening.m4a"
    );
    audio.loop = true;
    audio.volume = 0.85;
    audio.play().catch(() => {});
    return () => {
      audio.pause();
      audio.src = "";
    };
  }, []);

  const handleAccept = () => {
    navigate(`/chat/${dramaId}/${CALLER.id}`);
  };

  const handleDecline = () => {
    navigate(`/player/${dramaId}`, { replace: true });
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        maxWidth: "480px",
        margin: "0 auto",
        background: "linear-gradient(180deg, #1a1a2e 0%, #0d0d1a 40%, #0d0d0d 100%)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Top: label + name */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: "72px", paddingBottom: "16px" }}>
        <p style={{ color: "rgba(245,240,235,0.45)", fontSize: "11px", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "10px", fontFamily: "sans-serif" }}>
          来电
        </p>
        <h2 style={{ color: "#F5F0EB", fontSize: "28px", fontWeight: "700", fontFamily: "serif", margin: 0 }}>
          {CALLER.name}
        </h2>
        <p style={{ color: "rgba(232,168,124,0.65)", fontSize: "13px", marginTop: "6px", fontFamily: "sans-serif" }}>
          {CALLER.role}
        </p>
      </div>

      {/* Center: avatar */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ position: "relative", width: "200px", height: "200px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {/* Pulse rings */}
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                width: "200px",
                height: "200px",
                borderRadius: "50%",
                border: "1.5px solid rgba(232,168,124,0.2)",
                animation: `pulse ${2.4}s ease-out ${i * 0.7}s infinite`,
              }}
            />
          ))}
          {/* Avatar */}
          <div style={{ width: "170px", height: "170px", borderRadius: "50%", overflow: "hidden", border: "3px solid rgba(232,168,124,0.5)", boxShadow: "0 0 40px rgba(232,168,124,0.2)" }}>
            <img src={CALLER.image} alt={CALLER.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
          {/* Phone icon */}
          <div style={{ position: "absolute", bottom: "8px", right: "8px", width: "40px", height: "40px", borderRadius: "50%", background: "rgba(13,13,13,0.7)", display: "flex", alignItems: "center", justifyContent: "center", animation: "phonePulse 0.7s ease-in-out infinite" }}>
            <PhoneCall size={18} color="#E8A87C" />
          </div>
        </div>
      </div>

      {/* Bottom: buttons + hint */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingBottom: "56px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", width: "100%", paddingLeft: "64px", paddingRight: "64px", marginBottom: "32px" }}>
          {/* Decline */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
            <button
              onClick={handleDecline}
              style={{ width: "64px", height: "64px", borderRadius: "50%", background: "linear-gradient(135deg,#E53935,#C62828)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 6px 24px rgba(229,57,53,0.45)" }}
            >
              <PhoneOff size={26} color="#fff" />
            </button>
            <span style={{ color: "rgba(245,240,235,0.55)", fontSize: "13px", fontFamily: "sans-serif" }}>拒接</span>
          </div>
          {/* Accept */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
            <button
              onClick={handleAccept}
              style={{ width: "64px", height: "64px", borderRadius: "50%", background: "linear-gradient(135deg,#43A047,#2E7D32)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 6px 24px rgba(67,160,71,0.45)" }}
            >
              <Phone size={26} color="#fff" />
            </button>
            <span style={{ color: "rgba(245,240,235,0.55)", fontSize: "13px", fontFamily: "sans-serif" }}>接听</span>
          </div>
        </div>
        <p style={{ color: "rgba(245,240,235,0.3)", fontSize: "13px", fontFamily: "sans-serif", textAlign: "center", padding: "0 32px", lineHeight: "1.5" }}>
          接听电话，开始和沈彦希的故事
        </p>
      </div>

      <style>{`
        @keyframes pulse {
          0%   { transform: scale(1);   opacity: 0.6; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes phonePulse {
          0%, 100% { transform: scale(1); }
          50%       { transform: scale(1.15); }
        }
      `}</style>
    </div>
  );
};

export default Call;
