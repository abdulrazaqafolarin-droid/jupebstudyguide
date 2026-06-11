import { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react';
import { Send, ArrowLeft, Paperclip, Reply, X, Users, Check, CheckCheck, File, Music, Trash2, Edit3, Download, Loader2, Camera, Image, Mic, FileText, MapPin, User as UserIcon, Sticker, MessageCircle, Copy, Search, ChevronDown, ChevronUp, Phone, Mail, Info, Forward, Lock, Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Message, Conversation } from '@/hooks/useChat';
import { useAuth } from '@/contexts/AuthContext';
import { useImageCompression } from '@/hooks/useImageCompression';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { UserAvatar } from '@/components/UserAvatar';
import { MessageReactions } from './MessageReactions';
import { VoiceNotePlayer } from './VoiceNotePlayer';
import { VoiceRecorder } from './VoiceRecorder';
import { GroupInfoPanel } from './GroupInfoPanel';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { linkify, getDocTypeIcon, formatFileSize } from '@/lib/linkify';
import { safeMediaUrl, isValidUrl } from '@/lib/url';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface ChatAreaProps {
  messages: Message[];
  activeConversation: string | null;
  conversations: Conversation[];
  loading: boolean;
  onSend: (content: string, replyToId?: string | null) => void;
  onSendImage?: (imageUrl: string) => void;
  onSendFile?: (fileUrl: string, fileName: string, fileSize: number, fileType: string) => void;
  onReact?: (messageId: string, emoji: string) => void;
  onForward?: (messageId: string, targetConversationId: string) => void;
  onEditMessage?: (messageId: string, newContent: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onUploadImage?: (file: File) => Promise<string | null>;
  onUploadFile?: (file: File) => Promise<{ url: string | null; error: string | null }>;
  onBack?: () => void;
  isOnline: (userId: string) => boolean;
  isTyping: (userId: string) => boolean;
  isRecordingVn?: (userId: string) => boolean;
  getLastSeen?: (userId: string) => string | null;
  onTyping: (isTyping: boolean) => void;
  onRecordingVn?: (isRecording: boolean) => void;
  hasMoreMessages?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
  onProfileClick?: (userId: string) => void;
  onPushMessage?: (message: Message) => void;
  onBroadcastMessage?: (message: Message) => void;
  onQueueVoiceNote?: (conversationId: string, blob: Blob, senderId: string, duration: number) => void;
}



const DELETE_EVERYONE_WINDOW_MS = 48 * 60 * 60 * 1000;
const TYPING_TIMEOUT_MS = 3000;
const SCROLL_BOTTOM_THRESHOLD = 200;

const EMOJI_CATEGORIES: { name: string; emojis: string[] }[] = [
  { name: 'Smileys', emojis: ['😀','😁','😂','🤣','😊','😇','🙂','😉','😌','😍','🥰','😘','😗','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🫢','🫣','🤐','🤨','😐','😑','😶','🫡','😏','😒','🙄','😬','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤧','🥵','🥶','😎','🤓','🧐','😕','😟','🙁','😮','😯','😲','😳','🥺','😢','😭','😤','😠','😡','🤬','💀','☠️'] },
  { name: 'Gestures', emojis: ['👋','🤚','✋','🖐️','✌️','🤞','🫰','🤟','🤘','🤙','👈','👉','👆','🖕','👇','👍','👎','👊','✊','🤛','🤜','👏','🙌','🫶','👐','🤲','🤝','🙏','✍️','💅','🤳','💪','🦵','🦶','👂','🦻','👃','🧠','🫀','👀','👅','👄'] },
  { name: 'Hearts', emojis: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟','♥️'] },
  { name: 'Symbols', emojis: ['🔥','✨','🌟','⭐','💫','⚡','🌈','☀️','🌙','⭐','💥','💯','✅','❌','❓','❕','❗','➕','➖','➗','✖️','💲','🔒','🔓','🔑','🗝️','🎯','🎲','🎨','🎭','🎤','🎧','🎸','🎹','🎺','🎻','🥁','🎬','🎮','🕹️','♟️','🎪','🎟️','🎫'] },
  { name: 'Nature', emojis: ['🌹','🌸','🌺','🌻','🌷','🌿','🍀','🌵','🎄','🌲','🌳','🌴','🍁','🍂','🍃','🍄','🌾','💐','🌊','☄️','🌋','🌍','🌎','🌏','🪐','💫','⭐','🌙','☀️','🌈','☁️','❄️'] },
  { name: 'Food', emojis: ['🍎','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍈','🍒','🍑','🥭','🍍','🥥','🥝','🍅','🥑','🥦','🥬','🥒','🌶️','🫑','🥕','🧄','🧅','🥔','🍞','🥐','🥨','🧀','🥚','🍳','🥞','🧇','🥓','🍔','🌭','🍕','🫓','🥪','🥙','🧆','🌮','🌯','🫔','🥗','🥘','🍲','🍜','🍝','🍣','🥟','🍤','🍚','🍛','🍙','🍘','🍢','🍡','🍧','🍨','🍦','🍰','🧁','🍫','🍬','🍭','🍩','🍪','☕','🍵','🧃','🥤','🍺','🍻','🥂','🍷','🥃','🍸'] },
];
const EMOJIS = EMOJI_CATEGORIES.flatMap(c => c.emojis);

function TypingIndicator() {
  return (
    <div className="flex justify-start mb-2 pl-1">
      <div className="bg-secondary/80 rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1">
        <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
}

const MessageStatus = memo(function MessageStatus({ message, isOwn, isPending, canSeeReadReceipts }: { message: Message; isOwn: boolean; isPending?: boolean; canSeeReadReceipts?: boolean }) {
  if (!isOwn) return null;
  if (message.is_deleted) return null;

  if (isPending) {
    return <Loader2 className="w-3 h-3 text-muted-foreground/40 animate-spin inline" />;
  }

  const isRead = message.is_read || message.status === 'read' || !!message.read_at;
  const isDelivered = message.status === 'delivered' || !!message.delivered_at;

  if (isRead && canSeeReadReceipts !== false) {
    return <CheckCheck className="w-3.5 h-3.5 text-blue-400 inline" />;
  }
  if (isRead && canSeeReadReceipts === false) {
    return <CheckCheck className="w-3.5 h-3.5 text-muted-foreground/60 inline" />;
  }
  if (isDelivered) {
    return <CheckCheck className="w-3.5 h-3.5 text-muted-foreground/60 inline" />;
  }
  return <Check className="w-3.5 h-3.5 text-muted-foreground/60 inline" />;
});

const UploadProgressBar = memo(function UploadProgressBar({ progress }: { progress: number }) {
  return (
    <div className="w-full h-1 bg-secondary rounded-full overflow-hidden mt-1.5">
      <motion.div
        className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.3 }}
      />
    </div>
  );
});

const SWIPE_THRESHOLD = 40;
const VN_CANCEL_THRESHOLD = 60;
const VN_LOCK_THRESHOLD = -40;

const IMAGE_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/heic', 'image/heif'];
const SUPPORTED_FILE_TYPES = [
  ...IMAGE_MIME_TYPES,
  'video/mp4', 'video/webm',
  'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/aac', 'audio/flac',
  'application/pdf', 'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/csv',
  'application/zip', 'application/x-zip-compressed', 'application/x-rar-compressed', 'application/vnd.rar',
];

function renderLinkified(text: string) {
  const segments = linkify(text);
  return segments.map((seg, i) => {
    if (seg.type === 'url' && isValidUrl(seg.href)) {
      return <a key={i} href={seg.href!} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:opacity-80" onClick={e => e.stopPropagation()}>{seg.text}</a>;
    }
    if ((seg.type === 'email' || seg.type === 'phone') && isValidUrl(seg.href)) {
      return <a key={i} href={seg.href!} className="underline underline-offset-2 hover:opacity-80">{seg.text}</a>;
    }
    return <span key={i}>{seg.text}</span>;
  });
}

function renderHighlighted(text: string, query: string) {
  if (!query.trim()) return renderLinkified(text);
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  return parts.map((part, i) => {
    if (part.toLowerCase() === query.toLowerCase()) {
      return <span key={i} className="bg-yellow-300/40 dark:bg-yellow-500/30 rounded px-0.5 font-medium">{part}</span>;
    }
    return <span key={i}>{part}</span>;
  });
}

function parseLocationUrl(text: string): string | null {
  const match = text.match(/https:\/\/www\.google\.com\/maps\?q=([-\d.]+),([-\d.]+)/);
  return match ? `${match[1]},${match[2]}` : null;
}

function LocationCard({ text, isOwn }: { text: string; isOwn: boolean }) {
  const coords = parseLocationUrl(text);
  const cleanText = text.replace(/📍\s*My location:\s*/, '').replace(/https:\/\/www\.google\.com\/maps\?q=[-\d.]+,[-\d.]+/g, '').trim();
  if (!coords) {
    return <p className="whitespace-pre-wrap break-words">{renderLinkified(stripHtml(text))}</p>;
  }
  const [lat, lng] = coords.split(',');
  const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
  const geoUrl = `geo:${lat},${lng}`;
  return (
    <div>
      {cleanText && <p className="whitespace-pre-wrap break-words text-xs mb-1.5 opacity-80">{cleanText}</p>}
      <a
        href={/Android|iPhone|iPad/i.test(navigator.userAgent) ? geoUrl : mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block rounded-lg overflow-hidden border border-border/40 hover:opacity-95 transition-opacity group"
        onClick={e => e.stopPropagation()}
      >
        <div className={cn(
          'h-28 flex items-center justify-center text-xs relative',
          isOwn ? 'bg-primary-foreground/10' : 'bg-muted/60'
        )}>
          <img
            src={`https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=15&size=600x200&markers=${lat},${lng},red-pushpin`}
            alt="Map"
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
              (e.target as HTMLImageElement).parentElement!.classList.add('flex', 'items-center', 'justify-center');
              const span = document.createElement('span');
              span.className = 'text-xs text-muted-foreground flex items-center gap-1.5';
              span.innerHTML = '<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> View on Google Maps';
              (e.target as HTMLImageElement).parentElement!.appendChild(span);
            }}
          />
        </div>
        <div className={cn(
          'px-3 py-1.5 flex items-center gap-1.5',
          isOwn ? 'bg-primary-foreground/5' : 'bg-secondary/40'
        )}>
          <MapPin className="w-3 h-3 text-accent shrink-0" />
          <span className="text-[10px] font-medium truncate">{lat},{lng}</span>
        </div>
      </a>
    </div>
  );
}

function stripHtml(text: string): string {
  return text.replace(/<[a-zA-Z/][^>]*>/g, '');
}

const attachmentItems = [
  { key: 'camera', icon: Camera, label: 'Camera' },
  { key: 'gallery', icon: Image, label: 'Gallery' },
  { key: 'vn', icon: Mic, label: 'VN' },
  { key: 'document', icon: FileText, label: 'Document' },
  { key: 'location', icon: MapPin, label: 'Location' },
  { key: 'contact', icon: UserIcon, label: 'Contact' },
  { key: 'sticker', icon: Sticker, label: 'Sticker' },
] as const;

export function ChatArea({
  messages,
  activeConversation,
  conversations,
  loading,
  onSend,
  onSendImage,
  onSendFile,
  onReact,
  onEditMessage,
  onDeleteMessage,
  onUploadImage,
  onUploadFile,
  onBack,
  isOnline,
  isTyping,
  isRecordingVn,
  getLastSeen,
  onTyping,
  onRecordingVn,
  hasMoreMessages,
  loadingMore,
  onLoadMore,
  onProfileClick,
  onPushMessage,
  onBroadcastMessage,
  onQueueVoiceNote,
}: ChatAreaProps) {
  const { user } = useAuth();
  const { compressImage } = useImageCompression();
  const [input, setInput] = useState('');
  const [replyTo, setReplyTo_] = useState<Message | null>(null);
  const replyContentRef = useRef<string>('');
  const setReplyTo = useCallback((msg: Message | null) => {
    setReplyTo_(msg);
    replyContentRef.current = msg?.content || msg?.file_name || (msg?.message_type === 'image' ? 'Photo' : 'Message') || '';
  }, []);
  const [editingMessage, setEditingMessage] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);
  const [highlightedMsgId, setHighlightedMsgId] = useState<string | null>(null);
  const [showStickers, setShowStickers] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [unreadSinceScroll, setUnreadSinceScroll] = useState(0);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMatchIndex, setSearchMatchIndex] = useState(0);
  const [pickingLocation, setPickingLocation] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [activeActionsMsgId, setActiveActionsMsgId] = useState<string | null>(null);
  const [showContactForm, setShowContactForm] = useState(false);
  const [forwardMsgId, setForwardMsgId] = useState<string | null>(null);
  const [pendingLocation, setPendingLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [selectedEmojiCategory, setSelectedEmojiCategory] = useState(0);
  const [pendingMsgIds, setPendingMsgIds] = useState<Set<string>>(new Set());
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const pendingTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const blobUrlsRef = useRef<Set<string>>(new Set());

  const revokeBlobUrl = useCallback((url: string) => {
    if (blobUrlsRef.current.has(url)) {
      URL.revokeObjectURL(url);
      blobUrlsRef.current.delete(url);
    }
  }, []);

  const trackBlobUrl = useCallback((url: string) => {
    blobUrlsRef.current.add(url);
    return url;
  }, []);

  // Voice note recording state
  const {
    recordingState,
    duration: vnDuration,
    error: vnError,
    waveform: vnWaveform,
    isLocked: vnIsLocked,
    recordedBlob: vnRecordedBlob,
    startRecording: vnStartRecording,
    cancelRecording: vnCancelRecording,
    lockRecording: vnLockRecording,
    uploadAndSend: vnUploadAndSend,
  } = useVoiceRecorder();
  const [vnPreviewUrl, setVnPreviewUrl] = useState<string | null>(null);
  useEffect(() => {
    if (vnRecordedBlob) {
      const url = URL.createObjectURL(vnRecordedBlob);
      setVnPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setVnPreviewUrl(null);
  }, [vnRecordedBlob]);
  const isRecording = recordingState === 'recording';
  const isSending = recordingState === 'sending';

  // WhatsApp-style press-hold gesture tracking (document-level)
  const vnGestureRef = useRef({ startX: 0, startY: 0, started: false, pointerId: -1 });
  const [vnDragX, setVnDragX] = useState(0);
  const [vnDragY, setVnDragY] = useState(0);
  const [vnIsDragging, setVnIsDragging] = useState(false);
  const recordingStateRef = useRef(recordingState);
  recordingStateRef.current = recordingState;

  // Camera / gallery preview
  const [cameraPreview, setCameraPreview] = useState<string | null>(null);
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const vnBarRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const prevMessageCountRef = useRef(messages.length);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollDebounceRef = useRef<ReturnType<typeof setTimeout>>();
  const unsubRef = useRef<() => void>();

  useEffect(() => {
    return () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      if (scrollDebounceRef.current) clearTimeout(scrollDebounceRef.current);
      unsubRef.current?.();
      pendingTimersRef.current.forEach(timer => clearTimeout(timer));
      pendingTimersRef.current.clear();
      blobUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
      blobUrlsRef.current.clear();
    };
  }, []);

  const activeConv = conversations.find(c => c.id === activeConversation);
  const isGroup = activeConv?.is_group;
  const groupName = activeConv?.group_name;
  const groupAvatar = activeConv?.group_avatar;
  const canSend = !isGroup || activeConv?.messages_policy !== 'admins' || activeConv?.is_admin === true;

  const otherUserId = isGroup ? null : activeConv?.other_user?.user_id;
  const otherOnline = otherUserId ? isOnline(otherUserId) : false;
  const showTyping = otherUserId ? isTyping(otherUserId) : false;
  const showOtherRecording = otherUserId ? isRecordingVn?.(otherUserId) : false;
  const typingMemberNames = isGroup && activeConv?.participants
    ? activeConv.participants
        .filter(p => p.user_id !== user?.id && isTyping(p.user_id))
        .map(p => p.display_name || 'Someone')
    : [];
  const [lastSeenText, setLastSeenText] = useState<string | null>(null);
  const [canSeeReadReceipts, setCanSeeReadReceipts] = useState(true);
  useEffect(() => {
    if (!otherUserId || isGroup) { setCanSeeReadReceipts(true); return; }
    let cancelled = false;
    supabase.rpc('can_view_read_receipts', { p_target_user_id: otherUserId }).then(({ data }) => {
      if (!cancelled) setCanSeeReadReceipts(data !== false);
    }).catch(() => { if (!cancelled) setCanSeeReadReceipts(true); });
    return () => { cancelled = true; };
  }, [otherUserId, isGroup]);

  useEffect(() => {
    if (!otherUserId || otherOnline) { setLastSeenText(null); return; }
    const cached = getLastSeen?.(otherUserId);
    if (cached) {
      const d = new Date(cached);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMins = Math.floor(diffMs / (1000 * 60));
      if (diffMins < 1) setLastSeenText('just now');
      else if (diffMins < 60) setLastSeenText(`${diffMins}m ago`);
      else if (diffHrs < 24) setLastSeenText(`${diffHrs}h ago`);
      else if (diffHrs < 48) setLastSeenText('yesterday');
      else setLastSeenText(format(d, 'MMM d, HH:mm'));
    } else {
      // Poll for last_seen
      const timer = setInterval(() => {
        const fetched = getLastSeen?.(otherUserId);
        if (fetched) {
          const d = new Date(fetched);
          const now = new Date();
          const diffMs = now.getTime() - d.getTime();
          const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
          const diffMins = Math.floor(diffMs / (1000 * 60));
          if (diffMins < 1) setLastSeenText('just now');
          else if (diffMins < 60) setLastSeenText(`${diffMins}m ago`);
          else if (diffHrs < 24) setLastSeenText(`${diffHrs}h ago`);
          else if (diffHrs < 48) setLastSeenText('yesterday');
          else setLastSeenText(format(d, 'MMM d, HH:mm'));
          clearInterval(timer);
        }
      }, 2000);
      setTimeout(() => clearInterval(timer), 6000);
      return () => clearInterval(timer);
    }
  }, [otherUserId, otherOnline, getLastSeen]);

  const handleReportMessage = useCallback(async (msg: Message) => {
    const reason = window.prompt('Why are you reporting this message? (optional)');
    if (reason === null) return;
    try {
      const result = await supabase.rpc('report_user', {
        p_reported_id: msg.sender_id,
        p_reason: reason?.trim() || 'Inappropriate message',
        p_description: `Message ID: ${msg.id}\nContent: ${msg.content?.slice(0, 200)}`,
      });
      if (result.error) toast.error('Failed to submit report');
      else toast.success('Message reported. We\'ll review it.');
    } catch {
      toast.error('Failed to submit report');
    }
  }, []);

  // Filter messages by search
  const searchQueryLower = useMemo(() => searchQuery.toLowerCase().trim(), [searchQuery]);
  const searchMatchIdsSet = useMemo(() => {
    if (!searchQueryLower) return new Set<string>();
    const ids = new Set<string>();
    messages.forEach(m => {
      if (m.is_deleted) return;
      if (m.content?.toLowerCase().includes(searchQueryLower)) ids.add(m.id);
    });
    return ids;
  }, [searchQueryLower, messages]);

  // Reset search index when query changes
  useEffect(() => {
    setSearchMatchIndex(0);
  }, [searchQueryLower]);

  const searchMatches = useMemo(() =>
    messages.filter(m => searchMatchIdsSet.has(m.id)),
    [messages, searchMatchIdsSet]
  );
  const currentSearchMsgId = searchMatches[searchMatchIndex]?.id || null;

  // Track first unread message for "Jump to unread"
  const firstUnreadMsgId = useMemo(() => {
    if (!user) return null;
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg.sender_id !== user.id && !msg.is_read) {
        return msg.id;
      }
    }
    return null;
  }, [messages, user]);

  // Scroll to search match
  useEffect(() => {
    if (currentSearchMsgId) {
      const el = document.getElementById(`msg-${currentSearchMsgId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setHighlightedMsgId(currentSearchMsgId);
      }
    }
  }, [currentSearchMsgId]);

  const navSearch = useCallback((dir: 'up' | 'down') => {
    if (searchMatches.length === 0) return;
    setSearchMatchIndex(prev => {
      if (dir === 'up') return prev <= 0 ? searchMatches.length - 1 : prev - 1;
      return prev >= searchMatches.length - 1 ? 0 : prev + 1;
    });
  }, [searchMatches.length]);

  // Scroll to bottom on new messages + track pending sends
  useEffect(() => {
    if (messages.length > prevMessageCountRef.current) {
      const isNewMessage = messages.length - prevMessageCountRef.current === 1;
      const newMsg = isNewMessage ? messages[messages.length - 1] : null;
      if (isNewMessage) {
        if (isNearBottom) {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        } else {
          setUnreadSinceScroll(prev => prev + 1);
        }
      }
      // Track pending (sending) state for own messages
      if (newMsg && newMsg.sender_id === user?.id && !newMsg.is_read) {
        setPendingMsgIds(prev => new Set(prev).add(newMsg.id));
        const timer = setTimeout(() => {
          setPendingMsgIds(prev => {
            const next = new Set(prev);
            next.delete(newMsg.id);
            return next;
          });
          pendingTimersRef.current.delete(newMsg.id);
        }, 3000);
        pendingTimersRef.current.set(newMsg.id, timer);
      }
    }
    prevMessageCountRef.current = messages.length;
  }, [messages, user, isNearBottom]);

  // Initial scroll to bottom
  useEffect(() => {
    if (!loading && messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    }
  }, [activeConversation, loading]);

  useEffect(() => {
    setReplyTo(null);
    setEditingMessage(null);
    setInput('');
    setShowAttachments(false);
    setShowStickers(false);
    setShowSearch(false);
    setSearchQuery('');
    setUnreadSinceScroll(0);
    setIsNearBottom(true);
    // Clear VN recording
    vnCancelRecording();
    onRecordingVn?.(false);
    if (cameraPreview) { revokeBlobUrl(cameraPreview); setCameraPreview(null); }
    galleryPreviews.forEach(u => revokeBlobUrl(u));
    setGalleryPreviews([]);
    setGalleryFiles([]);
    pendingTimersRef.current.forEach(timer => clearTimeout(timer));
    pendingTimersRef.current.clear();
    setPendingMsgIds(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConversation]);

  // Clear highlight after 400ms
  useEffect(() => {
    if (highlightedMsgId) {
      const timer = setTimeout(() => setHighlightedMsgId(null), 400);
      return () => clearTimeout(timer);
    }
  }, [highlightedMsgId]);

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < SCROLL_BOTTOM_THRESHOLD;
    setIsNearBottom(nearBottom);
    if (nearBottom) setUnreadSinceScroll(0);
    setActiveActionsMsgId(null);

    if (!onLoadMore || !hasMoreMessages || loadingMore) return;
    if (el.scrollTop < 200) {
      if (scrollDebounceRef.current) clearTimeout(scrollDebounceRef.current);
      scrollDebounceRef.current = setTimeout(() => {
        onLoadMore();
      }, 200);
    }
  }, [onLoadMore, hasMoreMessages, loadingMore]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setUnreadSinceScroll(0);
    setIsNearBottom(true);
  }, []);

  const scrollToFirstUnread = useCallback(() => {
    if (firstUnreadMsgId) {
      const el = document.getElementById(`msg-${firstUnreadMsgId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setUnreadSinceScroll(0);
        setIsNearBottom(false);
      }
    }
  }, [firstUnreadMsgId]);

  const handleSend = useCallback(() => {
    if (!input.trim()) return;
    if (editingMessage) {
      onEditMessage?.(editingMessage, input);
      setEditingMessage(null);
    } else {
      onSend(input, replyTo?.id || null);
    }
    setInput('');
    setReplyTo(null);
    setShowAttachments(false);
    setShowStickers(false);
    setActiveActionsMsgId(null);
    onTyping(false);
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }
    inputRef.current?.focus();
  }, [input, onSend, onEditMessage, editingMessage, replyTo, onTyping]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    onTyping(e.target.value.trim().length > 0);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      onTyping(false);
    }, TYPING_TIMEOUT_MS);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  }, [onTyping]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (!e.shiftKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === 'Escape') {
      setEditingMessage(null);
      setReplyTo(null);
      setShowAttachments(false);
      setShowStickers(false);
      setShowSearch(false);
      setSearchQuery('');
    }
  }, [handleSend]);

  const insertEmoji = useCallback((emoji: string) => {
    setInput(prev => prev + emoji);
    inputRef.current?.focus();
    setShowStickers(false);
    setShowAttachments(false);
  }, []);

  const handleAttachmentClick = useCallback(async (key: string) => {
    setShowAttachments(false);
    setShowStickers(false);
    switch (key) {
      case 'camera':
        cameraInputRef.current?.click();
        break;
      case 'gallery':
        mediaInputRef.current?.click();
        break;
      case 'document':
        fileInputRef.current?.setAttribute('accept', '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar');
        fileInputRef.current?.click();
        break;
      case 'location':
        getLocation();
        break;
      case 'contact':
        setShowContactForm(true);
        break;
      case 'sticker':
        setShowStickers(true);
        break;
    }
  }, []);

  const handleVnPointerDown = useCallback(async (e: React.PointerEvent) => {
    if (uploadingFile || recordingStateRef.current !== 'idle') return;
    e.preventDefault();
    vnGestureRef.current = { startX: e.clientX, startY: e.clientY, started: false, pointerId: e.pointerId };
    const el = e.currentTarget as HTMLElement;
    try { el.setPointerCapture(e.pointerId); } catch {}
    setVnIsDragging(true);
    setVnDragX(0);
    setVnDragY(0);
    const ok = await vnStartRecording();
    vnGestureRef.current.started = ok;
    if (ok) onRecordingVn?.(true);
    if (!ok) {
      setVnIsDragging(false);
      try { el.releasePointerCapture(e.pointerId); } catch {}
    }
  }, [uploadingFile, vnStartRecording, onRecordingVn]);

  const handleVnLock = useCallback(async () => {
    await vnLockRecording();
  }, [vnLockRecording]);

  const handleVnSendLocked = useCallback(async () => {
    if (!activeConversation || !user) return;
    await vnUploadAndSend(activeConversation, user.id, vnDuration, (message) => {
      onPushMessage?.(message);
      onBroadcastMessage?.(message);
    }, (blob, senderId, duration) => {
      onQueueVoiceNote?.(activeConversation, blob, senderId, duration);
      toast.info('Voice note queued — will send when back online');
    });
  }, [activeConversation, user, vnUploadAndSend, vnDuration, onPushMessage, onBroadcastMessage, onQueueVoiceNote]);

  useEffect(() => {
    if (!vnIsDragging) return;
    const g = vnGestureRef.current;
    const handleMove = (e: PointerEvent) => {
      if (e.pointerId !== g.pointerId) return;
      setVnDragX(e.clientX - g.startX);
      setVnDragY(e.clientY - g.startY);
    };
    const handleUp = (e: PointerEvent) => {
      if (e.pointerId !== g.pointerId) return;
      setVnIsDragging(false);
      const dx = e.clientX - g.startX;
      const dy = e.clientY - g.startY;
      if (!g.started) { onRecordingVn?.(false); return; }
      if (dx < -80) {
        vnCancelRecording();
        onRecordingVn?.(false);
      } else if (dy < -70) {
        vnLockRecording().catch(console.error);
      } else {
        handleVnSendLocked().catch(console.error);
      }
    };
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, [vnIsDragging, vnCancelRecording, vnLockRecording, handleVnSendLocked, onRecordingVn]);

  const lastVnErrorRef = useRef<string | null>(null);

  useEffect(() => {
    if (vnError && vnError !== lastVnErrorRef.current) {
      lastVnErrorRef.current = vnError;
      onRecordingVn?.(false);
      toast.error(vnError);
    }
    if (!vnError) {
      lastVnErrorRef.current = null;
    }
  }, [vnError, onRecordingVn]);

  const sendGalleryImages = useCallback(async () => {
    if (galleryFiles.length === 0) return;
    setUploadingFile(true);
    setUploadProgress(0);
    let sent = 0;
    let failed = 0;
    for (let i = 0; i < galleryFiles.length; i++) {
      const file = galleryFiles[i];
      try {
        let uploadFile: File;
        try {
          const compressed = await compressImage(file, 1920, 0.8);
          uploadFile = new File([compressed], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });
        } catch {
          uploadFile = file;
        }
        const url = await onUploadImage?.(uploadFile);
        if (url) {
          onSendImage?.(url);
          sent++;
        } else {
          failed++;
        }
      } catch (err) {
        console.error('[gallery] upload failed:', i, err);
        failed++;
      }
      setUploadProgress(Math.round(((sent + failed) / galleryFiles.length) * 100));
    }
    setUploadProgress(null);
    setUploadingFile(false);
    galleryPreviews.forEach(u => revokeBlobUrl(u));
    setGalleryPreviews([]);
    setGalleryFiles([]);
    if (sent > 0) {
      toast.success(`${sent} image${sent !== 1 ? 's' : ''} sent`);
    }
    if (failed > 0) {
      toast.error(`${failed} image${failed !== 1 ? 's' : ''} failed`);
    }
  }, [galleryFiles, galleryPreviews, onUploadImage, onSendImage, compressImage, revokeBlobUrl]);

  const discardGalleryPreviews = useCallback(() => {
    galleryPreviews.forEach(u => revokeBlobUrl(u));
    setGalleryPreviews([]);
    setGalleryFiles([]);
  }, [galleryPreviews, revokeBlobUrl]);

  const sendCameraPreview = useCallback(async () => {
    if (!cameraPreview || !galleryFiles[0]) return;
    setUploadingFile(true);
    setUploadProgress(0);
    try {
      const file = galleryFiles[0];
      let uploadFile: File;
      try {
        const compressed = await compressImage(file, 1920, 0.8);
        uploadFile = new File([compressed], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });
      } catch {
        uploadFile = file;
      }
      const url = await onUploadImage?.(uploadFile);
      if (url) {
        onSendImage?.(url);
        toast.success('Photo sent');
      } else {
        toast.error('Failed to upload photo');
      }
    } catch (err) {
      console.error('[camera] send failed:', err);
      toast.error('Failed to send photo');
    }
    setUploadProgress(null);
    setUploadingFile(false);
    if (cameraPreview) revokeBlobUrl(cameraPreview);
    setCameraPreview(null);
    setGalleryFiles([]);
  }, [cameraPreview, galleryFiles, onUploadImage, onSendImage, compressImage, revokeBlobUrl]);

  const discardCameraPreview = useCallback(() => {
    if (cameraPreview) revokeBlobUrl(cameraPreview);
    setCameraPreview(null);
    setGalleryFiles([]);
  }, [cameraPreview, revokeBlobUrl]);

  const getLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported');
      return;
    }
    setPickingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setPendingLocation({ lat: latitude, lng: longitude });
        setPickingLocation(false);
      },
      (err) => {
        setPickingLocation(false);
        if (err.code === 1) toast.error('Location permission denied');
        else if (err.code === 2 || err.code === 3) toast.error('Could not get location. Try again.');
        else toast.error('Location error');
      },
      { enableHighAccuracy: true, timeout: 12000 },
    );
  }, []);

  const sendPendingLocation = useCallback(() => {
    if (!pendingLocation) return;
    const { lat, lng } = pendingLocation;
    const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
    onSend(`📍 My location:\n${mapsUrl}`);
    setPendingLocation(null);
    toast.success('Location shared');
  }, [pendingLocation, onSend]);

  const cancelPendingLocation = useCallback(() => {
    setPendingLocation(null);
  }, []);

  const handleFileSelected = useCallback(async (file: File) => {
    if (file.size > 50 * 1024 * 1024) {
      toast.error('File must be under 50MB');
      return;
    }

    const isImage = file.type.startsWith('image/');
    const isValid = isImage || SUPPORTED_FILE_TYPES.some(t => file.type === t);
    if (!isValid) {
      toast.error('Unsupported file type');
      return;
    }

    setUploadingFile(true);
    setUploadProgress(0);

    try {
      let uploadFile = file;
      if (isImage) {
        try {
          const compressed = await compressImage(file, 1920, 0.8);
          uploadFile = new File([compressed], file.name, { type: 'image/jpeg' });
        } catch {
          // If compression fails (e.g. HEIC unsupported by canvas), use original
        }
      }

      if (isImage && onUploadImage) {
        const url = await onUploadImage(uploadFile);
        setUploadProgress(100);
        if (url) onSendImage?.(url);
        else toast.error('Image upload failed');
      } else if (onUploadFile) {
        const { url, error } = await onUploadFile(uploadFile);
        setUploadProgress(100);
        if (url) onSendFile?.(url, file.name, file.size, file.type);
        else toast.error(error || 'Upload failed');
      }
    } catch {
      toast.error('Upload failed');
    }

    setUploadProgress(null);
    setUploadingFile(false);
  }, [onUploadImage, onSendImage, onUploadFile, onSendFile, compressImage]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const isCamera = e.target === cameraInputRef.current;
    const isGallery = e.target === mediaInputRef.current;

    if (isCamera) {
      const file = files[0];
      if (!file) return;
      setCameraPreview(prev => {
        if (prev) { URL.revokeObjectURL(prev); blobUrlsRef.current.delete(prev); }
        const url = URL.createObjectURL(file);
        blobUrlsRef.current.add(url);
        return url;
      });
      setGalleryFiles([file]);
      e.target.value = '';
      return;
    }

    if (isGallery) {
      const newFiles: File[] = [];
      const newPreviews: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.size > 50 * 1024 * 1024) continue;
        if (file.type.startsWith('image/')) {
          newFiles.push(file);
          const url = URL.createObjectURL(file);
          blobUrlsRef.current.add(url);
          newPreviews.push(url);
        }
      }
      if (newFiles.length > 0) {
        setGalleryPreviews(prev => [...prev, ...newPreviews]);
        setGalleryFiles(prev => [...prev, ...newFiles]);
      }
      e.target.value = '';
      return;
    }

    // Single file (document, or single gallery image)
    const file = files[0];
    if (!file) return;
    handleFileSelected(file);
    e.target.value = '';
  }, [handleFileSelected]);

  const replyMsg = replyTo ? { id: replyTo.id, content: replyContentRef.current || replyTo.content, message_type: replyTo.message_type, file_name: replyTo.file_name } : null;

  const handleStartEdit = useCallback((msg: Message) => {
    setEditingMessage(msg.id);
    setInput(msg.content);
    setReplyTo(null);
    inputRef.current?.focus();
  }, []);

  const handleScrollToMessage = useCallback((msgId: string) => {
    const el = document.getElementById(`msg-${msgId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedMsgId(msgId);
    }
  }, []);

  const handleCopyMessage = useCallback((text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success('Copied to clipboard');
    }).catch(() => {
      toast.error('Failed to copy');
    });
  }, []);

  const canDeleteEveryone = (msg: Message) => {
    return Date.now() - new Date(msg.created_at).getTime() < DELETE_EVERYONE_WINDOW_MS;
  };

  const todayStr = format(new Date(), 'MMM d, yyyy');
  const yesterdayStr = format(new Date(Date.now() - 86400000), 'MMM d, yyyy');

  if (!activeConversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground bg-muted/20">
        <div className="w-20 h-20 rounded-full bg-secondary/50 flex items-center justify-center mb-4">
          <MessageCircle className="w-10 h-10 opacity-40" />
        </div>
        <p className="text-lg font-medium">JUPEB Chat</p>
        <p className="text-sm mt-1 opacity-60">Select a conversation or find someone to chat with</p>
      </div>
    );
  }

  const groupedMessages: { date: string; messages: Message[] }[] = [];
  messages.forEach((msg) => {
    const dateStr = format(new Date(msg.created_at), 'MMM d, yyyy');
    const lastGroup = groupedMessages[groupedMessages.length - 1];
    if (lastGroup?.date === dateStr) {
      lastGroup.messages.push(msg);
    } else {
      groupedMessages.push({ date: dateStr, messages: [msg] });
    }
  });

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <div className="h-14 border-b border-border flex items-center px-4 gap-3 shrink-0 bg-card/80 backdrop-blur-sm z-10">
        {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0 -ml-1">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        )}
        <div className="relative shrink-0">
          <UserAvatar
            url={isGroup ? groupAvatar : activeConv?.other_user?.avatar_url}
            name={isGroup ? groupName : activeConv?.other_user?.display_name}
            className="w-9 h-9 ring-0"
            viewable
            targetUserId={isGroup ? undefined : activeConv?.other_user?.user_id}
          />
          {!isGroup && otherOnline && (
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-accent rounded-full border-[2.5px] border-card" />
          )}
        </div>

        {showSearch ? (
          <div className="flex-1 flex items-center gap-2 min-w-0">
            <div className="flex-1 relative">
              <input
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search messages..."
                className="w-full h-8 bg-secondary/60 border border-border/40 rounded-lg px-3 pl-8 text-xs focus:outline-none focus:ring-1 focus:ring-primary/40"
              />
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60" />
            </div>
            {searchMatches.length > 0 ? (
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                  {searchMatchIndex + 1}/{searchMatches.length}
                </span>
                <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={() => navSearch('up')}>
                  <ChevronUp className="w-3 h-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={() => navSearch('down')}>
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </div>
            ) : searchQuery.trim() && (
              <span className="text-[10px] text-muted-foreground/50">No results</span>
            )}
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 rounded-full" onClick={() => { setShowSearch(false); setSearchQuery(''); }}>
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        ) : (
          <>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="font-semibold text-sm leading-tight truncate">
                {isGroup ? (groupName || 'Group') : (activeConv?.other_user?.display_name || 'User')}
              </span>
              <span className="text-[10px] leading-tight text-muted-foreground">
                {isRecording ? (
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                    Recording…
                  </span>
                ) : showOtherRecording ? (
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                    Recording voice note…
                  </span>
                ) : isGroup ? (
                  typingMemberNames.length > 0 ? (
                    <span className="flex items-center gap-1">
                      <span className="w-1 h-1 bg-accent rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1 h-1 bg-accent rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1 h-1 bg-accent rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      <span className="text-accent font-medium ml-1">
                        {typingMemberNames.length === 1
                          ? `${typingMemberNames[0]} is typing...`
                          : `${typingMemberNames.slice(0, 2).join(', ')}${typingMemberNames.length > 2 ? ` +${typingMemberNames.length - 2}` : ''} typing...`}
                      </span>
                    </span>
                  ) : (
                    `${activeConv?.participants?.length || 0} members`
                  )
                ) : showTyping ? (
                  'Typing...'
                ) : otherOnline ? (
                  'Online'
                ) : lastSeenText ? (
                  `Last seen ${lastSeenText}`
                ) : (
                  'Offline'
                )}
              </span>
            </div>
            {isGroup && (
              <button onClick={() => setShowGroupInfo(true)} className="flex items-center gap-1 text-xs text-muted-foreground bg-secondary/50 px-2.5 py-1 rounded-full hover:bg-secondary transition-colors cursor-pointer">
                <Users className="w-3 h-3" />
                <span>Group</span>
              </button>
            )}
            {!isGroup && otherUserId && (
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 rounded-full" onClick={() => onProfileClick?.(otherUserId)} title="View profile">
                <Info className="w-4 h-4" />
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 rounded-full" onClick={() => setShowSearch(true)} title="Search">
              <Search className="w-4 h-4" />
            </Button>
          </>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 relative overflow-hidden">
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="absolute inset-0 overflow-y-auto px-3 py-3 space-y-1 scrollbar-thin"
        >
          {loading ? (
            <div className="flex flex-col gap-4 p-4">
              {[1, 2, 3].map(i => (
                <div key={i} className={`flex items-end gap-2 ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                  {i % 2 !== 0 && <div className="w-8 h-8 rounded-full bg-secondary animate-pulse shrink-0" />}
                  <div className="space-y-2" style={{ maxWidth: '70%' }}>
                    <div className={`h-3 rounded animate-pulse ${i % 2 === 0 ? 'bg-primary/30' : 'bg-secondary'}`}
                      style={{ width: `${80 + i * 30}px` }} />
                    <div className={`h-3 rounded animate-pulse ${i % 2 === 0 ? 'bg-primary/20' : 'bg-secondary'}`}
                      style={{ width: `${60 + i * 20}px` }} />
                    <div className="h-2 w-12 rounded animate-pulse bg-muted" />
                  </div>
                  {i % 2 === 0 && <div className="w-8 h-8 rounded-full bg-secondary animate-pulse shrink-0" />}
                </div>
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              {showSearch && searchQuery.trim() ? (
                <>
                  <Search className="w-8 h-8 mb-2 opacity-30" />
                  <p className="text-sm font-medium">No results found</p>
                  <p className="text-xs mt-0.5 opacity-60">Try a different search term</p>
                </>
              ) : (
                <>
                  <MessageCircle className="w-8 h-8 mb-2 opacity-30" />
                  <p className="text-sm font-medium">No messages yet</p>
                  <p className="text-xs mt-0.5 opacity-60">Send the first message!</p>
                </>
              )}
            </div>
          ) : (
            <>
              {/* Load more */}
              {hasMoreMessages && messages.length > 0 && (
                <div className="flex justify-center py-1">
                  <button
                    onClick={onLoadMore}
                    disabled={loadingMore}
                    className="text-[10px] text-muted-foreground/60 hover:text-muted-foreground transition-colors px-3 py-1 rounded-full hover:bg-secondary/30 disabled:opacity-50"
                  >
                    {loadingMore ? (
                      <span className="flex items-center gap-1.5">
                        <Loader2 className="w-2.5 h-2.5 animate-spin" />
                        Loading...
                      </span>
                    ) : (
                      'Load earlier'
                    )}
                  </button>
                </div>
              )}

              {groupedMessages.map((group) => (
                <div key={group.date}>
                  <div className="flex items-center justify-center my-4">
                    <div className="flex-1 h-px bg-border/30" />
                    <span className="mx-3 text-[10px] font-medium text-muted-foreground/60 tracking-wide uppercase">
                      {group.date === todayStr
                        ? 'Today'
                        : group.date === yesterdayStr
                        ? 'Yesterday'
                        : group.date}
                    </span>
                    <div className="flex-1 h-px bg-border/30" />
                  </div>
                  {group.messages.map((msg, i) => {
                    const isOwn = msg.sender_id === user?.id;
                    const showTime = i === group.messages.length - 1 ||
                      group.messages[i + 1]?.sender_id !== msg.sender_id;
                    const hasReactions = msg.reactions && typeof msg.reactions === 'object' && Object.keys(msg.reactions).some(k => Array.isArray(msg.reactions![k]) && msg.reactions![k].length > 0);
                    const prevMsg = i > 0 ? group.messages[i - 1] : null;
                    const isSameSender = prevMsg?.sender_id === msg.sender_id;
                    const timeDiff = isSameSender && prevMsg
                      ? new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime()
                      : Infinity;
                    const showAvatar = !isOwn && (!isSameSender || timeDiff > 300000);
                    const nextMsg = i < group.messages.length - 1 ? group.messages[i + 1] : null;
                    const isNextSameSender = nextMsg?.sender_id === msg.sender_id;
                    const nextTimeDiff = isNextSameSender && nextMsg
                      ? new Date(nextMsg.created_at).getTime() - new Date(msg.created_at).getTime()
                      : Infinity;
                    const isContinuous = isNextSameSender && nextTimeDiff < 300000;
                    const bubbleMargin = isContinuous ? 'mb-0.5' : 'mb-1.5';
                    const isHighlighted = highlightedMsgId === msg.id;
                    const isDeleted = msg.is_deleted;
                    const docIcon = msg.file_type ? getDocTypeIcon(msg.file_type) : null;
                    const isSearchMatch = searchMatchIdsSet.has(msg.id);

                    return (
                      <AnimatePresence mode="popLayout">
                        <motion.div
                          key={msg.id}
                          id={`msg-${msg.id}`}
                          layout
                          initial={{ opacity: 0, y: 20, scale: 0.97 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.15, ease: 'easeOut' }}
                          className={cn('group/message', isSearchMatch && searchQuery && 'scroll-mt-20')}
                        >
                            {['group_created','group_member_added','group_member_removed','group_member_left','group_name_changed','group_photo_changed','group_admin_promoted','group_admin_demoted'].includes(msg.message_type) ? (
                              <div className="flex justify-center my-2">
                                <span className="text-[11px] text-muted-foreground/70 italic bg-muted/30 px-3 py-1 rounded-full">
                                  {msg.content}
                                </span>
                              </div>
                            ) : (
                            <motion.div
                              className={cn('flex items-end gap-1.5', bubbleMargin, isOwn ? 'justify-end' : 'justify-start')}
                              onClick={(e) => {
                                if (!e.defaultPrevented && window.innerWidth < 768) {
                                  setActiveActionsMsgId(prev => prev === msg.id ? null : msg.id);
                                }
                              }}
                        >
                          {!isOwn && (
                            <div className={cn('shrink-0', showAvatar ? 'opacity-100' : 'opacity-0 pointer-events-none')}>
                              <UserAvatar
                                url={activeConv?.is_group ? (activeConv?.participants?.find(p => p.user_id === msg.sender_id)?.avatar_url) : (msg.sender_id === activeConv?.other_user?.user_id ? activeConv?.other_user?.avatar_url : undefined)}
                                name={activeConv?.is_group ? (activeConv?.participants?.find(p => p.user_id === msg.sender_id)?.display_name || msg.sender_id.slice(0, 8)) : (msg.sender_id === activeConv?.other_user?.user_id ? activeConv?.other_user?.display_name : undefined)}
                                className="w-6 h-6 ring-0"
                                viewable={msg.sender_id !== user?.id}
                                targetUserId={isOwn ? undefined : msg.sender_id}
                              />
                            </div>
                          )}

                          <motion.div
                            className={cn('max-w-[75%]', isOwn ? 'items-end' : 'items-start')}
                            drag={onSend ? 'x' : false}
                            dragDirectionLock
                            dragConstraints={{ left: 0, right: SWIPE_THRESHOLD }}
                            dragElastic={0.1}
                            onDragEnd={(_, info) => {
                              if (info.offset.x >= SWIPE_THRESHOLD && Math.abs(info.offset.y) < 20) {
                                setReplyTo(msg);
                              }
                            }}
                            whileTap={{ scale: 0.99 }}
                          >
                            {/* Sender name for groups */}
                            {!isOwn && activeConv?.is_group && !isContinuous && (
                              <span className="text-[10px] font-medium text-muted-foreground mb-0.5 ml-1 block">
                                {activeConv?.participants?.find(p => p.user_id === msg.sender_id)?.display_name || 'User'}
                              </span>
                            )}
                            {/* Reply indicator */}
                            {msg.reply_to_id && !isDeleted && (
                              <button
                                onClick={() => handleScrollToMessage(msg.reply_to_id!)}
                                className={cn(
                                  'mb-0.5 px-3 py-1.5 rounded-lg text-xs border-l-2 opacity-70 max-w-[200px] block text-left',
                                  isOwn ? 'bg-primary/20 border-primary-foreground/30 mr-1' : 'bg-muted border-muted-foreground/30 ml-1'
                                )}
                              >
                                <p className="font-medium text-[10px] mb-0.5 text-muted-foreground">Replying</p>
                                <p className="truncate">{messages.find(m => m.id === msg.reply_to_id)?.content || 'original message'}</p>
                              </button>
                            )}

                            {/* Deleted message */}
                            {isDeleted ? (
                              <div className={cn(
                                'px-3.5 py-2 rounded-2xl text-xs italic',
                                isOwn
                                  ? 'bg-primary/5 text-muted-foreground'
                                  : 'bg-secondary/40 text-muted-foreground',
                                isContinuous && isOwn ? 'rounded-br-[4px]' : '',
                                isContinuous && !isOwn ? 'rounded-bl-[4px]' : '',
                                !isContinuous && isOwn ? 'rounded-br-[4px]' : '',
                                !isContinuous && !isOwn ? 'rounded-bl-[4px]' : ''
                              )}>
                                This message was deleted
                              </div>
                            ) : (
                              <div
                                className={cn(
                                  'px-3.5 py-2.5 text-sm leading-relaxed shadow-sm',
                                  isOwn
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-secondary/80 text-foreground',
                                  'rounded-[18px]',
                                  isContinuous && isOwn ? 'rounded-br-[4px]' : '',
                                  isContinuous && !isOwn ? 'rounded-bl-[4px]' : '',
                                  !isContinuous && isOwn ? 'rounded-br-[4px]' : '',
                                  !isContinuous && !isOwn ? 'rounded-bl-[4px]' : '',
                                  isHighlighted && 'ring-2 ring-primary/40',
                                )}
                                style={{
                                  ...(!isContinuous ? (isOwn ? {
                                    clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%)',
                                  } : {
                                    clipPath: 'polygon(0 0, 100% 0, 100% 100%, 8px 100%, 0 calc(100% - 8px))',
                                  }) : {}),
                                }}
                              >
                                {/* Forwarded label */}
                                {msg.forwarded_from && (
                                  <p className="text-[10px] font-medium text-accent/80 mb-1 flex items-center gap-1">
                                    <Forward className="w-3 h-3" />
                                    Forwarded
                                  </p>
                                )}

                                {/* Image */}
                                {msg.message_type === 'image' && safeMediaUrl(msg.image_url) && (
                                  <img
                                    src={safeMediaUrl(msg.image_url)}
                                    alt="Shared image"
                                    className="max-w-full rounded-lg mb-1.5 max-h-60 object-cover cursor-pointer hover:opacity-95 transition-opacity"
                                    onClick={() => setLightboxImage(msg.image_url!)}
                                    loading="lazy"
                                  />
                                )}

                                {/* Video */}
                                {msg.message_type === 'video' && safeMediaUrl(msg.file_url) && (
                                  <div className="max-w-full rounded-lg overflow-hidden mb-1.5">
                                    <video
                                      src={safeMediaUrl(msg.file_url)}
                                      controls
                                      className="max-h-60 w-full object-cover"
                                      preload="metadata"
                                    >
                                      <a href={safeMediaUrl(msg.file_url)!} download={msg.file_name}>Download video</a>
                                    </video>
                                    {msg.file_name && <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{msg.file_name}</p>}
                                  </div>
                                )}

                                {/* Audio / Voice note */}
                                {msg.message_type === 'audio' && safeMediaUrl(msg.file_url) && (
                                  <div className={cn(
                                    'max-w-full rounded-lg mb-1.5',
                                    isOwn ? 'bg-primary-foreground/10' : 'bg-secondary/40'
                                  )}>
                                    <div className="px-3 pt-2 pb-1">
                                      <VoiceNotePlayer
                                        src={safeMediaUrl(msg.file_url)!}
                                        isOwn={isOwn}
                                        fileName={msg.file_name || undefined}
                                        hideControls
                                      />
                                    </div>
                                  </div>
                                )}

                                {/* File */}
                                {msg.message_type === 'file' && safeMediaUrl(msg.file_url) && (
                                  <a
                                    href={safeMediaUrl(msg.file_url)!.toString()}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 p-3 rounded-lg bg-secondary/40 hover:bg-secondary/60 transition-colors mb-1.5 group"
                                  >
                                    <div className="p-2 rounded-lg bg-primary/10">
                                      <File className="w-5 h-5 text-primary" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-medium truncate">
                                        {docIcon && <span className="uppercase mr-1 text-[10px] text-muted-foreground">{docIcon}</span>}
                                        {msg.file_name || 'File'}
                                      </p>
                                      {msg.file_size && <p className="text-[10px] text-muted-foreground">{formatFileSize(msg.file_size)}</p>}
                                    </div>
                                    <Download className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </a>
                                )}

                                {/* Location card */}
                                {msg.content && msg.content.includes('📍') && msg.content.includes('google.com/maps') ? (
                                  <LocationCard text={msg.content} isOwn={isOwn} />
                                ) : msg.content && searchQuery.trim() && isSearchMatch ? (
                                  <p className="whitespace-pre-wrap break-words">
                                    {renderHighlighted(stripHtml(msg.content), searchQuery)}
                                  </p>
                                ) : msg.content && (
                                  <p className="whitespace-pre-wrap break-words">
                                    {renderLinkified(stripHtml(msg.content))}
                                  </p>
                                )}

                                {/* Upload progress */}
                                {uploadProgress !== null && isOwn && messages[messages.length - 1]?.id === msg.id && (
                                  <UploadProgressBar progress={uploadProgress} />
                                )}

                                {/* Timestamp + status */}
                                {showTime && (
                                  <p className={cn(
                                    'text-[10px] mt-1 flex items-center gap-1',
                                    isOwn ? 'text-primary-foreground/60' : 'text-muted-foreground'
                                  )}>
                                    {format(new Date(msg.created_at), 'h:mm a')}
                                    {msg.is_edited && <span className="text-[9px]">(edited)</span>}
                                    <MessageStatus message={msg} isOwn={isOwn} isPending={pendingMsgIds.has(msg.id)} canSeeReadReceipts={canSeeReadReceipts} />
                                  </p>
                                )}
                              </div>
                            )}

                            {/* Reactions */}
                            {onReact && hasReactions && !isDeleted && (
                              <div className={cn('mt-0.5', isOwn ? 'ml-auto' : 'mr-auto')}>
                                <MessageReactions
                                  reactions={msg.reactions || {}}
                                  messageId={msg.id}
                                  currentUserId={user?.id || ''}
                                  onReact={onReact}
                                  alignRight={isOwn}
                                />
                              </div>
                            )}

                            {/* Hover actions */}
                            {!isDeleted && (
                              <div className={cn(
                                'flex gap-0.5 mt-0.5',
                                isOwn ? 'justify-end' : 'justify-start',
                                'opacity-0 group-hover/message:opacity-100 group-focus-within/message:opacity-100 transition-opacity',
                                activeActionsMsgId === msg.id && 'opacity-100'
                              )}>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="rounded-full h-6 w-6"
                                  onClick={() => setReplyTo(msg)}
                                  title="Reply"
                                >
                                  <Reply className="w-3 h-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="rounded-full h-6 w-6"
                                  onClick={() => handleCopyMessage(msg.content || '')}
                                  title="Copy"
                                >
                                  <Copy className="w-3 h-3" />
                                </Button>
                                {!isOwn && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="rounded-full h-6 w-6"
                                    onClick={() => handleReportMessage(msg)}
                                    title="Report"
                                  >
                                    <Flag className="w-3 h-3" />
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="rounded-full h-6 w-6"
                                  onClick={() => setForwardMsgId(msg.id)}
                                  title="Forward"
                                >
                                  <Forward className="w-3 h-3" />
                                </Button>
                                {isOwn && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="rounded-full h-6 w-6"
                                      onClick={() => handleStartEdit(msg)}
                                      title="Edit"
                                    >
                                      <Edit3 className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className={cn(
                                        'rounded-full h-6 w-6',
                                        !canDeleteEveryone(msg) && 'opacity-40 cursor-not-allowed'
                                      )}
                                      onClick={() => {
                                        if (canDeleteEveryone(msg)) {
                                          onDeleteMessage?.(msg.id);
                                        } else {
                                          toast.info('Delete window expired (48h)');
                                        }
                                      }}
                                      title={canDeleteEveryone(msg) ? 'Delete' : 'Delete expired (48h)'}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </>
                                )}
                                {onReact && (
                                  <MessageReactions
                                    reactions={{}}
                                    messageId={msg.id}
                                    currentUserId={user?.id || ''}
                                    onReact={onReact}
                                    compact
                                    alignRight={isOwn}
                                  />
                                )}
                              </div>
                            )}
                          </motion.div>
                            </motion.div>
                          )}</motion.div>
                        </AnimatePresence>
                    );
                  })}
                </div>
              ))}

              <AnimatePresence>
                {showTyping && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    transition={{ duration: 0.15 }}
                  >
                    <TypingIndicator />
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Scroll-to-bottom FAB */}
        <AnimatePresence>
          {!isNearBottom && messages.length > 0 && (
            <div className="absolute bottom-3 right-4 z-20 flex flex-col gap-2">
              {firstUnreadMsgId && unreadSinceScroll > 0 && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, y: 10 }}
                  transition={{ duration: 0.15 }}
                  onClick={scrollToFirstUnread}
                  className="flex items-center gap-1.5 bg-card border border-border/60 shadow-lg hover:shadow-xl rounded-full px-3 py-1.5 text-xs font-medium text-accent hover:text-accent-foreground transition-all"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                  Jump to unread
                  <span className="bg-accent text-accent-foreground text-[9px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                    {unreadSinceScroll > 99 ? '99+' : unreadSinceScroll}
                  </span>
                </motion.button>
              )}
              <motion.button
                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 10 }}
                transition={{ duration: 0.15 }}
                onClick={scrollToBottom}
                className="flex items-center gap-1.5 bg-card border border-border/60 shadow-lg hover:shadow-xl rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-all"
              >
                <ChevronDown className="w-3.5 h-3.5" />
                {unreadSinceScroll > 0 && !firstUnreadMsgId && (
                  <span className="bg-primary text-primary-foreground text-[9px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                    {unreadSinceScroll > 99 ? '99+' : unreadSinceScroll}
                  </span>
                )}
              </motion.button>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Upload progress indicator */}
      {uploadingFile && uploadProgress !== null && (
        <div className="px-4 py-1.5 bg-secondary/30 border-t border-border/40">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="w-3 h-3 animate-spin" />
            Uploading...
            <span className="ml-auto">{Math.round(uploadProgress)}%</span>
          </div>
          <div className="w-full h-1 bg-secondary rounded-full mt-1 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${uploadProgress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-border bg-card/50 backdrop-blur-sm shrink-0">
        {/* Edit indicator */}
        <AnimatePresence>
          {editingMessage && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-b border-border overflow-hidden"
            >
              <div className="px-4 py-2 flex items-center gap-2 bg-accent/10">
                <Edit3 className="w-3.5 h-3.5 text-accent shrink-0" />
                <span className="text-xs text-accent font-medium flex-1">Editing message</span>
                <Button variant="ghost" size="icon" className="rounded-lg shrink-0" onClick={() => { setEditingMessage(null); setInput(''); }}>
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Reply preview */}
        <AnimatePresence>
          {replyMsg && !editingMessage && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-b border-border overflow-hidden"
            >
              <div className="px-4 py-2 flex items-center gap-2 bg-secondary/20">
                <div className="w-0.5 h-8 bg-primary rounded-full shrink-0" />
                <Reply className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-medium text-primary">Replying</p>
                  <p className="text-xs truncate text-muted-foreground">{(replyMsg as { content?: string; message_type?: string; file_name?: string }).content || 'Message'}</p>
                </div>
                <Button variant="ghost" size="icon" className="rounded-lg shrink-0" onClick={() => setReplyTo(null)}>
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Attachment drawer */}
        <AnimatePresence>
        {/* Attachment bottom sheet */}
        <BottomSheet
          open={showAttachments && !showStickers}
          onOpenChange={(open) => setShowAttachments(open)}
          title="Attach"
          description="Choose what to share"
        >
          <div className="grid grid-cols-4 gap-2">
            {attachmentItems.map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                onClick={() => handleAttachmentClick(key)}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl hover:bg-secondary/60 transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
                  <Icon className="w-5 h-5 text-muted-foreground" />
                </div>
                <span className="text-[10px] text-muted-foreground/70 font-medium">{label}</span>
              </button>
            ))}
          </div>
        </BottomSheet>
        </AnimatePresence>

        {/* Sticker/emoji picker */}
        <AnimatePresence>
          {showStickers && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-b border-border overflow-hidden"
            >
              <div className="px-4 py-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex gap-1 overflow-x-auto scrollbar-none">
                    {EMOJI_CATEGORIES.map((cat, idx) => (
                      <button
                        key={cat.name}
                        onClick={() => setSelectedEmojiCategory(idx)}
                        className={cn(
                          'text-[10px] whitespace-nowrap px-2 py-1 rounded-full font-medium transition-colors',
                          selectedEmojiCategory === idx
                            ? 'bg-primary/10 text-primary'
                            : 'text-muted-foreground/60 hover:text-muted-foreground'
                        )}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full shrink-0" onClick={() => setShowStickers(false)}>
                    <X className="w-3 h-3" />
                  </Button>
                </div>
                <div className="grid grid-cols-8 gap-1.5 max-h-40 overflow-y-auto scrollbar-thin">
                  {EMOJI_CATEGORIES[selectedEmojiCategory]?.emojis.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => insertEmoji(emoji)}
                      className="w-9 h-9 flex items-center justify-center text-lg rounded-lg hover:bg-secondary/60 transition-colors"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Location loading indicator */}
        <AnimatePresence>
          {pickingLocation && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-b border-border overflow-hidden"
            >
              <div className="px-4 py-2 flex items-center gap-2 text-xs text-muted-foreground bg-secondary/20">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Getting your location...
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Camera preview bar */}
        <AnimatePresence>
          {cameraPreview && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-b border-border overflow-hidden"
            >
              <div className="px-3 py-2 flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-secondary">
                  <img src={cameraPreview} alt="Preview" className="w-full h-full object-cover" />
                </div>
                <span className="text-xs text-muted-foreground flex-1">Camera photo</span>
                <Button size="sm" variant="ghost" onClick={discardCameraPreview} disabled={uploadingFile}>
                  <X className="w-4 h-4" />
                </Button>
                <Button size="sm" onClick={sendCameraPreview} disabled={uploadingFile}>
                  {uploadingFile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Gallery preview bar */}
        <AnimatePresence>
          {galleryPreviews.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-b border-border overflow-hidden"
            >
              <div className="px-3 py-2">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-muted-foreground flex-1">{galleryPreviews.length} image{galleryPreviews.length !== 1 ? 's' : ''} selected</span>
                  <Button size="sm" variant="ghost" onClick={discardGalleryPreviews} disabled={uploadingFile}>
                    <X className="w-4 h-4" />
                  </Button>
                  <Button size="sm" onClick={sendGalleryImages} disabled={uploadingFile || galleryPreviews.length === 0}>
                    {uploadingFile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </div>
                <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
                  {galleryPreviews.map((url, idx) => (
                    <div key={idx} className="w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-secondary border border-border/40">
                      <img src={url} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
          </AnimatePresence>

        {/* Location preview bar */}
        <AnimatePresence>
          {pendingLocation && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-b border-border overflow-hidden"
            >
              <div className="px-3 py-2">
                <div className="flex items-center gap-2 mb-1.5">
                  <MapPin className="w-3.5 h-3.5 text-accent shrink-0" />
                  <span className="text-xs text-muted-foreground flex-1">
                    {pendingLocation.lat.toFixed(4)}, {pendingLocation.lng.toFixed(4)}
                  </span>
                  <Button size="sm" variant="ghost" onClick={cancelPendingLocation} className="h-7 w-7 rounded-full p-0">
                    <X className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="sm" onClick={sendPendingLocation} className="h-7 text-xs gap-1">
                    <Send className="w-3 h-3" />
                    Send Location
                  </Button>
                </div>
                <div className="rounded-lg overflow-hidden h-28 bg-secondary/40 flex items-center justify-center">
                  <img
                    src={`https://staticmap.openstreetmap.de/staticmap.php?center=${pendingLocation.lat},${pendingLocation.lng}&zoom=15&size=600x200&markers=${pendingLocation.lat},${pendingLocation.lng},red-pushpin`}
                    alt="Map preview"
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      (e.target as HTMLImageElement).parentElement!.innerHTML = '<span class="text-xs text-muted-foreground">Map unavailable</span>';
                    }}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {isRecording || isSending || vnIsLocked ? (
          <VoiceRecorder
            waveform={vnWaveform}
            duration={vnDuration}
            isLocked={vnIsLocked}
            isSending={isSending}
            previewUrl={vnPreviewUrl}
            dragX={vnDragX}
            dragY={vnDragY}
            isDragging={vnIsDragging}
            onSend={handleVnSendLocked}
            onCancel={() => { setVnIsDragging(false); vnCancelRecording(); onRecordingVn?.(false); }}
            onLock={handleVnLock}
          />
        ) : (
        <div className="px-3 py-2.5">
          {!canSend && (
            <div className="text-[11px] text-muted-foreground text-center pb-2">
              Only admins can send messages in this group
            </div>
          )}
          <div className="flex items-end gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm,audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/aac,audio/flac,application/pdf,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/csv,application/zip,application/x-zip-compressed,application/x-rar-compressed,application/vnd.rar"
              className="hidden"
              onChange={handleFileInput}
            />
            <input
              ref={mediaInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileInput}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileInput}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0 rounded-full"
              onClick={() => { setShowAttachments(v => !v); setShowStickers(false); }}
              disabled={uploadingFile || !canSend}
              title="Attach"
            >
              <Paperclip className="w-4 h-4" />
            </Button>
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onBlur={() => onTyping(false)}
                placeholder={!canSend ? '' : editingMessage ? 'Edit message...' : 'Type a message...'}
                rows={1}
                disabled={!canSend}
                className="w-full resize-none bg-secondary/40 border border-border/40 rounded-2xl px-4 py-2.5 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40 max-h-32 scrollbar-thin transition-all disabled:opacity-50"
                style={{ minHeight: '40px' }}
              />
            </div>
            {!input.trim() && !editingMessage ? (
              <button
                onPointerDown={handleVnPointerDown}
                className="shrink-0 rounded-full flex items-center justify-center w-9 h-9 transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-secondary hover:bg-accent/20 text-muted-foreground hover:text-accent"
                disabled={uploadingFile || !canSend}
                title={canSend ? "Press & hold to record" : "Only admins can send messages"}
                aria-label="Voice note"
                style={{ touchAction: 'none' }}
              >
                <Mic className="w-4 h-4" />
              </button>
            ) : (
              <Button
                type="button"
                size="icon"
                className="shrink-0 rounded-full"
                onClick={handleSend}
                disabled={!input.trim() || uploadingFile || !canSend}
              >
                {editingMessage ? <Check className="w-4 h-4" /> : <Send className="w-4 h-4" />}
              </Button>
            )}
          </div>
        </div>
        )}
      </div>

      {/* Contact sharing form */}
      <AnimatePresence>
        {showContactForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4"
            onClick={() => setShowContactForm(false)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="bg-background rounded-2xl w-full max-w-sm p-5 shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="font-semibold text-sm mb-4">Share Contact</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Name</label>
                  <input
                    autoFocus
                    value={contactName}
                    onChange={e => setContactName(e.target.value)}
                    placeholder="Contact name"
                    className="w-full h-9 bg-secondary/40 border border-border/40 rounded-lg px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary/40 mt-1"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Phone</label>
                  <input
                    value={contactPhone}
                    onChange={e => setContactPhone(e.target.value)}
                    placeholder="Phone number"
                    type="tel"
                    className="w-full h-9 bg-secondary/40 border border-border/40 rounded-lg px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary/40 mt-1"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Email (optional)</label>
                  <input
                    value={contactEmail}
                    onChange={e => setContactEmail(e.target.value)}
                    placeholder="Email address"
                    type="email"
                    className="w-full h-9 bg-secondary/40 border border-border/40 rounded-lg px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary/40 mt-1"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-5">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => setShowContactForm(false)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  disabled={!contactName.trim() || !contactPhone.trim()}
                  onClick={() => {
                    let text = `👤 ${contactName.trim()}\n📞 ${contactPhone.trim()}`;
                    if (contactEmail.trim()) text += `\n📧 ${contactEmail.trim()}`;
                    onSend(text);
                    setShowContactForm(false);
                    setContactName('');
                    setContactPhone('');
                    setContactEmail('');
                    toast.success('Contact shared');
                  }}
                >
                  Share
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Forward dialog */}
      <AnimatePresence>
        {forwardMsgId && conversations.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4"
            onClick={() => setForwardMsgId(null)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="bg-background rounded-2xl w-full max-w-sm p-5 shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="font-semibold text-sm mb-3">Forward to...</h3>
              <div className="max-h-60 overflow-y-auto scrollbar-thin space-y-0.5">
                {conversations
                  .filter(c => c.id !== activeConversation)
                  .map(conv => (
                    <button
                      key={conv.id}
                      onClick={() => {
                        onForward?.(forwardMsgId, conv.id);
                        setForwardMsgId(null);
                        toast.success('Message forwarded');
                      }}
                      className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-accent/30 transition-all text-left"
                    >
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                        {conv.is_group ? (
                          <Users className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <span className="text-xs font-bold text-muted-foreground">
                            {conv.other_user?.display_name?.charAt(0)?.toUpperCase() || '?'}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {conv.is_group ? (conv.group_name || 'Group') : (conv.other_user?.display_name || 'User')}
                        </p>
                      </div>
                    </button>
                  ))}
                {conversations.filter(c => c.id !== activeConversation).length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-6">No other conversations</p>
                )}
              </div>
              <div className="flex justify-end mt-3">
                <Button variant="ghost" size="sm" onClick={() => setForwardMsgId(null)}>
                  Cancel
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image lightbox */}
      <AnimatePresence>
        {lightboxImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
            onClick={() => setLightboxImage(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="relative max-w-full max-h-full"
            >
              <img
                src={lightboxImage}
                alt="Full size"
                className="max-w-full max-h-[90vh] rounded-lg object-contain"
                loading="lazy"
              />
              <button
                onClick={() => setLightboxImage(null)}
                className="absolute -top-3 -right-3 bg-background rounded-full p-1 shadow-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <GroupInfoPanel
        isOpen={showGroupInfo}
        onClose={() => setShowGroupInfo(false)}
        conversationId={activeConversation || ''}
        groupName={groupName || 'Group'}
        groupAvatar={groupAvatar}
        onLeft={() => { onBack?.(); }}
        onDeleted={() => { onBack?.(); }}
      />

    </div>
  );
}
