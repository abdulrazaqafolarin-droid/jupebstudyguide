import { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Users, Globe, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

type PrivacyOption = 'everyone' | 'friends' | 'nobody';

interface PrivacySetting {
  key: string;
  label: string;
  description: string;
  value: PrivacyOption;
  onChange: (value: PrivacyOption) => void;
}

const options: { value: PrivacyOption; label: string; icon: typeof Globe }[] = [
  { value: 'everyone', label: 'Everyone', icon: Globe },
  { value: 'friends', label: 'Friends Only', icon: Users },
  { value: 'nobody', label: 'Nobody', icon: EyeOff },
];

export function PrivacyToggle({ label, description, value, onChange }: PrivacySetting) {
  return (
    <div className="space-y-3">
      <div>
        <h4 className="text-sm font-medium flex items-center gap-2">
          <Shield className="w-3.5 h-3.5 text-primary" />
          {label}
        </h4>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <div className="flex gap-2">
        {options.map((opt) => {
          const Icon = opt.icon;
          const isActive = value === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => onChange(opt.value)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all border',
                isActive
                  ? 'bg-primary/10 border-primary/30 text-primary'
                  : 'bg-secondary/30 border-border/40 text-muted-foreground hover:bg-secondary/50'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function PrivacySettings({
  avatarPrivacy,
  profilePrivacy,
  onAvatarChange,
  onProfileChange,
}: {
  avatarPrivacy: PrivacyOption;
  profilePrivacy: PrivacyOption;
  onAvatarChange: (v: PrivacyOption) => void;
  onProfileChange: (v: PrivacyOption) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      <PrivacyToggle
        key="avatar"
        label="Profile Picture Privacy"
        description="Who can see your profile picture?"
        value={avatarPrivacy}
        onChange={onAvatarChange}
      />
      <div className="h-px bg-border/50" />
      <PrivacyToggle
        key="profile"
        label="Profile Privacy"
        description="Who can view your profile details?"
        value={profilePrivacy}
        onChange={onProfileChange}
      />
    </motion.div>
  );
}
