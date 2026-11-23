import React, { useEffect, useRef, useState } from 'react';
import {
  AnimatePresence,
  MotionConfig,
  motion,
  useScroll,
  useSpring,
  useTransform
} from 'motion/react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import {
  ADMIN_EMAIL,
  OperationType,
  auth,
  db,
  googleProvider,
  handleFirestoreError
} from './firebase';
import { compressImageToDataUrl } from './utils/imageCompress';
import {
  MAX_CLOUD_VIDEO_BYTES,
  encodeBlobChunk,
  getBlobChunkCount,
  runWithConcurrency
} from './utils/videoChunks';
import {
  ArrowUpRight,
  Camera,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CloudUpload,
  Download,
  Eye,
  Link2,
  Lock,
  Pencil,
  Play,
  RotateCcw,
  Upload,
  X
} from 'lucide-react';
import {
  ARCHITECTS as DEFAULT_ARCHITECTS,
  FIRM_METRICS as DEFAULT_METRICS,
  HERO_IMAGE,
  PROJECTS as DEFAULT_PROJECTS,
  type ArchitectProfile,
  type ProjectItem
} from './data/firmData';
import {
  MAX_VIDEO_BYTES,
  clearAllMediaAssets,
  deleteMediaAsset,
  getAllMediaAssets,
  saveMediaAsset
} from './utils/mediaStorage';
import { MediaVaultSection, type UploadedMediaState } from './components/MediaVaultSection';
import { ProjectWorkCard } from './components/ProjectWorkCard';
import { EditableText } from './components/EditableText';
import { PWAInstallButton } from './components/PWAInstallButton';
import { ArchitectRevealCard } from './components/ArchitectRevealCard';

const BRUTALIST_EASE = [0.16, 1, 0.3, 1] as const;
const SITE_DATA_STORAGE_KEY = 'monolith_six_site_data_v1';

interface SiteCopy {
  firmName: string;
  heroKicker: string;
  heroHeadline: string;
  heroManifesto: string;
  worksTitle: string;
  architectsTitle: string;
  architectsSubtitle: string;
  commissionTitle: string;
  commissionSubtitle: string;
  studioAddress: string;
  studioEmail: string;
  walkthroughVideoUrl: string;
}

const WEAVENEX_MANIFESTO =
  'WEAVENEX is a diversified and research-based architectural and design firm established in 2024. Founded by our Principal Architect, Architect Joshua De Guzman, and his peers, we are committed to functional planning and design excellence, innovation, and sustainability. We believe that each project is weaved through connection and understanding of its site, its client and its cultural and technological environment.We have a team of dedicated and talented architects and subordinates that thrives through the passion of the craft. Our company works on a wide range of project types from industrial, residential, hospitality, commercial, mixed-use developments, landscape architecture, and interior design.';

const DEFAULT_SITE_COPY: SiteCopy = {
  firmName: 'Weavenex',
  heroKicker: 'Architectural & Design Studio · Est. 2024',
  heroHeadline: 'Raw concrete. Unyielding form.',
  heroManifesto: WEAVENEX_MANIFESTO,
  worksTitle: 'Built Monoliths',
  architectsTitle: 'Six Principals. One Discipline.',
  architectsSubtitle:
    'Every commission is led directly by our six founding architects—uniting monumental formwork, structural engineering, and raw material mastery without delegation.',
  commissionTitle: 'Initiate a Structural Dialogue',
  commissionSubtitle:
    'We accept a limited number of civic, cultural, and private brutalist commissions each year. Share your site parameters and program requirements directly with our six principals.',
  studioAddress: 'Makati · BGC · Cebu, Philippines',
  studioEmail: 'studio@monolithsix.arch',
  walkthroughVideoUrl: 'https://www.youtube.com/watch?v=KtBIGKKRzDY'
};

interface WalkthroughVideoMeta {
  chunkCount: number;
  name: string;
  type: string;
  size: number;
}

interface PersistedSiteData {
  siteCopy: SiteCopy;
  metrics: typeof DEFAULT_METRICS;
  projects: ProjectItem[];
  architects: ArchitectProfile[];
  walkthroughVideoMeta?: WalkthroughVideoMeta | null;
}

const OLD_LOCATION_TO_PH: Record<string, string> = {
  'Rotterdam, NL': 'Makati, PH',
  'Reykjanes, IS': 'Tagaytay, PH',
  'Zurich, CH': 'Cebu City, PH',
  'Detroit, US': 'BGC, Taguig, PH'
};

function migrateProjects(savedProjects?: ProjectItem[]): ProjectItem[] {
  if (!savedProjects || savedProjects.length === 0) return DEFAULT_PROJECTS;

  const defaultById = new Map(DEFAULT_PROJECTS.map((p) => [p.id, p]));

  const updated = savedProjects.map((proj, idx) => {
    const def = defaultById.get(proj.id);
    const nextLocation = OLD_LOCATION_TO_PH[proj.location] ?? proj.location;
    let result: ProjectItem;

    // Preserve Mizu no Wa completely and set its location to Kyoto, Japan
    if (
      proj.id === 'basalt-point-residence' ||
      proj.title.toLowerCase().includes('mizu no wa')
    ) {
      result = { ...proj, location: 'Kyoto, Japan' };
    } else if (proj.id === 'kestrel-civic-citadel' && def) {
      // Upgrade Bendo Group of Companies description if still using old default
      const isOldSummary = proj.summary.startsWith('A fortified public gallery');
      result = {
        ...proj,
        location: nextLocation,
        summary: isOldSummary ? def.summary : proj.summary
      };
    } else if (
      (proj.id === 'solstice-courtyard-pavilion' || proj.id === 'foundry-command-center') &&
      def
    ) {
      // Update Solstice Concrete Pavilion & Foundry Research Monolith titles + descriptions
      const isOldTitle =
        proj.title === 'Solstice Concrete Pavilion' || proj.title === 'Foundry Research Monolith';
      result = {
        ...proj,
        title: isOldTitle ? def.title : proj.title,
        location: nextLocation,
        summary: def.summary
      };
    } else if (proj.id === 'cordillera-ridge-monolith' && def) {
      // Update Cordillera Ridge Monolith & Intramuros Concrete Archive names, descriptions, and remove 3rd photo from Intramuros
      const isOldTitle = proj.title === 'Cordillera Ridge Monolith';
      result = {
        ...proj,
        title: isOldTitle ? def.title : proj.title,
        summary: isOldTitle ? def.summary : proj.summary,
        structuralNotes: isOldTitle ? def.structuralNotes : proj.structuralNotes
      };
    } else if (proj.id === 'intramuros-stone-archive' && def) {
      const isOldTitle = proj.title === 'Intramuros Concrete Archive';
      result = {
        ...proj,
        title: isOldTitle ? def.title : proj.title,
        summary: isOldTitle ? def.summary : proj.summary,
        structuralNotes: isOldTitle ? def.structuralNotes : proj.structuralNotes,
        shots: proj.shots.length > 2 ? proj.shots.slice(0, 2) : proj.shots
      };
    } else {
      result = { ...proj, location: nextLocation };
    }

    if (idx === 0) {
      return { ...result, location: 'Lake Kawaguchiko, Yamanashi Japan' };
    }
    if (idx === 1) {
      return { ...result, location: 'Tagaytay City, PH' };
    }
    return result;
  });

  // Ensure all 6 projects exist by appending any new defaults not yet in savedProjects
  const existingIds = new Set(updated.map((p) => p.id));
  for (const defProj of DEFAULT_PROJECTS) {
    if (!existingIds.has(defProj.id)) {
      updated.push(defProj);
    }
  }

  return updated;
}

const LAWRENCE_HEADSHOT = '/assets/aistudio/ARMM_LAWRENCE_86318e6d.png';
const DEFAULT_LOGO_MEDIA: UploadedMediaState = {
  url: '/assets/aistudio/Pitch_Deck_-_1_-_Edited_1049dbfa.png',
  name: 'weavenex-logo.png',
  size: 0,
  type: 'image/png'
};
const DEFAULT_PERSPECTIVE_MEDIA: UploadedMediaState = {
  url: '/assets/aistudio/Pitch_Deck__1__5ab39471.png',
  name: 'weavenex-perspective.png',
  size: 0,
  type: 'image/png'
};

function normalizeArchitects(list?: ArchitectProfile[]): ArchitectProfile[] {
  const source = list?.length ? list : DEFAULT_ARCHITECTS;
  const defaultArchMap = new Map(DEFAULT_ARCHITECTS.map((a) => [a.id, a]));
  return source.map((arch, idx) => {
    const isLawrence = idx === 3 || /lawrence/i.test(arch.name);
    return {
      ...arch,
      name: isLawrence ? 'AR. LAWRENCE S. BERAQUIT' : arch.name,
      headshot: isLawrence
        ? LAWRENCE_HEADSHOT
        : arch.headshot || defaultArchMap.get(arch.id)?.headshot || HERO_IMAGE
    };
  });
}

function normalizeMetrics(list?: typeof DEFAULT_METRICS): typeof DEFAULT_METRICS {
  const source = list?.length ? list : DEFAULT_METRICS;
  return source.map((m, idx) => {
    if (idx === 1 || /built/i.test(m.label)) {
      return { ...m, detail: 'International and Philippine-based projects.' };
    }
    return m;
  });
}

