import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserAvatar } from '@/components/UserAvatar';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ArrowLeft, Camera, DollarSign, Loader2, LogOut, Mail, MessageCircle, Trash2, ShieldAlert } from 'lucide-react';
import { ADMIN_EMAIL } from '@/lib/adminEmail';
import { toast } from 'sonner';

export default function ProfilePage() {
  const { profile, loading, updateProfile, uploadAvatar } = useProfile();
  const { signOut, user, deleteAccount } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (profile) setDisplayName(profile.display_name ?? '');
  }, [profile]);

  const handleAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      toast.error('Image must be under 4MB');
      return;
    }
    setUploading(true);
    const { error } = await uploadAvatar(file);
    setUploading(false);
    if (error) toast.error('Upload failed: ' + error.message);
    else toast.success('Avatar updated');
    e.target.value = '';
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await updateProfile({ display_name: displayName.trim() });
    setSaving(false);
    if (error) toast.error('Save failed');
    else toast.success('Profile saved');
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    const { error } = await deleteAccount();
    if (error) {
      toast.error(error.message || 'Failed to delete account');
      setDeleting(false);
      return;
    }
    toast.success('Account deleted permanently');
    navigate('/auth');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-lg border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back</span>
          </button>
          <h1 className="font-semibold text-foreground">Profile</h1>
          <Button variant="ghost" size="sm" onClick={async () => { await signOut(); }} className="text-muted-foreground hover:text-foreground">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        {/* Avatar section */}
        <section className="animate-in-up stagger-1">
          <div className="bg-card rounded-2xl border border-border p-8 chalk-texture relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />
            <div className="relative flex flex-col items-center gap-4">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary via-accent to-primary rounded-full blur-lg opacity-50 group-hover:opacity-75 transition-opacity duration-500" />
                <UserAvatar
                  url={profile?.avatar_url}
                  name={profile?.display_name ?? user?.email}
                  className="w-28 h-28 ring-2 ring-primary/20 relative"
                />
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="absolute bottom-0 right-0 w-10 h-10 rounded-full bg-gradient-to-r from-primary to-accent text-primary-foreground flex items-center justify-center shadow-xl hover:scale-110 active:scale-95 transition-all duration-200 disabled:opacity-50 border-2 border-background"
                  title="Change avatar"
                >
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatar}
                />
              </div>
              <p className="text-sm text-muted-foreground bg-secondary/30 px-3 py-1 rounded-full">{user?.email}</p>
            </div>
          </div>
        </section>

        {/* Display name */}
        <section className="animate-in-up stagger-2">
          <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
            <Label htmlFor="name" className="text-sm font-semibold">Display name</Label>
            <Input
              id="name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="How others see you"
              maxLength={40}
              className="bg-background"
            />
            <Button onClick={handleSave} disabled={saving} className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save changes
            </Button>
          </div>
        </section>

        {/* Activation codes */}
        <section className="animate-in-up stagger-3">
          <div className="bg-gradient-to-br from-accent/10 to-accent/5 rounded-2xl p-6 border border-accent/20 relative overflow-hidden">
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-accent/10 rounded-full blur-3xl" />
            <div className="relative">
              <h3 className="text-base font-semibold flex items-center gap-2 mb-3">
                <DollarSign className="w-5 h-5 text-accent" />
                Need more activation codes?
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Contact the administrator to purchase additional tokens for yourself or friends.
              </p>
              <div className="flex flex-col gap-2">
                <a
                  href={`mailto:${ADMIN_EMAIL}`}
                  className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 bg-background/60 hover:bg-background/80 rounded-xl px-4 py-3 transition-all border border-border/50"
                >
                  <Mail className="w-4 h-4 shrink-0 text-accent" />
                  {ADMIN_EMAIL}
                </a>
                <a
                  href="https://wa.me/2348124504552?text=Hi%20I%20want%20to%20purchase%20a%20JUPEB%20Master%20activation%20code"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 bg-background/60 hover:bg-background/80 rounded-xl px-4 py-3 transition-all border border-border/50"
                >
                  <MessageCircle className="w-4 h-4 shrink-0 text-accent" />
                  08124504552 (WhatsApp)
                </a>
                <a
                  href="https://wa.me/2347043353166?text=Hi%20I%20want%20to%20purchase%20a%20JUPEB%20Master%20activation%20code"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 bg-background/60 hover:bg-background/80 rounded-xl px-4 py-3 transition-all border border-border/50"
                >
                  <MessageCircle className="w-4 h-4 shrink-0 text-accent" />
                  07043353166 (WhatsApp)
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Delete Account */}
        <section className="animate-in-up stagger-4">
          <div className="bg-gradient-to-br from-destructive/10 to-destructive/5 rounded-2xl p-6 border border-destructive/20 relative overflow-hidden">
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-destructive/10 rounded-full blur-3xl" />
            <div className="relative">
              <h3 className="text-base font-semibold flex items-center gap-2 mb-3 text-destructive">
                <Trash2 className="w-5 h-5" />
                Delete Account
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Permanently delete your account and all associated data. This action cannot be undone.
              </p>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
                className="w-full sm:w-auto hover:scale-105 active:scale-95 transition-all duration-200"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Account
              </Button>
            </div>
          </div>
        </section>
      </main>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="w-5 h-5" />
              Delete your account?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                This will permanently delete your account, your profile, your chat history,
                and all your study data. This action cannot be undone.
              </p>
              <div className="bg-destructive/5 rounded-lg p-3 border border-destructive/20">
                <p className="text-xs font-medium mb-2">
                  Type <strong className="text-destructive">DELETE</strong> to confirm:
                </p>
                <Input
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  placeholder="DELETE"
                  className="font-mono text-sm uppercase"
                  autoComplete="off"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteConfirm !== 'DELETE' || deleting}
              onClick={handleDeleteAccount}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {deleting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Deleting...</>
              ) : (
                <><Trash2 className="w-4 h-4 mr-2" /> Delete Forever</>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
