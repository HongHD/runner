import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useGameStore from '../../store/gameStore';
import { Image as ImageIcon, Paperclip, Send, Loader2, X } from 'lucide-react';
import axios from 'axios';

export default function PlayBoard() {
    const { socket, nickname, pinCode, resetGame } = useGameStore();
    const navigate = useNavigate();

    const [content, setContent] = useState('');
    const [imageFile, setImageFile] = useState(null);
    const [attachmentFile, setAttachmentFile] = useState(null);

    // UI state
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [imagePreview, setImagePreview] = useState(null);

    const imageInputRef = useRef(null);
    const fileInputRef = useRef(null);

    // Guard route
    useEffect(() => {
        if (!socket || !nickname || !pinCode) {
            navigate('/play');
            return;
        }

        const handleGameEnded = () => {
            navigate('/play/lobby');
        };
        const handleAdminLeft = () => {
            navigate('/play/lobby');
        };

        socket.on('game_ended', handleGameEnded);
        socket.on('admin_left', handleAdminLeft);

        socket.on('board_post_success', () => {
            setIsSubmitting(false);
            setContent('');
            setImageFile(null);
            setAttachmentFile(null);
            setImagePreview(null);
            alert('게시물이 성공적으로 전송되었습니다!');
        });

        socket.on('board_post_error', (data) => {
            setIsSubmitting(false);
            alert(data?.message || '업로드 실패');
        });

        return () => {
            socket.off('game_ended', handleGameEnded);
            socket.off('admin_left', handleAdminLeft);
            socket.off('board_post_success');
            socket.off('board_post_error');
        };
    }, [socket, nickname, pinCode, navigate, resetGame]);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleAttachmentChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setAttachmentFile(file);
        }
    };

    const uploadFile = async (file, type) => {
        const formData = new FormData();
        formData.append(type === 'image' ? 'image' : 'file', file);

        try {
            const res = await axios.post(`/api/upload/${type}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            return res.data;
        } catch (error) {
            console.error('Upload Error:', error);
            throw error;
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!content.trim() && !imageFile && !attachmentFile) {
            alert('내용이나 이미지를 최소 하나 이상 업로드해주세요.');
            return;
        }

        setIsSubmitting(true);

        try {
            let imageUrl = null;
            let attachmentUrl = null;
            let attachmentName = null;

            if (imageFile) {
                const imgRes = await uploadFile(imageFile, 'image');
                if (imgRes.success) {
                    imageUrl = imgRes.filePath;
                }
            }

            if (attachmentFile) {
                const fileRes = await uploadFile(attachmentFile, 'file');
                if (fileRes.success) {
                    attachmentUrl = fileRes.filePath;
                    attachmentName = fileRes.fileName;
                }
            }

            socket.emit('player_submit_board_post', {
                pinCode,
                content,
                imageUrl,
                attachmentUrl,
                attachmentName
            });

        } catch (err) {
            setIsSubmitting(false);
            alert('업로드 중 오류가 발생했습니다. 다시 시도해주세요.');
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col pt-safe px-4" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 80px)' }}>
            <header className="py-4 border-b border-white/10 flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                        실시간 게시판
                    </h1>
                    <p className="text-xs text-slate-400 mt-1">
                        PIN: {pinCode} <span className="mx-2">|</span> {nickname}
                    </p>
                </div>
            </header>

            <main className="flex-1 max-w-lg w-full mx-auto animate-fade-in-up">
                <form onSubmit={handleSubmit} className="bg-slate-800/50 backdrop-blur border border-white/10 rounded-2xl p-5 shadow-xl">

                    {/* Text Area */}
                    <div className="mb-4">
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="지금 어떤 생각을 하고 계신가요?"
                            className="w-full h-32 bg-slate-900/50 border border-white/10 rounded-xl p-4 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 resize-none transition-all"
                        />
                    </div>

                    {/* Previews */}
                    <div className="mb-6 space-y-3">
                        {imagePreview && (
                            <div className="relative group rounded-xl overflow-hidden border border-white/10">
                                <img src={imagePreview} alt="Preview" className="w-full object-cover max-h-48" />
                                <button
                                    type="button"
                                    onClick={() => { setImageFile(null); setImagePreview(null); }}
                                    className="absolute top-2 right-2 bg-black/60 p-1.5 rounded-full text-white hover:bg-black/80 transition-colors"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        )}

                        {attachmentFile && (
                            <div className="flex items-center justify-between p-3 bg-slate-900/50 border border-white/10 rounded-xl">
                                <div className="flex items-center gap-3 overflow-hidden text-sm">
                                    <Paperclip size={16} className="text-cyan-400 shrink-0" />
                                    <span className="truncate text-slate-300">{attachmentFile.name}</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setAttachmentFile(null)}
                                    className="p-1 mr-1 text-slate-400 hover:text-red-400 transition-colors shrink-0"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Controls & Submit */}
                    <div className="flex items-center justify-between mt-auto">
                        <div className="flex gap-2">
                            <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                ref={imageInputRef}
                                onChange={handleImageChange}
                            />
                            <button
                                type="button"
                                onClick={() => imageInputRef.current?.click()}
                                className="p-3 bg-slate-700/50 hover:bg-slate-700 rounded-full text-cyan-400 transition-colors"
                            >
                                <ImageIcon size={20} />
                            </button>

                            <input
                                type="file"
                                className="hidden"
                                ref={fileInputRef}
                                onChange={handleAttachmentChange}
                            />
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="p-3 bg-slate-700/50 hover:bg-slate-700 rounded-full text-blue-400 transition-colors"
                            >
                                <Paperclip size={20} />
                            </button>
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting || (!content.trim() && !imageFile && !attachmentFile)}
                            className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3 rounded-xl font-bold text-white shadow-lg hover:shadow-cyan-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" /> 전송 중...
                                </>
                            ) : (
                                <>
                                    <Send size={18} /> 전송
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </main>
        </div>
    );
}
