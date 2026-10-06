import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Head from 'next/head';
import Link from 'next/link';
import { SignInButton, SignUpButton, useAuth, useUser } from '@clerk/nextjs';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  Globe2,
  Mail,
  MessageCircle,
  MapPin,
  Phone,
  ShieldCheck,
  UploadCloud,
} from 'lucide-react';
import toast from 'react-hot-toast';

const plans = [
  {
    id: '14-day',
    name: 'Professional',
    duration: '14 Days',
    price: 17999,
    badge: 'Most Popular',
    popular: true,
  },
  {
    id: '30-day',
    name: 'Elite',
    duration: '30 Days',
    price: 52499,
    badge: 'Elite',
  },
];

const sponsorBankDetails = {
  bank: 'Scotiabank Jamaica',
  accountName: 'Dosnine Limited',
  accountNumber: '000991881',
  branch: '50575',
  accountType: 'Business Savings',
};

const categories = [
  // ---------- AGENTS & BROKERS (1-18) ----------
  { value: 'realtor', label: 'Realtor' },
  { value: 'real_estate_agent', label: 'Real Estate Agent' },
  { value: 'real_estate_broker', label: 'Real Estate Broker' },
  { value: 'associate_broker', label: 'Associate Broker' },
  { value: 'buyers_agent', label: "Buyer's Agent" },
  { value: 'sellers_agent', label: "Seller's Agent" },
  { value: 'listing_agent', label: 'Listing Agent' },
  { value: 'leasing_agent', label: 'Leasing Agent' },
  { value: 'rental_agent', label: 'Rental Agent' },
  { value: 'commercial_agent', label: 'Commercial Real Estate Agent' },
  { value: 'residential_agent', label: 'Residential Real Estate Agent' },
  { value: 'luxury_agent', label: 'Luxury Real Estate Agent' },
  { value: 'land_agent', label: 'Land Agent' },
  { value: 'vacation_rental_agent', label: 'Vacation Rental Agent' },
  { value: 'short_term_rental_manager', label: 'Short-Term Rental Manager' },
  { value: 'referral_agent', label: 'Referral Agent' },
  { value: 'transaction_coordinator', label: 'Transaction Coordinator' },
  { value: 'real_estate_assistant', label: 'Real Estate Assistant' },

  // ---------- PROPERTY MANAGEMENT (19-34) ----------
  { value: 'property_manager', label: 'Property Manager' },
  { value: 'residential_property_manager', label: 'Residential Property Manager' },
  { value: 'commercial_property_manager', label: 'Commercial Property Manager' },
  { value: 'hoa_manager', label: 'HOA Manager' },
  { value: 'strata_manager', label: 'Strata Manager' },
  { value: 'condo_manager', label: 'Condo Manager' },
  { value: 'apartment_manager', label: 'Apartment Manager' },
  { value: 'building_manager', label: 'Building Manager' },
  { value: 'facility_manager', label: 'Facility Manager' },
  { value: 'estate_manager', label: 'Estate Manager' },
  { value: 'asset_manager', label: 'Asset Manager' },
  { value: 'portfolio_manager', label: 'Portfolio Manager' },
  { value: 'leasing_manager', label: 'Leasing Manager' },
  { value: 'tenant_relations_manager', label: 'Tenant Relations Manager' },
  { value: 'resident_manager', label: 'Resident Manager' },
  { value: 'vacation_property_manager', label: 'Vacation Property Manager' },

  // ---------- LEGAL & TITLE (35-52) ----------
  { value: 'attorney', label: 'Attorney' },
  { value: 'real_estate_attorney', label: 'Real Estate Attorney' },
  { value: 'conveyancer', label: 'Conveyancer' },
  { value: 'title_agent', label: 'Title Agent' },
  { value: 'title_examiner', label: 'Title Examiner' },
  { value: 'title_officer', label: 'Title Officer' },
  { value: 'escrow_officer', label: 'Escrow Officer' },
  { value: 'notary', label: 'Notary Public' },
  { value: 'paralegal', label: 'Real Estate Paralegal' },
  { value: 'closing_agent', label: 'Closing Agent' },
  { value: 'settlement_agent', label: 'Settlement Agent' },
  { value: 'land_use_attorney', label: 'Land Use Attorney' },
  { value: 'zoning_consultant', label: 'Zoning Consultant' },
  { value: 'probate_attorney', label: 'Probate Attorney' },
  { value: 'estate_planning_attorney', label: 'Estate Planning Attorney' },
  { value: 'tax_attorney', label: 'Real Estate Tax Attorney' },
  { value: 'immigration_attorney', label: 'Immigration Attorney (Property)' },
  { value: 'legal_document_preparer', label: 'Legal Document Preparer' },

  // ---------- FINANCE & LENDING (53-76) ----------
  { value: 'mortgage', label: 'Mortgage Broker' },
  { value: 'mortgage_banker', label: 'Mortgage Banker' },
  { value: 'mortgage_lender', label: 'Mortgage Lender' },
  { value: 'loan_officer', label: 'Loan Officer' },
  { value: 'loan_processor', label: 'Loan Processor' },
  { value: 'loan_underwriter', label: 'Loan Underwriter' },
  { value: 'credit_analyst', label: 'Credit Analyst' },
  { value: 'mortgage_consultant', label: 'Mortgage Consultant' },
  { value: 'reverse_mortgage_specialist', label: 'Reverse Mortgage Specialist' },
  { value: 'hard_money_lender', label: 'Hard Money Lender' },
  { value: 'private_lender', label: 'Private Lender' },
  { value: 'bridge_loan_specialist', label: 'Bridge Loan Specialist' },
  { value: 'construction_lender', label: 'Construction Lender' },
  { value: 'commercial_lender', label: 'Commercial Real Estate Lender' },
  { value: 'financial_advisor', label: 'Financial Advisor' },
  { value: 'investment_advisor', label: 'Real Estate Investment Advisor' },
  { value: 'wealth_manager', label: 'Wealth Manager' },
  { value: 'accountant', label: 'Real Estate Accountant' },
  { value: 'tax_advisor', label: 'Real Estate Tax Advisor' },
  { value: 'bookkeeper', label: 'Real Estate Bookkeeper' },
  { value: 'crowdfunding_manager', label: 'Real Estate Crowdfunding Manager' },
  { value: 'reit_analyst', label: 'REIT Analyst' },
  { value: 'syndication_manager', label: 'Real Estate Syndication Manager' },
  { value: '1031_exchange_specialist', label: '1031 Exchange Specialist' },

  // ---------- INSPECTION & APPRAISAL (77-96) ----------
  { value: 'home_inspection', label: 'Home Inspector' },
  { value: 'commercial_inspector', label: 'Commercial Building Inspector' },
  { value: 'roof_inspector', label: 'Roof Inspector' },
  { value: 'foundation_inspector', label: 'Foundation Inspector' },
  { value: 'mold_inspector', label: 'Mold Inspector' },
  { value: 'asbestos_inspector', label: 'Asbestos Inspector' },
  { value: 'lead_paint_inspector', label: 'Lead Paint Inspector' },
  { value: 'radon_inspector', label: 'Radon Inspector' },
  { value: 'sewer_inspector', label: 'Sewer Scope Inspector' },
  { value: 'chimney_inspector', label: 'Chimney Inspector' },
  { value: 'pool_inspector', label: 'Pool Inspector' },
  { value: 'termite_inspector', label: 'Termite Inspector' },
  { value: 'appraiser', label: 'Property Appraiser' },
  { value: 'residential_appraiser', label: 'Residential Appraiser' },
  { value: 'commercial_appraiser', label: 'Commercial Appraiser' },
  { value: 'land_appraiser', label: 'Land Appraiser' },
  { value: 'review_appraiser', label: 'Review Appraiser' },
  { value: 'energy_auditor', label: 'Energy Auditor' },
  { value: 'surveyor', label: 'Surveyor' },
  { value: 'land_surveyor', label: 'Land Surveyor' },

  // ---------- CONSTRUCTION & TRADES (97-140) ----------
  { value: 'contractor', label: 'Contractor' },
  { value: 'general_contractor', label: 'General Contractor' },
  { value: 'building_contractor', label: 'Building Contractor' },
  { value: 'remodeling_contractor', label: 'Remodeling Contractor' },
  { value: 'roofing_contractor', label: 'Roofing Contractor' },
  { value: 'concrete_contractor', label: 'Concrete Contractor' },
  { value: 'masonry_contractor', label: 'Masonry Contractor' },
  { value: 'framing_contractor', label: 'Framing Contractor' },
  { value: 'drywall_contractor', label: 'Drywall Contractor' },
  { value: 'painting_contractor', label: 'Painting Contractor' },
  { value: 'flooring_contractor', label: 'Flooring Contractor' },
  { value: 'tiling_contractor', label: 'Tiling Contractor' },
  { value: 'cabinet_maker', label: 'Cabinet Maker' },
  { value: 'carpenter', label: 'Carpenter' },
  { value: 'woodworker', label: 'Woodworker' },
  { value: 'welder', label: 'Welder' },
  { value: 'steel_contractor', label: 'Steel Contractor' },
  { value: 'electrician', label: 'Electrician' },
  { value: 'master_electrician', label: 'Master Electrician' },
  { value: 'plumber', label: 'Plumber' },
  { value: 'master_plumber', label: 'Master Plumber' },
  { value: 'hvac_technician', label: 'HVAC Technician' },
  { value: 'ac', label: 'Air Conditioning Company' },
  { value: 'refrigeration_tech', label: 'Refrigeration Technician' },
  { value: 'glazier', label: 'Glazier' },
  { value: 'window_installer', label: 'Window Installer' },
  { value: 'door_installer', label: 'Door Installer' },
  { value: 'garage_door_tech', label: 'Garage Door Technician' },
  { value: 'locksmith', label: 'Locksmith' },
  { value: 'security_system_installer', label: 'Security System Installer' },
  { value: 'gate_installer', label: 'Gate Installer' },
  { value: 'fence_installer', label: 'Fence Installer' },
  { value: 'ironworker', label: 'Ironworker' },
  { value: 'stone_mason', label: 'Stone Mason' },
  { value: 'plasterer', label: 'Plasterer' },
  { value: 'insulation_contractor', label: 'Insulation Contractor' },
  { value: 'waterproofing_contractor', label: 'Waterproofing Contractor' },
  { value: 'demolition_contractor', label: 'Demolition Contractor' },
  { value: 'excavation_contractor', label: 'Excavation Contractor' },
  { value: 'paving_contractor', label: 'Paving Contractor' },
  { value: 'septic_installer', label: 'Septic System Installer' },
  { value: 'well_driller', label: 'Well Driller' },
  { value: 'scaffolding_company', label: 'Scaffolding Company' },
  { value: 'crane_service', label: 'Crane Service' },

  // ---------- DESIGN & ARCHITECTURE (141-162) ----------
  { value: 'architect', label: 'Architect' },
  { value: 'residential_architect', label: 'Residential Architect' },
  { value: 'commercial_architect', label: 'Commercial Architect' },
  { value: 'landscape_architect', label: 'Landscape Architect' },
  { value: 'interior_designer', label: 'Interior Designer' },
  { value: 'interior_decorator', label: 'Interior Decorator' },
  { value: 'structural_engineer', label: 'Structural Engineer' },
  { value: 'civil_engineer', label: 'Civil Engineer' },
  { value: 'mechanical_engineer', label: 'Mechanical Engineer' },
  { value: 'electrical_engineer', label: 'Electrical Engineer' },
  { value: 'geotechnical_engineer', label: 'Geotechnical Engineer' },
  { value: 'environmental_engineer', label: 'Environmental Engineer' },
  { value: 'urban_planner', label: 'Urban Planner' },
  { value: 'town_planner', label: 'Town Planner' },
  { value: 'draftsperson', label: 'Draftsperson' },
  { value: 'cad_designer', label: 'CAD Designer' },
  { value: '3d_renderer', label: '3D Renderer' },
  { value: 'bim_specialist', label: 'BIM Specialist' },
  { value: 'kitchen_designer', label: 'Kitchen Designer' },
  { value: 'bathroom_designer', label: 'Bathroom Designer' },
  { value: 'lighting_designer', label: 'Lighting Designer' },
  { value: 'feng_shui_consultant', label: 'Feng Shui Consultant' },

  // ---------- LANDSCAPING & OUTDOOR (163-180) ----------
  { value: 'landscaper', label: 'Landscaper' },
  { value: 'gardener', label: 'Gardener' },
  { value: 'lawn_care', label: 'Lawn Care Service' },
  { value: 'tree_surgeon', label: 'Tree Surgeon' },
  { value: 'arborist', label: 'Arborist' },
  { value: 'irrigation_specialist', label: 'Irrigation Specialist' },
  { value: 'hardscaper', label: 'Hardscaper' },
  { value: 'pool_builder', label: 'Pool Builder' },
  { value: 'pool_service', label: 'Pool Service' },
  { value: 'outdoor_kitchen_builder', label: 'Outdoor Kitchen Builder' },
  { value: 'deck_builder', label: 'Deck Builder' },
  { value: 'patio_contractor', label: 'Patio Contractor' },
  { value: 'pergola_builder', label: 'Pergola Builder' },
  { value: 'outdoor_lighting', label: 'Outdoor Lighting Specialist' },
  { value: 'fence_and_gate', label: 'Fence & Gate Company' },
  { value: 'driveway_contractor', label: 'Driveway Contractor' },
  { value: 'pest_control', label: 'Pest Control' },
  { value: 'wildlife_removal', label: 'Wildlife Removal Service' },

  // ---------- FURNITURE & HOME GOODS (181-196) ----------
  { value: 'furniture_store', label: 'Furniture Store' },
  { value: 'mattress_store', label: 'Mattress Store' },
  { value: 'appliance_store', label: 'Appliance Store' },
  { value: 'hardware_store', label: 'Hardware Store' },
  { value: 'home_goods_store', label: 'Home Goods Store' },
  { value: 'lighting_store', label: 'Lighting Store' },
  { value: 'tile_store', label: 'Tile Store' },
  { value: 'flooring_store', label: 'Flooring Store' },
  { value: 'paint_store', label: 'Paint Store' },
  { value: 'window_treatment_store', label: 'Window Treatment Store' },
  { value: 'rug_store', label: 'Rug & Carpet Store' },
  { value: 'kitchen_cabinet_store', label: 'Kitchen Cabinet Store' },
  { value: 'countertop_supplier', label: 'Countertop Supplier' },
  { value: 'appliance_repair', label: 'Appliance Repair' },
  { value: 'electronics_installer', label: 'Home Electronics Installer' },
  { value: 'smart_home_installer', label: 'Smart Home Installer' },

  // ---------- MOVING & STORAGE (197-208) ----------
  { value: 'mover', label: 'Mover' },
  { value: 'local_mover', label: 'Local Moving Company' },
  { value: 'long_distance_mover', label: 'Long-Distance Mover' },
  { value: 'international_mover', label: 'International Mover' },
  { value: 'packing_service', label: 'Packing Service' },
  { value: 'storage_facility', label: 'Storage Facility' },
  { value: 'climate_controlled_storage', label: 'Climate-Controlled Storage' },
  { value: 'self_storage', label: 'Self-Storage' },
  { value: 'junk_removal', label: 'Junk Removal' },
  { value: 'estate_cleanout', label: 'Estate Cleanout Service' },
  { value: 'furniture_assembly', label: 'Furniture Assembly Service' },
  { value: 'piano_mover', label: 'Piano Mover' },

  // ---------- UTILITIES & SERVICES (209-224) ----------
  { value: 'solar', label: 'Solar Company' },
  { value: 'solar_installer', label: 'Solar Panel Installer' },
  { value: 'battery_installer', label: 'Battery Storage Installer' },
  { value: 'generator_installer', label: 'Generator Installer' },
  { value: 'water_treatment', label: 'Water Treatment Service' },
  { value: 'water_softener', label: 'Water Softener Installer' },
  { value: 'plumbing_supply', label: 'Plumbing Supply Store' },
  { value: 'electrical_supply', label: 'Electrical Supply Store' },
  { value: 'gas_supplier', label: 'Gas Supplier' },
  { value: 'propane_delivery', label: 'Propane Delivery' },
  { value: 'internet_provider', label: 'Internet Service Provider' },
  { value: 'cable_installer', label: 'Cable Installer' },
  { value: 'security_monitoring', label: 'Security Monitoring Company' },
  { value: 'trash_removal', label: 'Trash Removal Service' },
  { value: 'recycling_service', label: 'Recycling Service' },
  { value: 'septic_service', label: 'Septic Tank Service' },

  // ---------- MAINTENANCE & REPAIR (225-244) ----------
  { value: 'handyman', label: 'Handyman' },
  { value: 'maintenance_company', label: 'Property Maintenance Company' },
  { value: 'janitorial_service', label: 'Janitorial Service' },
  { value: 'cleaning_service', label: 'Cleaning Service' },
  { value: 'deep_cleaning', label: 'Deep Cleaning Service' },
  { value: 'carpet_cleaning', label: 'Carpet Cleaning' },
  { value: 'window_cleaning', label: 'Window Cleaning' },
  { value: 'pressure_washing', label: 'Pressure Washing' },
  { value: 'gutter_cleaning', label: 'Gutter Cleaning' },
  { value: 'chimney_sweep', label: 'Chimney Sweep' },
  { value: 'duct_cleaning', label: 'Air Duct Cleaning' },
  { value: 'roof_repair', label: 'Roof Repair Service' },
  { value: 'waterproofing_service', label: 'Waterproofing Service' },
  { value: 'mold_remediation', label: 'Mold Remediation' },
  { value: 'fire_damage_restoration', label: 'Fire Damage Restoration' },
  { value: 'water_damage_restoration', label: 'Water Damage Restoration' },
  { value: 'general_repair', label: 'General Repair Service' },
  { value: 'drywall_repair', label: 'Drywall Repair' },
  { value: 'paint_touchup', label: 'Paint Touch-Up Service' },
  { value: 'floor_refinishing', label: 'Floor Refinishing' },

  // ---------- TECHNOLOGY, MARKETING & OTHER (245-250) ----------
  { value: 'real_estate_photographer', label: 'Real Estate Photographer' },
  { value: 'drone_photographer', label: 'Drone Photographer' },
  { value: 'virtual_tour_provider', label: 'Virtual Tour Provider' },
  { value: 'property_marketing_agency', label: 'Property Marketing Agency' },
  { value: 'stager', label: 'Home Stager' },
  { value: 'other', label: 'Other' },
];

