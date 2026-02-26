"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { signUp } from "@/lib/actions/auth";
import { Loader2 } from "lucide-react";

export default function SignupPage() {
  const [role, setRole] = useState<"admin" | "client">("admin");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError("");
    formData.set("role", role);
    const result = await signUp(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <Card className="border shadow-sm">
      <CardHeader className="text-center pb-2">
        <CardTitle className="text-2xl">Creează cont</CardTitle>
        <CardDescription>Începe să colaborezi pe ContaSync</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg border border-red-200">
              {error}
            </div>
          )}
          {/* Role selector */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-lg">
            <button
              type="button"
              onClick={() => setRole("admin")}
              className={cn(
                "py-2 text-sm font-medium rounded-md transition-colors",
                role === "admin"
                  ? "bg-white text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Sunt contabil
            </button>
            <button
              type="button"
              onClick={() => setRole("client")}
              className={cn(
                "py-2 text-sm font-medium rounded-md transition-colors",
                role === "client"
                  ? "bg-white text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Sunt client
            </button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Nume complet</Label>
            <Input id="name" name="name" placeholder="Ion Popescu" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="ion@firma.ro"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Parolă</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="Min. 8 caractere"
              required
              minLength={8}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">Confirmă parola</Label>
            <Input
              id="confirm"
              name="confirm"
              type="password"
              placeholder="••••••••"
              required
            />
          </div>
          <Button
            className="w-full"
            size="lg"
            type="submit"
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
            Creează cont
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Ai deja cont?{" "}
            <Link
              href="/login"
              className="text-primary font-medium hover:underline"
            >
              Autentifică-te
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
