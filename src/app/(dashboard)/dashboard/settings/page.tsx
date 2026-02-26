"use client";

import { useState, useEffect, useTransition } from "react";
import { DashboardHeader } from "@/components/contasync/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Lock, Loader2 } from "lucide-react";
import { getProfile, updateProfile, updatePassword } from "@/lib/actions/auth";
import { createClient } from "@/lib/supabase/client";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [userName, setUserName] = useState("Client");

  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState("");
  const [profileError, setProfileError] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    async function loadProfile() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setEmail(user.email || "");

        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, phone")
          .eq("id", user.id)
          .single();

        if (profile) {
          setName(profile.full_name || "");
          setPhone(profile.phone || "");
          setUserName(profile.full_name || "Client");
        }
      }
      setLoading(false);
    }
    loadProfile();
  }, []);

  function handleSaveProfile() {
    setProfileSaving(true);
    setProfileError("");
    setProfileSuccess("");

    const formData = new FormData();
    formData.set("full_name", name);
    formData.set("phone", phone);

    startTransition(async () => {
      const result = await updateProfile(formData);
      if (result.error) {
        setProfileError(result.error);
      } else {
        setProfileSuccess("Profilul a fost actualizat cu succes!");
        setUserName(name || "Client");
      }
      setProfileSaving(false);
    });
  }

  function handleChangePassword() {
    if (newPassword !== confirmPassword) {
      setPasswordError("Parolele nu coincid.");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("Parola trebuie sa aiba minim 6 caractere.");
      return;
    }

    setPasswordSaving(true);
    setPasswordError("");
    setPasswordSuccess("");

    const formData = new FormData();
    formData.set("password", newPassword);

    startTransition(async () => {
      const result = await updatePassword(formData);
      if (result.error) {
        setPasswordError(result.error);
      } else {
        setPasswordSuccess("Parola a fost schimbata cu succes!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
      setPasswordSaving(false);
    });
  }

  if (loading) {
    return (
      <>
        <DashboardHeader title="Setari cont" userName="Client" />
        <div className="p-4 lg:p-6 flex items-center justify-center min-h-[50vh]">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      </>
    );
  }

  return (
    <>
      <DashboardHeader title="Setari cont" userName={userName} />

      <div className="p-4 lg:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Profile Card */}
          <Card className="border border-border shadow-none">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-blue-50">
                  <User className="size-4 text-blue-600" />
                </div>
                <CardTitle className="text-base font-semibold">Profil</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nume complet</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  disabled
                  className="opacity-60"
                />
                <p className="text-xs text-muted-foreground">
                  Email-ul nu poate fi modificat.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefon</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              {profileError && (
                <p className="text-sm text-red-600">{profileError}</p>
              )}
              {profileSuccess && (
                <p className="text-sm text-emerald-600">{profileSuccess}</p>
              )}

              <Button
                className="w-full"
                onClick={handleSaveProfile}
                disabled={profileSaving}
              >
                {profileSaving ? (
                  <>
                    <Loader2 className="size-4 animate-spin mr-2" />
                    Se salveaza...
                  </>
                ) : (
                  "Salveaza"
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Security Card */}
          <Card className="border border-border shadow-none">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-amber-50">
                  <Lock className="size-4 text-amber-600" />
                </div>
                <CardTitle className="text-base font-semibold">
                  Securitate
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Parola curenta</Label>
                <Input
                  id="current-password"
                  type="password"
                  placeholder="Introdu parola curenta"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password">Parola noua</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="Introdu parola noua"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirma parola</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="Repeta parola noua"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              {passwordError && (
                <p className="text-sm text-red-600">{passwordError}</p>
              )}
              {passwordSuccess && (
                <p className="text-sm text-emerald-600">{passwordSuccess}</p>
              )}

              <Button
                className="w-full"
                disabled={
                  !currentPassword ||
                  !newPassword ||
                  newPassword !== confirmPassword ||
                  passwordSaving
                }
                onClick={handleChangePassword}
              >
                {passwordSaving ? (
                  <>
                    <Loader2 className="size-4 animate-spin mr-2" />
                    Se schimba...
                  </>
                ) : (
                  "Schimba parola"
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
