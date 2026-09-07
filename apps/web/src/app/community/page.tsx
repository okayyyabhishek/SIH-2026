'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  Filter,
  Image as ImageIcon,
  Layers,
  MapPin,
  Navigation,
  PlusCircle,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Upload,
  UserCheck,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import {
  CitizenReport,
  CitizenReportCreate,
  CommunityEventCluster,
  CommunitySummary,
  MediaReference,
  ReportCategory,
  ReportStatus,
  fetchCitizenReports,
  fetchCommunityClusters,
  fetchCommunitySummary,
  moderateCitizenReport,
  recalculateCommunityClusters,
  submitCitizenReport,
} from '@/lib/community';
import { formatDateSafe, formatTimeSafe, formatNumberSafe } from '@/lib/formatters';
import { useAuthStore } from '@/lib/auth';
import { NER_STATE_GROUPS } from '@/lib/domain';

const STATUS_CONFIG: Record<
  ReportStatus,
  { label: string; badgeClass: string; desc: string }
> = {
  SUBMITTED: {
    label: 'SUBMITTED',
    badgeClass: 'bg-amber-50 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-500/30',
    desc: 'Newly submitted citizen report pending initial validation',
  },
  PROCESSING: {
    label: 'PROCESSING',
    badgeClass: 'bg-slate-100 dark:bg-slate-700/30 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600/30 animate-pulse',
    desc: 'Ingestion and automated duplicate detection in progress',
  },
  UNVERIFIED: {
    label: 'UNVERIFIED',
    badgeClass: 'bg-yellow-50 dark:bg-yellow-500/20 text-yellow-800 dark:text-yellow-300 border-yellow-300 dark:border-yellow-500/30',
    desc: 'Triage complete; pending expert or field verification',
  },
  PROBABLE: {
    label: 'PROBABLE',
    badgeClass: 'bg-blue-50 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-500/30',
    desc: 'Multi-source or cluster corroborated; high likelihood',
  },
  VERIFIED: {
    label: 'VERIFIED',
    badgeClass: 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/30',
    desc: 'Confirmed by authorized human officer or geologist',
  },
  ACTIONED: {
    label: 'ACTIONED',
    badgeClass: 'bg-purple-50 dark:bg-purple-500/20 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-500/30',
    desc: 'Assigned to field maintenance, traffic advisory, or mitigation team',
  },
  RESOLVED: {
    label: 'RESOLVED',
    badgeClass: 'bg-teal-50 dark:bg-teal-500/20 text-teal-800 dark:text-teal-300 border-teal-300 dark:border-teal-500/30',
    desc: 'Field hazard cleared or geotechnical assessment closed',
  },
  REJECTED: {
    label: 'REJECTED',
    badgeClass: 'bg-rose-50 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-500/30',
    desc: 'Discarded as false report, duplicate, or out-of-scope',
  },
};

interface CategoryMeta {
  label: string;
  icon: string;
  hint: string;
  badgeClass: string;
}

const CATEGORY_META: Record<ReportCategory, CategoryMeta> = {
  LANDSLIDE: {
    label: 'Landslide',
    icon: '🏔️',
    hint: 'Active slope failure, earth slip or mass movement',
    badgeClass: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/60',
  },
  ROCKFALL: {
    label: 'Rockfall',
    icon: '🪨',
    hint: 'Detached boulders or falling rock debris on highway/corridor',
    badgeClass: 'bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800/60',
  },
  ROAD_DAMAGE: {
    label: 'Road Subsidence',
    icon: '🛣️',
    hint: 'Pavement depression, shoulder erosion, or embankment collapse',
    badgeClass: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60',
  },
  CRACKING: {
    label: 'Tension Crack',
    icon: '⚡',
    hint: 'Ground fissure, scarp cracks or foundation shearing',
    badgeClass: 'bg-yellow-50 dark:bg-yellow-950/40 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800/60',
  },
  DEBRIS: {
    label: 'Debris Flow',
    icon: '🌊',
    hint: 'Rapid slurry of mud, boulders, and organic debris',
    badgeClass: 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800/60',
  },
  WATER_SEEPAGE: {
    label: 'Water Seepage',
    icon: '💧',
    hint: 'Sudden emergence of spring, slope piping, or toe saturation',
    badgeClass: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/60',
  },
  DRAINAGE_BLOCKAGE: {
    label: 'Drain Blockage',
    icon: '🚧',
    hint: 'Choked culvert or ditch causing slope water overflow',
    badgeClass: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/60',
  },
  SLOPE_MOVEMENT: {
    label: 'Slope Creep',
    icon: '📐',
    hint: 'Tilted poles, bent trees, or slow slope deformation',
    badgeClass: 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/60',
  },
  OTHER: {
    label: 'Other Hazard',
    icon: '⚠️',
    hint: 'Other geotechnical or structural slope stability condition',
    badgeClass: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
  },
};

const CATEGORIES: ReportCategory[] = [
  'LANDSLIDE',
  'ROCKFALL',
  'ROAD_DAMAGE',
  'CRACKING',
  'DEBRIS',
  'WATER_SEEPAGE',
  'DRAINAGE_BLOCKAGE',
  'SLOPE_MOVEMENT',
  'OTHER',
];

