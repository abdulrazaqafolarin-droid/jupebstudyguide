import { useState, useMemo } from 'react';
import { ACHIEVEMENTS, Achievement } from '@/hooks/useAchievements';
import { useUserStorage } from '@/hooks/useUserStorage';
import AchievementBadge from '@/components/AchievementBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Crown, Swords, Search, Trophy, Star } from 'lucide-react';
import { WorkspacePageHeader } from '@/components/WorkspacePageHeader';
import WorkspaceAchievementProgress from '@/components/WorkspaceAchievementProgress';
import { cn } from '@/lib/utils';

const RARITIES = ['all', 'legendary', 'epic', 'rare', 'uncommon', 'common'] as const;
type RarityFilter = (typeof RARITIES)[number];

const rarityLabel: Record<string, string> = {
  all: 'All',
  legendary: 'Legendary',
  epic: 'Epic',
  rare: 'Rare',
  uncommon: 'Uncommon',
  common: 'Common',
};

const rarityColor: Record<string, string> = {
  all: 'bg-primary/10 text-primary border-primary/20',
  legendary: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  epic: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  rare: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  uncommon: 'bg-green-500/10 text-green-400 border-green-500/20',
  common: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
};

export default function AchievementsPage() {
  const [unlockedIds] = useUserStorage<string[]>('achievements-unlocked', []);
  const [rarityFilter, setRarityFilter] = useState<RarityFilter>('all');
  const [search, setSearch] = useState('');

  const unlockedSet = useMemo(() => new Set(unlockedIds), [unlockedIds]);

  const filtered = useMemo(() => {
    return ACHIEVEMENTS.filter(a => {
      if (rarityFilter !== 'all' && a.rarity !== rarityFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!a.name.toLowerCase().includes(q) && !a.description.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [rarityFilter, search]);

  const stats = useMemo(() => {
    const total = ACHIEVEMENTS.length;
    const unlocked = unlockedIds.length;
    const byRarity = { legendary: 0, epic: 0, rare: 0, uncommon: 0, common: 0 } as Record<string, number>;
    const totalByRarity = { legendary: 0, epic: 0, rare: 0, uncommon: 0, common: 0 } as Record<string, number>;
    ACHIEVEMENTS.forEach(a => {
      totalByRarity[a.rarity]++;
      if (unlockedSet.has(a.id)) byRarity[a.rarity]++;
    });
    return { total, unlocked, byRarity, totalByRarity };
  }, [unlockedIds, unlockedSet]);

  const pct = stats.total > 0 ? (stats.unlocked / stats.total) * 100 : 0;

  return (
    <div className="min-h-screen bg-background">
      <WorkspacePageHeader title="Achievements" backTo="/" backLabel="Back to JUPEB workspace" icon={Trophy} />

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <WorkspaceAchievementProgress
          unlockedCount={stats.unlocked}
          totalCount={stats.total}
          percentage={pct}
          badges={(
            <>
              {(['legendary', 'epic', 'rare'] as const).map((rarity) => stats.byRarity[rarity] > 0 && (
                <span
                  key={rarity}
                  className={cn(
                    "flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
                    rarity === "legendary" && "bg-yellow-500/20 text-yellow-500",
                    rarity === "epic" && "bg-purple-500/20 text-purple-400",
                    rarity === "rare" && "bg-blue-500/20 text-blue-400",
                  )}
                >
                  {rarity === "legendary" && <Crown className="h-3 w-3" />}
                  {rarity === "epic" && <Swords className="h-3 w-3" />}
                  {stats.byRarity[rarity]}/{stats.totalByRarity[rarity]}
                </span>
              ))}
            </>
          )}
        />

        {/* Search + Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search achievements..."
              className="pl-9 bg-background"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {RARITIES.map(r => (
            <button
              key={r}
              onClick={() => setRarityFilter(r)}
              className={cn(
                'text-xs px-3 py-1.5 rounded-full border transition-all font-medium',
                rarityFilter === r ? rarityColor[r] : 'border-border text-muted-foreground hover:text-foreground hover:bg-secondary/50',
              )}
            >
              {r === 'all' ? `All (${ACHIEVEMENTS.length})` : `${rarityLabel[r]} (${stats.totalByRarity[r]})`}
            </button>
          ))}
        </div>

        {/* Achievements grid */}
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((achievement, i) => (
            <div
              key={achievement.id}
              className="animate-in-up"
              style={{ animationDelay: `${i * 0.03}s` }}
            >
              <AchievementBadge
                achievement={achievement}
                unlocked={unlockedSet.has(achievement.id)}
                size="md"
              />
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16">
            <Star className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-muted-foreground">No achievements match your filters</p>
            {(rarityFilter !== 'all' || search) && (
              <Button variant="ghost" size="sm" className="mt-2" onClick={() => { setRarityFilter('all'); setSearch(''); }}>
                Clear filters
              </Button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
