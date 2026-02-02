describe('Home Page', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should load the home page successfully', () => {
    cy.url().should('include', '/');
    cy.get('body').should('be.visible');
  });

  it('should display the main heading', () => {
    // Adjust the selector based on your actual home page content
    cy.get('h1').should('exist');
  });

  it('should have proper meta tags', () => {
    cy.document().its('head').find('meta[name="viewport"]').should('exist');
  });
});

describe('Navigation', () => {
  it('should navigate between pages', () => {
    cy.visit('/');

    // Example: Test navigation links (adjust selectors based on your app)
    // cy.get('a[href="/about"]').click();
    // cy.url().should('include', '/about');
    // cy.go('back');
    // cy.url().should('include', '/');
  });
});

describe('Responsive Design', () => {
  const viewportSizes = [
    { device: 'iphone-x', width: 375, height: 812 },
    { device: 'ipad-2', width: 768, height: 1024 },
    { device: 'macbook-15', width: 1440, height: 900 },
  ];

  viewportSizes.forEach(({ device, width, height }) => {
    it(`should render correctly on ${device}`, () => {
      cy.viewport(width, height);
      cy.visit('/');
      cy.get('body').should('be.visible');
    });
  });
});

describe('Accessibility', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should have a main landmark', () => {
    cy.get('main').should('exist');
  });

  it('should not have any detached elements', () => {
    cy.get('body *').each(($el) => {
      cy.wrap($el).should('not.have.css', 'display', 'none');
    });
  });
});
