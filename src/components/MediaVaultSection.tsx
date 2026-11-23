import React, { useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  Upload,
  Image as ImageIcon,
  Trash2,
  AlertCircle,
  Link2,
  ArrowUpRight,
  Play
} from 'lucide-react';
import {
  MAX_LOGO_BYTES,
  formatFileSize,
  saveMediaAsset,
  deleteMediaAsset
} from '../utils/mediaStorage';

const BRUTALIST_EASE = [0.16, 1, 0.3, 1] as const;

export interface UploadedMediaState {
  url: string;
  name: string;
  size: number;
  type: string;
}

function formatLinkHost(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl.trim());
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return rawUrl.trim();
  }
}

interface MediaVaultSectionProps {
  canEdit: boolean;
  logoMedia: UploadedMediaState | null;
  videoMedia?: UploadedMediaState | null;
  videoEmbedUrl: string;
  videoLoadingProgress?: number | null;
  onLogoChange: (media: UploadedMediaState | null) => void;
  onVideoChange?: (media: UploadedMediaState | null) => void;
  onVideoEmbedUrlChange: (url: string) => void;
}

export function MediaVaultSection({
  canEdit,
  logoMedia,
  videoEmbedUrl,
  onLogoChange,
  onVideoEmbedUrlChange
}: MediaVaultSectionProps) {
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [logoDragging, setLogoDragging] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);

  const cleanUrl = videoEmbedUrl.trim();
  const hasLink = Boolean(cleanUrl);

  const handleLogoFile = async (file: File) => {
    setLogoError(null);

    if (!file.type.startsWith('image/')) {
      setLogoError('Unsupported format. Please upload a PNG, SVG, JPG, or WebP logo.');
      return;
    }

    if (file.size > MAX_LOGO_BYTES) {
      setLogoError(`Logo exceeds 10 MB limit (${formatFileSize(file.size)} selected).`);
      return;
    }

    setLogoUploading(true);
    try {
      await saveMediaAsset({
        id: 'firm-logo',
        name: file.name,
        type: file.type,
        size: file.size,
        updatedAt: Date.now(),
        blob: file
      });

      if (logoMedia?.url) {
        URL.revokeObjectURL(logoMedia.url);
      }

      const objectUrl = URL.createObjectURL(file);
      onLogoChange({
        url: objectUrl,
        name: file.name,
        size: file.size,
        type: file.type
      });
    } catch {
      setLogoError('Could not save logo to browser storage.');
    } finally {
      setLogoUploading(false);
    }
  };

  const handleRemoveLogo = async () => {
    await deleteMediaAsset('firm-logo');
    if (logoMedia?.url) {
      URL.revokeObjectURL(logoMedia.url);
    }
    onLogoChange(null);
    setLogoError(null);
    if (logoInputRef.current) logoInputRef.current.value = '';
  };

  return (
    <section
      id="our-firm"
      className="border-t border-[#2A2E35] bg-[#101215] py-20 lg:py-28 overflow-hidden"
    >
      <div className="mx-auto max-w-[1360px] px-6 lg:px-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.7, ease: BRUTALIST_EASE }}
          className="mb-12 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"
        >
          <div>
            <p className="font-mono text-xs tracking-wider text-[#D9381E]">
              02. Our Firm & Studio Showcase
            </p>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-[#F4F4F2] sm:text-4xl [text-wrap:balance]">
              Studio Walkthrough
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-relaxed text-[#9CA3AF]">
            Step inside our architectural practice—from raw formwork studies and structural models
            to our completed concrete monoliths across the Philippines.
          </p>
        </motion.div>

        {/* Main 12-Column Grid: Full-width in Public View, 8+4 Split in Admin Edit Mode */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-stretch">
          {/* Clean Architectural Walkthrough Link Template */}
          <motion.div
            initial={{ opacity: 0, y: 48 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.75, ease: BRUTALIST_EASE }}
            className={`${canEdit ? 'lg:col-span-8' : 'lg:col-span-12'} flex flex-col justify-between border border-[#2A2E35] bg-[#141619]`}
          >
            <div className="flex flex-col justify-between gap-8 p-8 sm:p-10 lg:flex-row lg:items-center lg:p-12">
              <div className="max-w-xl">
                <div className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-[#D9381E]">
                  <Play className="h-3.5 w-3.5 fill-current" />
                  Official Studio Screening
                </div>
                <h3 className="mt-3 font-display text-2xl font-bold tracking-tight text-[#F4F4F2] sm:text-3xl">
                  Watch the Full Architectural Walkthrough
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-[#9CA3AF]">
                  Experience our studio spaces, structural models, and completed architectural works
                  in full resolution via our official walkthrough link.
                </p>
                {hasLink && (
                  <p className="mt-4 font-mono text-xs text-[#6B7280]">
                    Source: <span className="text-[#D1D5DB]">{formatLinkHost(cleanUrl)}</span>
                  </p>
                )}
              </div>

              <div className="shrink-0">
                {hasLink ? (
                  <a
                    href={cleanUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2.5 bg-[#D9381E] px-7 py-4 text-sm font-semibold text-white transition-colors hover:bg-[#B82D16] whitespace-nowrap"
                  >
                    <Play className="h-4 w-4 fill-current" />
                    Watch Walkthrough
                    <ArrowUpRight className="h-4 w-4" />
                  </a>
                ) : (
                  <div className="inline-flex items-center gap-2 border border-[#2A2E35] bg-[#0B0C0E] px-6 py-3.5 font-mono text-xs text-[#9CA3AF]">
                    <Link2 className="h-3.5 w-3.5 text-[#D9381E]" />
                    {canEdit ? 'Add link below' : 'Link coming soon'}
                  </div>
                )}
              </div>
            </div>

            {/* Admin-Only Clean Link Input */}
            {canEdit && (
              <div className="border-t border-[#2A2E35] bg-[#0B0C0E] px-8 py-5 sm:px-10">
                <label
                  htmlFor="walkthrough-embed-url"
                  className="flex items-center gap-2 font-mono text-xs text-[#9CA3AF]"
                >
                  <Link2 className="h-3.5 w-3.5 text-[#D9381E]" />
                  Walkthrough Video Link (YouTube, Vimeo, or Google Drive)
                </label>
                <div className="mt-2.5 flex gap-2">
                  <input
                    id="walkthrough-embed-url"
                    type="url"
                    value={videoEmbedUrl}
                    onChange={(e) => onVideoEmbedUrlChange(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
                    className="flex-1 border border-[#2A2E35] bg-[#141619] px-3.5 py-2.5 text-xs text-[#F4F4F2] placeholder-[#4B5563] focus:border-[#D9381E] focus:outline-none"
                  />
                  {videoEmbedUrl && (
                    <button
                      type="button"
                      onClick={() => onVideoEmbedUrlChange('')}
                      className="border border-[#2A2E35] bg-[#1C1F24] px-3.5 py-2.5 text-xs font-medium text-[#9CA3AF] hover:border-[#D9381E] hover:text-[#D9381E] cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            )}
          </motion.div>

          {/* Right 4 Columns: Direct Brand Logo Uploader (Admin Only) */}
          {canEdit && (
            <motion.div
              initial={{ opacity: 0, y: 48 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 0.75, delay: 0.12, ease: BRUTALIST_EASE }}
              className="lg:col-span-4 flex flex-col justify-between border border-[#2A2E35] bg-[#141619]"
            >
              <div>
                <div className="flex items-center justify-between border-b border-[#2A2E35] px-6 py-4">
                  <div className="flex items-center gap-3">
                    <ImageIcon className="h-4 w-4 text-[#D9381E]" aria-hidden="true" />
                    <span className="font-display text-sm font-semibold text-[#F4F4F2]">
                      Firm Brand Logo
                    </span>
                  </div>
                  <span className="font-mono text-xs text-[#9CA3AF]">Header Sync</span>
                </div>

                <div className="p-6">
                  <p className="text-sm leading-relaxed text-[#9CA3AF]">
                    Upload your firm’s emblem or wordmark. It immediately replaces the default
                    monogram in the website header and footer.
                  </p>

                  {/* Live Logo Dropzone / Preview */}
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setLogoDragging(true);
                    }}
                    onDragLeave={() => setLogoDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setLogoDragging(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) handleLogoFile(file);
                    }}
                    className={`mt-6 flex min-h-[180px] flex-col items-center justify-center border border-dashed p-6 text-center transition-colors ${
                      logoDragging
                        ? 'border-[#D9381E] bg-[#1C1F24]'
                        : 'border-[#2A2E35] bg-[#0B0C0E]'
                    }`}
                  >
                    {logoMedia ? (
                      <div className="flex flex-col items-center gap-4">
                        <img
                          src={logoMedia.url}
                          alt="Uploaded architectural firm logo"
                          className="max-h-28 max-w-full object-contain drop-shadow-[0_2px_12px_rgba(255,255,255,0.12)]"
                        />
                        <div className="font-mono text-xs text-[#9CA3AF] tabular-nums">
                          {logoMedia.name} · {formatFileSize(logoMedia.size)}
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <div className="mb-3 flex h-11 w-11 items-center justify-center border border-[#2A2E35] bg-[#141619]">
                          <ImageIcon className="h-5 w-5 text-[#9CA3AF]" />
                        </div>
                        <span className="text-sm font-medium text-[#F4F4F2]">
                          Drop PNG, SVG, or WebP logo
                        </span>
                        <span className="mt-1 font-mono text-xs text-[#6B7280]">
                          Transparent background recommended
                        </span>
                      </div>
                    )}
                  </div>

                  {logoError && (
                    <div className="mt-4 flex items-center gap-2 border border-[#D9381E]/40 bg-[#D9381E]/10 px-3 py-2 text-xs text-[#FCA5A5]">
                      <AlertCircle className="h-4 w-4 shrink-0 text-[#D9381E]" />
                      <span>{logoError}</span>
                    </div>
                  )}

                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      type="button"
                      disabled={logoUploading}
                      onClick={() => logoInputRef.current?.click()}
                      className="flex-1 inline-flex items-center justify-center gap-2 bg-[#F4F4F2] px-4 py-2.5 text-xs font-semibold text-[#0B0C0E] transition-colors hover:bg-white whitespace-nowrap cursor-pointer disabled:opacity-50"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      {logoMedia ? 'Replace Logo' : 'Upload Logo'}
                    </button>

                    {logoMedia && (
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        className="inline-flex items-center justify-center gap-1.5 border border-[#2A2E35] bg-[#1C1F24] px-4 py-2.5 text-xs font-medium text-[#9CA3AF] transition-colors hover:border-[#D9381E] hover:text-[#D9381E] whitespace-nowrap cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Reset
                      </button>
                    )}
                  </div>

                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/png,image/svg+xml,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleLogoFile(file);
                    }}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
}
