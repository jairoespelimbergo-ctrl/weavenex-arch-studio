import React, { useRef, useState } from 'react';
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  type PanInfo
} from 'motion/react';
import { ArrowUpRight, Camera, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import type { ProjectItem } from '../data/firmData';
import { EditableText } from './EditableText';

const BRUTALIST_EASE = [0.16, 1, 0.3, 1] as const;

interface ProjectWorkCardProps {
  project: ProjectItem;
  index: number;
  editMode: boolean;
  onSelect: (project: ProjectItem, initialShotIndex: number) => void;
  onUpdateProject: (projectId: string, updater: (prev: ProjectItem) => ProjectItem) => void;
  onReplaceShotImage: (projectId: string, shotIndex: number, file: File) => void;
  onAddShotImage: (projectId: string, file: File) => void;
}

export function ProjectWorkCard({
  project,
  index,
  editMode,
  onSelect,
  onUpdateProject,
  onReplaceShotImage,
  onAddShotImage
}: ProjectWorkCardProps) {
  const cardRef = useRef<HTMLElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const addInputRef = useRef<HTMLInputElement>(null);

  const [shotIndex, setShotIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  // Subtle 3D tilt motion values
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [4.5, -4.5]), {
    stiffness: 240,
    damping: 26
  });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-4.5, 4.5]), {
    stiffness: 240,
    damping: 26
  });

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    if (editMode) return;
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    const xPct = (e.clientX - rect.left) / rect.width - 0.5;
    const yPct = (e.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(xPct);
    mouseY.set(yPct);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  const totalShots = project.shots.length;
  const safeIndex = Math.min(shotIndex, Math.max(0, totalShots - 1));

  const paginate = (newDirection: number) => {
    setDirection(newDirection);
    setShotIndex((prev) => (prev + newDirection + totalShots) % totalShots);
  };

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const swipeThreshold = 45;
    if (info.offset.x < -swipeThreshold || info.velocity.x < -300) {
      paginate(1);
    } else if (info.offset.x > swipeThreshold || info.velocity.x > 300) {
      paginate(-1);
    }
  };

  const currentShot = project.shots[safeIndex] ?? { url: project.image, caption: project.title };

  return (
    <div style={{ perspective: 1000 }}>
      <motion.article
        ref={cardRef}
        layout
        initial={{ opacity: 0, y: 52 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{
          duration: 0.72,
          delay: (index % 2) * 0.1,
          ease: BRUTALIST_EASE
        }}
        style={{
          rotateX: editMode ? 0 : rotateX,
          rotateY: editMode ? 0 : rotateY,
          transformStyle: 'preserve-3d'
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="group border border-[#2A2E35] bg-[#141619] transition-colors hover:border-[#D9381E] will-change-transform"
      >
        {/* Swipable 4:3 Architectural Image Stage */}
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#0B0C0E] select-none">
          <AnimatePresence initial={false} custom={direction} mode="popLayout">
            <motion.div
              key={`${project.id}-${safeIndex}`}
              custom={direction}
              initial={{ x: direction >= 0 ? '100%' : '-100%', opacity: 0.6 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: direction >= 0 ? '-100%' : '100%', opacity: 0.6 }}
              transition={{ duration: 0.4, ease: BRUTALIST_EASE }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.22}
              onDragEnd={handleDragEnd}
              className="absolute inset-0 cursor-grab active:cursor-grabbing"
            >
              <img
                src={currentShot.url || undefined}
                alt={`${project.title} — ${currentShot.caption}`}
                referrerPolicy="no-referrer"
                draggable={false}
                className="h-full w-full object-cover pointer-events-none"
              />
            </motion.div>
          </AnimatePresence>

          {/* Edit Mode Direct Photo Controls */}
          {editMode && (
            <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  replaceInputRef.current?.click();
                }}
                className="inline-flex items-center gap-1.5 border border-[#D9381E] bg-[#0B0C0E]/90 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#D9381E] cursor-pointer whitespace-nowrap"
              >
                <Camera className="h-3.5 w-3.5" />
                Replace Shot
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  addInputRef.current?.click();
                }}
                className="inline-flex items-center gap-1 border border-[#2A2E35] bg-[#0B0C0E]/90 px-2.5 py-1.5 text-xs font-semibold text-[#F4F4F2] transition-colors hover:border-[#D9381E] cursor-pointer whitespace-nowrap"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Shot
              </button>
              <input
                ref={replaceInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onReplaceShotImage(project.id, safeIndex, file);
                  e.target.value = '';
                }}
              />
              <input
                ref={addInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    onAddShotImage(project.id, file);
                    setShotIndex(totalShots);
                  }
                  e.target.value = '';
                }}
              />
            </div>
          )}

          {/* Bottom Gradient Scrim + Shot Caption & Counter */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent px-4 pt-10 pb-3.5">
            <div className="flex items-center justify-between gap-3">
              <EditableText
                as="span"
                editMode={editMode}
                value={currentShot.caption}
                onChange={(val) =>
                  onUpdateProject(project.id, (prev) => ({
                    ...prev,
                    shots: prev.shots.map((s, i) => (i === safeIndex ? { ...s, caption: val } : s))
                  }))
                }
                className="truncate text-xs font-medium text-[#F4F4F2]"
              />
              <span className="font-mono text-[11px] text-[#D1D5DB] tabular-nums shrink-0 pointer-events-none">
                {String(safeIndex + 1).padStart(2, '0')} / {String(totalShots).padStart(2, '0')}
              </span>
            </div>
            {/* Progress Bars */}
            <div className="mt-2 flex gap-1.5 pointer-events-none">
              {project.shots.map((shot, i) => (
                <span
                  key={`${shot.caption}-${i}`}
                  className={`h-[2px] flex-1 transition-colors ${
                    i === safeIndex ? 'bg-[#D9381E]' : 'bg-white/25'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Prev / Next Controls */}
          <button
            type="button"
            aria-label={`Previous shot of ${project.title}`}
            onClick={(e) => {
              e.stopPropagation();
              paginate(-1);
            }}
            className="absolute top-1/2 left-3 -translate-y-1/2 flex h-9 w-9 items-center justify-center border border-[#2A2E35] bg-[#0B0C0E]/80 text-[#F4F4F2] opacity-85 transition-all hover:border-[#D9381E] hover:bg-[#0B0C0E] hover:text-white group-hover:opacity-100 cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label={`Next shot of ${project.title}`}
            onClick={(e) => {
              e.stopPropagation();
              paginate(1);
            }}
            className="absolute top-1/2 right-3 -translate-y-1/2 flex h-9 w-9 items-center justify-center border border-[#2A2E35] bg-[#0B0C0E]/80 text-[#F4F4F2] opacity-85 transition-all hover:border-[#D9381E] hover:bg-[#0B0C0E] hover:text-white group-hover:opacity-100 cursor-pointer"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Clickable Project Details Body */}
        <div
          onClick={() => {
            if (!editMode) onSelect(project, safeIndex);
          }}
          className={editMode ? 'p-6' : 'cursor-pointer p-6'}
        >
          <div className="flex items-center justify-between gap-4">
            <EditableText
              as="h3"
              editMode={editMode}
              value={project.title}
              onChange={(val) => onUpdateProject(project.id, (prev) => ({ ...prev, title: val }))}
              className="font-display text-xl font-bold text-[#F4F4F2] group-hover:text-[#D9381E] transition-colors"
            />
            {!editMode && (
              <ArrowUpRight className="h-4 w-4 text-[#9CA3AF] transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[#D9381E] shrink-0" />
            )}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 font-mono text-xs text-[#9CA3AF] tabular-nums">
            <EditableText
              as="span"
              editMode={editMode}
              value={project.location}
              onChange={(val) =>
                onUpdateProject(project.id, (prev) => ({ ...prev, location: val }))
              }
            />
            <span aria-hidden="true">·</span>
            <EditableText
              as="span"
              editMode={editMode}
              value={project.year}
              onChange={(val) => onUpdateProject(project.id, (prev) => ({ ...prev, year: val }))}
            />
            <span aria-hidden="true">·</span>
            <EditableText
              as="span"
              editMode={editMode}
              value={project.area}
              onChange={(val) => onUpdateProject(project.id, (prev) => ({ ...prev, area: val }))}
            />
          </div>
          <EditableText
            as="p"
            editMode={editMode}
            value={project.summary}
            onChange={(val) => onUpdateProject(project.id, (prev) => ({ ...prev, summary: val }))}
            className="mt-3 text-sm leading-relaxed text-[#9CA3AF]"
          />
        </div>
      </motion.article>
    </div>
  );
}