function loadSavedSiteData(): PersistedSiteData {
  try {
    const raw = localStorage.getItem(SITE_DATA_STORAGE_KEY);
    if (!raw) {
      return {
        siteCopy: DEFAULT_SITE_COPY,
        metrics: normalizeMetrics(DEFAULT_METRICS),
        projects: DEFAULT_PROJECTS,
        architects: normalizeArchitects()
      };
    }
    const parsed = JSON.parse(raw) as Partial<PersistedSiteData>;
    const savedCopy = { ...DEFAULT_SITE_COPY, ...(parsed.siteCopy ?? {}) };
    if (!savedCopy.walkthroughVideoUrl?.trim()) {
      savedCopy.walkthroughVideoUrl = DEFAULT_SITE_COPY.walkthroughVideoUrl;
    }
    if (savedCopy.heroManifesto.includes('established in 2026')) {
      savedCopy.heroManifesto = WEAVENEX_MANIFESTO;
    }
    if (savedCopy.studioAddress === '480 Foundry Wharf, Rotterdam · Zurich · Detroit') {
      savedCopy.studioAddress = DEFAULT_SITE_COPY.studioAddress;
    }
    return {
      siteCopy: savedCopy,
      metrics: normalizeMetrics(parsed.metrics),
      projects: migrateProjects(parsed.projects),
      architects: normalizeArchitects(parsed.architects)
    };
  } catch {
    return {
      siteCopy: DEFAULT_SITE_COPY,
      metrics: normalizeMetrics(DEFAULT_METRICS),
      projects: DEFAULT_PROJECTS,
      architects: normalizeArchitects()
    };
  }
}

function DefaultMonogram({ dark = false }: { dark?: boolean }) {
  const strokeFill = dark ? '#0B0C0E' : '#F4F4F2';
  return (
    <svg
      width="36"
      height="36"
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="shrink-0"
    >
      <rect x="1" y="1" width="26" height="26" stroke={strokeFill} strokeWidth="2.2" />
      <path d="M7 21V7H12L14 13L16 7H21V21H17.5V12.5L15 19H13L10.5 12.5V21H7Z" fill={strokeFill} />
      <rect x="20.5" y="1" width="6.5" height="6.5" fill="#D9381E" />
    </svg>
  );
}

