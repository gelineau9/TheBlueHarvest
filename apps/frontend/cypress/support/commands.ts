/// <reference types="cypress" />

// Custom commands can be added here
// Example:
// Cypress.Commands.add('login', (email: string, password: string) => {
//   cy.visit('/login');
//   cy.get('input[name="email"]').type(email);
//   cy.get('input[name="password"]').type(password);
//   cy.get('button[type="submit"]').click();
// });

declare global {
  namespace Cypress {
    interface Chainable {
      // Add custom command type definitions here
      // Example:
      // login(email: string, password: string): Chainable<void>;
    }
  }
}

export {};
