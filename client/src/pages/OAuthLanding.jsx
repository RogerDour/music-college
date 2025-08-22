import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function OAuthLanding() {
  const [sp] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = sp.get("token");
    if (!token) {
      navigate("/login?error=missing_token");
      return;
    }
    (async () => {
      try {
        localStorage.setItem("token", token);
        // fetch profile to fill user cache
        const me = await axios.get(`${API}/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        localStorage.setItem("user", JSON.stringify(me.data || {}));
        localStorage.setItem("role", me.data?.role || "");
        navigate("/dashboard"); // or / after login
      } catch (e) {
        console.error("OAuth landing error:", e);
        navigate("/login?error=profile");
      }
    })();
  }, [sp, navigate]);

  return null;
}
