export interface AdvocateCategoryFilter {
  id: string;
  name: string;
  iconName: string;
  color: string;
  bg: string;
  description: string;
  keywords: string[];
}

export interface ServiceCategoryFilter {
  id: string;
  name: string;
  type: 'govt' | 'private';
  iconName: string;
  color: string;
  bg: string;
  badge: string;
  description: string;
  sampleServices: string[];
  suggestedCatalogueQuery: string;
}

export const ADVOCATE_FILTERS: AdvocateCategoryFilter[] = [
  {
    id: 'family',
    name: 'Family',
    iconName: 'people',
    color: '#D93025',
    bg: '#FCE8E6',
    description: 'Divorce, child custody, alimony & domestic matters',
    keywords: ['Family', 'family', 'divorce', 'custody', 'matrimonial', 'marriage'],
  },
  {
    id: 'business',
    name: 'Business',
    iconName: 'business',
    color: '#1A73E8',
    bg: '#E8F0FE',
    description: 'Corporate contracts, startup compliance & partnerships',
    keywords: ['Business', 'business', 'corporate', 'commercial', 'company', 'agreements'],
  },
  {
    id: 'property',
    name: 'Property',
    iconName: 'home',
    color: '#137333',
    bg: '#E6F4EA',
    description: 'Land purchase, title search, tenant disputes & registry',
    keywords: ['Property', 'property', 'land', 'real estate', 'title', 'deed', 'tenant', 'rera'],
  },
  {
    id: 'criminal',
    name: 'Criminal',
    iconName: 'shield',
    color: '#C5221F',
    bg: '#FEECEB',
    description: 'Bail, police matters, FIR quashing & defense',
    keywords: ['Criminal', 'criminal', 'bail', 'fir', 'defense', 'complaint'],
  },
  {
    id: 'financial',
    name: 'Financial',
    iconName: 'cash',
    color: '#B06000',
    bg: '#FEF7E0',
    description: 'Cheque bounce (Sec 138), loan recovery & debt resolution',
    keywords: ['Financial', 'financial', 'tax', 'cheque', 'banking', 'recovery', 'debt'],
  },
  {
    id: 'consumer',
    name: 'Consumer',
    iconName: 'cart',
    color: '#7B1FA2',
    bg: '#F3E8FD',
    description: 'E-commerce fraud, defective products & consumer forum',
    keywords: ['Consumer', 'consumer', 'refund', 'complaint', 'service'],
  },
];

export const ADVOCATE_PROBLEM_SUGGESTIONS = [
  'Cheque Bounce (Sec 138)',
  'Property Title Deed Verification',
  'Mutual Divorce & Custody',
  'Anticipatory Bail & FIR',
  'Land Registration Dispute',
  'Startup Shareholder Agreement',
  'Consumer Court Compensation',
];

export const GOVT_SERVICE_FILTERS: ServiceCategoryFilter[] = [
  {
    id: 'rto',
    name: 'RTO',
    type: 'govt',
    iconName: 'car',
    color: '#1A73E8',
    bg: '#E8F0FE',
    badge: 'Transport Dept',
    description: 'Driving Licence, RC transfer, NOC & Hypothecation cancellation',
    sampleServices: ['Driving Licence', 'Vehicle RC Transfer', 'State NOC', 'Fitness Certificate'],
    suggestedCatalogueQuery: 'Licence-related assistance',
  },
  {
    id: 'electricity',
    name: 'Electricity Board',
    type: 'govt',
    iconName: 'flash',
    color: '#E37400',
    bg: '#FEF7E0',
    badge: 'Power Discom',
    description: 'BESCOM / State Discom meter transfer, load increase & connection',
    sampleServices: ['Meter Name Transfer', 'Sanctioned Load Enhancement', 'New Commercial Meter', 'Tariff Change'],
    suggestedCatalogueQuery: 'Local-authority process assistance',
  },
  {
    id: 'water_board',
    name: 'Water Board',
    type: 'govt',
    iconName: 'water',
    color: '#0288D1',
    bg: '#E1F5FE',
    badge: 'Water Supply',
    description: 'BWSSB / Water Authority sanitary line sanction & billing meter',
    sampleServices: ['Sanitary Connection', 'Water Meter Registration', 'Industrial Water NOC', 'Sewerage Approval'],
    suggestedCatalogueQuery: 'Government process assistance',
  },
  {
    id: 'nagara_palike',
    name: 'Nagara Palike',
    type: 'govt',
    iconName: 'trail-sign',
    color: '#2E7D32',
    bg: '#E8F5E9',
    badge: 'Municipality',
    description: 'BBMP / City Council E-Khata, property tax mutation & building plan',
    sampleServices: ['Khata Transfer (A/B)', 'Property Tax Assessment', 'Trade Licence', 'Building Plan Sanction'],
    suggestedCatalogueQuery: 'Local-authority process assistance',
  },
  {
    id: 'registrar',
    name: 'Registrar',
    type: 'govt',
    iconName: 'document-text',
    color: '#512DA8',
    bg: '#EDE7F6',
    badge: 'Sub-Registrar',
    description: 'Sale deed registration, gift deed, encumbrance certificate (EC)',
    sampleServices: ['Deed Registration Support', 'Marriage Registration', 'Encumbrance Certificate (EC)', 'Certified Copies'],
    suggestedCatalogueQuery: 'Government process assistance',
  },
  {
    id: 'association',
    name: 'Association',
    type: 'govt',
    iconName: 'people-circle',
    color: '#00796B',
    bg: '#E0F2F1',
    badge: 'Societies Act',
    description: 'Apartment Owners Association (AOA) & RWA registration',
    sampleServices: ['Apartment Association Registration', 'RWA Bylaws Framing', 'Society Annual Return', 'Trust Registration'],
    suggestedCatalogueQuery: 'Assocition Registration',
  },
  {
    id: 'tax_dept',
    name: 'Tax',
    type: 'govt',
    iconName: 'receipt',
    color: '#C2185B',
    bg: '#FCE4EC',
    badge: 'Commercial Taxes',
    description: 'GST registration, state professional tax & commercial assessments',
    sampleServices: ['GST Registration', 'Professional Tax Enrollment', 'VAT Clearance', 'TDS Assessment'],
    suggestedCatalogueQuery: 'Tax-related services',
  },
];