const formatMoney = (value) => `J$${Number(value || 0).toLocaleString()}`;
const DEFAULT_AD_PLAN_PRICES = { '14-day': 17999, '30-day': 52499 };

const MAX_IMAGE_SIZE_KB = 250;
const MONTHLY_VISITORS = '57K+';
const SPOTS_TOTAL = 40;

const STORAGE_KEY = 'dosnine:ad-submission';
const STORAGE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const isValidSubmissionId = (value) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || '').trim()
  );

const normalizeWebsite = (value) => {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
};

const isValidWebsite = (value) => {
  if (!value) return true;
  const normalized = normalizeWebsite(value);
  try {
    const url = new URL(normalized);
    return url.hostname.includes('.') && !/\s/.test(url.hostname);
  } catch {
    return false;
  }
};

/* -------------------- Persistence helpers -------------------- */

const persistSubmission = (data) => {
  try {
    const payload = JSON.stringify({ ...data, savedAt: Date.now() });
    localStorage.setItem(STORAGE_KEY, payload);
  } catch (error) {
    console.error('Failed to persist submission:', error);
  }
};

const loadPersistedSubmission = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.savedAt || Date.now() - parsed.savedAt > STORAGE_TTL_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

const clearPersistedSubmission = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* noop */
  }
};

