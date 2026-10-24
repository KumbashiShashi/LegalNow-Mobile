import {
  ADVOCATE_FILTERS,
  ADVOCATE_PROBLEM_SUGGESTIONS,
  GOVT_SERVICE_FILTERS,
  PRIVATE_SERVICE_FILTERS,
  SERVICE_DEFAULT_SEARCH_SUGGESTIONS,
} from '../src/utils/directoryFilters';

describe('Directory Visual Filters & Common Problem/Service Catalog', () => {
  describe('Advocate Practice Area & Problem Filters', () => {
    test('contains core practice area icon categories', () => {
      const categoryNames = ADVOCATE_FILTERS.map((f) => f.name);
      expect(categoryNames).toContain('Family');
      expect(categoryNames).toContain('Business');
      expect(categoryNames).toContain('Property');
      expect(categoryNames).toContain('Criminal');
      expect(categoryNames).toContain('Financial');
    });

    test('each advocate filter has valid icon, background, color and keywords', () => {
      ADVOCATE_FILTERS.forEach((filter) => {
        expect(filter.iconName).toBeDefined();
        expect(filter.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(filter.bg).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(filter.keywords.length).toBeGreaterThan(0);
      });
    });

    test('has default legal problem suggestions', () => {
      expect(ADVOCATE_PROBLEM_SUGGESTIONS.length).toBeGreaterThanOrEqual(5);
      expect(ADVOCATE_PROBLEM_SUGGESTIONS).toContain('Cheque Bounce (Sec 138)');
    });
  });

  describe('Service Provider Government & Private Category Filters', () => {
    test('contains government service filters: RTO, Electricity, Water, Nagara Palike, Registrar, Association, Tax', () => {
      const govtNames = GOVT_SERVICE_FILTERS.map((f) => f.name);
      expect(govtNames).toContain('RTO');
      expect(govtNames).toContain('Electricity Board');
      expect(govtNames).toContain('Water Board');
      expect(govtNames).toContain('Nagara Palike');
      expect(govtNames).toContain('Registrar');
      expect(govtNames).toContain('Association');
      expect(govtNames).toContain('Tax');
    });

    test('contains private service filters: Home Contractors, Tax Consultants, Auditors, Sports Coaches, Nursing Service', () => {
      const privateNames = PRIVATE_SERVICE_FILTERS.map((f) => f.name);
      expect(privateNames).toContain('Home Contractors');
      expect(privateNames).toContain('Tax Consultants');
      expect(privateNames).toContain('Auditors & CAs');
      expect(privateNames).toContain('Sports Coaches');
      expect(privateNames).toContain('Nursing Service');
    });

    test('all service category filters link to valid catalogue mapping query', () => {
      [...GOVT_SERVICE_FILTERS, ...PRIVATE_SERVICE_FILTERS].forEach((filter) => {
        expect(filter.suggestedCatalogueQuery.length).toBeGreaterThan(0);
        expect(filter.sampleServices.length).toBeGreaterThan(0);
      });
    });

    test('default service search suggestions list is available', () => {
      expect(SERVICE_DEFAULT_SEARCH_SUGGESTIONS.length).toBeGreaterThanOrEqual(6);
      expect(SERVICE_DEFAULT_SEARCH_SUGGESTIONS).toContain('RTO Driving Licence');
      expect(SERVICE_DEFAULT_SEARCH_SUGGESTIONS).toContain('BESCOM Meter Transfer');
    });
  });
});
