export interface ProjectShot {
  url: string;
  caption: string;
}

export interface ProjectItem {
  id: string;
  title: string;
  location: string;
  year: string;
  area: string;
  materials: string;
  leadArchitect: string;
  image: string;
  shots: ProjectShot[];
  featured?: boolean;
  summary: string;
  structuralNotes: string;
}

export interface ArchitectProfile {
  id: string;
  index: string;
  name: string;
  initials: string;
  headshot: string;
  role: string;
  discipline: string;
  experience: string;
  education: string;
  signatureMaterial: string;
  specializations: string[];
  bio: string;
  notableWorks: string[];
}

export const HERO_IMAGE = '/src/assets/images/hero_brutalist_monolith_1795021472104.jpg';

export const PROJECTS: ProjectItem[] = [
  {
    id: 'kestrel-civic-citadel',
    title: 'Bendo Group of Companies',
    location: 'Lake Kawaguchiko, Yamanashi Japan',
    year: '2025',
    area: '14,800 m²',
    materials: 'Board-Formed Concrete · Oxidized Corten Steel',
    leadArchitect: 'Marcus Vance',
    image: '/src/assets/images/work_civic_citadel_1795021472284.jpg',
    shots: [
      {
        url: '/src/assets/images/work_civic_citadel_1795021472284.jpg',
        caption: 'South Plaza & Corten Entry'
      },
      {
        url: '/src/assets/images/shot_civic_interior_1795021951402.jpg',
        caption: 'Main Atrium & Cantilevered Stair'
      },
      {
        url: '/src/assets/images/shot_pavilion_detail_1795021951522.jpg',
        caption: 'North Reflection Basin'
      }
    ],
    featured: true,
    summary:
      'A commanding corporate headquarters forged in raw cast concrete and weathered corten steel, projecting executive authority and structural permanence across the Makati skyline.',
    structuralNotes:
      'Post-tensioned concrete trusses span 24 meters column-free over the main executive atrium, engineered for seismic resilience and zero-maintenance longevity.'
  },
  {
    id: 'basalt-point-residence',
    title: 'Mizu no Wa',
    location: 'Tagaytay City, PH',
    year: '2024',
    area: '640 m²',
    materials: 'Cast-in-Place Basalt Concrete · Blackened Steel',
    leadArchitect: 'Henrik Lindholm',
    image: '/src/assets/images/work_cliff_residence_1795021471658.jpg',
    shots: [
      {
        url: '/src/assets/images/work_cliff_residence_1795021471658.jpg',
        caption: 'Ridge Cantilever Elevation'
      },
      {
        url: '/src/assets/images/shot_cliff_interior_1795021951925.jpg',
        caption: 'Hearth & Living Volume'
      },
      {
        url: '/src/assets/images/shot_foundry_night_1795021951079.jpg',
        caption: 'Evening Structural Corridor'
      }
    ],
    summary:
      'A private coastal fortress cantilevered 9 meters over volcanic sea cliffs, engineered to withstand severe monsoon winds.',
    structuralNotes:
      'Deep rock-anchored concrete piers transfer wind and thermal loads directly into the basalt bedrock below.'
  },
  {
    id: 'solstice-courtyard-pavilion',
    title: 'Aurelia Concrete Sanctuary',
    location: 'Cebu City, PH',
    year: '2024',
    area: '4,200 m²',
    materials: 'Raw Architectural Concrete · Honed Dark Granite',
    leadArchitect: 'Tomasz Kowalski',
    image: '/src/assets/images/work_cultural_pavilion_1795021471823.jpg',
    shots: [
      {
        url: '/src/assets/images/work_cultural_pavilion_1795021471823.jpg',
        caption: 'Solar Lightwell Courtyard'
      },
      {
        url: '/src/assets/images/shot_pavilion_detail_1795021951522.jpg',
        caption: 'Cantilevered Granite Basin'
      },
      {
        url: '/src/assets/images/shot_civic_interior_1795021951402.jpg',
        caption: 'Coffer Skylight Gallery'
      }
    ],
    summary:
      'A meditative brutalist sanctuary where soaring raw concrete colonnades and precision-cut roof apertures transform harsh tropical sunlight into sculptural shafts of shadow.',
    structuralNotes:
      'Zero applied finishes; every formwork tie-hole and aggregate seam is left exposed to weather naturally in the Visayan climate.'
  },
  {
    id: 'foundry-command-center',
    title: 'Vanguard Brutalist Citadel',
    location: 'BGC, Taguig, PH',
    year: '2026',
    area: '11,400 m²',
    materials: 'Precast Concrete · Weathering Structural Steel',
    leadArchitect: 'Dante Moretti',
    image: '/src/assets/images/hero_brutalist_monolith_1795021472104.jpg',
    shots: [
      {
        url: '/src/assets/images/hero_brutalist_monolith_1795021472104.jpg',
        caption: 'Twilight Cantilever Facade'
      },
      {
        url: '/src/assets/images/shot_foundry_night_1795021951079.jpg',
        caption: 'Ribbed Concrete Spine'
      },
      {
        url: '/src/assets/images/work_civic_citadel_1795021472284.jpg',
        caption: 'East Service Monolith'
      }
    ],
    summary:
      'Twin cantilevered monoliths suspended above a sunken concrete plinth, housing next-generation design laboratories and fortified collaborative studios in the heart of BGC.',
    structuralNotes:
      'Heavy steel plate girders embedded within 600mm concrete shear walls isolate upper volumes from urban vibration and seismic shear.'
  },
  {
    id: 'cordillera-ridge-monolith',
    title: 'Sierra Mirror Monolith',
    location: 'Baguio, PH',
    year: '2025',
    area: '2,850 m²',
    materials: 'Board-Formed Concrete · Black Granite Reflecting Basin',
    leadArchitect: 'Rafael Ortega',
    image: '/src/assets/images/shot_pavilion_detail_1795021951522.jpg',
    shots: [
      {
        url: '/src/assets/images/shot_pavilion_detail_1795021951522.jpg',
        caption: 'Cantilevered Concrete & Reflecting Basin'
      },
      {
        url: '/src/assets/images/shot_cliff_interior_1795021951925.jpg',
        caption: 'Monolithic Hearth & Living Hall'
      },
      {
        url: '/src/assets/images/work_cliff_residence_1795021471658.jpg',
        caption: 'Ridge Edge Elevation'
      }
    ],
    summary:
      'Defined by a razor-sharp concrete volume cantilevered above a still black-granite reflecting pool, this highland residence balances raw monumental mass with quiet, mirror-like stillness.',
    structuralNotes:
      'Deep stepped concrete retaining walls anchor the cantilevered viewing deck into the mountain ridge while framing an uninterrupted water reflection.'
  },
  {
    id: 'intramuros-stone-archive',
    title: 'Bastion Atrium & Gallery',
    location: 'Manila, PH',
    year: '2026',
    area: '8,900 m²',
    materials: 'Raw Cast Concrete · Oxidized Corten Steel · Honed Basalt',
    leadArchitect: 'Kenji Takahashi',
    image: '/src/assets/images/shot_civic_interior_1795021951402.jpg',
    shots: [
      {
        url: '/src/assets/images/shot_civic_interior_1795021951402.jpg',
        caption: 'Coffered Skylight Atrium & Corten Stair'
      },
      {
        url: '/src/assets/images/shot_foundry_night_1795021951079.jpg',
        caption: 'Illuminated Ribbed Concrete Gallery'
      }
    ],
    summary:
      'A soaring concrete atrium anchored by a cantilevered oxidized corten-steel staircase and coffered skylight grid, leading into an atmospheric ribbed-concrete gallery spine.',
    structuralNotes:
      'Exposed concrete waffle skylights channel raking daylight across 18-meter shear walls while linear ceiling luminaires articulate the structural ribs after dusk.'
  }
];