/* -------------------- Image processing -------------------- */

const cropAndCompressAdImage = async (
  file,
  outputSize = 1200,
  maxBytes = MAX_IMAGE_SIZE_KB * 1024
) => {
  const image = await new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Invalid image file.'));
    };
    img.src = objectUrl;
  });

  const cropSize = Math.min(image.width, image.height);
  const startX = (image.width - cropSize) / 2;
  const startY = (image.height - cropSize) / 2;

  const canvas = document.createElement('canvas');
  canvas.width = outputSize;
  canvas.height = outputSize;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Unable to process image.');

  context.fillStyle = '#f8fafc';
  context.fillRect(0, 0, outputSize, outputSize);
  context.drawImage(image, startX, startY, cropSize, cropSize, 0, 0, outputSize, outputSize);

  const blobToFile = (blob) =>
    new File([blob], `${(file.name || 'ad-image').replace(/\.[^.]+$/, '')}.webp`, {
      type: 'image/webp',
    });

  let quality = 0.82;
  let outputBlob = null;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    outputBlob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error('Image compression failed.'));
          resolve(blob);
        },
        'image/webp',
        quality
      );
    });
    if (outputBlob.size <= maxBytes || quality <= 0.38) break;
    quality -= 0.12;
  }
  return blobToFile(outputBlob || new Blob([], { type: 'image/webp' }));
};

const compressImageFiles = async (files) => {
  const compressedFiles = [];
  for (const file of files) {
    if (!file) continue;
    try {
      compressedFiles.push(await cropAndCompressAdImage(file));
    } catch (error) {
      console.error('Image compression failed:', error);
      compressedFiles.push(file);
    }
  }
  return compressedFiles;
};