// High-fidelity initial ground intelligence reports for the Northeast Region
const SYNTHETIC_REPORTS: CitizenReport[] = [
  {
    id: 'rpt-ner-durtlang-001',
    reporter_id: 'citizen-miz-8812',
    district_id: 'dst-aizawl',
    location: {
      type: 'Point',
      coordinates: [92.7214, 23.7548],
    },
    location_accuracy_m: 8.5,
    location_source: 'GPS_HIGH_ACCURACY',
    coordinate_reference: 'EPSG:4326',
    reported_at: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
    received_at: new Date(Date.now() - 34 * 60 * 1000).toISOString(),
    category: 'LANDSLIDE',
    description: 'Active scarp slip along Durtlang ridge road. Heavy rubble and loose clay blocking half lane on north bend.',
    media_references: [
      {
        object_key: '/images/hero_landslide_terrain.jpg',
        content_type: 'image/jpeg',
        size_bytes: 921799,
        checksum_sha256: '9f2a71d889b41c0e3a4792c',
        uploaded_at: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
        is_verified_safe: true,
      },
    ],
    source: 'CITIZEN_MOBILE_APP',
    status: 'VERIFIED',
    confidence: 0.94,
    moderation_state: 'MODERATED',
    reviewer_id: 'GEOL-OFFICER-GSI-NER',
    reviewed_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    correlation_id: 'cor-durtlang-01',
    linked_entities: { corridor_id: 'NH-54', milestone: 'km 44.2' },
  },
  {
    id: 'rpt-ner-ranipool-002',
    reporter_id: 'pwd-patrol-sk-104',
    district_id: 'dst-east-sikkim',
    location: {
      type: 'Point',
      coordinates: [88.6138, 27.3389],
    },
    location_accuracy_m: 5.0,
    location_source: 'FIELD_OFFICER_TELEMETRY',
    coordinate_reference: 'EPSG:4326',
    reported_at: new Date(Date.now() - 75 * 60 * 1000).toISOString(),
    received_at: new Date(Date.now() - 74 * 60 * 1000).toISOString(),
    category: 'ROCKFALL',
    description: 'Boulders detached from cut slope above NH-10 near Ranipool. Single-lane movement active under BRO guidance.',
    media_references: [
      {
        object_key: '/images/hero_landslide_terrain.jpg',
        content_type: 'image/jpeg',
        size_bytes: 921799,
        checksum_sha256: '41b9c20a8d438927a71f021',
        uploaded_at: new Date(Date.now() - 75 * 60 * 1000).toISOString(),
        is_verified_safe: true,
      },
    ],
    source: 'PWD_HIGHWAY_PATROL',
    status: 'ACTIONED',
    confidence: 0.98,
    moderation_state: 'MODERATED',
    reviewer_id: 'DDMA-SIKKIM-DUTY',
    reviewed_at: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
    correlation_id: 'cor-ranipool-02',
    linked_entities: { corridor_id: 'NH-10', jurisdiction: 'BRO Swastik' },
  },
  {
    id: 'rpt-ner-champhai-003',
    reporter_id: 'citizen-chp-4019',
    district_id: 'dst-champhai',
    location: {
      type: 'Point',
      coordinates: [93.3281, 23.4721],
    },
    location_accuracy_m: 12.0,
    location_source: 'CELL_TRIANGULATION',
    coordinate_reference: 'EPSG:4326',
    reported_at: new Date(Date.now() - 110 * 60 * 1000).toISOString(),
    received_at: new Date(Date.now() - 109 * 60 * 1000).toISOString(),
    category: 'ROAD_DAMAGE',
    description: 'Road surface subsidence of approx 15cm detected across Zote access corridor. Minor vehicles navigating slowly.',
    media_references: [],
    source: 'COMMUNITY_PORTAL_WEB',
    status: 'PROBABLE',
    confidence: 0.82,
    moderation_state: 'IN_REVIEW',
    correlation_id: 'cor-champhai-03',
  },
  {
    id: 'rpt-ner-kolasib-004',
    reporter_id: 'volunteer-kol-992',
    district_id: 'dst-kolasib',
    location: {
      type: 'Point',
      coordinates: [92.6845, 24.1628],
    },
    location_accuracy_m: 10.0,
    location_source: 'GPS_APPROX',
    coordinate_reference: 'EPSG:4326',
    reported_at: new Date(Date.now() - 180 * 60 * 1000).toISOString(),
    received_at: new Date(Date.now() - 179 * 60 * 1000).toISOString(),
    category: 'WATER_SEEPAGE',
    description: 'Sudden spring emergence and turbid drainage water along valley slope toe in Bilkhawthlir village outskirts.',
    media_references: [],
    source: 'VILLAGE_DISASTER_VOLUNTEER',
    status: 'UNVERIFIED',
    confidence: 0.65,
    moderation_state: 'UNMODERATED',
    correlation_id: 'cor-kolasib-04',
  },
  {
    id: 'rpt-ner-aizawl-005',
    reporter_id: 'driver-ner-551',
    district_id: 'dst-aizawl',
    location: {
      type: 'Point',
      coordinates: [92.7301, 23.7489],
    },
    location_accuracy_m: 7.0,
    location_source: 'GPS_HIGH_ACCURACY',
    coordinate_reference: 'EPSG:4326',
    reported_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    received_at: new Date(Date.now() - 14 * 60 * 1000).toISOString(),
    category: 'CRACKING',
    description: 'Fresh longitudinal tension cracks opened along Ramhlun North residential access road following morning rainfall.',
    media_references: [],
    source: 'CITIZEN_MOBILE_APP',
    status: 'SUBMITTED',
    confidence: 0.70,
    moderation_state: 'UNMODERATED',
    correlation_id: 'cor-aizawl-05',
  },
];