export const ARCHITECTS: ArchitectProfile[] = [
  {
    id: 'marcus-vance',
    index: '01',
    name: 'Marcus Vance',
    initials: 'MV',
    headshot: '/src/assets/images/architect_marcus_vance_1795021527638.jpg',
    role: 'Founding Principal',
    discipline: 'Civic & Monumental Form',
    experience: '19 Years',
    education: 'M.Arch, ETH Zurich',
    signatureMaterial: 'Board-Formed Concrete',
    specializations: ['Monumental Civic Cores', 'Cantilevered Volumes', 'Béton Brut Detailing'],
    bio: 'Leads the firm’s civic and institutional commissions. His work focuses on load-bearing honesty, massive cantilevered geometry, and structures built for a 200-year lifespan.',
    notableWorks: ['Kestrel Civic Museum', 'North Harbor Archive']
  },
  {
    id: 'henrik-lindholm',
    index: '02',
    name: 'Henrik Lindholm',
    initials: 'HL',
    headshot: '/src/assets/images/architect_henrik_lindholm_1795021528108.jpg',
    role: 'Managing Principal',
    discipline: 'Extreme-Site Residential',
    experience: '16 Years',
    education: 'M.Arch, Royal Danish Academy',
    signatureMaterial: 'Basalt Aggregate Concrete',
    specializations: ['Cliffside Foundations', 'Thermal Mass Envelopes', 'Blackened Steel Glazing'],
    bio: 'Specializes in brutalist private residences anchored into rugged coastal, alpine, and desert terrain, balancing raw thermal mass with razor-sharp steel glazing.',
    notableWorks: ['Basalt Point House', 'Fjord Bunker Villa']
  },
  {
    id: 'tomasz-kowalski',
    index: '03',
    name: 'Tomasz Kowalski',
    initials: 'TK',
    headshot: '/src/assets/images/architect_tomasz_kowalski_1795021528277.jpg',
    role: 'Design Principal',
    discipline: 'Cultural Spaces & Light',
    experience: '15 Years',
    education: 'M.Arch, TU Delft',
    signatureMaterial: 'Exposed Cast Concrete',
    specializations: ['Solar Lightwells', 'Acoustic Concrete Vaults', 'Monolithic Courtyards'],
    bio: 'Choreographs natural daylight across monumental interior volumes. His pavilions and museums treat shadow and raw concrete mass as primary sculptural instruments.',
    notableWorks: ['Solstice Concrete Pavilion', 'Warsaw Concrete Hall']
  },
  {
    id: 'dante-moretti',
    index: '04',
    name: 'AR. LAWRENCE S. BERAQUIT',
    initials: 'DM',
    headshot: '/src/assets/images/architect_dante_moretti_1795021529187.jpg',
    role: 'Structural Principal',
    discipline: 'Long-Span Engineering',
    experience: '17 Years',
    education: 'M.Sc Structural Architecture, Politecnico di Milano',
    signatureMaterial: 'Oxidized Corten Steel',
    specializations: ['Post-Tensioned Spans', 'Exposed Exoskeletons', 'Corten Steel Integration'],
    bio: 'Bridges brutalist architectural expression with heavy structural engineering, pioneering post-tensioned concrete cantilevers and exposed steel exoskeletons.',
    notableWorks: ['Foundry Research Monolith', 'Turin Logistics Citadel']
  },
  {
    id: 'rafael-ortega',
    index: '05',
    name: 'Rafael Ortega',
    initials: 'RO',
    headshot: '/src/assets/images/architect_rafael_ortega_1795021528358.jpg',
    role: 'Technical Principal',
    discipline: 'Materiality & Formwork',
    experience: '14 Years',
    education: 'M.Arch, ETSAM Madrid',
    signatureMaterial: 'Bush-Hammered Concrete',
    specializations: ['Custom Timber Formwork', 'Pigmented Concrete Mixes', 'Bush-Hammered Finishes'],
    bio: 'Directs the studio’s material research lab, developing custom timber formwork patterns, pigmented concrete mixes, and acoustic stone assemblies.',
    notableWorks: ['Bilbao Sound Vault', 'Kestrel Civic Museum']
  },
  {
    id: 'kenji-takahashi',
    index: '06',
    name: 'Kenji Takahashi',
    initials: 'KT',
    headshot: '/src/assets/images/architect_kenji_takahashi_1795021527852.jpg',
    role: 'Urban Principal',
    discipline: 'Masterplanning & Plazas',
    experience: '13 Years',
    education: 'M.Arch, University of Tokyo',
    signatureMaterial: 'Honed Black Granite',
    specializations: ['Civic Plinths & Plazas', 'Subterranean Concourses', 'Monolithic Memorials'],
    bio: 'Shapes the threshold between brutalist architecture and the city, designing austere public plazas, subterranean transit concourses, and monolithic memorials.',
    notableWorks: ['Osaka Transit Plinth', 'Solstice Concrete Pavilion']
  }
];

export const FIRM_METRICS = [
  { value: '06', label: 'Founding Architects', detail: 'Partner-led studio' },
  { value: '42', label: 'Built Monoliths', detail: 'Across 11 countries' },
  { value: '200 yr', label: 'Structural Lifespan', detail: 'Zero-cladding standard' },
  { value: '260 MB', label: 'Walkthrough Vault', detail: 'Direct cinema upload' }
];