export const PRIVATE_SERVICE_FILTERS: ServiceCategoryFilter[] = [
  {
    id: 'home_contractors',
    name: 'Home Contractors',
    type: 'private',
    iconName: 'construct',
    color: '#E65100',
    bg: '#FFF3E0',
    badge: 'Construction & Civil',
    description: 'Civil contractors, structural repair, waterproofing & renovation',
    sampleServices: ['Building Contractor', 'Interior Renovation', 'Waterproofing Civil Work', 'Structural Audit'],
    suggestedCatalogueQuery: 'Business support services',
  },
  {
    id: 'tax_consultants',
    name: 'Tax Consultants',
    type: 'private',
    iconName: 'calculator',
    color: '#1565C0',
    bg: '#E3F2FD',
    badge: 'Tax Experts',
    description: 'Income Tax Return (ITR), capital gains, GST returns & notices',
    sampleServices: ['Individual ITR Filing', 'Business GST Returns', 'Capital Gains Planning', 'Tax Notice Response'],
    suggestedCatalogueQuery: 'Tax-related services',
  },
  {
    id: 'auditors',
    name: 'Auditors & CAs',
    type: 'private',
    iconName: 'clipboard',
    color: '#2E7D32',
    bg: '#E8F5E9',
    badge: 'Chartered Accounts',
    description: 'Statutory audit, company financial audit & balance sheet certification',
    sampleServices: ['Statutory Audit', 'Company Annual ROC Filing', 'Internal Financial Audit', 'Due Diligence'],
    suggestedCatalogueQuery: 'Compliance-related services',
  },
  {
    id: 'sports_coaches',
    name: 'Sports Coaches',
    type: 'private',
    iconName: 'trophy',
    color: '#F57C00',
    bg: '#FFF8E1',
    badge: 'Fitness & Sports',
    description: 'Certified sports trainers, fitness coach agreements & academies',
    sampleServices: ['Academy Affiliation', 'Coach Certification', 'Sports Club Bylaws', 'Player Contracts'],
    suggestedCatalogueQuery: 'Other approved service categories',
  },
  {
    id: 'nursing_service',
    name: 'Nursing Service',
    type: 'private',
    iconName: 'medkit',
    color: '#C2185B',
    bg: '#FCE4EC',
    badge: 'Healthcare At Home',
    description: 'Home nursing verification, elderly patient care & medical attendant',
    sampleServices: ['Home Nursing Care Verification', 'Elderly Patient Attendant', 'Medical Staff Compliance', 'Home Healthcare Contract'],
    suggestedCatalogueQuery: 'Other approved service categories',
  },
];

export const SERVICE_DEFAULT_SEARCH_SUGGESTIONS = [
  'RTO Driving Licence',
  'BESCOM Meter Transfer',
  'E-Khata Municipal Transfer',
  'Apartment Association Reg',
  'GST & Tax Filing',
  'Home Contractor Assistance',
  'Statutory Audit by CA',
  'Elder Care Nursing Attendant',
];
