import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  const navigate = useNavigate();

  useEffect(() => {
    if (localStorage.getItem("token")) {
      navigate("/dashboard");
    }
  }, [navigate]);

  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "login") {
        const res = await fetch("http://localhost:8080/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });
        if (!res.ok) {
          setError("Invalid username or password");
          return;
        }
        const data = await res.json();
        localStorage.setItem("token", data.token);
        localStorage.setItem("username", username);
        navigate("/dashboard");
      } else {
        const res = await fetch("http://localhost:8080/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });
        if (!res.ok) {
          setError("Registration failed. Username may already be taken.");
          return;
        }
        const data = await res.json();
        localStorage.setItem("token", data.token);
        localStorage.setItem("username", username);
        navigate("/onboarding");
      }
    } catch {
      setError("Failed to connect to server");
    } finally {
      setLoading(false);
    }
  }

  function switchMode(m: "login" | "register") {
    setMode(m);
    setError("");
    setUsername("");
    setPassword("");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-center text-xl">
              Akari <span className="text-muted-foreground">明かり</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Input
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
              />
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
              <Button type="submit" disabled={loading}>
                {loading
                  ? mode === "login" ? "Signing in..." : "Creating account..."
                  : mode === "login" ? "Sign in" : "Create account"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="flex justify-center gap-1 text-sm text-muted-foreground">
          {mode === "login" ? (
            <>
              <span>Don't have an account?</span>
              <button
                type="button"
                onClick={() => switchMode("register")}
                className="text-foreground underline underline-offset-4"
              >
                Register
              </button>
            </>
          ) : (
            <>
              <span>Already have an account?</span>
              <button
                type="button"
                onClick={() => switchMode("login")}
                className="text-foreground underline underline-offset-4"
              >
                Sign in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
