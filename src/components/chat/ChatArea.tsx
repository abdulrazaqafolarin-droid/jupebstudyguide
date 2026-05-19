import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, ArrowLeft, ImagePlus, Reply, X, Users, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Message, Conversation } from '@/hooks/useChat';
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
    <div className="flex justify-start mb-2">
      <div className="bg-secondary rounded-2xl rounded-bl-md px-4 py-2.5 flex items-center gap-1">
        <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
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
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const activeConv = conversations.find(c => c.id === activeConversation);
  const isGroup = activeConv?.is_group;
  const groupName = activeConv?.group_name;

  const otherUserId = isGroup
    ? null
    : activeConv?.other_user?.user_id;
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

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>, useCamera?: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;
    handleImageSelected(file);
    e.target.value = '';
  }, [handleImageSelected]);

  const replyMsg = replyTo ? messages.find(m => m.id === replyTo.id) : null;

  if (!activeConversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
        <div className="w-16 h-16 rounded-full bg-secondary/50 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <p className="text-lg font-medium">Select a conversation</p>
        <p className="text-sm mt-1 opacity-60">Or search for users to start chatting</p>
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
    <>
      {/* Header */}
      <div className="h-14 border-b border-border flex items-center px-4 gap-3 shrink-0 bg-card/50 backdrop-blur-sm z-10">
        {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        )}
        <div className="relative shrink-0">
          <UserAvatar
            url={activeConv?.other_user?.avatar_url}
            name={isGroup ? groupName : activeConv?.other_user?.display_name}
            className="w-8 h-8 ring-0"
          />
          {!isGroup && otherOnline && (
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-accent rounded-full border-2 border-card" />
          )}
        </div>
        <div className="flex flex-col min-w-0">
          <span className="font-medium text-sm leading-tight truncate">
            {isGroup ? (groupName || 'Group') : (activeConv?.other_user?.display_name || 'User')}
          </span>
          <span className="text-[10px] leading-tight text-muted-foreground">
            {isGroup ? 'Group conversation' : (showTyping ? 'typing...' : otherOnline ? 'Online' : 'Offline')}
          </span>
        </div>
        {isGroup && (
          <div className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="w-3.5 h-3.5" />
            <span>Group</span>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1 scrollbar-thin">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : (
          <>
            {groupedMessages.map((group) => (
              <div key={group.date}>
                <div className="flex items-center justify-center my-4">
                  <span className="text-[10px] text-muted-foreground bg-secondary/50 px-3 py-1 rounded-full">
                    {group.date}
                  </span>
                </div>
                {group.messages.map((msg, i) => {
                  const isOwn = msg.sender_id === user?.id;
                  const showTime = i === group.messages.length - 1 ||
                    group.messages[i + 1]?.sender_id !== msg.sender_id;
                  const hasReactions = msg.reactions && Object.keys(msg.reactions).some(k => msg.reactions![k].length > 0);

                  return (
                    <div key={msg.id} className="group">
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                        className={cn(
                          'flex mb-0.5',
                          isOwn ? 'justify-end' : 'justify-start'
                        )}
                      >
                        <div className={cn('max-w-[75%]', isOwn ? 'items-end' : 'items-start')}>
                          {/* Reply indicator */}
                          {msg.reply_to_id && (
                            <div className={cn(
                              'mb-0.5 px-3 py-1.5 rounded-lg text-xs border-l-2 opacity-70 max-w-[200px]',
                              isOwn ? 'bg-primary-foreground/10 border-primary-foreground/30 mr-1' : 'bg-muted border-muted-foreground/30 ml-1'
                            )}>
                              <p className="font-medium text-[10px] mb-0.5">Replying</p>
                              <p className="truncate">{group.messages.find(m => m.id === msg.reply_to_id)?.content || 'original message'}</p>
                            </div>
                          )}

                          <div className={cn(
                            'px-3.5 py-2 rounded-2xl text-sm leading-relaxed',
                            isOwn
                              ? 'bg-primary text-primary-foreground rounded-br-md'
                              : 'bg-secondary text-foreground rounded-bl-md'
                          )}>
                            {/* Image message */}
                            {msg.message_type === 'image' && msg.image_url && (
                              <img
                                src={msg.image_url}
                                alt="Shared image"
                                className="max-w-full rounded-lg mb-1 max-h-60 object-cover cursor-pointer"
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
                                {isOwn && (
                                  <span className="ml-0.5">{msg.is_read ? '✓✓' : '✓'}</span>
                                )}
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

                          {/* Reply button */}
                          <button
                            onClick={() => setReplyTo(msg)}
                            className={cn(
                              'opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-muted-foreground hover:text-foreground p-1',
                              isOwn ? 'text-right' : 'text-left'
                            )}
                          >
                            <Reply className="w-3 h-3 inline-block" />
                          </button>
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
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
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
              <div className="px-4 py-2 flex items-center gap-2 bg-secondary/30">
                <Reply className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-medium text-muted-foreground">Replying</p>
                  <p className="text-xs truncate">{replyMsg.content || 'Image'}</p>
                </div>
                <button onClick={() => setReplyTo(null)} className="p-1 rounded hover:bg-secondary transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="p-3">
          <div className="flex items-end gap-2 max-w-3xl mx-auto">
            {onUploadImage && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileInput(e, false)}
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => handleFileInput(e, true)}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => fileInputRef.current?.click()}
                  className="shrink-0 rounded-xl h-10 w-10 text-muted-foreground hover:text-foreground"
                  title="Upload image"
                >
                  <ImagePlus className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => cameraInputRef.current?.click()}
                  className="shrink-0 rounded-xl h-10 w-10 text-muted-foreground hover:text-foreground"
                  title="Take photo"
                >
                  <Camera className="w-4 h-4" />
                </Button>
              </>
            )}
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onBlur={() => onTyping(false)}
              placeholder="Type a message..."
              rows={1}
              className="flex-1 resize-none bg-secondary/50 border border-border/50 rounded-xl px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 max-h-32 scrollbar-thin"
              style={{ minHeight: '40px' }}
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!input.trim()}
              className="shrink-0 rounded-xl h-10 w-10 bg-primary hover:bg-primary/90"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
