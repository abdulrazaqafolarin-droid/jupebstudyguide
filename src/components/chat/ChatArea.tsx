import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, ArrowLeft, ImagePlus, Paperclip, Reply, X, Users, Check, CheckCheck, File, Film, Music, Trash2, Edit3, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Message, Conversation, Profile } from '@/hooks/useChat';
import { useAuth } from '@/contexts/AuthContext';
import { useImageCompression } from '@/hooks/useImageCompression';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { UserAvatar } from '@/components/UserAvatar';
import { MessageReactions } from './MessageReactions';
import { toast } from 'sonner';

interface ChatAreaProps {
  messages: Message[];
  activeConversation: string | null;
  conversations: Conversation[];
  loading: boolean;
  onSend: (content: string, replyToId?: string | null) => void;
  onSendImage?: (imageUrl: string) => void;
  onSendFile?: (fileUrl: string, fileName: string, fileSize: number, fileType: string) => void;
  onReact?: (messageId: string, emoji: string) => void;
  onEditMessage?: (messageId: string, newContent: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onUploadImage?: (file: File) => Promise<string | null>;
  onUploadFile?: (file: File) => Promise<{ url: string | null; error: string | null }>;
  onBack?: () => void;
  isOnline: (userId: string) => boolean;
  isTyping: (userId: string) => boolean;
  onTyping: (isTyping: boolean) => void;
  hasMoreMessages?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
}

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

function MessageStatus({ message, isOwn }: { message: Message; isOwn: boolean }) {
  if (!isOwn) return null;
  if (message.is_deleted) return null;

  if (message.read_at) {
    return <CheckCheck className="w-3.5 h-3.5 text-blue-400 inline" />;
  }
  if (message.delivered_at) {
    return <CheckCheck className="w-3.5 h-3.5 text-muted-foreground/60 inline" />;
  }
  return <Check className="w-3.5 h-3.5 text-muted-foreground/60 inline" />;
}

function UploadProgressBar({ progress }: { progress: number }) {
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
}

function FilePreview({ fileUrl, fileName, fileType, fileSize }: { fileUrl: string; fileName: string; fileType?: string; fileSize?: number }) {
  const mime = fileType || '';
  const sizeLabel = fileSize ? `${(fileSize / 1024 / 1024).toFixed(1)} MB` : '';

  if (mime.startsWith('video/')) {
    return (
      <div className="max-w-full rounded-lg overflow-hidden mb-1.5">
        <video
          src={fileUrl}
          controls
          className="max-h-60 w-full object-cover"
          preload="metadata"
        >
          <a href={fileUrl} download={fileName}>Download video</a>
        </video>
        {fileName && <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{fileName}</p>}
      </div>
    );
  }

  if (mime.startsWith('audio/')) {
    return (
      <div className="max-w-full rounded-lg bg-secondary/40 p-3 mb-1.5">
        <div className="flex items-center gap-2 mb-2">
          <Music className="w-4 h-4 text-accent" />
          <span className="text-xs font-medium truncate flex-1">{fileName || 'Audio'}</span>
          {sizeLabel && <span className="text-[10px] text-muted-foreground">{sizeLabel}</span>}
        </div>
        <audio src={fileUrl} controls className="w-full h-8" />
      </div>
    );
  }

  return (
    <a
      href={fileUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 p-3 rounded-lg bg-secondary/40 hover:bg-secondary/60 transition-colors mb-1.5 group"
    >
      <div className="p-2 rounded-lg bg-primary/10">
        <File className="w-5 h-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">{fileName || 'File'}</p>
        {sizeLabel && <p className="text-[10px] text-muted-foreground">{sizeLabel}</p>}
      </div>
      <Download className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </a>
  );
}

const SUPPORTED_FILE_TYPES = [
  'image/png', 'image/jpeg', 'image/webp', 'image/gif',
  'video/mp4', 'video/webm',
  'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg',
  'application/pdf', 'text/plain',
];

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
  onTyping,
  hasMoreMessages,
  loadingMore,
  onLoadMore,
}: ChatAreaProps) {
  const { user } = useAuth();
  const { compressImage } = useImageCompression();
  const [input, setInput] = useState('');
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const prevMessageCountRef = useRef(messages.length);

  const activeConv = conversations.find(c => c.id === activeConversation);
  const isGroup = activeConv?.is_group;
  const groupName = activeConv?.group_name;

  const otherUserId = isGroup ? null : activeConv?.other_user?.user_id;
  const otherOnline = otherUserId ? isOnline(otherUserId) : false;
  const showTyping = otherUserId ? isTyping(otherUserId) : false;

  // Scroll to bottom on new messages, but not when loading more
  useEffect(() => {
    if (messages.length > prevMessageCountRef.current) {
      const isNewMessage = messages.length - prevMessageCountRef.current === 1;
      if (isNewMessage) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }
    prevMessageCountRef.current = messages.length;
  }, [messages]);

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
  }, [activeConversation]);

  const scrollDebounceRef = useRef<ReturnType<typeof setTimeout>>();

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el || !onLoadMore || !hasMoreMessages || loadingMore) return;

    if (el.scrollTop < 200) {
      if (scrollDebounceRef.current) clearTimeout(scrollDebounceRef.current);
      scrollDebounceRef.current = setTimeout(() => {
        onLoadMore();
      }, 200);
    }
  }, [onLoadMore, hasMoreMessages, loadingMore]);

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
    onTyping(false);
    inputRef.current?.focus();
  }, [input, onSend, onEditMessage, editingMessage, replyTo, onTyping]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    onTyping(e.target.value.trim().length > 0);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  }, [onTyping]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === 'Escape') {
      setEditingMessage(null);
      setReplyTo(null);
    }
  }, [handleSend]);

  const handleFileSelected = useCallback(async (file: File) => {
    if (file.size > 50 * 1024 * 1024) {
      toast.error('File must be under 50MB');
      return;
    }

    const isValid = SUPPORTED_FILE_TYPES.some(t => file.type === t);
    if (!isValid) {
      toast.error('Unsupported file type');
      return;
    }

    setUploadingFile(true);
    setUploadProgress(0);

    try {
      // If image, compress first
      let uploadFile = file;
      if (file.type.startsWith('image/')) {
        const compressed = await compressImage(file, 1920, 0.8);
        uploadFile = new File([compressed], file.name, { type: file.type });
      }

      if (file.type.startsWith('image/') && onUploadImage) {
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
    const file = e.target.files?.[0];
    if (!file) return;
    handleFileSelected(file);
    e.target.value = '';
  }, [handleFileSelected]);

  const replyMsg = replyTo ? messages.find(m => m.id === replyTo.id) : null;

  const handleStartEdit = useCallback((msg: Message) => {
    setEditingMessage(msg.id);
    setInput(msg.content);
    setReplyTo(null);
    inputRef.current?.focus();
  }, []);

  if (!activeConversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground bg-muted/20">
        <div className="w-20 h-20 rounded-full bg-secondary/50 flex items-center justify-center mb-4">
          <svg className="w-10 h-10 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
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
            url={isGroup ? undefined : activeConv?.other_user?.avatar_url}
            name={isGroup ? groupName : activeConv?.other_user?.display_name}
            className="w-9 h-9 ring-0"
          />
          {!isGroup && otherOnline && (
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-accent rounded-full border-[2.5px] border-card" />
          )}
        </div>
        <div className="flex flex-col min-w-0 flex-1">
          <span className="font-semibold text-sm leading-tight truncate">
            {isGroup ? (groupName || 'Group') : (activeConv?.other_user?.display_name || 'User')}
          </span>
          <span className="text-[10px] leading-tight text-muted-foreground">
            {isGroup ? `${activeConv?.participants?.length || 0} members` : (showTyping ? 'Typing...' : otherOnline ? 'Online' : 'Offline')}
          </span>
        </div>
        {isGroup && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground bg-secondary/50 px-2.5 py-1 rounded-full">
            <Users className="w-3 h-3" />
            <span>Group</span>
          </div>
        )}
      </div>

      {/* Messages */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-3 py-3 space-y-1 scrollbar-thin"
      >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
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
                    {group.date === format(new Date(), 'MMM d, yyyy')
                      ? 'Today'
                      : group.date === format(new Date(Date.now() - 86400000), 'MMM d, yyyy')
                      ? 'Yesterday'
                      : group.date}
                  </span>
                  <div className="flex-1 h-px bg-border/30" />
                </div>
                {group.messages.map((msg, i) => {
                  const isOwn = msg.sender_id === user?.id;
                  const showTime = i === group.messages.length - 1 ||
                    group.messages[i + 1]?.sender_id !== msg.sender_id;
                  const hasReactions = msg.reactions && Object.keys(msg.reactions).some(k => msg.reactions![k].length > 0);
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

                  return (
                    <div key={msg.id} className="group/message">
                      <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.12, ease: 'easeOut' }}
                        className={cn('flex items-end gap-1.5', bubbleMargin, isOwn ? 'justify-end' : 'justify-start')}
                      >
                        {!isOwn && (
                          <div className={cn('shrink-0', showAvatar ? 'opacity-100' : 'opacity-0 pointer-events-none')}>
                            <UserAvatar
                              url={msg.sender_id === activeConv?.other_user?.user_id ? activeConv?.other_user?.avatar_url : undefined}
                              name={msg.sender_id === activeConv?.other_user?.user_id ? activeConv?.other_user?.display_name : undefined}
                              className="w-6 h-6 ring-0"
                            />
                          </div>
                        )}

                        <div className={cn('max-w-[75%]', isOwn ? 'items-end' : 'items-start')}>
                          {/* Reply indicator */}
                          {msg.reply_to_id && !msg.is_deleted && (
                            <div className={cn(
                              'mb-0.5 px-3 py-1.5 rounded-lg text-xs border-l-2 opacity-70 max-w-[200px]',
                              isOwn ? 'bg-primary/20 border-primary-foreground/30 mr-1' : 'bg-muted border-muted-foreground/30 ml-1'
                            )}>
                              <p className="font-medium text-[10px] mb-0.5 text-muted-foreground">Replying</p>
                              <p className="truncate">{group.messages.find(m => m.id === msg.reply_to_id)?.content || 'original message'}</p>
                            </div>
                          )}

                          {/* Deleted message */}
                          {msg.is_deleted ? (
                            <div className={cn(
                              'px-3.5 py-2 rounded-2xl text-xs italic',
                              isOwn
                                ? 'bg-primary/5 text-muted-foreground'
                                : 'bg-secondary/40 text-muted-foreground',
                              isContinuous && isOwn ? 'rounded-br-md' : '',
                              isContinuous && !isOwn ? 'rounded-bl-md' : '',
                              !isContinuous && isOwn ? 'rounded-br-sm' : '',
                              !isContinuous && !isOwn ? 'rounded-bl-sm' : ''
                            )}>
                              This message was deleted
                            </div>
                          ) : (
                            <div className={cn(
                              'px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm',
                              isOwn
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-secondary/80 text-foreground',
                              isContinuous && isOwn ? 'rounded-br-md' : '',
                              isContinuous && !isOwn ? 'rounded-bl-md' : '',
                              !isContinuous && isOwn ? 'rounded-br-sm' : '',
                              !isContinuous && !isOwn ? 'rounded-bl-sm' : ''
                            )}>
                              {/* Image */}
                              {msg.message_type === 'image' && msg.image_url && (
                                <img
                                  src={msg.image_url}
                                  alt="Shared image"
                                  className="max-w-full rounded-lg mb-1.5 max-h-60 object-cover cursor-pointer hover:opacity-95 transition-opacity"
                                  onClick={() => window.open(msg.image_url, '_blank')}
                                  loading="lazy"
                                />
                              )}

                              {/* File/video/audio preview */}

                              {/* Video */}
                              {msg.message_type === 'video' && msg.file_url && (
                                <FilePreview fileUrl={msg.file_url} fileName={msg.file_name || ''} fileType={msg.file_type} fileSize={msg.file_size ?? undefined} />
                              )}

                              {/* Audio */}
                              {msg.message_type === 'audio' && msg.file_url && (
                                <FilePreview fileUrl={msg.file_url} fileName={msg.file_name || ''} fileType={msg.file_type} fileSize={msg.file_size ?? undefined} />
                              )}

                              {/* File */}
                              {msg.message_type === 'file' && msg.file_url && (
                                <FilePreview fileUrl={msg.file_url} fileName={msg.file_name || ''} fileType={msg.file_type} fileSize={msg.file_size ?? undefined} />
                              )}

                              {/* Text content */}
                              {msg.content && (
                                <p className="whitespace-pre-wrap break-words">{msg.content}</p>
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
                                  <MessageStatus message={msg} isOwn={isOwn} />
                                </p>
                              )}
                            </div>
                          )}

                          {/* Reactions */}
                          {onReact && hasReactions && !msg.is_deleted && (
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
                          {!msg.is_deleted && (
                            <div className={cn(
                              'flex gap-0.5 mt-0.5',
                              isOwn ? 'justify-end' : 'justify-start',
                              'opacity-0 group-hover/message:opacity-100 transition-opacity'
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
                                    className="rounded-full h-6 w-6 hover:text-destructive"
                                    onClick={() => onDeleteMessage?.(msg.id)}
                                    title="Delete"
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
                        </div>
                      </motion.div>
                    </div>
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
                  <p className="text-xs truncate text-muted-foreground">{replyMsg.content || 'Photo'}</p>
                </div>
                <Button variant="ghost" size="icon" className="rounded-lg shrink-0" onClick={() => setReplyTo(null)}>
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="px-3 py-2.5">
          <div className="flex items-end gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm,audio/mpeg,audio/mp3,audio/wav,audio/ogg,application/pdf,text/plain"
              className="hidden"
              onChange={handleFileInput}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0 rounded-full"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingFile}
              title="Attach file"
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
                placeholder={editingMessage ? 'Edit message...' : 'Type a message...'}
                rows={1}
                className="w-full resize-none bg-secondary/40 border border-border/40 rounded-2xl px-4 py-2.5 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40 max-h-32 scrollbar-thin transition-all"
                style={{ minHeight: '40px' }}
              />
            </div>
            <Button
              type="button"
              size="icon"
              className="shrink-0 rounded-full"
              onClick={handleSend}
              disabled={!input.trim() || uploadingFile}
            >
              {editingMessage ? <Check className="w-4 h-4" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
