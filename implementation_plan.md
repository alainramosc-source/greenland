# Implementation Plan - Greenland Website

**Context**: Corporate website for "Greenland Products", specializing in functional furniture (folding tables, chairs, etc.).
**Key Constraints**: 
- **NO E-commerce** (Catalog only).
- **Strict Content**: Use only provided text. No generic marketing phrases.
- **Strict Design**: Specific colors and fonts.
- **Tech Stack**: Vite + React (for component reusability and future B2B portal expansion) + Vanilla CSS (per user rules).

## Phase 1: Project Initialization & Design System
- [ ] **Initialize Project**: Create a new Vite project (`npm create vite@latest .`).
- [ ] **Configure Assets**: 
    - Set up color palette in CSS variables:
        - Primary Green: `#6a9a04`
        - Secondary Green: `#dee24b`
        - Black: `#000000`
        - Grey: `#747474`
    - **Fonts**: Need to source "Rounded Elegance" and "Iwata Souchou". Will use system sans-serif temporarily if not provided.
- [ ] **Global Styles**: distinct visual hierarchy, clean, professional.

## Phase 2: Core Architecture & Components
- [ ] **Navigation (Sticky)**:
    - Items: Inicio | Productos | Distribuidores | Greenland Spaces | Greenland Deco | Nosotros | Contacto
    - Logic: Mobile responsive menu.
- [ ] **Footer**:
    - Social media links (placeholders).
    - QR Code section.
    - Contact info.
- [ ] **Base Layout**: Shared layout for all pages.

## Phase 3: Page Implementation
- [ ] **Home Page**:
    - **Hero Banner**: "Especialistas en mobiliario funcional..."
    - **Sections**: Featured Products, Distributors CTA, Spaces Intro, Deco Intro, About snippet, Contact.
- [ ] **Products Section**:
    - **Catalog Layout**: Grid of categories (Mesas, Sillas, Toldos, etc.).
    - **Detail View**: Standard template for product models (using data from "INFO PRODUCTOS.pdf" - extracted later).
- [ ] **Divisions**:
    - **Greenland Spaces**: Intro page (Industrial/Technical look).
    - **Greenland Deco**: Intro page (Architectural look).
- [ ] **Distributors**:
    - Info section.
    - "Iniciar Sesión" button (placeholder/modal).
- [ ] **About (Nosotros)**: 
    - Full text from approved docs.
- [ ] **Contact**: 
    - Form and info.
    - WhatsApp floating button.

## Phase 4: Content & Refinement
- [ ] **Content Injection**: Populate strictly with "DOCUMENTO 2 - TEXTOS SITIO WEB".
- [ ] **Responsive Check**: Ensure mobile compatibility.
- [ ] **Performance Optimization**.

## Questions/Blockers
- **Fonts**: "Rounded Elegance" and "Iwata Souchou" files are missing.
- **Images**: "INFO PRODUCTOS.pptx/pdf" contains images, but extracting them might be needed. "WhatsApp Image" is available. Need high-res product assets.