export default function App() {
  const initialData = loadSavedSiteData();

  const [authUser, setAuthUser] = useState<User | null>(null);
  const isAdminUnlocked = Boolean(
    authUser && authUser.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()
  );
  const [adminModalOpen, setAdminModalOpen] = useState<boolean>(() => {
    try {
      return new URLSearchParams(window.location.search).get('admin') === '1';
    } catch {
      return false;
    }
  });
  const [adminError, setAdminError] = useState<string | null>(null);
  const [publishingLive, setPublishingLive] = useState(false);
  const [publishStatus, setPublishStatus] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [siteCopy, setSiteCopy] = useState<SiteCopy>(initialData.siteCopy);
  const [metrics, setMetrics] = useState(initialData.metrics);
  const [projects, setProjects] = useState<ProjectItem[]>(initialData.projects);
  const [architects, setArchitects] = useState<ArchitectProfile[]>(initialData.architects);

  const [activeProject, setActiveProject] = useState<ProjectItem | null>(null);
  const [modalShotIndex, setModalShotIndex] = useState(0);
  const [activeArchitect, setActiveArchitect] = useState<ArchitectProfile | null>(null);

  const [isHydratingCloud, setIsHydratingCloud] = useState(true);
  const [logoMedia, setLogoMedia] = useState<UploadedMediaState | null>(DEFAULT_LOGO_MEDIA);
  const [videoMedia, setVideoMedia] = useState<UploadedMediaState | null>(null);
  const [videoLoadingProgress, setVideoLoadingProgress] = useState<number | null>(null);
  const publishedVideoMetaRef = useRef<WalkthroughVideoMeta | null>(null);
  const [bgMedia, setBgMedia] = useState<UploadedMediaState | null>(DEFAULT_PERSPECTIVE_MEDIA);
  const [bgError, setBgError] = useState<string | null>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);

  // Commission form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    typology: 'Civic & Institutional',
    brief: ''
  });
  const [formSubmitted, setFormSubmitted] = useState(false);

  // Persist text & structure edits to localStorage automatically
  useEffect(() => {
    try {
      const payload: PersistedSiteData = {
        siteCopy,
        metrics,
        projects,
        architects
      };
      localStorage.setItem(SITE_DATA_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore storage quota errors
    }
  }, [siteCopy, metrics, projects, architects]);

  // Incorporate /weavenex-architectural-studio into the address bar path
  useEffect(() => {
    try {
      if (window.location.pathname === '/' || window.location.pathname === '') {
        window.history.replaceState(
          null,
          '',
          `/weavenex-architectural-studio${window.location.search}${window.location.hash}`
        );
      }
    } catch {
      // Ignore history API restrictions
    }
  }, []);

  // Scroll-linked animations
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 180,
    damping: 30,
    restDelta: 0.001
  });

  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress: heroScroll } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start']
  });
  const heroBgY = useTransform(heroScroll, [0, 1], ['0%', '22%']);
  const heroBgScale = useTransform(heroScroll, [0, 1], [1.02, 1.14]);
  const heroBgOpacity = useTransform(heroScroll, [0, 0.85, 1], [0.45, 0.25, 0.1]);
  const heroTextY = useTransform(heroScroll, [0, 1], ['0%', '-10%']);
  const heroImageY = useTransform(heroScroll, [0, 1], ['0%', '14%']);
  const heroImageScale = useTransform(heroScroll, [0, 1], [1, 1.09]);

  // Dual-direction scroll-driven architectural ribbons
  const ribbonXPrimary = useTransform(scrollYProgress, [0, 1], ['0%', '-20%']);
  const ribbonXSecondary = useTransform(scrollYProgress, [0, 1], ['-18%', '4%']);

  // Track Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
      if (!user || user.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
        setEditMode(false);
      } else if (
        new URLSearchParams(window.location.search).get('admin') === '1'
      ) {
        setEditMode(true);
        setAdminModalOpen(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Hydrate live published site content & media from Firestore (for all visitors), overlaid with local IndexedDB assets
  useEffect(() => {
    const createdUrls: string[] = [];

    async function hydrateAll() {
      const mediaUrlMap = new Map<string, string>();
      let loadedProjects = initialData.projects;
      let loadedArchitects = initialData.architects;
      let snapshotUpdatedAt = 0;

      // 0. Load static /weavenex-site-data.json snapshot if bundled in public/ (zero quota, always works on Cloudflare/Netlify)
      try {
        const res = await fetch('/weavenex-site-data.json', { cache: 'no-store' });
        if (res.ok) {
          const snapData = (await res.json()) as Partial<PersistedSiteData> & {
            exportedAt?: number;
            media?: Record<string, string>;
          };
          if (typeof snapData.exportedAt === 'number') {
            snapshotUpdatedAt = snapData.exportedAt;
          }
          if (snapData.siteCopy) {
            const mergedCopy = { ...DEFAULT_SITE_COPY, ...snapData.siteCopy };
            if (!mergedCopy.walkthroughVideoUrl?.trim()) {
              mergedCopy.walkthroughVideoUrl = DEFAULT_SITE_COPY.walkthroughVideoUrl;
            }
            if (mergedCopy.heroManifesto.includes('established in 2026')) {
              mergedCopy.heroManifesto = WEAVENEX_MANIFESTO;
            }
            setSiteCopy(mergedCopy);
          }
          if (snapData.metrics?.length) setMetrics(normalizeMetrics(snapData.metrics));
          if (snapData.projects?.length) {
            loadedProjects = migrateProjects(snapData.projects);
            setProjects(loadedProjects);
          }
          if (snapData.architects?.length) {
            loadedArchitects = normalizeArchitects(snapData.architects);
            setArchitects(loadedArchitects);
          }
          if (snapData.media) {
            Object.entries(snapData.media).forEach(([id, dataUrl]) => {
              if (!dataUrl) return;
              mediaUrlMap.set(id, dataUrl);
            });
          }
        }
      } catch {
        // Optional static snapshot not bundled
      }

      // 1. Load live published siteConfig from Firestore (only apply if newer than bundled snapshot)
      let shouldFetchFirestoreMedia = false;
      try {
        const configSnap = await getDoc(doc(db, 'siteConfig', 'main'));
        if (configSnap.exists()) {
          const data = configSnap.data() as { payload?: string; updatedAt?: number };
          const cloudUpdatedAt = typeof data.updatedAt === 'number' ? data.updatedAt : 0;
          if (data.payload && (snapshotUpdatedAt === 0 || cloudUpdatedAt > snapshotUpdatedAt)) {
            shouldFetchFirestoreMedia = true;
            const parsed = JSON.parse(data.payload) as Partial<PersistedSiteData>;
            if (parsed.siteCopy) {
              const mergedCopy = { ...DEFAULT_SITE_COPY, ...parsed.siteCopy };
              if (!mergedCopy.walkthroughVideoUrl?.trim()) {
                mergedCopy.walkthroughVideoUrl = DEFAULT_SITE_COPY.walkthroughVideoUrl;
              }
              if (mergedCopy.heroManifesto.includes('established in 2026')) {
                mergedCopy.heroManifesto = WEAVENEX_MANIFESTO;
              }
              setSiteCopy(mergedCopy);
            }
            if (parsed.metrics?.length) setMetrics(normalizeMetrics(parsed.metrics));
            if (parsed.projects?.length) {
              const defaultProjMap = new Map(DEFAULT_PROJECTS.map((p) => [p.id, p]));
              loadedProjects = migrateProjects(parsed.projects).map((proj) => {
                const def = defaultProjMap.get(proj.id);
                return {
                  ...proj,
                  image: proj.image || def?.image || HERO_IMAGE,
                  shots: proj.shots.map((shot, idx) => ({
                    ...shot,
                    url: shot.url || def?.shots[idx]?.url || def?.image || HERO_IMAGE
                  }))
                };
              });
              setProjects(loadedProjects);
            }
            if (parsed.architects?.length) {
              loadedArchitects = normalizeArchitects(parsed.architects);
              setArchitects(loadedArchitects);
            }
            if (parsed.walkthroughVideoMeta) {
              publishedVideoMetaRef.current = parsed.walkthroughVideoMeta;
            }
          }
        }
      } catch (err) {
        console.warn('Could not load published siteConfig from Firestore:', err);
      }

      // 2. Fetch published image media docs by ID only when Firestore config was applied
      if (shouldFetchFirestoreMedia) {
        const imageDocIds: string[] = ['firm-logo', 'firm-background'];
        loadedArchitects.forEach((arch) => imageDocIds.push(`architect-${arch.id}`));
        loadedProjects.forEach((proj) => {
          proj.shots.forEach((_, idx) => imageDocIds.push(`project-${proj.id}-shot-${idx}`));
        });

        try {
          const snaps = await Promise.all(
            imageDocIds.map((id) => getDoc(doc(db, 'siteMedia', id)).catch(() => null))
          );
          snaps.forEach((snap) => {
            if (!snap || !snap.exists()) return;
            const d = snap.data() as { dataUrl?: string; name?: string; type?: string };
            if (!d.dataUrl) return;
            mediaUrlMap.set(snap.id, d.dataUrl);
            if (snap.id === 'firm-logo') {
              setLogoMedia(DEFAULT_LOGO_MEDIA);
            } else if (snap.id === 'firm-background') {
              setBgMedia(DEFAULT_PERSPECTIVE_MEDIA);
            }
          });
        } catch (err) {
          console.warn('Could not load published siteMedia images from Firestore:', err);
        }
      }

      // 3. Overlay local IndexedDB assets (for unpublished local uploads on admin device)
      try {
        const allAssets = await getAllMediaAssets();
        for (const asset of allAssets) {
          if (asset.id === 'firm-walkthrough') continue;
          const url = URL.createObjectURL(asset.blob);
          createdUrls.push(url);
          mediaUrlMap.set(asset.id, url);

          if (asset.id === 'firm-logo') {
            setLogoMedia({ url, name: asset.name, size: asset.size, type: asset.type });
          } else if (asset.id === 'firm-background') {
            setBgMedia({ url, name: asset.name, size: asset.size, type: asset.type });
          }
        }
      } catch {
        // Ignore IndexedDB unavailability
      }

      if (mediaUrlMap.size > 0) {
        setArchitects((prev) =>
          prev.map((arch, idx) => {
            if (idx === 3 || /lawrence/i.test(arch.name)) {
              return { ...arch, name: 'AR. LAWRENCE S. BERAQUIT', headshot: LAWRENCE_HEADSHOT };
            }
            const customUrl = mediaUrlMap.get(`architect-${arch.id}`);
            return customUrl ? { ...arch, headshot: customUrl } : arch;
          })
        );

        setProjects((prev) =>
          prev.map((proj) => ({
            ...proj,
            shots: proj.shots.map((shot, idx) => {
              const customUrl = mediaUrlMap.get(`project-${proj.id}-shot-${idx}`);
              return customUrl ? { ...shot, url: customUrl } : shot;
            })
          }))
        );
      }

      // Reveal the live edited website immediately once config & images are hydrated
      setIsHydratingCloud(false);
    }

    hydrateAll();

    return () => {
      createdUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const handleBackgroundUpload = async (file: File) => {
    setBgError(null);
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (!isImage && !isVideo) {
      setBgError('Please select a photo (JPG, PNG, WebP) or video clip (MP4, WebM, MOV).');
      return;
    }

    if (file.size > MAX_VIDEO_BYTES) {
      setBgError('Background file exceeds the 260 MB maximum limit.');
      return;
    }

    try {
      await saveMediaAsset({
        id: 'firm-background',
        name: file.name,
        type: file.type,
        size: file.size,
        updatedAt: Date.now(),
        blob: file
      });

      if (bgMedia?.url) URL.revokeObjectURL(bgMedia.url);
      const objectUrl = URL.createObjectURL(file);
      setBgMedia({
        url: objectUrl,
        name: file.name,
        size: file.size,
        type: file.type
      });
    } catch {
      setBgError('Could not save background media to browser storage.');
    }
  };

  const handleResetBackground = async () => {
    await deleteMediaAsset('firm-background');
    if (bgMedia?.url) URL.revokeObjectURL(bgMedia.url);
    setBgMedia(null);
    setBgError(null);
    if (bgInputRef.current) bgInputRef.current.value = '';
  };

  const handleUpdateProject = (projectId: string, updater: (prev: ProjectItem) => ProjectItem) => {
    setProjects((prev) => prev.map((p) => (p.id === projectId ? updater(p) : p)));
  };

  const handleReplaceProjectShot = async (projectId: string, shotIndex: number, file: File) => {
    if (!file.type.startsWith('image/')) return;
    const assetId = `project-${projectId}-shot-${shotIndex}`;
    await saveMediaAsset({
      id: assetId,
      name: file.name,
      type: file.type,
      size: file.size,
      updatedAt: Date.now(),
      blob: file
    });
    const url = URL.createObjectURL(file);
    handleUpdateProject(projectId, (prev) => ({
      ...prev,
      image: shotIndex === 0 ? url : prev.image,
      shots: prev.shots.map((s, idx) => (idx === shotIndex ? { ...s, url } : s))
    }));
  };

  const handleAddProjectShot = async (projectId: string, file: File) => {
    if (!file.type.startsWith('image/')) return;
    const targetProject = projects.find((p) => p.id === projectId);
    const nextIndex = targetProject ? targetProject.shots.length : 0;
    const assetId = `project-${projectId}-shot-${nextIndex}`;
    await saveMediaAsset({
      id: assetId,
      name: file.name,
      type: file.type,
      size: file.size,
      updatedAt: Date.now(),
      blob: file
    });
    const url = URL.createObjectURL(file);
    const cleanCaption = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    handleUpdateProject(projectId, (prev) => ({
      ...prev,
      shots: [...prev.shots, { url, caption: cleanCaption || 'Architectural View' }]
    }));
  };

  const handleReplaceArchitectPhoto = async (architectId: string, file: File) => {
    if (!file.type.startsWith('image/')) return;
    await saveMediaAsset({
      id: `architect-${architectId}`,
      name: file.name,
      type: file.type,
      size: file.size,
      updatedAt: Date.now(),
      blob: file
    });
    const url = URL.createObjectURL(file);
    setArchitects((prev) => prev.map((a) => (a.id === architectId ? { ...a, headshot: url } : a)));
  };

  const handleResetAllCustomizations = async () => {
    localStorage.removeItem(SITE_DATA_STORAGE_KEY);
    await clearAllMediaAssets();
    setSiteCopy(DEFAULT_SITE_COPY);
    setMetrics(DEFAULT_METRICS);
    setProjects(DEFAULT_PROJECTS);
    setArchitects(DEFAULT_ARCHITECTS);
    setLogoMedia(null);
    setVideoMedia(null);
    setBgMedia(null);
    setEditMode(false);
  };

  // Close modals on Escape & unlock private Admin mode on Ctrl+Shift+E / Cmd+Shift+E
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveProject(null);
        setActiveArchitect(null);
        setAdminModalOpen(false);
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        if (isAdminUnlocked) {
          setEditMode((prev) => !prev);
        } else {
          setAdminModalOpen(true);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isAdminUnlocked]);

  const handleAdminSignIn = async () => {
    setAdminError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
        setEditMode(true);
        setAdminModalOpen(false);
      } else {
        await signOut(auth);
        setAdminError(`Access denied. Only ${ADMIN_EMAIL} can edit this website.`);
      }
    } catch (err) {
      const code = (err as { code?: string })?.code ?? '';
      if (code === 'auth/unauthorized-domain') {
        setAdminError(
          `Add "${window.location.hostname}" to Firebase Console → Authentication → Settings → Authorized domains.`
        );
      } else if (code === 'auth/popup-blocked') {
        setAdminError('Sign-in popup was blocked by your browser. Please allow popups and try again.');
      } else {
        setAdminError('Google Sign-In was cancelled or blocked. Please try again.');
      }
    }
  };

  const handleLockAdmin = async () => {
    setEditMode(false);
    setPublishStatus(null);
    try {
      await signOut(auth);
    } catch {
      // Ignore
    }
  };

  const handlePublishToLive = async () => {
    if (!auth.currentUser || !isAdminUnlocked) return;
    setPublishingLive(true);
    setPublishStatus('Preparing upload...');
    const uid = auth.currentUser.uid;
    const now = Date.now();

    try {
      // 1. Load local assets and upload walkthrough video FIRST with immediate live progress
      const localAssets = await getAllMediaAssets();
      let walkthroughVideoMeta: WalkthroughVideoMeta | null = null;
      let videoTooLargeForCloud = false;

      const videoAsset = localAssets.find(
        (a) =>
          a.id === 'firm-walkthrough' &&
          (a.type.startsWith('video/') || /\.(mp4|webm|mov|m4v)$/i.test(a.name))
      );

      const hasEmbedVideoLink = Boolean(siteCopy.walkthroughVideoUrl.trim());
      if (videoAsset && !hasEmbedVideoLink) {
        if (videoAsset.blob.size <= MAX_CLOUD_VIDEO_BYTES) {
          const existing = publishedVideoMetaRef.current;
          const totalChunks = getBlobChunkCount(videoAsset.blob);
          if (
            existing &&
            existing.name === videoAsset.name.slice(0, 200) &&
            existing.size === videoAsset.size &&
            existing.chunkCount === totalChunks
          ) {
            walkthroughVideoMeta = existing;
          } else {
            setPublishStatus('Uploading video... 0%');
            await runWithConcurrency(
              totalChunks,
              3,
              async (idx) => {
                const chunkData = await encodeBlobChunk(videoAsset.blob, idx);
                await setDoc(doc(db, 'siteMedia', `firm-walkthrough-chunk-${idx}`), {
                  dataUrl: chunkData,
                  name: videoAsset.name.slice(0, 200),
                  type: (videoAsset.type || 'video/mp4').slice(0, 64),
                  updatedAt: now,
                  updatedBy: uid
                });
              },
              (done, total) => {
                const pct = Math.min(100, Math.round((done / total) * 100));
                setPublishStatus(`Uploading video... ${pct}%`);
              }
            );
            walkthroughVideoMeta = {
              chunkCount: totalChunks,
              name: videoAsset.name.slice(0, 200),
              type: (videoAsset.type || 'video/mp4').slice(0, 64),
              size: videoAsset.size
            };
            publishedVideoMetaRef.current = walkthroughVideoMeta;
          }
        } else {
          videoTooLargeForCloud = true;
        }
      }

      // 2. Sync all local uploaded images to Firestore siteMedia with live counter
      const imageAssets = localAssets.filter((a) => a.type.startsWith('image/'));
      for (let i = 0; i < imageAssets.length; i++) {
        const asset = imageAssets[i];
        setPublishStatus(`Syncing images (${i + 1}/${imageAssets.length})...`);
        try {
          const maxDim = asset.id === 'firm-logo' ? 800 : 1200;
          const dataUrl = await compressImageToDataUrl(asset.blob, maxDim, 0.8);
          if (dataUrl.length <= 850_000) {
            await setDoc(doc(db, 'siteMedia', asset.id), {
              dataUrl,
              name: asset.name.slice(0, 200),
              type: asset.type.slice(0, 64),
              updatedAt: now,
              updatedBy: uid
            });
          }
        } catch (imgErr) {
          console.warn(`Skipping image ${asset.id}:`, imgErr);
        }
      }

      setPublishStatus('Saving site config...');

      // 2. Strip temporary blob: URLs before saving JSON config
      const cleanProjects = projects.map((p) => ({
        ...p,
        image: p.image.startsWith('blob:') ? '' : p.image,
        shots: p.shots.map((s) => ({
          ...s,
          url: s.url.startsWith('blob:') ? '' : s.url
        }))
      }));
      const cleanArchitects = architects.map((a) => ({
        ...a,
        headshot: a.headshot.startsWith('blob:') ? '' : a.headshot
      }));

      const payloadStr = JSON.stringify({
        siteCopy,
        metrics,
        projects: cleanProjects,
        architects: cleanArchitects,
        walkthroughVideoMeta
      });

      await setDoc(doc(db, 'siteConfig', 'main'), {
        payload: payloadStr,
        updatedAt: now,
        updatedBy: uid
      });

      setPublishStatus(
        videoTooLargeForCloud
          ? 'Published! (Video >50MB: paste a Drive/YouTube link)'
          : 'Published Live!'
      );
      window.setTimeout(() => setPublishStatus(null), 5000);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      console.error('Publish failed:', error);
      setPublishStatus(`Publish failed: ${msg.slice(0, 60)}`);
    } finally {
      setPublishingLive(false);
    }
  };

  const handleExportSiteData = async () => {
    setPublishingLive(true);
    setPublishStatus('Exporting backup...');
    try {
      const localAssets = await getAllMediaAssets();
      const media: Record<string, string> = {};
      for (const asset of localAssets) {
        if (!asset.type.startsWith('image/')) continue;
        try {
          const maxDim = asset.id === 'firm-logo' ? 800 : 1200;
          const dataUrl = await compressImageToDataUrl(asset.blob, maxDim, 0.82);
          media[asset.id] = dataUrl;
        } catch {
          // Skip invalid image
        }
      }

      const cleanProjects = projects.map((p) => ({
        ...p,
        image: p.image.startsWith('blob:') ? '' : p.image,
        shots: p.shots.map((s) => ({
          ...s,
          url: s.url.startsWith('blob:') ? '' : s.url
        }))
      }));
      const cleanArchitects = architects.map((a) => ({
        ...a,
        headshot: a.headshot.startsWith('blob:') ? '' : a.headshot
      }));

      const exportObj = {
        exportedAt: Date.now(),
        siteCopy,
        metrics,
        projects: cleanProjects,
        architects: cleanArchitects,
        media
      };

      const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'weavenex-site-data.json';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setPublishStatus('Downloaded weavenex-site-data.json!');
      window.setTimeout(() => setPublishStatus(null), 5000);
    } catch {
      setPublishStatus('Export failed');
    } finally {
      setPublishingLive(false);
    }
  };

  const handleInquirySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) return;
    setFormSubmitted(true);
  };

  if (isHydratingCloud) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0B0C0E] text-[#F4F4F2]">
        <div className="h-0.5 w-32 overflow-hidden bg-[#2A2E35]">
          <div className="h-full w-1/2 animate-pulse bg-[#D9381E]" />
        </div>
      </div>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-[#0B0C0E] text-[#F4F4F2]">
        {/* Top Bar — High-Contrast Light Architectural Header for Dark-Text Logo Visibility */}
        <header className="sticky top-0 z-40 border-b border-[#D4D4CE] bg-[#F4F4F2]/95 backdrop-blur-sm">
          <div className="mx-auto flex h-20 max-w-[1360px] items-center justify-between gap-8 px-6 lg:px-10">
            {/* Zone 1: Brand Wordmark or Uploaded Firm Logo */}
            <a
              href="#top"
              className="flex items-center gap-3.5 font-display text-xl font-extrabold tracking-tight text-[#0B0C0E] whitespace-nowrap shrink-0"
            >
              {logoMedia ? (
                <img
                  src={logoMedia.url}
                  alt="Firm logo"
                  className="h-12 sm:h-14 max-w-[260px] object-contain"
                />
              ) : (
                <>
                  <DefaultMonogram dark />
                  <EditableText
                    as="span"
                    editMode={editMode}
                    value={siteCopy.firmName}
                    onChange={(val) => setSiteCopy((prev) => ({ ...prev, firmName: val }))}
                  />
                </>
              )}
            </a>

            {/* Zone 2: 4 Clean Single-Line Nav Links */}
            <nav
              aria-label="Primary"
              className="hidden md:flex items-center gap-7 text-sm font-semibold text-[#374151]"
            >
              <a
                href="#works"
                className="transition-colors hover:text-[#0B0C0E] whitespace-nowrap shrink-0"
              >
                Works
              </a>
              <a
                href="#our-firm"
                className="transition-colors hover:text-[#0B0C0E] whitespace-nowrap shrink-0"
              >
                Our Firm
              </a>
              <a
                href="#our-architects"
                className="transition-colors hover:text-[#0B0C0E] whitespace-nowrap shrink-0"
              >
                Our Architects
              </a>
              <a
                href="#commission"
                className="transition-colors hover:text-[#0B0C0E] whitespace-nowrap shrink-0"
              >
                Commission
              </a>
            </nav>

            {/* Zone 3: Install App (Android/iOS) + Primary CTA */}
            <div className="flex items-center gap-2.5 shrink-0">
              <PWAInstallButton />
              <a
                href="#commission"
                className="bg-[#D9381E] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#B82D16] whitespace-nowrap shrink-0"
              >
                Start a Project
              </a>
            </div>
          </div>

          {/* Scroll Progress Beam */}
          <motion.div
            aria-hidden="true"
            style={{ scaleX }}
            className="h-[2px] w-full origin-left bg-[#D9381E]"
          />
        </header>

        <main id="top">
          {/* Split-Screen Brutalist Hero with Editable Full-Bleed Photo/Video Background & Deep Scroll Parallax */}
          <section ref={heroRef} className="relative overflow-hidden border-b border-[#2A2E35]">
            {/* Editable Atmospheric Background Layer (Photo or Looping Video Clip) */}
            <motion.div
              aria-hidden="true"
              style={{ y: heroBgY, scale: heroBgScale, opacity: heroBgOpacity }}
              className="pointer-events-none absolute inset-0 z-0 will-change-transform"
            >
              {bgMedia?.type.startsWith('video/') ? (
                <video
                  src={bgMedia.url}
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="h-full w-full object-cover"
                />
              ) : (
                <img
                  src={bgMedia?.url ?? HERO_IMAGE}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
              )}
            </motion.div>

            {/* Measured Contrast Scrim ensuring WCAG AA legibility */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-b from-[#0B0C0E]/85 via-[#0B0C0E]/75 to-[#0B0C0E]"
            />

            <div className="relative z-10 mx-auto max-w-[1360px] px-6 pt-12 pb-16 lg:px-10 lg:pt-16 lg:pb-20">
              <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 items-stretch">
                {/* Left Column: Typographic Hierarchy with Foreground Parallax */}
                <motion.div
                  style={{ y: heroTextY }}
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, ease: BRUTALIST_EASE }}
                  className="lg:col-span-5 flex flex-col justify-between py-2 will-change-transform"
                >
                  <div>
                    <EditableText
                      as="p"
                      editMode={editMode}
                      value={siteCopy.heroKicker}
                      onChange={(val) => setSiteCopy((prev) => ({ ...prev, heroKicker: val }))}
                      className="font-mono text-xs tracking-wider text-[#D9381E]"
                    />
                    <EditableText
                      as="h1"
                      editMode={editMode}
                      value={siteCopy.heroHeadline}
                      onChange={(val) => setSiteCopy((prev) => ({ ...prev, heroHeadline: val }))}
                      className="mt-5 font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-[#F4F4F2] sm:text-5xl lg:text-[3.5rem] [text-wrap:balance]"
                    />
                    <EditableText
                      as="p"
                      editMode={editMode}
                      value={siteCopy.heroManifesto}
                      onChange={(val) => setSiteCopy((prev) => ({ ...prev, heroManifesto: val }))}
                      className="mt-6 max-w-lg text-base leading-relaxed text-[#D1D5DB]"
                    />
                  </div>

                  <div className="mt-10 flex flex-wrap items-center gap-4">
                    <a
                      href="#our-firm"
                      className="inline-flex items-center gap-2 bg-[#D9381E] px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#B82D16] whitespace-nowrap"
                    >
                      <Play className="h-4 w-4 fill-current" />
                      Firm Walkthrough
                    </a>
                    <a
                      href="#our-architects"
                      className="inline-flex items-center gap-2 border border-[#2A2E35] bg-[#141619]/90 px-6 py-3.5 text-sm font-semibold text-[#F4F4F2] transition-colors hover:border-[#F4F4F2] whitespace-nowrap"
                    >
                      Meet the 6 Architects
                      <ArrowUpRight className="h-4 w-4" />
                    </a>
                  </div>
                </motion.div>

                {/* Right Column: Monumental Hero Media Frame + Direct Background Editor */}
                <motion.div
                  initial={{ opacity: 0, clipPath: 'inset(10% 0% 0% 0%)' }}
                  animate={{ opacity: 1, clipPath: 'inset(0% 0% 0% 0%)' }}
                  transition={{ duration: 0.9, delay: 0.1, ease: BRUTALIST_EASE }}
                  className="lg:col-span-7"
                >
                  <div className="relative h-full min-h-[340px] w-full overflow-hidden border border-[#2A2E35] bg-[#141619]">
                    {bgMedia?.type.startsWith('video/') ? (
                      <motion.video
                        src={bgMedia.url}
                        autoPlay
                        muted
                        loop
                        playsInline
                        style={{ y: heroImageY, scale: heroImageScale }}
                        className="h-full w-full object-cover will-change-transform"
                      />
                    ) : (
                      <motion.img
                        src={bgMedia?.url ?? HERO_IMAGE}
                        alt="Monumental brutalist concrete and blackened steel architecture"
                        referrerPolicy="no-referrer"
                        style={{ y: heroImageY, scale: heroImageScale }}
                        className="h-full w-full object-cover will-change-transform"
                      />
                    )}

                    {/* Top-Right Editable Background Control (Admin Edit Mode Only) */}
                    {editMode && (
                      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => bgInputRef.current?.click()}
                          className="inline-flex items-center gap-1.5 border border-[#2A2E35] bg-[#0B0C0E]/85 px-3 py-2 text-xs font-semibold text-[#F4F4F2] backdrop-blur-sm transition-colors hover:border-[#D9381E] hover:text-white whitespace-nowrap cursor-pointer"
                        >
                          <Upload className="h-3.5 w-3.5 text-[#D9381E]" />
                          {bgMedia ? 'Change Background' : 'Edit Background'}
                        </button>
                        {bgMedia && (
                          <button
                            type="button"
                            onClick={handleResetBackground}
                            aria-label="Reset background to default"
                            className="inline-flex items-center gap-1 border border-[#2A2E35] bg-[#0B0C0E]/85 px-2.5 py-2 text-xs font-medium text-[#9CA3AF] backdrop-blur-sm transition-colors hover:border-[#D9381E] hover:text-[#D9381E] whitespace-nowrap cursor-pointer"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Reset
                          </button>
                        )}
                        <input
                          ref={bgInputRef}
                          type="file"
                          accept="image/*,video/mp4,video/webm,video/quicktime,video/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleBackgroundUpload(file);
                          }}
                        />
                      </div>
                    )}
                  </div>

                  {bgError && (
                    <p className="mt-2 font-mono text-xs text-[#FCA5A5]">{bgError}</p>
                  )}
                </motion.div>
              </div>

              {/* Full-Width 4-Column Architectural Metrics Strip Below Split */}
              <motion.div
                initial={{ opacity: 0, y: 36 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.7, ease: BRUTALIST_EASE }}
                className="mt-12 grid grid-cols-2 border border-[#2A2E35] bg-[#141619]/95 backdrop-blur-sm lg:grid-cols-4"
              >
                {metrics.map((metric, idx) => (
                  <div
                    key={idx}
                    className={`p-6 ${
                      idx !== 0 ? 'border-t border-[#2A2E35] lg:border-t-0 lg:border-l' : ''
                    } ${idx === 1 ? 'border-l border-t-0 lg:border-l' : ''} ${
                      idx === 3 ? 'border-l' : ''
                    }`}
                  >
                    <EditableText
                      as="div"
                      editMode={editMode}
                      value={metric.value}
                      onChange={(val) =>
                        setMetrics((prev) =>
                          prev.map((m, i) => (i === idx ? { ...m, value: val } : m))
                        )
                      }
                      className="font-display text-3xl font-extrabold tracking-tight text-[#F4F4F2] tabular-nums"
                    />
                    <EditableText
                      as="div"
                      editMode={editMode}
                      value={metric.label}
                      onChange={(val) =>
                        setMetrics((prev) =>
                          prev.map((m, i) => (i === idx ? { ...m, label: val } : m))
                        )
                      }
                      className="mt-1 text-sm font-semibold text-[#F4F4F2]"
                    />
                    <EditableText
                      as="div"
                      editMode={editMode}
                      value={metric.detail}
                      onChange={(val) =>
                        setMetrics((prev) =>
                          prev.map((m, i) => (i === idx ? { ...m, detail: val } : m))
                        )
                      }
                      className="mt-0.5 text-xs text-[#9CA3AF]"
                    />
                  </div>
                ))}
              </motion.div>
            </div>
          </section>

          {/* Dual-Direction Scroll-Driven Architectural Ribbon Divider */}
          <div
            aria-hidden="true"
            className="overflow-hidden border-b border-[#2A2E35] bg-[#101215] py-4 select-none space-y-2.5"
          >
            <motion.div
              style={{ x: ribbonXPrimary }}
              className="flex whitespace-nowrap font-mono text-xs tracking-[0.22em] text-[#9CA3AF] will-change-transform"
            >
              {Array.from({ length: 4 }).map((_, i) => (
                <span key={i} className="mr-12 inline-flex items-center gap-12">
                  <span>MONOLITHIC CONCRETE</span>
                  <span className="text-[#D9381E]">/</span>
                  <span>OXIDIZED CORTEN STEEL</span>
                  <span className="text-[#D9381E]">/</span>
                  <span>CANTILEVERED MASS</span>
                  <span className="text-[#D9381E]">/</span>
                  <span>SIX PRINCIPAL ARCHITECTS</span>
                  <span className="text-[#D9381E]">/</span>
                </span>
              ))}
            </motion.div>
            <motion.div
              style={{ x: ribbonXSecondary }}
              className="flex whitespace-nowrap font-mono text-[11px] tracking-[0.26em] text-[#4B5563] will-change-transform"
            >
              {Array.from({ length: 4 }).map((_, i) => (
                <span key={i} className="mr-12 inline-flex items-center gap-12">
                  <span>MAKATI · BGC · CEBU · MANILA</span>
                  <span className="text-[#D9381E]">·</span>
                  <span>200-YEAR STRUCTURAL STANDARD</span>
                  <span className="text-[#D9381E]">·</span>
                  <span>BOARD-FORMED BÉTON BRUT</span>
                  <span className="text-[#D9381E]">·</span>
                </span>
              ))}
            </motion.div>
          </div>

          {/* 01. Selected Brutalist Works */}
          <section id="works" className="py-20 lg:py-28 overflow-hidden">
            <div className="mx-auto max-w-[1360px] px-6 lg:px-10">
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.7, ease: BRUTALIST_EASE }}
                className="mb-12 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"
              >
                <div>
                  <p className="font-mono text-xs tracking-wider text-[#D9381E]">
                    01. Selected Works
                  </p>
                  <EditableText
                    as="h2"
                    editMode={editMode}
                    value={siteCopy.worksTitle}
                    onChange={(val) => setSiteCopy((prev) => ({ ...prev, worksTitle: val }))}
                    className="mt-2 font-display text-3xl font-bold tracking-tight text-[#F4F4F2] sm:text-4xl"
                  />
                </div>
                <p className="max-w-md text-sm leading-relaxed text-[#9CA3AF]">
                  Six monolithic brutalist works across the Philippines. Swipe any project card to
                  explore exterior, interior, and structural detail shots.
                </p>
              </motion.div>

              {/* Asymmetric Architectural Grid with 3D Tilt & Swipable Shots */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {projects.map((project, idx) => (
                  <ProjectWorkCard
                    key={project.id}
                    project={project}
                    index={idx}
                    editMode={editMode}
                    onSelect={(proj, initialShot) => {
                      setActiveProject(proj);
                      setModalShotIndex(initialShot);
                    }}
                    onUpdateProject={handleUpdateProject}
                    onReplaceShotImage={handleReplaceProjectShot}
                    onAddShotImage={handleAddProjectShot}
                  />
                ))}
              </div>
            </div>
          </section>

          {/* 02. Our Firm — Walkthrough Video (up to 260MB) & Direct Logo Upload */}
          <MediaVaultSection
            canEdit={editMode}
            logoMedia={logoMedia}
            videoMedia={videoMedia}
            videoEmbedUrl={siteCopy.walkthroughVideoUrl}
            videoLoadingProgress={videoLoadingProgress}
            onLogoChange={setLogoMedia}
            onVideoChange={setVideoMedia}
            onVideoEmbedUrlChange={(url) =>
              setSiteCopy((prev) => ({ ...prev, walkthroughVideoUrl: url }))
            }
          />

          {/* 03. Our Architects — 6 Principals in 3-in-a-Row Grid */}
          <section
            id="our-architects"
            className="border-t border-[#2A2E35] py-20 lg:py-28 overflow-hidden"
          >
            <div className="mx-auto max-w-[1360px] px-6 lg:px-10">
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.7, ease: BRUTALIST_EASE }}
                className="mb-12 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"
              >
                <div>
                  <p className="font-mono text-xs tracking-wider text-[#D9381E]">
                    03. Our Architects
                  </p>
                  <EditableText
                    as="h2"
                    editMode={editMode}
                    value={siteCopy.architectsTitle}
                    onChange={(val) => setSiteCopy((prev) => ({ ...prev, architectsTitle: val }))}
                    className="mt-2 font-display text-3xl font-bold tracking-tight text-[#F4F4F2] sm:text-4xl"
                  />
                </div>
                <EditableText
                  as="p"
                  editMode={editMode}
                  value={siteCopy.architectsSubtitle}
                  onChange={(val) =>
                    setSiteCopy((prev) => ({ ...prev, architectsSubtitle: val }))
                  }
                  className="max-w-xl text-sm leading-relaxed text-[#9CA3AF]"
                />
              </motion.div>

              {/* 3-Column Desktop Grid for the 6 Architects with Bold Staggered Reveals */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {architects.map((architect, idx) => (
                  <ArchitectRevealCard
                    key={architect.id}
                    index={idx}
                    onClick={() => {
                      if (!editMode) setActiveArchitect(architect);
                    }}
                    className={`group flex flex-col justify-between border border-[#2A2E35] bg-[#141619] hover:border-[#D9381E] ${
                      editMode ? '' : 'cursor-pointer'
                    }`}
                  >
                    <div>
                      {/* Square 1:1 Professional Headshot */}
                      <div className="relative aspect-square w-full overflow-hidden border-b border-[#2A2E35] bg-[#0B0C0E]">
                        <img
                          src={architect.headshot || undefined}
                          alt={`${architect.name}, ${architect.role}`}
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover object-top transition-transform duration-500 ease-out group-hover:scale-[1.05]"
                        />

                        {editMode && (
                          <label
                            onClick={(e) => e.stopPropagation()}
                            className="absolute top-3 right-3 z-20 inline-flex items-center gap-1.5 border border-[#D9381E] bg-[#0B0C0E]/90 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#D9381E] cursor-pointer"
                          >
                            <Camera className="h-3.5 w-3.5" />
                            Replace Photo
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleReplaceArchitectPhoto(architect.id, file);
                                e.target.value = '';
                              }}
                            />
                          </label>
                        )}
                      </div>

                      <div className="p-6">
                        <div className="flex items-baseline justify-between gap-3">
                          <EditableText
                            as="h3"
                            editMode={editMode}
                            value={architect.name}
                            onChange={(val) =>
                              setArchitects((prev) =>
                                prev.map((a) => (a.id === architect.id ? { ...a, name: val } : a))
                              )
                            }
                            className="font-display text-xl font-bold text-[#F4F4F2] group-hover:text-[#D9381E] transition-colors"
                          />
                          <span className="font-mono text-xs text-[#6B7280] tabular-nums">
                            {architect.index}
                          </span>
                        </div>

                        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-[#9CA3AF]">
                          <EditableText
                            as="span"
                            editMode={editMode}
                            value={architect.role}
                            onChange={(val) =>
                              setArchitects((prev) =>
                                prev.map((a) => (a.id === architect.id ? { ...a, role: val } : a))
                              )
                            }
                            className="font-medium text-[#D1D5DB]"
                          />
                          <span aria-hidden="true">·</span>
                          <EditableText
                            as="span"
                            editMode={editMode}
                            value={architect.experience}
                            onChange={(val) =>
                              setArchitects((prev) =>
                                prev.map((a) =>
                                  a.id === architect.id ? { ...a, experience: val } : a
                                )
                              )
                            }
                            className="font-mono tabular-nums"
                          />
                        </div>

                        <EditableText
                          as="p"
                          editMode={editMode}
                          value={architect.bio}
                          onChange={(val) =>
                            setArchitects((prev) =>
                              prev.map((a) => (a.id === architect.id ? { ...a, bio: val } : a))
                            )
                          }
                          className="mt-4 text-sm leading-relaxed text-[#9CA3AF]"
                        />
                      </div>
                    </div>

                    {/* Key Brutalist Specializations (Clean Unboxed Text) */}
                    <div className="border-t border-[#2A2E35] bg-[#101215] px-6 py-4">
                      <div className="font-mono text-[11px] text-[#6B7280]">
                        Brutalist Specializations
                      </div>
                      <EditableText
                        as="div"
                        editMode={editMode}
                        value={architect.specializations.join(' · ')}
                        onChange={(val) =>
                          setArchitects((prev) =>
                            prev.map((a) =>
                              a.id === architect.id
                                ? {
                                    ...a,
                                    specializations: val
                                      .split('·')
                                      .map((s) => s.trim())
                                      .filter(Boolean)
                                  }
                                : a
                            )
                          )
                        }
                        className="mt-1.5 text-xs font-medium text-[#F4F4F2]"
                      />
                    </div>
                  </ArchitectRevealCard>
                ))}
              </div>
            </div>
          </section>

          {/* 04. Commission Inquiry Section */}
          <section
            id="commission"
            className="border-t border-[#2A2E35] bg-[#101215] py-20 lg:py-28 overflow-hidden"
          >
            <div className="mx-auto max-w-[1360px] px-6 lg:px-10">
              <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
                <motion.div
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.7, ease: BRUTALIST_EASE }}
                  className="lg:col-span-5"
                >
                  <p className="font-mono text-xs tracking-wider text-[#D9381E]">
                    04. Commission
                  </p>
                  <EditableText
                    as="h2"
                    editMode={editMode}
                    value={siteCopy.commissionTitle}
                    onChange={(val) =>
                      setSiteCopy((prev) => ({ ...prev, commissionTitle: val }))
                    }
                    className="mt-2 font-display text-3xl font-bold tracking-tight text-[#F4F4F2] sm:text-4xl [text-wrap:balance]"
                  />
                  <EditableText
                    as="p"
                    editMode={editMode}
                    value={siteCopy.commissionSubtitle}
                    onChange={(val) =>
                      setSiteCopy((prev) => ({ ...prev, commissionSubtitle: val }))
                    }
                    className="mt-4 text-sm leading-relaxed text-[#9CA3AF]"
                  />

                  <div className="mt-8 space-y-4 border-t border-[#2A2E35] pt-6 text-sm">
                    <div>
                      <div className="font-mono text-xs text-[#6B7280]">Studio Headquarters</div>
                      <EditableText
                        as="div"
                        editMode={editMode}
                        value={siteCopy.studioAddress}
                        onChange={(val) =>
                          setSiteCopy((prev) => ({ ...prev, studioAddress: val }))
                        }
                        className="mt-1 text-[#F4F4F2]"
                      />
                    </div>
                    <div>
                      <div className="font-mono text-xs text-[#6B7280]">Direct Inquiries</div>
                      <EditableText
                        as="div"
                        editMode={editMode}
                        value={siteCopy.studioEmail}
                        onChange={(val) =>
                          setSiteCopy((prev) => ({ ...prev, studioEmail: val }))
                        }
                        className="mt-1 font-mono text-[#F4F4F2]"
                      />
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 48 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.75, delay: 0.1, ease: BRUTALIST_EASE }}
                  className="lg:col-span-7"
                >
                  <div className="border border-[#2A2E35] bg-[#141619] p-6 sm:p-8">
                    {formSubmitted ? (
                      <div className="py-10 text-center">
                        <CheckCircle2 className="mx-auto h-10 w-10 text-[#D9381E]" />
                        <h3 className="mt-4 font-display text-2xl font-bold text-[#F4F4F2]">
                          Commission Brief Received
                        </h3>
                        <p className="mx-auto mt-2 max-w-md text-sm text-[#9CA3AF]">
                          Thank you, {formData.name}. Our six principals will review your{' '}
                          {formData.typology.toLowerCase()} brief and respond within 48 hours.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setFormSubmitted(false);
                            setFormData({
                              name: '',
                              email: '',
                              typology: 'Civic & Institutional',
                              brief: ''
                            });
                          }}
                          className="mt-6 border border-[#2A2E35] bg-[#1C1F24] px-5 py-2.5 text-xs font-semibold text-[#F4F4F2] transition-colors hover:border-[#D9381E] cursor-pointer"
                        >
                          Submit Another Brief
                        </button>
                      </div>
                    ) : (
                      <form onSubmit={handleInquirySubmit} className="space-y-5">
                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                          <div>
                            <label
                              htmlFor="client-name"
                              className="block font-mono text-xs text-[#9CA3AF]"
                            >
                              Full Name
                            </label>
                            <input
                              id="client-name"
                              type="text"
                              required
                              value={formData.name}
                              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                              placeholder="Alex Mercer"
                              className="mt-2 w-full border border-[#2A2E35] bg-[#0B0C0E] px-4 py-3 text-sm text-[#F4F4F2] placeholder-[#4B5563] focus:border-[#D9381E] focus:outline-none"
                            />
                          </div>
                          <div>
                            <label
                              htmlFor="client-email"
                              className="block font-mono text-xs text-[#9CA3AF]"
                            >
                              Email Address
                            </label>
                            <input
                              id="client-email"
                              type="email"
                              required
                              value={formData.email}
                              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                              placeholder="alex@organization.com"
                              className="mt-2 w-full border border-[#2A2E35] bg-[#0B0C0E] px-4 py-3 text-sm text-[#F4F4F2] placeholder-[#4B5563] focus:border-[#D9381E] focus:outline-none"
                            />
                          </div>
                        </div>

                        <div>
                          <label
                            htmlFor="project-typology"
                            className="block font-mono text-xs text-[#9CA3AF]"
                          >
                            Project Typology
                          </label>
                          <select
                            id="project-typology"
                            value={formData.typology}
                            onChange={(e) => setFormData({ ...formData, typology: e.target.value })}
                            className="mt-2 w-full border border-[#2A2E35] bg-[#0B0C0E] px-4 py-3 text-sm text-[#F4F4F2] focus:border-[#D9381E] focus:outline-none"
                          >
                            <option>Civic & Institutional</option>
                            <option>Private Brutalist Residence</option>
                            <option>Cultural Pavilion or Museum</option>
                            <option>Commercial Headquarters</option>
                          </select>
                        </div>

                        <div>
                          <label
                            htmlFor="project-brief"
                            className="block font-mono text-xs text-[#9CA3AF]"
                          >
                            Site & Program Brief
                          </label>
                          <textarea
                            id="project-brief"
                            rows={4}
                            required
                            value={formData.brief}
                            onChange={(e) => setFormData({ ...formData, brief: e.target.value })}
                            placeholder="Describe your site location, approximate area, and architectural ambitions..."
                            className="mt-2 w-full border border-[#2A2E35] bg-[#0B0C0E] px-4 py-3 text-sm text-[#F4F4F2] placeholder-[#4B5563] focus:border-[#D9381E] focus:outline-none"
                          />
                        </div>

                        <button
                          type="submit"
                          className="w-full bg-[#D9381E] px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#B82D16] sm:w-auto cursor-pointer"
                        >
                          Send Commission Brief
                        </button>
                      </form>
                    )}
                  </div>
                </motion.div>
              </div>
            </div>
          </section>
        </main>

        {/* Clean Architectural Footer */}
        <footer className="border-t border-[#2A2E35] bg-[#0B0C0E] py-10">
          <div className="mx-auto flex max-w-[1360px] flex-col items-start justify-between gap-6 px-6 sm:flex-row sm:items-center lg:px-10">
            <div className="flex items-center gap-3.5">
              {logoMedia ? (
                <img
                  src={logoMedia.url}
                  alt="Firm logo"
                  className="h-10 max-w-[200px] object-contain drop-shadow-[0_2px_8px_rgba(255,255,255,0.12)]"
                />
              ) : (
                <>
                  <DefaultMonogram />
                  <span className="font-display text-base font-bold text-[#F4F4F2]">
                    {siteCopy.firmName}
                  </span>
                </>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-6 text-xs text-[#6B7280]">
              <a href="#works" className="hover:text-[#F4F4F2] transition-colors">
                Works
              </a>
              <a href="#our-firm" className="hover:text-[#F4F4F2] transition-colors">
                Our Firm
              </a>
              <a href="#our-architects" className="hover:text-[#F4F4F2] transition-colors">
                Our Architects
              </a>
              <span
                onClick={(e) => {
                  if (e.detail === 3 && !isAdminUnlocked) {
                    setAdminModalOpen(true);
                  }
                }}
                className="select-none"
              >
                © {new Date().getFullYear()} {siteCopy.firmName}
              </span>
              {!isAdminUnlocked && (
                <button
                  type="button"
                  onClick={() => setAdminModalOpen(true)}
                  aria-label="Studio Admin Unlock"
                  title="Studio Admin Sign-In"
                  className="inline-flex items-center justify-center p-1 text-[#4B5563] transition-colors hover:text-[#9CA3AF] cursor-pointer"
                >
                  <Lock className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </footer>

        {/* Private Admin Editor Floating Control (Hidden in Public Read-Only Mode) */}
        {isAdminUnlocked && (
          <div className="fixed right-5 bottom-5 z-40 flex flex-wrap items-center gap-2 border border-[#2A2E35] bg-[#141619]/95 p-1.5 shadow-xl backdrop-blur-sm">
            {publishStatus && !publishingLive && (
              <span className="px-2.5 font-mono text-xs text-emerald-400">{publishStatus}</span>
            )}
            <button
              type="button"
              disabled={publishingLive}
              onClick={handlePublishToLive}
              className="inline-flex items-center gap-1.5 bg-[#D9381E] px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#B82D16] cursor-pointer whitespace-nowrap disabled:opacity-90"
            >
              <CloudUpload className="h-3.5 w-3.5" />
              {publishingLive ? (publishStatus || 'Publishing...') : 'Publish Changes Live'}
            </button>
            <button
              type="button"
              disabled={publishingLive}
              onClick={handleExportSiteData}
              title="Download all edited text & photos as weavenex-site-data.json for Cloudflare/GitHub"
              className="inline-flex items-center gap-1.5 border border-[#2A2E35] bg-[#0B0C0E] px-3 py-2 text-xs font-medium text-[#F4F4F2] transition-colors hover:border-[#D9381E] cursor-pointer whitespace-nowrap disabled:opacity-60"
            >
              <Download className="h-3.5 w-3.5 text-[#D9381E]" />
              Export Backup
            </button>
            <button
              type="button"
              onClick={() => {
                const publicUrl = `${window.location.origin.replace('ais-dev-', 'ais-pre-')}/weavenex-architectural-studio`;
                navigator.clipboard?.writeText(publicUrl).catch(() => {});
                setLinkCopied(true);
                window.setTimeout(() => setLinkCopied(false), 2500);
              }}
              className="inline-flex items-center gap-1.5 border border-[#2A2E35] bg-[#0B0C0E] px-3 py-2 text-xs font-medium text-[#F4F4F2] transition-colors hover:border-[#D9381E] cursor-pointer whitespace-nowrap"
            >
              <Link2 className="h-3.5 w-3.5 text-[#D9381E]" />
              {linkCopied ? 'Link Copied!' : 'Copy Live Link'}
            </button>
            {editMode && (
              <button
                type="button"
                onClick={handleResetAllCustomizations}
                className="inline-flex items-center gap-1.5 border border-[#2A2E35] bg-[#0B0C0E] px-3 py-2 text-xs font-medium text-[#9CA3AF] transition-colors hover:border-[#D9381E] hover:text-[#D9381E] cursor-pointer whitespace-nowrap"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset
              </button>
            )}
            <button
              type="button"
              onClick={() => setEditMode((prev) => !prev)}
              className="inline-flex items-center gap-2 bg-[#F4F4F2] px-3.5 py-2 text-xs font-semibold text-[#0B0C0E] transition-colors hover:bg-white cursor-pointer whitespace-nowrap"
            >
              {editMode ? (
                <>
                  <Eye className="h-3.5 w-3.5" />
                  Preview Public
                </>
              ) : (
                <>
                  <Pencil className="h-3.5 w-3.5" />
                  Edit Site
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleLockAdmin}
              title="Sign Out & Lock Admin Mode"
              className="inline-flex items-center gap-1.5 border border-[#2A2E35] bg-[#0B0C0E] px-3 py-2 text-xs font-medium text-[#9CA3AF] transition-colors hover:border-[#F4F4F2] hover:text-white cursor-pointer whitespace-nowrap"
            >
              <Lock className="h-3.5 w-3.5" />
              Lock
            </button>
          </div>
        )}

        {/* Private Admin Google Sign-In Modal */}
        <AnimatePresence>
          {adminModalOpen && !isAdminUnlocked && (
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="admin-modal-title"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setAdminModalOpen(false)}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
            >
              <motion.div
                initial={{ opacity: 0, y: 16, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.98 }}
                transition={{ duration: 0.25, ease: BRUTALIST_EASE }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md border border-[#2A2E35] bg-[#141619] p-6 sm:p-8"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-mono text-xs text-[#D9381E]">
                    <Lock className="h-3.5 w-3.5" />
                    Studio Admin Access
                  </div>
                  <button
                    type="button"
                    onClick={() => setAdminModalOpen(false)}
                    aria-label="Close admin unlock"
                    className="text-[#9CA3AF] hover:text-white cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <h3
                  id="admin-modal-title"
                  className="mt-3 font-display text-xl font-bold text-[#F4F4F2]"
                >
                  Sign In to Edit & Publish
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-[#9CA3AF]">
                  Sign in with your authorized studio Google account to edit text, upload photos,
                  and publish changes live to all visitors.
                </p>

                <div className="mt-6 space-y-4">
                  {adminError && <p className="font-mono text-xs text-[#FCA5A5]">{adminError}</p>}
                  <button
                    type="button"
                    onClick={handleAdminSignIn}
                    className="inline-flex w-full items-center justify-center gap-2 bg-[#D9381E] px-5 py-3 text-xs font-semibold text-white transition-colors hover:bg-[#B82D16] cursor-pointer"
                  >
                    <Check className="h-4 w-4" />
                    Sign In with Google
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Project Monograph Lightbox Modal */}
        <AnimatePresence>
          {activeProject && (
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="project-modal-title"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setActiveProject(null)}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 sm:p-8"
            >
              <motion.div
                initial={{ opacity: 0, y: 24, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 16, scale: 0.98 }}
                transition={{ duration: 0.3, ease: BRUTALIST_EASE }}
                onClick={(e) => e.stopPropagation()}
                className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto border border-[#2A2E35] bg-[#141619]"
              >
                <button
                  type="button"
                  onClick={() => setActiveProject(null)}
                  aria-label="Close project details"
                  className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center border border-[#2A2E35] bg-[#0B0C0E]/90 text-[#F4F4F2] transition-colors hover:border-[#D9381E] hover:text-[#D9381E] cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>

                <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#0B0C0E] select-none">
                  <motion.div
                    key={`${activeProject.id}-modal-${modalShotIndex}`}
                    initial={{ opacity: 0.4, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, ease: BRUTALIST_EASE }}
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.2}
                    onDragEnd={(_e, info) => {
                      const len = activeProject.shots.length;
                      if (info.offset.x < -45) {
                        setModalShotIndex((prev) => (prev + 1) % len);
                      } else if (info.offset.x > 45) {
                        setModalShotIndex((prev) => (prev - 1 + len) % len);
                      }
                    }}
                    className="h-full w-full cursor-grab active:cursor-grabbing"
                  >
                    <img
                      src={activeProject.shots[modalShotIndex]?.url || activeProject.image || undefined}
                      alt={`${activeProject.title} — ${activeProject.shots[modalShotIndex]?.caption ?? ''}`}
                      referrerPolicy="no-referrer"
                      draggable={false}
                      className="h-full w-full object-cover pointer-events-none"
                    />
                  </motion.div>

                  <button
                    type="button"
                    aria-label="Previous project shot"
                    onClick={() =>
                      setModalShotIndex(
                        (prev) =>
                          (prev - 1 + activeProject.shots.length) % activeProject.shots.length
                      )
                    }
                    className="absolute top-1/2 left-4 -translate-y-1/2 flex h-10 w-10 items-center justify-center border border-[#2A2E35] bg-[#0B0C0E]/85 text-[#F4F4F2] transition-colors hover:border-[#D9381E] hover:text-white cursor-pointer"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Next project shot"
                    onClick={() =>
                      setModalShotIndex((prev) => (prev + 1) % activeProject.shots.length)
                    }
                    className="absolute top-1/2 right-4 -translate-y-1/2 flex h-10 w-10 items-center justify-center border border-[#2A2E35] bg-[#0B0C0E]/85 text-[#F4F4F2] transition-colors hover:border-[#D9381E] hover:text-white cursor-pointer"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>

                  <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/85 to-transparent px-6 pt-8 pb-4 text-xs text-[#F4F4F2]">
                    <span className="font-medium">
                      {activeProject.shots[modalShotIndex]?.caption}
                    </span>
                    <span className="font-mono tabular-nums text-[#D1D5DB]">
                      {String(modalShotIndex + 1).padStart(2, '0')} /{' '}
                      {String(activeProject.shots.length).padStart(2, '0')}
                    </span>
                  </div>
                </div>

                <div className="p-6 sm:p-8">
                  <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-[#D9381E] tabular-nums">
                    <span>{activeProject.location}</span>
                    <span aria-hidden="true">·</span>
                    <span>{activeProject.year}</span>
                    <span aria-hidden="true">·</span>
                    <span>{activeProject.area}</span>
                  </div>

                  <h3
                    id="project-modal-title"
                    className="mt-2 font-display text-2xl font-bold text-[#F4F4F2] sm:text-3xl"
                  >
                    {activeProject.title}
                  </h3>

                  <p className="mt-4 text-sm leading-relaxed text-[#D1D5DB]">
                    {activeProject.summary}
                  </p>

                  <div className="mt-6 grid grid-cols-1 gap-6 border-t border-[#2A2E35] pt-6 sm:grid-cols-3">
                    <div>
                      <div className="font-mono text-xs text-[#6B7280]">Lead Principal</div>
                      <div className="mt-1 text-sm font-semibold text-[#F4F4F2]">
                        {activeProject.leadArchitect}
                      </div>
                    </div>
                    <div className="sm:col-span-2">
                      <div className="font-mono text-xs text-[#6B7280]">Primary Materials</div>
                      <div className="mt-1 text-sm text-[#F4F4F2]">{activeProject.materials}</div>
                    </div>
                  </div>

                  <div className="mt-6 border-t border-[#2A2E35] pt-6">
                    <div className="font-mono text-xs text-[#6B7280]">Structural Notes</div>
                    <p className="mt-1.5 text-sm leading-relaxed text-[#9CA3AF]">
                      {activeProject.structuralNotes}
                    </p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Architect Profile Modal */}
        <AnimatePresence>
          {activeArchitect && (
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="architect-modal-title"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setActiveArchitect(null)}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 sm:p-8"
            >
              <motion.div
                initial={{ opacity: 0, y: 24, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 16, scale: 0.98 }}
                transition={{ duration: 0.3, ease: BRUTALIST_EASE }}
                onClick={(e) => e.stopPropagation()}
                className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto border border-[#2A2E35] bg-[#141619]"
              >
                <button
                  type="button"
                  onClick={() => setActiveArchitect(null)}
                  aria-label="Close architect profile"
                  className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center border border-[#2A2E35] bg-[#0B0C0E]/90 text-[#F4F4F2] transition-colors hover:border-[#D9381E] hover:text-[#D9381E] cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>

                <div className="grid grid-cols-1 sm:grid-cols-12">
                  <div className="sm:col-span-5 bg-[#0B0C0E]">
                    <img
                      src={activeArchitect.headshot || undefined}
                      alt={activeArchitect.name}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover object-top"
                    />
                  </div>

                  <div className="p-6 sm:col-span-7 sm:p-8">
                    <div className="font-mono text-xs text-[#D9381E]">
                      Principal {activeArchitect.index} · {activeArchitect.experience}
                    </div>
                    <h3
                      id="architect-modal-title"
                      className="mt-2 font-display text-2xl font-bold text-[#F4F4F2]"
                    >
                      {activeArchitect.name}
                    </h3>
                    <div className="mt-1 text-sm font-medium text-[#9CA3AF]">
                      {activeArchitect.role} · {activeArchitect.discipline}
                    </div>

                    <p className="mt-5 text-sm leading-relaxed text-[#D1D5DB]">
                      {activeArchitect.bio}
                    </p>

                    <div className="mt-6 space-y-4 border-t border-[#2A2E35] pt-5 text-sm">
                      <div>
                        <div className="font-mono text-xs text-[#6B7280]">
                          Brutalist Specializations
                        </div>
                        <div className="mt-1 text-[#F4F4F2]">
                          {activeArchitect.specializations.join(' · ')}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="font-mono text-xs text-[#6B7280]">Education</div>
                          <div className="mt-1 text-[#F4F4F2]">{activeArchitect.education}</div>
                        </div>
                        <div>
                          <div className="font-mono text-xs text-[#6B7280]">Signature Material</div>
                          <div className="mt-1 text-[#F4F4F2]">
                            {activeArchitect.signatureMaterial}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}
