/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    backend: import('./lib/backend/types').Backend;
    member: import('./lib/backend/types').Member | null;
    products: import('./lib/backend/types').Product[];
  }
}
