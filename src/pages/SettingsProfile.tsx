import { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, Save, Check, Sun, Moon, Shield, Sparkles, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useImageCompression } from '@/hooks/useImageCompression';
import { AvatarCropper } from '@/components/profile/AvatarCropper';
import { PrivacySettings } from '@/components/profile/PrivacySettings';
import { supabase } from '@/integrations/supabase/client';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  MAX_SCHOOL_NAME_LENGTH,
  normalizeSchoolName,
  normalizeSeatNumber,
  parseSeatNumber,
} from '@/lib/profile-fields';

export default function SettingsProfile() {
  const { user } = useAuth();
  const { profile, loading, updateProfile, uploadAvatar } = useProfile();
  const { compressImage } = useImageCompression();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [seatNumber, setSeatNumber] = useState('');
  const [avatarPrivacy, setAvatarPrivacy] = useState<'everyone' | 'friends' | 'nobody'>('everyone');
  const [profilePrivacy, setProfilePrivacy] = useState<'everyone' | 'friends' | 'nobody'>('everyone');
  const [lastSeenPrivacy, setLastSeenPrivacy] = useState<'everyone' | 'friends' | 'nobody'>('everyone');
  const [readReceiptsPrivacy, setReadReceiptsPrivacy] = useState<'everyone' | 'friends' | 'nobody'>('everyone');
  const [activityStatusPrivacy, setActivityStatusPrivacy] = useState<'everyone' | 'friends' | 'nobody'>('everyone');
  const [onlineStatusPrivacy, setOnlineStatusPrivacy] = useState<'everyone' | 'friends' | 'nobody'>('everyone');
  const [groupsPrivacy, setGroupsPrivacy] = useState<'everyone' | 'friends' | 'nobody'>('everyone');
  const { theme, setTheme } = useTheme();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  // Inline hint while typing: the field is optional, but a half-typed
  // number must not be saved as-is.
  const seatInvalid =
    seatNumber.trim().length > 0 && parseSeatNumber(seatNumber).status === 'invalid';

  useEffect(() => {
    if (!profile) return;
    const asPrivacy = (v: string | null): 'everyone' | 'friends' | 'nobody' =>
      v === 'friends' || v === 'nobody' ? v : 'everyone';
    setDisplayName(profile.display_name ?? '');
    setBio(profile.bio ?? '');
    setSchoolName(profile.school_name ?? '');
    setSeatNumber(profile.exam_seat_number ?? '');
    setAvatarPrivacy(asPrivacy(profile.privacy_avatar));
    setProfilePrivacy(asPrivacy(profile.privacy_profile));
    setLastSeenPrivacy(asPrivacy(profile.privacy_last_seen));
    setReadReceiptsPrivacy(asPrivacy(profile.privacy_read_receipts));
    setActivityStatusPrivacy(asPrivacy(profile.privacy_activity_status));
    setOnlineStatusPrivacy(asPrivacy(profile.privacy_online_status));
    setGroupsPrivacy(asPrivacy(profile.privacy_groups));
  }, [profile]);

  const handleAvatarUpload = useCallback(async (file: File) => {
    if (!user) return;
    setUploading(true);
    try {
      let uploadFile: File;
      if (file.type.startsWith('image/')) {
        const compressed = await compressImage(file, 512, 0.8);
        uploadFile = new File([compressed], file.name, { type: file.type });
      } else {
        uploadFile = file;
      }

      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from('avatars')
        .upload(path, uploadFile, { upsert: true, contentType: uploadFile.type });

      if (upErr) {
        toast.error('Upload failed: ' + upErr.message);
        return;
      }

      const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path);
      const { error: updErr } = await updateProfile({ avatar_url: pub.publicUrl });

      if (updErr) toast.error('Update failed: ' + updErr.message);
      else toast.success('Avatar updated!');
    } catch (err) {
      toast.error('Something went wrong');
    }
    setUploading(false);
  }, [user, updateProfile, compressImage]);

  const handleSave = async () => {
    if (!user) return;
    const seat = parseSeatNumber(seatNumber);
    if (seat.status === 'invalid') {
      toast.error('Exam seat number should be the last 3 or 4 digits of your ID card.');
      return;
    }
    setSaving(true);
    const { error: nameErr } = await updateProfile({ display_name: displayName.trim() });
    if (nameErr) { toast.error('Save failed'); setSaving(false); return; }

    const { error: metaErr } = await supabase
      .from('profiles')
      .update({
        bio: bio.trim() || null,
        school_name: normalizeSchoolName(schoolName),
        exam_seat_number: seat.status === 'valid' ? seat.value : null,
        privacy_avatar: avatarPrivacy,
        privacy_profile: profilePrivacy,
        privacy_last_seen: lastSeenPrivacy,
        privacy_read_receipts: readReceiptsPrivacy,
        privacy_activity_status: activityStatusPrivacy,
        privacy_online_status: onlineStatusPrivacy,
        privacy_groups: groupsPrivacy,
      })
      .eq('user_id', user.id);

    if (metaErr) toast.error('Privacy settings failed: ' + metaErr.message);
    else toast.success('Profile saved!');
    setSaving(false);
  };

  const handleThemeChange = (t: 'dark' | 'light') => {
    setTheme(t);
    // Mirror to the profile so the choice follows the student across devices.
    if (user) {
      supabase
        .from('profiles')
        .update({ theme_preference: t })
        .eq('user_id', user.id)
        .then(({ error }) => {
          if (error) console.warn('Theme preference not saved:', error.message);
        });
    }
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
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-xl hover:bg-accent transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-bold text-base">Settings</h1>
            <p className="text-[10px] text-muted-foreground -mt-0.5">Profile & Privacy</p>
          </div>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="ml-auto h-8 text-xs rounded-lg"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Check className="w-3.5 h-3.5 mr-1" />}
            Save
          </Button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Avatar */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl border border-border p-6"
        >
          <h3 className="text-sm font-semibold mb-4">Profile Picture</h3>
          <AvatarCropper
            currentUrl={profile?.avatar_url}
            currentName={profile?.display_name ?? user?.email}
            uploading={uploading}
            onFileSelect={handleAvatarUpload}
          />
        </motion.section>

        {/* Display Name */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-card rounded-2xl border border-border p-6 space-y-3"
        >
          <Label htmlFor="name" className="text-sm font-semibold">Display Name</Label>
          <Input
            id="name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="How others see you"
            maxLength={40}
            className="bg-background"
          />
        </motion.section>

        {/* Bio */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card rounded-2xl border border-border p-6 space-y-3"
        >
          <Label htmlFor="bio" className="text-sm font-semibold">Bio</Label>
          <Textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="A short description about yourself"
            maxLength={160}
            rows={3}
            className="bg-background resize-none"
          />
          <p className="text-[10px] text-muted-foreground text-right">{bio.length}/160</p>
        </motion.section>

        {/* School tag + exam seat number */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.115 }}
          className="bg-card rounded-2xl border border-border p-6 space-y-5"
        >
          <div className="space-y-3">
            <Label htmlFor="school" className="text-sm font-semibold flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4 text-primary" />
              School
            </Label>
            <Input
              id="school"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              placeholder="e.g. Baptist High School"
              maxLength={MAX_SCHOOL_NAME_LENGTH}
              className="bg-background"
            />
            <p className="text-[10px] text-muted-foreground">
              Shown as a tag on your profile everywhere it appears — leaderboard, chat, groups.
            </p>
          </div>
          <div className="space-y-3">
            <Label htmlFor="seat" className="text-sm font-semibold">Exam seat number</Label>
            <Input
              id="seat"
              value={seatNumber}
              onChange={(e) => setSeatNumber(e.target.value)}
              placeholder="Last 3 or 4 digits on your ID card"
              inputMode="numeric"
              maxLength={12}
              className={cn('bg-background', seatInvalid && 'border-destructive focus-visible:ring-destructive')}
            />
            <p className={cn('text-[10px]', seatInvalid ? 'text-destructive' : 'text-muted-foreground')}>
              {seatInvalid ? 'Type the last 3 or 4 digits — e.g. 4321' : 'Optional. Only you can see it.'}
            </p>
          </div>
        </motion.section>

        {/* Appearance */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.13 }}
          className="bg-card rounded-2xl border border-border p-6"
        >
          <h3 className="text-sm font-semibold mb-4">Appearance</h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Theme</p>
              <p className="text-xs text-muted-foreground">Switch between dark and light mode</p>
            </div>
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
              <button
                onClick={() => handleThemeChange('dark')}
                className={`p-2 rounded-md transition-all ${theme === 'dark' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                title="Dark mode"
              >
                <Moon className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleThemeChange('light')}
                className={`p-2 rounded-md transition-all ${theme === 'light' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                title="Light mode"
              >
                <Sun className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.section>

        {/* Replay welcome tour */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.14 }}
        >
          <button
            onClick={() => navigate('/onboarding?replay=1')}
            className="w-full flex items-center justify-between bg-card rounded-2xl border border-border p-5 hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold">Replay welcome tour</p>
                <p className="text-xs text-muted-foreground"> revisit theme, study plan &amp; chat setup</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
        </motion.section>

        {/* Security */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
        >
          <Link
            to="/settings/security"
            className="flex items-center justify-between bg-card rounded-2xl border border-border p-5 hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold">Security</p>
                <p className="text-xs text-muted-foreground">Two-factor authentication</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </Link>
        </motion.section>

        {/* Privacy */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-card rounded-2xl border border-border p-6 space-y-3"
        >
          <h3 className="text-sm font-semibold mb-1">Privacy Controls</h3>
          <PrivacySettings
            avatarPrivacy={avatarPrivacy}
            profilePrivacy={profilePrivacy}
            lastSeenPrivacy={lastSeenPrivacy}
            readReceiptsPrivacy={readReceiptsPrivacy}
            activityStatusPrivacy={activityStatusPrivacy}
            onlineStatusPrivacy={onlineStatusPrivacy}
            groupsPrivacy={groupsPrivacy}
            onAvatarChange={setAvatarPrivacy}
            onProfileChange={setProfilePrivacy}
            onLastSeenChange={setLastSeenPrivacy}
            onReadReceiptsChange={setReadReceiptsPrivacy}
            onActivityStatusChange={setActivityStatusPrivacy}
            onOnlineStatusChange={setOnlineStatusPrivacy}
            onGroupsChange={setGroupsPrivacy}
          />
        </motion.section>
      </main>
    </div>
  );
}
