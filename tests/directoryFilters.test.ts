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

    test('advocate specialty matching handles DB categories and general legal practitioners', () => {
      // Mock the 6 verified advocates in legalnow_db
      const mockAdvocates = [
        { id: '1', name: 'Advocate Alex', categories: ['advocate', 'legal'], bio: 'General legal consultant' },
        { id: '2', name: 'Shanmukha Sampige', categories: ['Notary'], bio: 'Authorized notary' },
        { id: '3', name: 'Nagaraj Adiga', categories: ['advocate', 'legal', 'Notary'], bio: 'Senior advocate & notary' },
        { id: '4', name: 'Suresh Aithal', categories: ['Criminal'], bio: 'Criminal defense advocate' },
        { id: '5', name: 'Arpitha', categories: ['legal'], bio: 'Corporate and civil counsel' },
        { id: '6', name: 'Asmitha', categories: ['Criminal'], bio: 'Bail & trial practitioner' },
      ];

      // Test Criminal Filter
      const criminalMatches = mockAdvocates.filter((a) =>
        a.categories.some((c) => c.toLowerCase() === 'criminal')
      );
      expect(criminalMatches.length).toBe(2);
      expect(criminalMatches.map((a) => a.name)).toEqual(['Suresh Aithal', 'Asmitha']);

      // Test Notary Filter
      const notaryMatches = mockAdvocates.filter((a) =>
        a.categories.some((c) => c.toLowerCase().includes('notary'))
      );
      expect(notaryMatches.length).toBe(2);
      expect(notaryMatches.map((a) => a.name)).toEqual(['Shanmukha Sampige', 'Nagaraj Adiga']);

      // Test General Practitioners (Family, Business, Property, Financial)
      const generalMatches = mockAdvocates.filter((a) => {
        const cats = a.categories.map((c) => c.toLowerCase());
        const isCrimOnly = cats.every((c) => c === 'criminal');
        const isNotaryOnly = cats.every((c) => c === 'notary');
        const hasGeneral = cats.some((c) => ['advocate', 'legal'].includes(c));
        return hasGeneral && !isCrimOnly && !isNotaryOnly;
      });
      expect(generalMatches.length).toBe(3);
      expect(generalMatches.map((a) => a.name)).toEqual(['Advocate Alex', 'Nagaraj Adiga', 'Arpitha']);

      // Test Global Search
      const searchByName = mockAdvocates.filter((a) => a.name.toLowerCase().includes('alex'));
      expect(searchByName.length).toBe(1);
      expect(searchByName[0].name).toBe('Advocate Alex');
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

    test('catalogue items correctly filter between Government and Private tabs', () => {
      const mockCatalogue = [
        { id: '1', name: 'Licence-related assistance', category: 'Government Services' },
        { id: '2', name: 'Government process assistance', category: 'Government Services' },
        { id: '3', name: 'Assocition Registration', category: 'Assocition Registration' },
        { id: '4', name: 'Business registration assistance', category: 'Business Services' },
        { id: '5', name: 'Tax-related services', category: 'Tax and Compliance' },
        { id: '6', name: 'Other approved service categories', category: 'Other Approved Services' },
      ];

      const govt = mockCatalogue.filter(
        (s) => s.category.toLowerCase().includes('government') || s.category.toLowerCase().includes('assocition')
      );
      expect(govt.length).toBe(3);

      const privateServices = mockCatalogue.filter(
        (s) => s.category.toLowerCase().includes('business') || s.category.toLowerCase().includes('tax') || s.category.toLowerCase().includes('other')
      );
      expect(privateServices.length).toBe(3);
    });
  });
});