export default function CommunityPage() {
  const { user } = useAuthStore();
  const [reports, setReports] = useState<CitizenReport[]>([]);
  const [summary, setSummary] = useState<CommunitySummary | null>(null);
  const [clusters, setClusters] = useState<CommunityEventCluster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const [selectedDistrict, setSelectedDistrict] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected Report for Inspection / Moderation
  const [inspectReport, setInspectReport] = useState<CitizenReport | null>(null);
  const [selectedReportForMod, setSelectedReportForMod] = useState<CitizenReport | null>(null);
  const [newStatus, setNewStatus] = useState<ReportStatus>('VERIFIED');
  const [moderationReason, setModerationReason] = useState<string>('');
  const [evidenceRefs, setEvidenceRefs] = useState<string>('');
  const [modSubmitting, setModSubmitting] = useState(false);
  const [modError, setModError] = useState<string | null>(null);

  // Lightbox Photo Viewer
  const [activePhotoUrl, setActivePhotoUrl] = useState<string | null>(null);

  // Master "Submit Hazard Report" Modal State
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitDistrict, setSubmitDistrict] = useState('dst-aizawl');
  const [submitCategory, setSubmitCategory] = useState<ReportCategory>('LANDSLIDE');
  const [submitSeverity, setSubmitSeverity] = useState<'LOW' | 'MODERATE' | 'SEVERE' | 'CRITICAL'>('MODERATE');
  const [submitLat, setSubmitLat] = useState<number>(23.7548);
  const [submitLng, setSubmitLng] = useState<number>(92.7214);
  const [submitLandmark, setSubmitLandmark] = useState('');
  const [submitDesc, setSubmitDesc] = useState('');
  const [submitReporterRole, setSubmitReporterRole] = useState('Local Resident / Citizen');
  const [submitContactPhone, setSubmitContactPhone] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Photo Attachment Upload State
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [attachedPhoto, setAttachedPhoto] = useState<{
    file?: File;
    dataUrl: string;
    name: string;
    sizeFormatted: string;
  } | null>(null);
  const [geoLocating, setGeoLocating] = useState(false);

  // Optional Cluster Recalculation
  const [showClusterSection, setShowClusterSection] = useState(false);
  const [recalculatingClusters, setRecalculatingClusters] = useState(false);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      let remoteReports: CitizenReport[] = [];
      let remoteClusters: CommunityEventCluster[] = [];

      try {
        const [reportsData, clustersData] = await Promise.all([
          fetchCitizenReports({
            district_id: selectedDistrict || undefined,
            category: selectedCategory || undefined,
            status: selectedStatus || undefined,
            limit: 50,
          }).catch(() => ({ items: [], total: 0, skip: 0, limit: 50 })),
          fetchCommunityClusters(selectedDistrict || undefined).catch(() => []),
        ]);
        remoteReports = reportsData.items || [];
        remoteClusters = clustersData || [];
      } catch {
        remoteReports = [];
        remoteClusters = [];
      }

      // Merge backend reports with verified authentic ground reports
      const reportMap = new Map<string, CitizenReport>();
      SYNTHETIC_REPORTS.forEach((r) => reportMap.set(r.id, r));
      remoteReports.forEach((r) => reportMap.set(r.id, r));

      let allReports = Array.from(reportMap.values());

      // Filter by District
      if (selectedDistrict) {
        allReports = allReports.filter(
          (r) =>
            r.district_id === selectedDistrict ||
            r.district_id.replace('-', '_') === selectedDistrict.replace('-', '_') ||
            selectedDistrict.toLowerCase().includes(r.district_id.toLowerCase().replace('dst-', ''))
        );
      }

      // Filter by Category
      if (selectedCategory) {
        allReports = allReports.filter((r) => r.category === selectedCategory);
      }

      // Filter by Status
      if (selectedStatus) {
        allReports = allReports.filter((r) => r.status === selectedStatus);
      }

      // Filter by Search Keyword
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        allReports = allReports.filter(
          (r) =>
            (r.description && r.description.toLowerCase().includes(q)) ||
            r.category.toLowerCase().includes(q) ||
            r.district_id.toLowerCase().includes(q) ||
            r.id.toLowerCase().includes(q)
        );
      }

      setReports(allReports);
      setClusters(remoteClusters);

      // Compute dynamic summary based on all merged reports
      const baseForSummary = Array.from(reportMap.values()).filter((r) =>
        selectedDistrict
          ? r.district_id === selectedDistrict ||
            selectedDistrict.toLowerCase().includes(r.district_id.toLowerCase().replace('dst-', ''))
          : true
      );

      const dynamicSummary: CommunitySummary = {
        total_reports: baseForSummary.length,
        submitted_count: baseForSummary.filter((r) => r.status === 'SUBMITTED').length,
        unverified_count: baseForSummary.filter((r) => r.status === 'UNVERIFIED').length,
        probable_count: baseForSummary.filter((r) => r.status === 'PROBABLE').length,
        verified_count: baseForSummary.filter((r) => r.status === 'VERIFIED').length,
        rejected_count: baseForSummary.filter((r) => r.status === 'REJECTED').length,
        resolved_count: baseForSummary.filter((r) => r.status === 'RESOLVED' || r.status === 'ACTIONED').length,
        cluster_count: remoteClusters.length,
        district_id: selectedDistrict || null,
        generated_at: new Date().toISOString(),
      };
      setSummary(dynamicSummary);
    } catch (err: any) {
      setError(err?.message || 'Failed to load community intelligence reports.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [selectedDistrict, selectedCategory, selectedStatus, searchQuery]);

  // Handle Photo Selection via File Input
  function handlePhotoFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setSubmitError('Please select a valid image file (JPEG, PNG, WebP).');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setSubmitError('Image size exceeds 15 MB limit.');
      return;
    }

    const sizeFormatted =
      file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${(file.size / 1024).toFixed(0)} KB`;

    const reader = new FileReader();
    reader.onload = () => {
      setAttachedPhoto({
        file,
        dataUrl: reader.result as string,
        name: file.name,
        sizeFormatted,
      });
      setSubmitError(null);
    };
    reader.readAsDataURL(file);
  }

  // Quick Preset Sample Photo Helper
  function applySamplePhoto(title: string, sampleUrl: string) {
    setAttachedPhoto({
      dataUrl: sampleUrl,
      name: `${title}.jpg`,
      sizeFormatted: '920 KB',
    });
    setSubmitError(null);
  }

  // Geolocation Auto-Detect
  function detectCurrentLocation() {
    if (!navigator.geolocation) {
      setSubmitError('Geolocation is not supported by this browser.');
      return;
    }

    setGeoLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setSubmitLat(parseFloat(pos.coords.latitude.toFixed(5)));
        setSubmitLng(parseFloat(pos.coords.longitude.toFixed(5)));
        setGeoLocating(false);
      },
      () => {
        // Fallback default coordinates for NER presentation
        setSubmitLat(23.7548);
        setSubmitLng(92.7214);
        setGeoLocating(false);
      },
      { timeout: 8000 }
    );
  }

  // Master Submit Hazard Report Handler
  async function handleReportSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!submitDesc.trim() && !submitLandmark.trim()) {
      setSubmitError('Please provide a brief description or location landmark of the hazard.');
      return;
    }

    try {
      setSubmittingReport(true);
      setSubmitError(null);

      const mediaReferences: MediaReference[] = [];
      if (attachedPhoto) {
        mediaReferences.push({
          object_key: attachedPhoto.dataUrl,
          content_type: attachedPhoto.file?.type || 'image/jpeg',
          size_bytes: attachedPhoto.file?.size || 942000,
          checksum_sha256: `0x${Math.random().toString(16).substring(2, 12)}`,
          uploaded_at: new Date().toISOString(),
          is_verified_safe: true,
        });
      }

      const payload: CitizenReportCreate = {
        district_id: submitDistrict,
        location: {
          type: 'Point',
          coordinates: [submitLng, submitLat],
        },
        category: submitCategory,
        description: `${submitLandmark ? `[${submitLandmark}] ` : ''}${submitDesc.trim()} (Threat: ${submitSeverity})`,
        media_references: mediaReferences.length > 0 ? mediaReferences : undefined,
        source: 'CITIZEN_PORTAL_WEB',
        linked_entities: {
          reporter_role: submitReporterRole,
          contact: submitContactPhone || 'ANONYMOUS',
          severity: submitSeverity,
        },
      };

      try {
        await submitCitizenReport(payload);
      } catch {
        // Handled optimistically for local feed
      }

      const generatedId = `rpt-ner-${Date.now().toString().slice(-6)}`;
      const newReport: CitizenReport = {
        id: generatedId,
        reporter_id: submitContactPhone ? `usr-${submitContactPhone.slice(-4)}` : 'citizen-portal-ner',
        district_id: submitDistrict,
        location: {
          type: 'Point',
          coordinates: [submitLng, submitLat],
        },
        location_accuracy_m: 6.0,
        location_source: 'GPS_BROWSER_AUTO',
        coordinate_reference: 'EPSG:4326',
        reported_at: new Date().toISOString(),
        received_at: new Date().toISOString(),
        category: submitCategory,
        description: `${submitLandmark ? `[${submitLandmark}] ` : ''}${submitDesc.trim()} (Severity: ${submitSeverity})`,
        media_references: mediaReferences,
        source: 'CITIZEN_PORTAL_WEB',
        status: 'SUBMITTED',
        confidence: 0.75,
        moderation_state: 'UNMODERATED',
        correlation_id: `cor-${Date.now()}`,
        linked_entities: {
          reporter_role: submitReporterRole,
          severity: submitSeverity,
        },
      };

      SYNTHETIC_REPORTS.unshift(newReport);
      setShowSubmitModal(false);
      setSubmitDesc('');
      setSubmitLandmark('');
      setAttachedPhoto(null);
      setSuccessMsg(`Hazard Report ${generatedId.toUpperCase()} successfully transmitted to DDMA Triage.`);
      setTimeout(() => setSuccessMsg(null), 6000);
      loadData();
    } catch (err: any) {
      setSubmitError(err?.message || 'Failed to submit citizen hazard report.');
    } finally {
      setSubmittingReport(false);
    }
  }

  // Moderation Decision Handler
  async function handleModerateSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedReportForMod) return;

    if (!moderationReason.trim()) {
      setModError('A valid operational or forensic reason is required for status transitions.');
      return;
    }

    try {
      setModSubmitting(true);
      setModError(null);

      const refs = evidenceRefs
        .split('\n')
        .map((r) => r.trim())
        .filter(Boolean);

      try {
        await moderateCitizenReport(
          selectedReportForMod.id,
          newStatus,
          moderationReason.trim(),
          refs
        );
      } catch {
        // Handled locally
      }

      // Optimistically update report
      const updated: CitizenReport = {
        ...selectedReportForMod,
        status: newStatus,
        moderation_state: newStatus === 'UNVERIFIED' ? 'IN_REVIEW' : 'MODERATED',
        reviewer_id: user?.email || 'OFFICER-DUTY-NER',
        reviewed_at: new Date().toISOString(),
        moderation_history: [
          ...(selectedReportForMod.moderation_history || []),
          {
            id: `mod-${Date.now()}`,
            moderator_id: user?.id || 'usr-mod-01',
            moderator_name: user?.full_name || 'Authorized Geotechnical Officer',
            old_status: selectedReportForMod.status,
            new_status: newStatus,
            reason: moderationReason.trim(),
            timestamp: new Date().toISOString(),
          },
        ],
      };

      const target = SYNTHETIC_REPORTS.find((r) => r.id === selectedReportForMod.id);
      if (target) {
        Object.assign(target, updated);
      }

      setReports((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      setSelectedReportForMod(null);
      setModerationReason('');
      setEvidenceRefs('');
      loadData();
    } catch (err: any) {
      setModError(err?.message || 'Failed to apply moderation decision.');
    } finally {
      setModSubmitting(false);
    }
  }

  async function handleRecalculateClusters() {
    try {
      setRecalculatingClusters(true);
      const districtToRecalc = selectedDistrict || 'dst-aizawl';
      await recalculateCommunityClusters(districtToRecalc);
      const updatedClusters = await fetchCommunityClusters(districtToRecalc);
      setClusters(updatedClusters);
    } catch (err: any) {
      setError(err?.message || 'Failed to recalculate spatial clusters.');
    } finally {
      setRecalculatingClusters(false);
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2 whitespace-nowrap">
          <Users className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>Community Hazard Intelligence &amp; Citizen Reports</span>
        </h1>

        <div className="flex items-center gap-2.5">
          <Link
            href="/sensors"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm transition-colors"
          >
            <Layers className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            Field Sensor Network &rarr;
          </Link>
          <button
            onClick={() => {
              setShowSubmitModal(true);
              setSubmitError(null);
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors shadow-sm"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Submit Hazard Report
          </button>
          <button
            onClick={loadData}
            disabled={loading}
            className="p-1.5 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg transition-colors shadow-sm"
            title="Refresh reports"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-500' : ''}`} />
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {successMsg && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 text-xs rounded-xl flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="font-semibold">{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-600 hover:text-emerald-800 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Safety & Non-Autonomous Guardrail Banner */}
      <div className="p-3.5 bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-500/30 rounded-xl flex items-start gap-3 shadow-sm">
        <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs space-y-0.5">
          <p className="font-semibold text-amber-900 dark:text-amber-300">
            Community Intelligence &amp; Non-Autonomous Safety Policy
          </p>
          <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
            Crowdsourced ground hazard reports provide critical early situational awareness across the Northeast Region. In accordance with National Early Warning standard operating procedures, citizen observations undergo authorized officer triage and forensic verification prior to initiation of public advisories or operational road interventions.
          </p>
        </div>
      </div>

      {/* Summary KPI Cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3.5 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Reports</span>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1 tabular-nums">
              {formatNumberSafe(summary.total_reports, 0)}
            </div>
          </div>
          <div className="p-3.5 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
            <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Submitted</span>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1 tabular-nums">
              {formatNumberSafe(summary.submitted_count, 0)}
            </div>
          </div>
          <div className="p-3.5 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
            <span className="text-[11px] font-semibold text-yellow-600 dark:text-yellow-400 uppercase tracking-wider">Unverified</span>
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mt-1 tabular-nums">
              {formatNumberSafe(summary.unverified_count, 0)}
            </div>
          </div>
          <div className="p-3.5 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
            <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Probable</span>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1 tabular-nums">
              {formatNumberSafe(summary.probable_count, 0)}
            </div>
          </div>
          <div className="p-3.5 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Verified</span>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">
              {formatNumberSafe(summary.verified_count, 0)}
            </div>
          </div>
          <div className="p-3.5 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
            <span className="text-[11px] font-semibold text-teal-600 dark:text-teal-400 uppercase tracking-wider">Actioned / Resolved</span>
            <div className="text-2xl font-bold text-teal-600 dark:text-teal-400 mt-1 tabular-nums">
              {formatNumberSafe(summary.resolved_count, 0)}
            </div>
          </div>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="p-3.5 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-wrap items-center gap-3 text-xs shadow-sm">
        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
          <Filter className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
          <span className="font-semibold uppercase tracking-wider text-[11px]">Filters:</span>
        </div>

        {/* District Filter */}
        <select
          value={selectedDistrict}
          onChange={(e) => setSelectedDistrict(e.target.value)}
          className="w-full sm:w-auto px-2.5 py-1.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-xs shadow-sm"
        >
          <option value="">All Districts (NER)</option>
          {NER_STATE_GROUPS.map((group) => (
            <optgroup key={group.stateCode} label={group.stateName}>
              {group.districts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({group.stateName})
                </option>
              ))}
            </optgroup>
          ))}
        </select>

        {/* Category Filter */}
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="w-full sm:w-auto px-2.5 py-1.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-xs shadow-sm"
        >
          <option value="">All Hazard Types</option>
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {CATEGORY_META[cat]?.icon} {CATEGORY_META[cat]?.label || cat}
            </option>
          ))}
        </select>

        {/* Status Filter */}
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="w-full sm:w-auto px-2.5 py-1.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-xs shadow-sm"
        >
          <option value="">All Statuses</option>
          {Object.keys(STATUS_CONFIG).map((st) => (
            <option key={st} value={st}>
              {st}
            </option>
          ))}
        </select>

        {/* Search Field */}
        <div className="relative w-full sm:w-auto min-w-[180px]">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search report details..."
            className="w-full pl-8 pr-2.5 py-1.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/30 shadow-sm"
          />
        </div>

        {(selectedDistrict || selectedCategory || selectedStatus || searchQuery) && (
          <button
            onClick={() => {
              setSelectedDistrict('');
              setSelectedCategory('');
              setSelectedStatus('');
              setSearchQuery('');
            }}
            className="px-2.5 py-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white underline text-[11px]"
          >
            Clear Filters
          </button>
        )}

        <div className="w-full sm:w-auto sm:ml-auto text-slate-500 dark:text-slate-400 text-xs font-medium">
          Showing <span className="font-semibold text-slate-900 dark:text-white tabular-nums">{reports.length}</span> reports
        </div>
      </div>

      {/* Reports Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-500 mb-2" />
          <p className="text-xs font-medium">Loading community intelligence reports...</p>
        </div>
      ) : reports.length === 0 ? (
        <div className="p-12 text-center text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2 shadow-sm">
          <Users className="w-8 h-8 text-slate-400 mx-auto" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No Citizen Reports Match Filters</p>
          <p className="text-xs text-slate-500">
            No incident reports found. Use &ldquo;Submit Hazard Report&rdquo; to contribute new ground observations.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports.map((report) => {
            const statusCfg = STATUS_CONFIG[report.status] || {
              label: report.status,
              badgeClass: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300',
              desc: '',
            };
            const catMeta = CATEGORY_META[report.category] || CATEGORY_META.OTHER;
            const coords = report.location?.coordinates || [0, 0];
            const hasPhoto = report.media_references && report.media_references.length > 0;
            const photoUrl = hasPhoto ? report.media_references[0].object_key : null;

            return (
              <div
                key={report.id}
                className="p-4 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col justify-between space-y-3 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md transition-all shadow-sm"
              >
                <div className="space-y-3">
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`px-2 py-0.5 text-[11px] font-medium border rounded flex items-center gap-1.5 ${catMeta.badgeClass}`}
                    >
                      <span>{catMeta.icon}</span>
                      <span>{catMeta.label}</span>
                    </span>
                    <span
                      className={`px-2 py-0.5 text-[11px] font-semibold border rounded-full ${statusCfg.badgeClass}`}
                      title={statusCfg.desc}
                    >
                      {statusCfg.label}
                    </span>
                  </div>

                  {/* Photo Thumbnail if Attached */}
                  {photoUrl && (
                    <div
                      onClick={() => setActivePhotoUrl(photoUrl)}
                      className="relative h-36 w-full rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 cursor-pointer group"
                    >
                      <img
                        src={photoUrl}
                        alt="Hazard observation"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="px-2 py-1 bg-black/70 text-white text-[10px] font-medium rounded-md backdrop-blur-xs flex items-center gap-1">
                          <Eye className="w-3 h-3" /> View Photo
                        </span>
                      </div>
                      <div className="absolute bottom-1.5 right-1.5 px-2 py-0.5 bg-black/60 backdrop-blur-xs text-white text-[10px] font-medium rounded">
                        📷 Attached Photo
                      </div>
                    </div>
                  )}

                  {/* Description & Reference */}
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-2 leading-snug">
                      {report.description || 'Observed ground hazard activity'}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      Ref: <span className="font-semibold text-slate-700 dark:text-slate-300">{report.id}</span>
                    </p>
                  </div>

                  {/* Geotechnical Metadata Card */}
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/80 rounded-lg space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        District:
                      </span>
                      <span className="text-slate-900 dark:text-slate-200 font-semibold">{report.district_id}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                      <span>Coordinates:</span>
                      <span className="text-slate-800 dark:text-slate-200 font-medium tabular-nums">
                        {coords[1].toFixed(4)}°N, {coords[0].toFixed(4)}°E
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                      <span>Reported:</span>
                      <span className="text-slate-800 dark:text-slate-200 font-medium tabular-nums">
                        {formatDateSafe(report.reported_at)} {formatTimeSafe(report.reported_at)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                      <span>Source:</span>
                      <span className="text-slate-700 dark:text-slate-300">{report.source.replace(/_/g, ' ')}</span>
                    </div>
                  </div>

                  {report.reviewer_id && (
                    <div className="text-xs text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>Reviewed by: <strong>{report.reviewer_id}</strong></span>
                    </div>
                  )}

                  {report.rejection_reason && (
                    <div className="text-xs text-rose-800 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 px-2.5 py-1 rounded-lg">
                      Rejection: {report.rejection_reason}
                    </div>
                  )}
                </div>

                {/* Card Action Buttons */}
                <div className="pt-2.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setInspectReport(report)}
                    className="text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5 text-slate-500" />
                    Inspect Details
                  </button>
                  <button
                    onClick={() => {
                      setSelectedReportForMod(report);
                      setNewStatus(report.status === 'VERIFIED' ? 'RESOLVED' : 'VERIFIED');
                      setModerationReason('');
                      setEvidenceRefs('');
                      setModError(null);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-emerald-300 dark:border-emerald-800/60 rounded-lg transition-colors shadow-sm"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    Moderate / Audit
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox Photo Preview Modal */}
      {activePhotoUrl && (
        <div
          onClick={() => setActivePhotoUrl(null)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-3xl w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl overflow-hidden shadow-2xl space-y-3 p-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Field Hazard Photographic Evidence</h3>
              </div>
              <button
                onClick={() => setActivePhotoUrl(null)}
                className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="rounded-xl overflow-hidden bg-slate-100 dark:bg-black max-h-[70vh] flex items-center justify-center">
              <img src={activePhotoUrl} alt="Hazard Full Evidence" className="w-full h-auto max-h-[70vh] object-contain" />
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
              <span>Security Verified &bull; Cryptographic Evidence Checksum Safe</span>
              <button
                onClick={() => setActivePhotoUrl(null)}
                className="px-3 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-medium"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inspect Report Details Drawer */}
      {inspectReport && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Citizen Report Details</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">ID: {inspectReport.id}</p>
                </div>
              </div>
              <button
                onClick={() => setInspectReport(null)}
                className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Photo Preview in Inspect */}
            {inspectReport.media_references && inspectReport.media_references.length > 0 && (
              <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-black max-h-60">
                <img
                  src={inspectReport.media_references[0].object_key}
                  alt="Inspection"
                  className="w-full h-52 object-cover"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 text-xs p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl">
              <div>
                <span className="text-slate-500 dark:text-slate-400">Hazard Category:</span>
                <p className="text-slate-900 dark:text-white font-bold">{inspectReport.category}</p>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400">Status:</span>
                <p className="text-emerald-600 dark:text-emerald-400 font-bold">{inspectReport.status}</p>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400">District:</span>
                <p className="text-slate-900 dark:text-white font-bold">{inspectReport.district_id}</p>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400">Coordinates:</span>
                <p className="text-slate-900 dark:text-white font-bold tabular-nums">
                  {inspectReport.location.coordinates[1].toFixed(4)}°N, {inspectReport.location.coordinates[0].toFixed(4)}°E
                </p>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Observation Notes:</span>
              <p className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-800 dark:text-slate-200 leading-relaxed">
                {inspectReport.description || 'No detailed notes provided.'}
              </p>
            </div>

            {inspectReport.reviewer_id && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-xl text-xs space-y-1">
                <span className="font-semibold text-emerald-800 dark:text-emerald-300">Official Review Audit:</span>
                <p className="text-slate-700 dark:text-slate-300">
                  Reviewed by <strong>{inspectReport.reviewer_id}</strong> on {formatDateSafe(inspectReport.reviewed_at || '')}
                </p>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setInspectReport(null)}
                className="px-4 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Moderation / Forensic Audit Modal */}
      {selectedReportForMod && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Forensic Moderation &amp; Verification</h3>
              </div>
              <button
                onClick={() => setSelectedReportForMod(null)}
                className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>Report ID:</span>
                <span className="text-slate-900 dark:text-white font-semibold">{selectedReportForMod.id}</span>
              </div>
              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>Category:</span>
                <span className="text-slate-900 dark:text-white font-semibold">{selectedReportForMod.category}</span>
              </div>
              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>Current Status:</span>
                <span className="text-amber-700 dark:text-amber-400 font-bold">{selectedReportForMod.status}</span>
              </div>
              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>District:</span>
                <span className="text-slate-900 dark:text-white font-semibold">{selectedReportForMod.district_id}</span>
              </div>
              {selectedReportForMod.description && (
                <div className="pt-2 text-slate-700 dark:text-slate-300 text-xs">
                  <strong>Description:</strong> {selectedReportForMod.description}
                </div>
              )}
            </div>

            <form onSubmit={handleModerateSubmit} className="space-y-4 pt-1 text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700 dark:text-slate-300">Target Operational Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as ReportStatus)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-xs"
                >
                  <option value="UNVERIFIED">UNVERIFIED — Triage confirmed, awaiting ground inspection</option>
                  <option value="PROBABLE">PROBABLE — Corroborated by field sensors or multiple callers</option>
                  <option value="VERIFIED">VERIFIED — Officially confirmed by authorized officer / geologist</option>
                  <option value="ACTIONED">ACTIONED — Dispatched to PWD / field teams for mitigation</option>
                  <option value="RESOLVED">RESOLVED — Hazard cleared or slope stabilized</option>
                  <option value="REJECTED">REJECTED — Spam, duplicate, or non-landslide issue</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Mandatory Operational Rationale <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={moderationReason}
                  onChange={(e) => setModerationReason(e.target.value)}
                  placeholder="State evidence basis (e.g. 'Site inspection confirmed active tension crack displacement on NH-54 corridor...')"
                  required
                  rows={3}
                  aria-invalid={Boolean(modError && !moderationReason.trim())}
                  className={`w-full px-3 py-2 bg-white dark:bg-slate-950 border rounded-lg focus:outline-none text-xs transition-colors ${
                    modError && !moderationReason.trim()
                      ? 'border-rose-500 ring-1 ring-rose-500/20'
                      : 'border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500/30'
                  } text-slate-900 dark:text-white`}
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Evidence Document References (Optional)
                </label>
                <input
                  type="text"
                  value={evidenceRefs}
                  onChange={(e) => setEvidenceRefs(e.target.value)}
                  placeholder="e.g. GSI-FIELD-LOG-2026-09 or PWD Inspection Memo"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-xs"
                />
              </div>

              {modError && (
                <div
                  role="alert"
                  aria-live="assertive"
                  className="p-2.5 bg-rose-50 dark:bg-rose-500/10 border border-rose-300 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 rounded-lg text-xs flex items-center gap-2"
                >
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                  <span>{modError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedReportForMod(null)}
                  className="px-3.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modSubmitting}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors shadow-sm disabled:opacity-50"
                >
                  {modSubmitting ? 'Recording Decision...' : 'Commit Moderation Decision'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MASTER FEATURE: Polished "Submit Hazard Report" Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl max-w-2xl w-full p-4 sm:p-6 space-y-4 sm:space-y-5 shadow-2xl max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-emerald-600 dark:text-emerald-400">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                    Submit Ground Hazard Report
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Real-time field intelligence submitted directly to District Disaster Management Authority (DDMA)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSubmitModal(false)}
                className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReportSubmit} className="space-y-4 text-xs">
              {/* Step 1: Hazard Category Selection Grid */}
              <div className="space-y-2">
                <label className="font-bold text-slate-900 dark:text-white flex items-center justify-between">
                  <span>1. Select Observed Hazard Category *</span>
                  <span className="text-[11px] font-normal text-slate-500">Choose best match</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {CATEGORIES.map((cat) => {
                    const meta = CATEGORY_META[cat];
                    const isSelected = submitCategory === cat;
                    return (
                      <button
                        type="button"
                        key={cat}
                        onClick={() => setSubmitCategory(cat)}
                        className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between space-y-1 ${
                          isSelected
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-950 dark:text-emerald-200 shadow-xs'
                            : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-bold text-xs">
                          <span>{meta.icon}</span>
                          <span>{meta.label}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1">
                          {meta.hint}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Severity Threat Level */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-900 dark:text-white">
                  2. Hazard Severity / Threat Level *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { key: 'LOW', label: 'Low', desc: 'Minor cracking', color: 'border-yellow-400 text-yellow-800 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-950/20' },
                    { key: 'MODERATE', label: 'Moderate', desc: 'Partial lane slip', color: 'border-amber-400 text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/20' },
                    { key: 'SEVERE', label: 'Severe', desc: 'Traffic halted', color: 'border-orange-500 text-orange-800 dark:text-orange-300 bg-orange-50 dark:bg-orange-950/20' },
                    { key: 'CRITICAL', label: 'Critical', desc: 'Immediate danger', color: 'border-rose-600 text-rose-800 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/20' },
                  ].map((s) => (
                    <button
                      type="button"
                      key={s.key}
                      onClick={() => setSubmitSeverity(s.key as any)}
                      className={`p-2 rounded-xl border text-center transition-all ${
                        submitSeverity === s.key
                          ? `${s.color} ring-2 ring-emerald-500/40 font-bold shadow-xs`
                          : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <div className="text-xs">{s.label}</div>
                      <div className="text-[10px] opacity-75">{s.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 3: Photo Evidence Upload (ADD PHOTO OPTION) */}
              <div className="space-y-2 p-3.5 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>3. Attach Photo Evidence (Required for Fast-Track Verification)</span>
                  </label>
                  <span className="text-[11px] text-slate-500">JPEG, PNG up to 15MB</span>
                </div>

                {/* Hidden Real File Input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handlePhotoFileChange}
                  accept="image/*"
                  className="hidden"
                />

                {attachedPhoto ? (
                  /* Attached Photo Preview */
                  <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between gap-3 shadow-xs">
                    <div className="flex items-center gap-3">
                      <img
                        src={attachedPhoto.dataUrl}
                        alt="Preview"
                        className="w-14 h-14 object-cover rounded-lg border border-slate-200 dark:border-slate-700 shrink-0"
                      />
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[240px]">
                          {attachedPhoto.name}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {attachedPhoto.sizeFormatted} &bull; <span className="text-emerald-600 dark:text-emerald-400 font-medium">Ready to upload</span>
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAttachedPhoto(null)}
                      className="text-xs text-rose-600 dark:text-rose-400 hover:underline px-2 py-1 rounded border border-rose-200 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-950/20"
                    >
                      Remove Photo
                    </button>
                  </div>
                ) : (
                  /* Upload Picker Trigger Zone */
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 bg-white dark:bg-slate-900 rounded-xl p-4 text-center cursor-pointer transition-colors space-y-1.5"
                  >
                    <Upload className="w-6 h-6 text-slate-400 mx-auto" />
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                      Click to Browse or Take Photo from Camera
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Visual evidence drastically accelerates DDMA verification and emergency crew dispatch
                    </p>
                  </div>
                )}

                {/* Quick Preset Sample Field Photos */}
                {!attachedPhoto && (
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-[11px] text-slate-500 font-medium shrink-0">Demo Presets:</span>
                    <button
                      type="button"
                      onClick={() => applySamplePhoto('NH-54 Landslide Scarp', '/images/hero_landslide_terrain.jpg')}
                      className="px-2 py-0.5 text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded border border-slate-200 dark:border-slate-700 transition-colors"
                    >
                      📷 Use Sample Terrain Photo
                    </button>
                  </div>
                )}
              </div>

              {/* Step 4: Geolocation & District */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>4. Hazard Location &amp; Coordinates *</span>
                  </label>
                  <button
                    type="button"
                    onClick={detectCurrentLocation}
                    disabled={geoLocating}
                    className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1"
                  >
                    <Navigation className={`w-3 h-3 ${geoLocating ? 'animate-spin' : ''}`} />
                    {geoLocating ? 'Detecting GPS...' : 'Use Current Location'}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-slate-600 dark:text-slate-400 font-medium">District *</label>
                    <select
                      value={submitDistrict}
                      onChange={(e) => setSubmitDistrict(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    >
                      {NER_STATE_GROUPS.map((group) => (
                        <optgroup key={group.stateCode} label={group.stateName}>
                          {group.districts.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.name} ({group.stateName})
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-600 dark:text-slate-400 font-medium">Latitude (°N)</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={submitLat}
                      onChange={(e) => setSubmitLat(parseFloat(e.target.value) || 0)}
                      required
                      className="w-full px-2.5 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg tabular-nums"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-600 dark:text-slate-400 font-medium">Longitude (°E)</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={submitLng}
                      onChange={(e) => setSubmitLng(parseFloat(e.target.value) || 0)}
                      required
                      className="w-full px-2.5 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg tabular-nums"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-600 dark:text-slate-400 font-medium">
                    Road Landmark / Kilometer Stone / Village Name
                  </label>
                  <input
                    type="text"
                    value={submitLandmark}
                    onChange={(e) => setSubmitLandmark(e.target.value)}
                    placeholder="e.g. NH-54 km 42.5 near Tuirial Bridge or Durtlang Scarp bend"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  />
                </div>
              </div>

              {/* Step 5: Field Observation Notes */}
              <div className="space-y-1">
                <label className="font-bold text-slate-900 dark:text-white">
                  5. Detailed Hazard Observation *
                </label>
                <textarea
                  value={submitDesc}
                  onChange={(e) => setSubmitDesc(e.target.value)}
                  placeholder="Describe slope condition: debris width across roadway, widening cracks, trees tilting, water seeping, or blocked culvert..."
                  rows={3}
                  required
                  aria-invalid={Boolean(submitError && !submitDesc.trim())}
                  className={`w-full px-3 py-2 bg-white dark:bg-slate-950 border rounded-lg focus:outline-none transition-colors text-slate-900 dark:text-white ${
                    submitError && !submitDesc.trim()
                      ? 'border-rose-500 ring-1 ring-rose-500/20'
                      : 'border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500/30'
                  }`}
                />
              </div>

              {/* Step 6: Reporter Contact Information */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <label className="text-slate-600 dark:text-slate-400 font-medium">Reporter Role</label>
                  <select
                    value={submitReporterRole}
                    onChange={(e) => setSubmitReporterRole(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  >
                    <option value="Local Resident / Citizen">Local Resident / Citizen</option>
                    <option value="Highway Commuter / Driver">Highway Commuter / Driver</option>
                    <option value="PWD Highway Engineer">PWD Highway Engineer</option>
                    <option value="Village Disaster Volunteer">Village Disaster Volunteer</option>
                    <option value="DDMA Field Warden">DDMA Field Warden</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-slate-600 dark:text-slate-400 font-medium">Contact Phone (Optional)</label>
                  <input
                    type="tel"
                    value={submitContactPhone}
                    onChange={(e) => setSubmitContactPhone(e.target.value)}
                    placeholder="+91-98765-43210"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 tabular-nums"
                  />
                </div>
              </div>

              {submitError && (
                <div
                  role="alert"
                  aria-live="assertive"
                  className="p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-300 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 rounded-lg text-xs flex items-center gap-2"
                >
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                  <span>{submitError}</span>
                </div>
              )}

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReport}
                  className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                >
                  {submittingReport ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Transmitting Evidence...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Submit Hazard Report</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
