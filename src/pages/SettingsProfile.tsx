import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, Save, Check } from 'lucide-react';
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
import { toast } from 'sonner';

export default function SettingsProfile() {
  const { user } = useAuth();
  const { profile, loading, updateProfile, uploadAvatar } = useProfile();
  const { compressImage } = useImageCompression();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarPrivacy, setAvatarPrivacy] = useState<'everyone' | 'friends' | 'nobody'>('everyone');
  const [profilePrivacy, setProfilePrivacy] = useState<'everyone' | 'friends' | 'nobody'>('everyone');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.display_name ?? '');
    setBio((profile as any).bio ?? '');
    setAvatarPrivacy((profile as any).privacy_avatar ?? 'everyone');
    setProfilePrivacy((profile as any).privacy_profile ?? 'everyone');
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
    setSaving(true);
    const { error: nameErr } = await updateProfile({ display_name: displayName.trim() });
    if (nameErr) { toast.error('Save failed'); setSaving(false); return; }

    const { error: metaErr } = await supabase
      .from('profiles')
      .update({
        bio: bio.trim() || null,
        privacy_avatar: avatarPrivacy,
        privacy_profile: profilePrivacy,
      })
      .eq('user_id', user!.id);

    if (metaErr) toast.error('Privacy settings failed: ' + metaErr.message);
    else toast.success('Profile saved!');
    setSaving(false);
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
            onAvatarChange={setAvatarPrivacy}
            onProfileChange={setProfilePrivacy}
          />
        </motion.section>
      </main>
    </div>
  );
}