export default function AdvertisePage() {
  const { user, isSignedIn } = useUser();
  const { getToken } = useAuth();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [copied, setCopied] = useState('');
  const [submissionId, setSubmissionId] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('unpaid');
  const [submissionStatus, setSubmissionStatus] = useState('pending_payment');
  const [receiptSubmittedAt, setReceiptSubmittedAt] = useState('');
  const [receiptFile, setReceiptFile] = useState(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const receiptInputRef = useRef(null);
  const [planPrices, setPlanPrices] = useState(DEFAULT_AD_PLAN_PRICES);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [spotsLeft, setSpotsLeft] = useState(null);
  const [availabilityError, setAvailabilityError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [restoredFromStorage, setRestoredFromStorage] = useState(false);
  const [form, setForm] = useState({
    company_name: '',
    business_logo: '',
    title: '',
    category: 'contractor',
    description: '',
    phone: '',
    whatsapp: '',
    email: user?.primaryEmailAddress?.emailAddress || '',
    website: '',
    contact_name: '',
    location: '',
    plan_id: '14-day',
    is_featured: false,
  });

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.id === form.plan_id) || plans[0],
    [form.plan_id]
  );

  const totalAmount = Number(planPrices[selectedPlan.id] || selectedPlan.price);
  /* -------------------- Restore on mount -------------------- */
  useEffect(() => {
    const persisted = loadPersistedSubmission();
    if (isValidSubmissionId(persisted?.submissionId)) {
      setSubmissionId(persisted.submissionId);
      setPaymentStatus(persisted.paymentStatus || 'unpaid');
      setSubmissionStatus(persisted.submissionStatus || 'pending_payment');
      setReceiptSubmittedAt(persisted.receiptSubmittedAt || '');
      if (persisted.form) {
        setForm((prev) => ({ ...prev, ...persisted.form }));
      }
      setStep(2);
      setRestoredFromStorage(true);
      toast.success('Welcome back — pick up where you left off.');
    } else if (persisted) {
      clearPersistedSubmission();
      toast.error('Your saved ad submission is missing a valid ID. Please submit your ad again.');
    }
  }, []);

  useEffect(() => {
    let active = true;
    const loadAvailability = async () => {
      try {
        const response = await fetch('/api/sponsors/availability', { cache: 'no-store' });
        const payload = await response.json();
        if (!response.ok || !payload?.success) {
          throw new Error(payload?.error || 'Unable to load sponsor availability.');
        }
        if (!active) return;
        setSpotsLeft(payload.available);
        setPlanPrices({ ...DEFAULT_AD_PLAN_PRICES, ...payload.adPlanPrices });
        setAvailabilityError('');
      } catch (error) {
        if (!active) return;
        console.error('Failed to load sponsor availability:', error);
        setAvailabilityError(error.message || 'Unable to load monthly ad capacity.');
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') loadAvailability();
    };
    loadAvailability();
    const interval = window.setInterval(loadAvailability, 30000);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      active = false;
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (!isSignedIn) {
      sessionStorage.setItem('redirectAfterSignIn', '/advertise');
      return;
    }
    if (user?.primaryEmailAddress?.emailAddress && !form.email) {
      setForm((prev) => ({ ...prev, email: user.primaryEmailAddress.emailAddress }));
    }
  }, [user, form.email, isSignedIn]);

  useEffect(() => {
    return () => {
      imagePreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [imagePreviews]);

  const requireSignIn = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('redirectAfterSignIn', '/advertise');
    }
  };

  const copyToClipboard = async (value, key) => {
    try {
      await navigator.clipboard.writeText(String(value));
      setCopied(key);
      toast.success('Copied');
      setTimeout(() => setCopied(''), 1800);
    } catch {
      toast.error('Unable to copy.');
    }
  };

  const clearFieldError = (field) => {
    setFieldErrors((previous) => {
      if (!previous[field]) return previous;
      const next = { ...previous };
      delete next[field];
      return next;
    });
  };

  const getFieldClassName = (field, baseClassName) =>
    `${baseClassName} ${fieldErrors[field] ? 'border-red-500 bg-red-50 focus:border-red-500' : ''}`;

  const handleStartOver = () => {
    if (
      receiptSubmittedAt &&
      !window.confirm(
        'Your submitted receipt and current ad submission will remain under review, but will not be canceled. Start a separate ad submission?'
      )
    ) {
      return;
    }

    clearPersistedSubmission();
    setSubmissionId('');
    setPaymentStatus('unpaid');
    setSubmissionStatus('pending_payment');
    setReceiptSubmittedAt('');
    setReceiptFile(null);
    setStep(1);
    setRestoredFromStorage(false);
    setSubmitError('');
    setFieldErrors({});
    setSaveStatus('');
    setForm((prev) => ({
      ...prev,
      company_name: '',
      title: '',
      description: '',
      phone: '',
      whatsapp: '',
      website: '',
      contact_name: '',
      location: '',
    }));
    setImageFiles([]);
    setImagePreviews([]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast('Starting a new ad submission.');
  };

  const finishReviewedSubmission = useCallback((status) => {
    clearPersistedSubmission();
    setSubmissionId('');
    setPaymentStatus('unpaid');
    setSubmissionStatus('pending_payment');
    setReceiptSubmittedAt('');
    setReceiptFile(null);
    setStep(1);
    setRestoredFromStorage(false);
    setSubmitError('');
    setFieldErrors({});
    setSaveStatus('');
    setForm((previous) => ({
      ...previous,
      company_name: '',
      title: '',
      description: '',
      phone: '',
      whatsapp: '',
      website: '',
      contact_name: '',
      location: '',
    }));
    setImageFiles([]);
    setImagePreviews([]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast.success(
      status === 'approved'
        ? 'Your ad was approved. You can submit another ad now.'
        : 'Your ad was rejected. You can submit a new ad now.'
    );
  }, []);

  const onSubmit = async (event) => {
    event.preventDefault();
    if (!isSignedIn) {
      requireSignIn();
      return;
    }

    const errors = {};
    if (!String(form.company_name || '').trim()) errors.company_name = 'Enter your business name.';
    if (!String(form.phone || '').trim()) errors.phone = 'Enter a phone number customers can use.';
    if (!String(form.description || '').trim()) errors.description = 'Describe your services.';
    if (!String(form.location || '').trim()) errors.location = 'Enter the area where you serve customers.';
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email.trim())) errors.email = 'Enter a valid email address.';
    if (form.website && !isValidWebsite(form.website)) {
      errors.website = 'Enter a valid website, e.g. example.com or https://example.com.';
    }
    if (imageFiles.length === 0) errors.imageFiles = 'Upload at least 1 image for your advertisement.';

    setFieldErrors(errors);
    setSubmitError(Object.keys(errors).length > 0 ? 'Please fix the highlighted fields before continuing.' : '');

    if (Object.keys(errors).length > 0) {
      const firstField = Object.keys(errors)[0];
      const fieldElement = document.getElementById(`ad-${firstField}`);
      fieldElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      fieldElement?.focus({ preventScroll: true });
      toast.error(errors[firstField]);
      return;
    }

    setSaveStatus('Saving your ad details...');
    setSubmitting(true);

    try {
      const toastId = toast.loading('Cropping to square and storing images…');
      setSaveStatus('Processing and saving images...');
      const compressedFiles = await compressImageFiles(imageFiles);
      toast.dismiss(toastId);

      const uploadedImageUrls = [];
      setSaveStatus('Uploading images...');

      for (const file of compressedFiles) {
        const uploadResponse = await fetch('/api/sponsors/upload-images', {
          method: 'POST',
          headers: { 'Content-Type': file.type || 'image/webp' },
          body: file,
        });
        const uploadPayload = await uploadResponse.json();
        if (!uploadResponse.ok || !uploadPayload?.success || !uploadPayload?.image_url) {
          throw new Error(uploadPayload?.error || 'Image upload failed.');
        }
        uploadedImageUrls.push(uploadPayload.image_url);
      }

      setSaveStatus('Saving your ad request...');

      const submissionPayload = {
        ...form,
        website: normalizeWebsite(form.website),
        email: form.email || user?.primaryEmailAddress?.emailAddress || 'no-email@dosnine.local',
        image_url: uploadedImageUrls[0] || null,
        image_urls: uploadedImageUrls,
        is_featured: Boolean(selectedPlan.id === '14-day' || selectedPlan.id === '30-day'),
      };

      const token = await getToken();
      const response = await fetch('/api/sponsors/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(submissionPayload),
      });

      let payload = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || `Unable to submit ad request. Server returned ${response.status}.`);
      }

      const newId = String(payload.id || '').trim();
      if (!isValidSubmissionId(newId)) {
        throw new Error('Your ad was not assigned a valid submission ID. Please try submitting it again.');
      }
      setSubmissionId(newId);
      setPaymentStatus('unpaid');
      setSubmissionStatus('pending_payment');
      setReceiptSubmittedAt('');
      setReceiptFile(null);
      setSaveStatus('Saved. Preparing payment step...');

      persistSubmission({
        submissionId: newId,
        paymentStatus: 'unpaid',
        submissionStatus: 'pending_payment',
        planId: selectedPlan.id,
        form: submissionPayload,
        imageUrls: uploadedImageUrls,
      });

      setStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      toast.success('Ad request submitted. Complete the bank transfer and send your receipt.');
    } catch (error) {
      const message = error?.message || 'Unable to submit ad request.';
      setSubmitError(message);
      setSaveStatus('');
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const refreshPaymentStatus = async () => {
    if (!submissionId || checkingPayment) return;
    setCheckingPayment(true);
    try {
      const token = await getToken();
      const response = await fetch(
        `/api/sponsors/payment-status?submission_id=${encodeURIComponent(submissionId)}`,
        {
          headers: token ? { Authorization: 'Bearer ' + token } : {},
        }
      );
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Unable to check payment status.');
      }
      setPaymentStatus(payload.paymentStatus || 'unpaid');
      setSubmissionStatus(payload.status || 'pending_payment');
      setReceiptSubmittedAt(payload.receiptSubmittedAt || '');
      if (payload.status === 'approved' || payload.status === 'rejected') {
        finishReviewedSubmission(payload.status);
        return;
      }
      if (payload.paymentStatus === 'paid') {
        const savedSubmission = loadPersistedSubmission();
        if (savedSubmission?.submissionId === submissionId) {
          persistSubmission({
            ...savedSubmission,
            paymentStatus: 'paid',
            submissionStatus: payload.status,
          });
        }
        toast.success(
          payload.status === 'waitlisted'
            ? 'Payment confirmed. Your ad is waitlisted for a future month.'
            : 'Payment confirmed. Your ad is waiting for review.'
        );
      } else if (payload.receiptSubmittedAt) {
        toast(
          'Your receipt is received. Bank processing times vary, so payment may take a few business days to appear.'
        );
      } else {
        toast(
          'Payment is not confirmed yet. Bank processing times vary; check the status again once the transfer has had time to appear.'
        );
      }
    } catch (error) {
      toast.error(error.message || 'Unable to check payment status.');
    } finally {
      setCheckingPayment(false);
    }
  };

  const submitPaymentReceipt = async () => {
    if (!isValidSubmissionId(submissionId) || !receiptFile || uploadingReceipt) return;
    setUploadingReceipt(true);
    try {
      const token = await getToken();
      const body = new FormData();
      body.append('submission_id', submissionId);
      body.append('receipt', receiptFile);
      const response = await fetch('/api/sponsors/payment-receipt', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body,
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Unable to submit payment receipt.');
      }
      const submittedAt = payload.receiptSubmittedAt || new Date().toISOString();
      setReceiptSubmittedAt(submittedAt);
      setSubmissionStatus('pending_payment');
      setReceiptFile(null);
      if (receiptInputRef.current) receiptInputRef.current.value = '';
      const savedSubmission = loadPersistedSubmission();
      if (savedSubmission?.submissionId === submissionId) {
        persistSubmission({
          ...savedSubmission,
          receiptSubmittedAt: submittedAt,
          submissionStatus: 'pending_payment',
        });
      }
      toast.success(
        'Receipt submitted. Bank processing times vary; we will verify payment once the transfer appears.'
      );
    } catch (error) {
      toast.error(error.message || 'Unable to submit payment receipt.');
    } finally {
      setUploadingReceipt(false);
    }
  };

  useEffect(() => {
    if (step !== 2 || !receiptSubmittedAt || !submissionId || !isSignedIn) return undefined;

    let active = true;
    let requestInProgress = false;
    const checkForReviewDecision = async () => {
      if (requestInProgress) return;
      requestInProgress = true;
      try {
        const token = await getToken();
        const response = await fetch(
          `/api/sponsors/payment-status?submission_id=${encodeURIComponent(submissionId)}`,
          { headers: token ? { Authorization: `Bearer ${token}` } : {} }
        );
        const payload = await response.json();
        if (!response.ok || !payload?.success) {
          throw new Error(payload?.error || 'Unable to retrieve submission status.');
        }
        if (!active) return;

        if (payload.status === 'approved' || payload.status === 'rejected') {
          finishReviewedSubmission(payload.status);
          return;
        }

        setPaymentStatus(payload.paymentStatus || 'unpaid');
        setSubmissionStatus(payload.status || 'pending_payment');
        setReceiptSubmittedAt(payload.receiptSubmittedAt || '');
        const savedSubmission = loadPersistedSubmission();
        if (savedSubmission?.submissionId === submissionId) {
          persistSubmission({
            ...savedSubmission,
            paymentStatus: payload.paymentStatus || 'unpaid',
            submissionStatus: payload.status || 'pending_payment',
            receiptSubmittedAt: payload.receiptSubmittedAt || '',
          });
        }
      } catch (error) {
        if (active) console.error('Automatic ad review status check failed:', error);
      } finally {
        requestInProgress = false;
      }
    };

    checkForReviewDecision();
    const interval = window.setInterval(checkForReviewDecision, 15000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [step, receiptSubmittedAt, submissionId, isSignedIn, getToken, finishReviewedSubmission]);

  return (
    <>
      <Head>
        <title>Advertise on Dosnine Properties — Premium Property Advertising</title>
        <meta
          name="description"
          content="Advertise your business to active property buyers, renters, investors and homeowners across Jamaica."
        />
      </Head>

      <div className="min-h-screen bg-white">
        {step === 2 ? (
          /* ---------- PAYMENT STEP — single column ---------- */
          <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
            <div className="overflow-hidden  bg-white shadow-sm">
              {/* Hero banner */}
              <div className="bg-gradient-to-br from-emerald-600 via-emerald-600 to-teal-600 p-6 sm:p-8 lg:p-10">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/15 backdrop-blur">
                    <ShieldCheck className="h-6 w-6 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-100">
                      {receiptSubmittedAt || paymentStatus === 'paid'
                        ? 'Submission received'
                        : 'Complete payment'}
                    </p>
                    <h1 className="mt-2 text-2xl font-semibold leading-tight text-white sm:text-3xl">
                      {receiptSubmittedAt || paymentStatus === 'paid'
                        ? 'Your ad is under review'
                        : 'Pay by bank transfer'}
                    </h1>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-emerald-50">
                      {receiptSubmittedAt || paymentStatus === 'paid'
                        ? 'We’ll update this page when your ad is approved or rejected. You can leave this page and return later.'
                        : 'Your ad request has been saved. Include the submission ID in your transfer notes, then upload the receipt here. We will verify payment before reviewing and activating your ad.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Restored-from-storage notice */}
              {restoredFromStorage && !receiptSubmittedAt && paymentStatus !== 'paid' ? (
                <div className="border-b border-amber-100 bg-amber-50 px-6 py-4 sm:px-8 lg:px-10">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="flex items-start gap-2 text-sm text-amber-900">
                      <span className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                      We saved your progress. You can complete payment anytime in the next 7 days.
                    </p>
                    <button
                      type="button"
                      onClick={handleStartOver}
                      className="inline-flex shrink-0 items-center justify-center rounded-full border border-amber-300 bg-white px-4 py-2 text-xs font-semibold text-amber-900 transition hover:bg-amber-100"
                    >
                      Start over
                    </button>
                  </div>
                </div>
              ) : null}

              {/* Body */}
              <div className="space-y-6 p-6 sm:p-8 lg:p-10">
                {/* Plan summary */}
                <div>
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Your selected plan
                  </h2>
                  <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-xl font-semibold text-slate-900">
                          {selectedPlan.name}
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          {selectedPlan.duration} of premium placement
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-semibold tracking-tight text-slate-900">
                          {formatMoney(totalAmount)}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">One-time bank transfer</p>
                      </div>
                    </div>

                  </div>
                </div>

                {/* Payment and review status */}
                <div className="rounded-xl border border-accent/30 bg-accent/5 p-5 sm:p-6">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent">
                    {paymentStatus === 'paid'
                      ? 'Payment confirmed'
                      : receiptSubmittedAt
                        ? 'Receipt received'
                        : 'Payment required'}
                  </p>
                  <h3 className="mt-2 text-lg font-semibold leading-snug text-slate-900">
                    {paymentStatus === 'paid'
                      ? submissionStatus === 'waitlisted'
                        ? 'Paid — scheduled for a future review month'
                        : 'Paid — awaiting ad review and approval'
                      : receiptSubmittedAt
                        ? 'Your payment is being verified'
                        : 'Pay by bank transfer'}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {paymentStatus === 'paid'
                      ? submissionStatus === 'waitlisted'
                        ? 'Your payment is confirmed. Your ad is reserved for the next available review month. This page will return to a new ad form after the team approves or rejects it.'
                        : 'Your payment is confirmed. Your ad is awaiting review and approval. This page will return to a new ad form after the team approves or rejects it.'
                      : receiptSubmittedAt
                        ? 'Your receipt has been submitted. We are verifying the transfer; bank processing times vary and it may take a few business days for payment to appear. Once confirmed, your ad will wait for approval. This page will return to a new ad form after the team approves or rejects it.'
                        : 'Transfer the amount to the bank account below. Put your submission ID in the transfer notes, then upload your receipt for verification.'}
                  </p>

                  {!receiptSubmittedAt && paymentStatus !== 'paid' ? (
                    <>
                      <div className="mt-5 divide-y divide-slate-100 rounded-lg bg-white px-4">
                        {[
                          ['Bank', sponsorBankDetails.bank],
                          ['Account name', sponsorBankDetails.accountName],
                          ['Account number', sponsorBankDetails.accountNumber],
                          ['Account type', sponsorBankDetails.accountType],
                          ['Branch', sponsorBankDetails.branch],
                          ['Transfer amount', formatMoney(totalAmount)],
                          ['Payment notes — use this exact ID', submissionId],
                        ].map(([label, value]) => (
                          <div key={label} className="flex items-center justify-between gap-3 py-3">
                            <div className="min-w-0">
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
                              <p className="mt-1 break-all font-medium text-slate-900">{value}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(value, label)}
                              className="inline-flex shrink-0 items-center gap-1 rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                            >
                              {copied === label ? <Check size={14} /> : <Copy size={14} />}
                              {copied === label ? 'Copied' : 'Copy'}
                            </button>
                          </div>
                        ))}
                      </div>

                      <div className="mt-5">
                        <label htmlFor="payment-receipt" className="block text-sm font-semibold text-slate-800">
                          Payment receipt
                        </label>
                        <p className="mt-1 text-xs text-slate-500">
                          Upload a JPG, PNG, or WebP image, up to 5 MB.
                        </p>
                        <input
                          ref={receiptInputRef}
                          id="payment-receipt"
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={(event) => {
                            const file = event.target.files?.[0] || null;
                            if (file && file.size > 5 * 1024 * 1024) {
                              toast.error('Receipt image must be 5 MB or smaller.');
                              event.target.value = '';
                              return;
                            }
                            setReceiptFile(file);
                          }}
                          className="mt-2 block w-full rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-semibold"
                        />
                        <button
                          type="button"
                          onClick={submitPaymentReceipt}
                          disabled={!isValidSubmissionId(submissionId) || !receiptFile || uploadingReceipt}
                          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <UploadCloud className="h-4 w-4" />
                          {uploadingReceipt ? 'Submitting receipt…' : 'Submit payment receipt'}
                        </button>
                      </div>
                    </>
                  ) : null}

                  <button
                    type="button"
                    onClick={refreshPaymentStatus}
                    disabled={checkingPayment}
                    className="mt-4 inline-flex w-full items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                  >
                    {checkingPayment
                      ? 'Checking…'
                      : receiptSubmittedAt || paymentStatus === 'paid'
                        ? 'Check approval status'
                        : 'Refresh payment status'}
                  </button>

                  {(receiptSubmittedAt || paymentStatus === 'paid') && (
                    <Link
                        href="/dashboard"
                        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-accent/90"
                    >
                        Back to your advertiser profile
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  )}

                  {paymentStatus !== 'paid' ? (
                    <div className="mt-5 flex flex-col items-center border-t border-slate-200 pt-4">
                      <button
                        type="button"
                        onClick={handleStartOver}
                        className="text-xs font-semibold text-slate-500 underline-offset-2 transition hover:text-slate-700 hover:underline"
                      >
                        Submit a different ad
                      </button>
                      {receiptSubmittedAt && (
                        <p className="mt-2 text-center text-xs text-slate-500">
                          Your current submission and receipt will remain under review.
                        </p>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* ---------- HERO ---------- */}
            <section className="border-b border-slate-100">
              <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">
                  Advertise on Dosnine
                </p>
                <h1 className="mt-6 text-4xl font-semibold leading-[1.05] tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
                  Reach buyers, renters, and investors across Jamaica.
                </h1>
                <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
                  Your business appears in rotating sponsor slots across all Dosnine Properties
                  pages — seen by people actively searching for property and services.
                </p>

                <div className="mt-12 grid grid-cols-1 gap-6 border-t border-slate-100 pt-8 sm:grid-cols-3">
                  <div>
                    <p className="text-3xl font-semibold text-slate-900 sm:text-4xl">
                      {MONTHLY_VISITORS}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">Monthly visitors</p>
                  </div>
                  <div>
                    <p className="text-3xl font-semibold text-slate-900 sm:text-4xl">High-intent</p>
                    <p className="mt-1 text-sm text-slate-500">Buyers & renters, not browsers</p>
                  </div>
                  <div>
                    <p className="text-3xl font-semibold text-slate-900 sm:text-4xl">
                      ?/{SPOTS_TOTAL}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {availabilityError ? 'Monthly capacity unavailable' : 'Paid spots left this month'}
                    </p>
                  </div>
                </div>

                <div className="mt-10 flex flex-row gap-3">
                  <a
                    href="#advertise-form"
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-accent px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-accent/90 sm:flex-none sm:px-6"
                  >
                    Start advertising
                    <ArrowRight className="h-4 w-4" />
                  </a>
                  <a
                    href="#plans"
                    className="inline-flex flex-1 items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-3.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 sm:flex-none sm:px-6"
                  >
                    View pricing
                  </a>
                </div>
              </div>
            </section>

            {/* ---------- HOW IT WORKS ---------- */}
            <section className="border-b border-slate-100">
              <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
                <h2 className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">
                  How it works
                </h2>
                <p className="mt-6 max-w-3xl text-2xl font-semibold leading-snug tracking-tight text-slate-900 sm:text-3xl">
                  Your business appears in rotating sponsor slots on desktop sidebars and mobile
                  banners across every Dosnine page.
                </p>
                <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
                  Sponsors rotate so visibility stays fair among all advertisers. Buyers see your
                  brand while they browse listings, requests, and market data.
                </p>

                <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-3">
                  {[
                    { step: '01', title: 'Submit your ad', body: 'Tell us about your business in a two-minute form.' },
                    { step: '02', title: 'Pay & get approved', body: 'Secure payment, then we review and publish within hours.' },
                    { step: '03', title: 'Receive leads', body: 'Buyers and renters reach out by WhatsApp or phone.' },
                  ].map((item) => (
                    <div key={item.step}>
                      <p className="text-xs font-semibold tracking-widest text-slate-400">
                        {item.step}
                      </p>
                      <h3 className="mt-3 text-lg font-semibold text-slate-900">{item.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{item.body}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* ---------- PRICING ---------- */}
            <section id="plans" className="border-b border-slate-100">
              <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
                <h2 className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">
                  Pricing
                </h2>
                <p className="mt-6 max-w-2xl text-2xl font-semibold leading-snug tracking-tight text-slate-900 sm:text-3xl">
                  One-time payment. No subscriptions.
                </p>
                <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
                  Choose how long you want your ad in rotation. Both plans include the same
                  placement — you are only choosing duration.
                </p>

                <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-2">
                  {plans.map((plan) => {
                    const selected = form.plan_id === plan.id;
                    return (
                      <button
                        key={plan.id}
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, plan_id: plan.id }))}
                        className={`group relative flex flex-col rounded-2xl border p-6 text-left transition-all duration-200 sm:p-7 ${
                          selected
                            ? 'border-accent bg-accent text-white shadow-[0_24px_50px_-18px_rgba(90,122,205,0.55)]'
                            : 'border-slate-200 bg-white hover:-translate-y-1 hover:border-slate-300 hover:shadow-lg'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <p
                            className={`text-xs font-semibold uppercase tracking-[0.22em] ${
                              selected ? 'text-white/70' : 'text-slate-400'
                            }`}
                          >
                            {plan.badge}
                          </p>
                          {plan.popular && (
                            <span
                              className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                                selected ? 'bg-white text-accent' : 'bg-accent/10 text-accent'
                              }`}
                            >
                              Popular
                            </span>
                          )}
                        </div>

                        <h3
                          className={`mt-4 text-xl font-semibold ${
                            selected ? 'text-white' : 'text-slate-900'
                          }`}
                        >
                          {plan.name}
                        </h3>

                        <div className="mt-6 flex items-baseline gap-2">
                          <span
                            className={`text-4xl font-semibold tracking-tight ${
                              selected ? 'text-white' : 'text-slate-900'
                            }`}
                          >
                            {formatMoney(planPrices[plan.id] || plan.price)}
                          </span>
                        </div>
                        <p
                          className={`mt-1 text-sm ${
                            selected ? 'text-white/70' : 'text-slate-500'
                          }`}
                        >
                          for {plan.duration.toLowerCase()}
                        </p>

                        <div
                          className={`mt-6 inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition ${
                            selected
                              ? 'bg-white text-accent'
                              : 'bg-slate-900 text-white group-hover:bg-accent'
                          }`}
                        >
                          {selected ? (
                            <>
                              <CheckCircle2 className="h-4 w-4" />
                              Selected
                            </>
                          ) : (
                            <>
                              Choose {plan.name}
                              <ArrowRight className="h-4 w-4" />
                            </>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <p className="mt-8 max-w-2xl text-sm text-slate-500">
                  {spotsLeft === null
                    ? `There are ${SPOTS_TOTAL} paid sponsor slots each month. Submissions stay open when they fill and paid ads are queued for the next available month.`
                    : spotsLeft > 0
                    ? `Only ${spotsLeft} of ${SPOTS_TOTAL} paid sponsor slots remain this month. Submissions stay open after they fill and join the next available month’s waitlist.`
                    : `This month’s ${SPOTS_TOTAL} paid sponsor slots are full. You can still submit and pay; your ad will be queued for the next available month.`}
                  {availabilityError ? ` (${availabilityError})` : ''}
                </p>
              </div>
            </section>

            {/* ---------- FORM ---------- */}
            <section id="advertise-form" className="border-b border-slate-100">
              <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
                <h2 className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">
                  Submit your ad
                </h2>
                <p className="mt-6 max-w-2xl text-2xl font-semibold leading-snug tracking-tight text-slate-900 sm:text-3xl">
                  Tell us about your business. We&apos;ll handle the rest.
                </p>
                <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
                  A polished listing builds trust and helps you attract better-qualified leads.
                </p>

                {!isSignedIn ? (
                  <div className="mt-12 rounded-2xl border border-slate-200 bg-slate-50 p-8 sm:p-10">
                    <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent/10">
                        <ShieldCheck className="h-6 w-6 text-accent" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold text-slate-900">
                          Sign in to create your ad
                        </h3>
                        <p className="mt-1.5 text-sm leading-6 text-slate-600">
                          Create a free account to unlock the ad builder. You&apos;ll return here
                          automatically.
                        </p>
                      </div>
                    </div>
                    <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                      <SignInButton mode="modal">
                        <button
                          type="button"
                          onClick={requireSignIn}
                          className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-accent px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-accent/90"
                        >
                          Sign In
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      </SignInButton>
                      <SignUpButton mode="redirect" redirectUrl="/advertise" afterSignUpUrl="/advertise">
                        <button
                          type="button"
                          onClick={requireSignIn}
                          className="inline-flex flex-1 items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          Create Free Account
                        </button>
                      </SignUpButton>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={onSubmit} noValidate className="mt-12 space-y-6">
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                        Business Name
                      </label>
                      <input
                        id="ad-company_name"
                        type="text"
                        value={form.company_name}
                        onChange={(event) => {
                          clearFieldError('company_name');
                          setForm((prev) => ({ ...prev, company_name: event.target.value }));
                        }}
                        className={getFieldClassName(
                          'company_name',
                          'w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20'
                        )}
                        aria-invalid={Boolean(fieldErrors.company_name)}
                      />
                      {fieldErrors.company_name ? (
                        <p className="mt-1 text-sm text-red-600">{fieldErrors.company_name}</p>
                      ) : null}
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                          Ad Title
                        </label>
                        <input
                          type="text"
                          value={form.title}
                          onChange={(event) =>
                            setForm((prev) => ({ ...prev, title: event.target.value }))
                          }
                          className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                          placeholder="Optional"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                          Category
                        </label>
                        <select
                          value={form.category}
                          onChange={(event) =>
                            setForm((prev) => ({ ...prev, category: event.target.value }))
                          }
                          className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                        >
                          {categories.map((category) => (
                            <option key={category.value} value={category.value}>
                              {category.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                          Phone
                        </label>
                        <div className="relative">
                          <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          <input
                            id="ad-phone"
                            type="tel"
                            value={form.phone}
                            onChange={(event) => {
                              clearFieldError('phone');
                              setForm((prev) => ({ ...prev, phone: event.target.value }));
                            }}
                            className={getFieldClassName(
                              'phone',
                              'w-full rounded-lg border border-slate-200 bg-white py-3 pl-10 pr-4 text-slate-900 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20'
                            )}
                            placeholder="876-123-4567"
                            aria-invalid={Boolean(fieldErrors.phone)}
                          />
                        </div>
                        {fieldErrors.phone ? (
                          <p className="mt-1 text-sm text-red-600">{fieldErrors.phone}</p>
                        ) : null}
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                          WhatsApp
                        </label>
                        <div className="relative">
                          <MessageCircle className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          <input
                            type="tel"
                            value={form.whatsapp}
                            onChange={(event) =>
                              setForm((prev) => ({ ...prev, whatsapp: event.target.value }))
                            }
                            className="w-full rounded-lg border border-slate-200 bg-white py-3 pl-10 pr-4 text-slate-900 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                            placeholder="876-123-4567"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                          Email
                        </label>
                        <div className="relative">
                          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          <input
                            id="ad-email"
                            type="email"
                            value={form.email}
                            onChange={(event) => {
                              clearFieldError('email');
                              setForm((prev) => ({ ...prev, email: event.target.value }));
                            }}
                            className={getFieldClassName(
                              'email',
                              'w-full rounded-lg border border-slate-200 bg-white py-3 pl-10 pr-4 text-slate-900 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20'
                            )}
                            placeholder="you@example.com"
                            aria-invalid={Boolean(fieldErrors.email)}
                          />
                        </div>
                        {fieldErrors.email ? (
                          <p className="mt-1 text-sm text-red-600">{fieldErrors.email}</p>
                        ) : null}
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                          Website
                        </label>
                        <div className="relative">
                          <Globe2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          <input
                            id="ad-website"
                            type="text"
                            inputMode="url"
                            autoComplete="url"
                            value={form.website}
                            onChange={(event) => {
                              clearFieldError('website');
                              setForm((prev) => ({ ...prev, website: event.target.value }));
                            }}
                            className={getFieldClassName(
                              'website',
                              'w-full rounded-lg border border-slate-200 bg-white py-3 pl-10 pr-4 text-slate-900 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20'
                            )}
                            placeholder="example.com"
                            aria-invalid={Boolean(fieldErrors.website)}
                          />
                        </div>
                        {fieldErrors.website ? (
                          <p className="mt-1 text-sm text-red-600">{fieldErrors.website}</p>
                        ) : (
                          <p className="mt-1 text-xs text-slate-500">
                            Optional. example.com or https://example.com both work.
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                          Contact Name
                        </label>
                        <input
                          type="text"
                          value={form.contact_name}
                          onChange={(event) =>
                            setForm((prev) => ({ ...prev, contact_name: event.target.value }))
                          }
                          className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                          placeholder="Optional"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                          Location
                        </label>
                        <div className="relative">
                          <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          <input
                            id="ad-location"
                            type="text"
                            value={form.location}
                            onChange={(event) => {
                              clearFieldError('location');
                              setForm((prev) => ({ ...prev, location: event.target.value }));
                            }}
                            className={getFieldClassName(
                              'location',
                              'w-full rounded-lg border border-slate-200 bg-white py-3 pl-10 pr-4 text-slate-900 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20'
                            )}
                            placeholder="Kingston, St. Andrew"
                            aria-invalid={Boolean(fieldErrors.location)}
                          />
                        </div>
                        {fieldErrors.location ? (
                          <p className="mt-1 text-sm text-red-600">{fieldErrors.location}</p>
                        ) : null}
                      </div>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                        Upload Images
                      </label>
                      <label
                        id="ad-imageFiles"
                        tabIndex={-1}
                        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-6 py-10 text-center transition hover:border-accent hover:bg-accent/5 ${
                          fieldErrors.imageFiles ? 'border-red-500 bg-red-50' : 'border-slate-300 bg-slate-50'
                        }`}
                      >
                        <UploadCloud className="h-8 w-8 text-accent" />
                        <span className="mt-3 text-sm font-semibold text-slate-900">
                          Upload up to 3 images
                        </span>
                        <span className="mt-1 text-sm text-slate-500">
                          PNG, JPG or WebP up to 8MB each
                        </span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/jpg,image/webp"
                          multiple
                          required
                          onChange={async (event) => {
                            const selectedFiles = Array.from(event.target.files || []).slice(0, 3);
                            if (selectedFiles.length === 0) return;
                            clearFieldError('imageFiles');

                            const oversized = selectedFiles.find((file) => file.size > 8 * 1024 * 1024);
                            if (oversized) {
                              toast.error('Each image must be 8MB or less.');
                              return;
                            }

                            const loadingId = toast.loading('Cropping to square and compressing images…');
                            try {
                              const compressedFiles = await compressImageFiles(selectedFiles);
                              imagePreviews.forEach((url) => URL.revokeObjectURL(url));
                              setImageFiles(compressedFiles);
                              setImagePreviews(compressedFiles.map((file) => URL.createObjectURL(file)));
                              toast.dismiss(loadingId);
                              toast.success('Images ready.');
                            } catch (error) {
                              toast.dismiss(loadingId);
                              toast.error(error?.message || 'Unable to process images.');
                            }

                            if ((event.target.files || []).length > 3) {
                              toast('Only the first 3 images were selected.');
                            }
                          }}
                          className="hidden"
                        />
                      </label>
                      {fieldErrors.imageFiles ? (
                        <p className="mt-1 text-sm text-red-600">{fieldErrors.imageFiles}</p>
                      ) : null}
                      {imagePreviews.length > 0 ? (
                        <div className="mt-4 grid gap-3 sm:grid-cols-3">
                          {imagePreviews.map((preview, index) => (
                            <div
                              key={`${preview}-${index}`}
                              className="relative aspect-square w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-100"
                            >
                              <Image
                                src={preview}
                                alt={`Preview ${index + 1}`}
                                fill
                                unoptimized
                                className="object-cover"
                              />
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                        Description
                      </label>
                      <textarea
                        id="ad-description"
                        value={form.description}
                        onChange={(event) => {
                          clearFieldError('description');
                          setForm((prev) => ({ ...prev, description: event.target.value }));
                        }}
                        className={getFieldClassName(
                          'description',
                          'w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20'
                        )}
                        rows={5}
                        placeholder="Tell buyers what you offer, your location, and what makes your business stand out."
                        aria-invalid={Boolean(fieldErrors.description)}
                      />
                      {fieldErrors.description ? (
                        <p className="mt-1 text-sm text-red-600">{fieldErrors.description}</p>
                      ) : null}
                    </div>

                    {submitError ? (
                      <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                        {submitError}
                      </div>
                    ) : null}

                    {submitting ? (
                      <div className="rounded-lg border border-accent/20 bg-accent/5 p-3 text-sm text-slate-700">
                        <div className="flex items-center gap-3">
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                          <span>{saveStatus || 'Saving your ad request...'}</span>
                        </div>
                      </div>
                    ) : null}

                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex w-full items-center justify-center gap-2 rounded-full bg-accent px-6 py-4 text-base font-semibold text-white transition hover:bg-accent/90 disabled:bg-slate-400"
                    >
                      {submitting ? saveStatus || 'Saving...' : `Continue to bank transfer — ${formatMoney(totalAmount)}`}
                      {!submitting ? <ArrowRight className="h-5 w-5" /> : null}
                    </button>
                  </form>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </>
  );
}