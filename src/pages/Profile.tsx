import { useEffect, useRef, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserAvatar } from '@/components/UserAvatar';
import AchievementBadge from '@/components/AchievementBadge';
import EliteBadge from '@/components/EliteBadge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Camera, Crown, DollarSign, Loader2, LogOut, Mail, MessageCircle, Medal, Settings, ShieldAlert, Sparkles, Swords, Trash2, Trophy } from 'lucide-react';
import { ADMIN_EMAIL } from '@/lib/adminEmail';
import { toast } from 'sonner';
import { ACHIEVEMENTS, Achievement } from '@/hooks/useAchievements';
import { useUserStorage } from '@/hooks/useUserStorage';
import { cn } from '@/lib/utils';

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

  // Achievements
  const [unlockedIds] = useUserStorage<string[]>('achievements-unlocked', []);
  const unlockedAchievements = useMemo(
    () => ACHIEVEMENTS.filter(a => unlockedIds.includes(a.id)),
    [unlockedIds],
  );
  const ordered = useMemo(() => {
    const order = { legendary: 0, epic: 1, rare: 2, uncommon: 3, common: 4 };
    return [...unlockedAchievements].sort((a, b) => order[a.rarity] - order[b.rarity]);
  }, [unlockedAchievements]);

  const legendary = unlockedAchievements.filter(a => a.rarity === 'legendary').length;
  const epic = unlockedAchievements.filter(a => a.rarity === 'epic').length;
  const rare = unlockedAchievements.filter(a => a.rarity === 'rare').length;

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
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={() => navigate('/settings/profile')} className="text-muted-foreground hover:text-foreground">
              <Settings className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={async () => { await signOut(); }} className="text-muted-foreground hover:text-foreground">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
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

        {/* Achievements Showcase */}
        {unlockedAchievements.length > 0 && (
          <section className="animate-in-up stagger-3">
            <div className="bg-card rounded-2xl border border-border p-6 space-y-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />
              <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-accent/5 rounded-full blur-3xl" />

              <div className="relative">
                {/* Header */}
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-base font-semibold flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-primary" />
                    Achievements
                    <span className="text-xs font-normal text-muted-foreground ml-1">
                      ({unlockedAchievements.length})
                    </span>
                  </h3>
                  <div className="flex items-center gap-2">
                    {legendary > 0 && (
                      <span className="text-[10px] bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-500 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                        <Crown className="w-3 h-3" /> {legendary}
                      </span>
                    )}
                    {epic > 0 && (
                      <span className="text-[10px] bg-gradient-to-r from-purple-500/20 to-violet-500/20 text-purple-400 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                        <Swords className="w-3 h-3" /> {epic}
                      </span>
                    )}
                    {rare > 0 && (
                      <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full font-medium">
                        {rare} rare
                      </span>
                    )}
                  </div>
                </div>

                {/* Elite Showcase - Legendary + Epic badges */}
                {ordered.filter(a => a.rarity === 'legendary' || a.rarity === 'epic').length > 0 && (
                  <div className="bg-gradient-to-br from-yellow-500/5 via-purple-500/5 to-accent/5 rounded-xl border border-primary/10 p-5">
                    <div className="flex items-center gap-1.5 mb-4">
                      <Medal className="w-4 h-4 text-primary" />
                      <span className="text-xs font-semibold text-primary">Elite Achievements</span>
                      <Sparkles className="w-3 h-3 text-yellow-400" />
                    </div>
                    <div className="flex flex-wrap gap-5 justify-center">
                      {ordered.filter(a => a.rarity === 'legendary' || a.rarity === 'epic').map((achievement, i) => (
                        <motion.div
                          key={achievement.id}
                          initial={{ opacity: 0, scale: 0.8, y: 20 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          transition={{ delay: i * 0.1, duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                        >
                          <EliteBadge achievement={achievement} unlocked featured />
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {/* All unlocked badges grid */}
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {ordered.filter(a => a.rarity !== 'legendary' && a.rarity !== 'epic').slice(0, 12).map((achievement, i) => (
                    <motion.div
                      key={achievement.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04, duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                      className="flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-200 hover:bg-secondary/40 group cursor-default"
                    >
                      <AchievementBadge
                        achievement={achievement}
                        unlocked={true}
                        size="md"
                        showDetails={false}
                      />
                      <p className="text-[10px] text-muted-foreground text-center leading-tight group-hover:text-foreground transition-colors line-clamp-2">
                        {achievement.name}
                      </p>
                    </motion.div>
                  ))}
                </div>

                {unlockedAchievements.length > 12 && (
                  <Link
                    to="/achievements"
                    className="flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-primary hover:text-primary/80 transition-colors group border-t border-border/50 pt-3"
                  >
                    View all {unlockedAchievements.length} achievements
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Activation codes */}
        <section className="animate-in-up stagger-4">
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
