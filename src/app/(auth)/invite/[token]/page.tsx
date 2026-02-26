"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
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
import { Building2, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function InvitePage() {
  const params = useParams();
  const token = params.token as string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [invitation, setInvitation] = useState<{
    email: string;
    companies: any;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadInvitation() {
      const supabase = createClient();
      const { data } = await supabase
        .from("invitations")
        .select("email, companies:company_id(name)")
        .eq("token", token)
        .is("accepted_at", null)
        .single();

      if (data) {
        setInvitation(data as any);
      } else {
        setError("Invitația este invalidă sau a expirat.");
      }
      setLoading(false);
    }
    loadInvitation();
  }, [token]);

  async function handleSubmit(formData: FormData) {
    setSubmitting(true);
    setError("");

    const supabase = createClient();
    const name = formData.get("name") as string;
    const password = formData.get("password") as string;
    const confirm = formData.get("confirm") as string;

    if (password !== confirm) {
      setError("Parolele nu coincid.");
      setSubmitting(false);
      return;
    }

    // Sign up user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: invitation!.email,
      password,
      options: { data: { full_name: name, role: "client" } },
    });

    if (authError) {
      setError(authError.message);
      setSubmitting(false);
      return;
    }

    // Accept invitation via server API route (bypasses RLS)
    if (authData.user) {
      try {
        const res = await fetch("/api/invitations/accept", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, userId: authData.user.id }),
        });
        const result = await res.json();
        if (!res.ok) {
          console.error("[INVITE] Accept failed:", result.error);
          setError(result.error || "Eroare la acceptarea invitației.");
          setSubmitting(false);
          return;
        }
      } catch (err) {
        console.error("[INVITE] Network error:", err);
        setError("Eroare de rețea. Încearcă din nou.");
        setSubmitting(false);
        return;
      }
    }

    window.location.href = "/dashboard";
  }

  if (loading) {
    return (
      <Card className="border shadow-sm">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!invitation) {
    return (
      <Card className="border shadow-sm">
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border shadow-sm">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto mb-3 size-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Building2 className="size-6 text-primary" />
        </div>
        <CardTitle className="text-2xl">Ai fost invitat!</CardTitle>
        <CardDescription>
          <span className="font-semibold text-foreground">
            {Array.isArray(invitation.companies)
              ? invitation.companies[0]?.name
              : invitation.companies?.name}
          </span>{" "}
          te-a invitat pe ContaSync
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg border border-red-200">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="name">Nume complet</Label>
            <Input id="name" name="name" placeholder="Ion Popescu" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={invitation.email}
              disabled
              className="bg-muted"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Creează parolă</Label>
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
            disabled={submitting}
          >
            {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
            Acceptă invitația
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
