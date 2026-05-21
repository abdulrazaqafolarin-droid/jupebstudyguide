import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, ArrowLeft, ImagePlus, Reply, X, Users, Check, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Message, Conversation, Profile } from '@/hooks/useChat';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { UserAvatar } from '@/components/UserAvatar';
import { MessageReactions } from './MessageReactions';

interface ChatAreaProps {
  messages: Message[];
  activeConversation: string | null;
  conversations: Conversation[];
  loading: boolean;
  onSend: (content: string) => void;
  onSendImage?: (imageUrl: string) => void;
  onReact?: (messageId: string, emoji: string) => void;
  onUploadImage?: (file: File) => Promise<string | null>;
  onBack?: () => void;
  isOnline: (userId: string) => boolean;
  isTyping: (userId: string) => boolean;
  onTyping: (isTyping: boolean) => void;
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

function MessageStatus({ isRead, isOwn }: { isRead: boolean; isOwn: boolean }) {
  if (!isOwn) return null;
  return (
    <span className="ml-1">
      {isRead ? (
        <CheckCheck className="w-3.5 h-3.5 text-blue-400 inline" />
      ) : (
        <Check className="w-3.5 h-3.5 text-muted-foreground/60 inline" />
      )}
    </span>
  );
}

export function ChatArea({
  messages,
  activeConversation,
  conversations,
  loading,
  onSend,
  onSendImage,
  onReact,
  onUploadImage,
  onBack,
  isOnline,
  isTyping,
  onTyping,
}: ChatAreaProps) {
  const { user } = useAuth();
  const [input, setInput] = useState('');
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeConv = conversations.find(c => c.id === activeConversation);
  const isGroup = activeConv?.is_group;
  const groupName = activeConv?.group_name;

  const otherUserId = isGroup ? null : activeConv?.other_user?.user_id;
  const otherOnline = otherUserId ? isOnline(otherUserId) : false;
  const showTyping = otherUserId ? isTyping(otherUserId) : false;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, showTyping]);

  useEffect(() => {
    setReplyTo(null);
  }, [activeConversation]);

  const handleSend = useCallback(() => {
    if (!input.trim()) return;
    onSend(input);
    setInput('');
    setReplyTo(null);
    onTyping(false);
    inputRef.current?.focus();
  }, [input, onSend, onTyping]);

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
  }, [handleSend]);

  const handleImageSelected = useCallback(async (file: File) => {
    if (!onUploadImage || !onSendImage) return;
    const url = await onUploadImage(file);
    if (url) onSendImage(url);
  }, [onUploadImage, onSendImage]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    handleImageSelected(file);
    e.target.value = '';
  }, [handleImageSelected]);

  const replyMsg = replyTo ? messages.find(m => m.id === replyTo.id) : null;

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
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1 scrollbar-thin">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : (
          <>
            {groupedMessages.map((group) => (
              <div key={group.date}>
                <div className="flex items-center justify-center my-3">
                  <span className="text-[10px] text-muted-foreground bg-secondary/50 px-3 py-1 rounded-full font-medium">
                    {group.date}
                  </span>
                </div>
                {group.messages.map((msg, i) => {
                  const isOwn = msg.sender_id === user?.id;
                  const showTime = i === group.messages.length - 1 ||
                    group.messages[i + 1]?.sender_id !== msg.sender_id;
                  const hasReactions = msg.reactions && Object.keys(msg.reactions).some(k => msg.reactions![k].length > 0);

                  return (
                    <div key={msg.id} className="group/message">
                      <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.15 }}
                        className={cn('flex mb-0.5', isOwn ? 'justify-end' : 'justify-start')}
                      >
                        <div className={cn('max-w-[75%]', isOwn ? 'items-end' : 'items-start')}>
                          {/* Reply indicator */}
                          {msg.reply_to_id && (
                            <div className={cn(
                              'mb-0.5 px-3 py-1.5 rounded-lg text-xs border-l-2 opacity-70 max-w-[200px]',
                              isOwn ? 'bg-primary/20 border-primary-foreground/30 mr-1' : 'bg-muted border-muted-foreground/30 ml-1'
                            )}>
                              <p className="font-medium text-[10px] mb-0.5 text-muted-foreground">Replying</p>
                              <p className="truncate">{group.messages.find(m => m.id === msg.reply_to_id)?.content || 'original message'}</p>
                            </div>
                          )}

                          <div className={cn(
                            'px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm',
                            isOwn
                              ? 'bg-primary text-primary-foreground rounded-br-sm'
                              : 'bg-secondary/80 text-foreground rounded-bl-sm'
                          )}>
                            {msg.message_type === 'image' && msg.image_url && (
                              <img
                                src={msg.image_url}
                                alt="Shared image"
                                className="max-w-full rounded-lg mb-1.5 max-h-60 object-cover cursor-pointer hover:opacity-95 transition-opacity"
                                onClick={() => window.open(msg.image_url, '_blank')}
                                loading="lazy"
                              />
                            )}
                            {msg.content && (
                              <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                            )}
                            {showTime && (
                              <p className={cn(
                                'text-[10px] mt-1 flex items-center gap-1',
                                isOwn ? 'text-primary-foreground/60' : 'text-muted-foreground'
                              )}>
                                {format(new Date(msg.created_at), 'h:mm a')}
                                {msg.is_edited && <span className="text-[9px]">(edited)</span>}
                                <MessageStatus isRead={msg.is_read} isOwn={isOwn} />
                              </p>
                            )}
                          </div>

                          {/* Reactions */}
                          {onReact && hasReactions && (
                            <div className={cn('mt-0.5', isOwn ? 'ml-auto' : 'mr-auto')}>
                              <MessageReactions
                                reactions={msg.reactions || {}}
                                messageId={msg.id}
                                currentUserId={user?.id || ''}
                                onReact={onReact}
                              />
                            </div>
                          )}

                          {/* Hover actions - reply and react */}
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
                            {onReact && (
                              <div className="p-1 rounded-full hover:bg-secondary transition-colors">
                                <MessageReactions
                                  reactions={{}}
                                  messageId={msg.id}
                                  currentUserId={user?.id || ''}
                                  onReact={onReact}
                                  compact
                                />
                              </div>
                            )}
                          </div>
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

      {/* Input */}
      <div className="border-t border-border bg-card/50 backdrop-blur-sm shrink-0">
        {/* Reply preview */}
        <AnimatePresence>
          {replyMsg && (
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
            {onUploadImage && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileInput}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0 rounded-full"
                  onClick={() => fileInputRef.current?.click()}
                  title="Send photo"
                >
                  <ImagePlus className="w-4 h-4" />
                </Button>
              </>
            )}
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onBlur={() => onTyping(false)}
                placeholder="Type a message..."
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
              disabled={!input.trim()}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
