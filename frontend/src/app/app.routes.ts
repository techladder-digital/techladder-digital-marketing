import { Routes } from '@angular/router';
import { authGuard, fullAdminGuard, guestGuard } from './core/guards/auth.guard';
import { MainLayout } from './layouts/main-layout/main-layout';

export const routes: Routes = [
  // ---------------------------------------------------- public website (5 main pages)
  {
    path: '',
    component: MainLayout,
    children: [
      {
        path: '',
        pathMatch: 'full',
        title: 'Digital Marketing, Websites & Software',
        data: { description: 'Grow your business with creative digital marketing, AI advertisement videos, professional websites and custom software from TechLadder Digital Marketing.' },
        loadComponent: () => import('./pages/home/home').then((m) => m.HomePage),
      },
      {
        path: 'services',
        title: 'Services',
        data: { description: 'Digital marketing services and website & software development services offered by TechLadder Digital Marketing.' },
        loadComponent: () => import('./pages/services/services').then((m) => m.ServicesPage),
      },
      {
        path: 'portfolio',
        title: 'Portfolio',
        data: { description: 'Selected digital marketing, video, design, website and software work by TechLadder Digital Marketing.' },
        loadComponent: () => import('./pages/portfolio/portfolio').then((m) => m.PortfolioPage),
      },
      {
        path: 'contact',
        title: 'Contact & Enquiry',
        data: { description: 'Contact TechLadder Digital Marketing by email, WhatsApp or phone, or send a project enquiry.' },
        loadComponent: () => import('./pages/contact/contact').then((m) => m.ContactPage),
      },
      {
        path: 'feedback',
        title: 'Customer Feedback',
        data: { description: 'Read verified customer feedback or share your experience working with TechLadder Digital Marketing.' },
        loadComponent: () => import('./pages/feedback/feedback').then((m) => m.FeedbackPage),
      },
      // Convenience alias used by "Enquiry" navigation items.
      { path: 'enquiry', redirectTo: 'contact', pathMatch: 'full' },
    ],
  },

  // ---------------------------------------------------- administration (not public pages)
  {
    path: 'admin/login',
    title: 'Admin Sign In',
    data: { noindex: true },
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/admin/login/admin-login').then((m) => m.AdminLoginPage),
  },
  {
    path: 'admin',
    canActivate: [authGuard],
    data: { noindex: true },
    loadComponent: () => import('./layouts/admin-layout/admin-layout').then((m) => m.AdminLayout),
    children: [
      { path: '', title: 'Dashboard', loadComponent: () => import('./pages/admin/dashboard/admin-dashboard').then((m) => m.AdminDashboardPage) },
      { path: 'enquiries', title: 'Enquiries', canActivate: [fullAdminGuard], loadComponent: () => import('./pages/admin/enquiries/admin-enquiries').then((m) => m.AdminEnquiriesPage) },
      { path: 'enquiries/:id', title: 'Enquiry', canActivate: [fullAdminGuard], loadComponent: () => import('./pages/admin/enquiries/admin-enquiry-detail').then((m) => m.AdminEnquiryDetailPage) },
      { path: 'feedback', title: 'Feedback Moderation', loadComponent: () => import('./pages/admin/feedback/admin-feedback').then((m) => m.AdminFeedbackPage) },
      { path: 'portfolio', title: 'Portfolio', loadComponent: () => import('./pages/admin/portfolio/admin-portfolio').then((m) => m.AdminPortfolioPage) },
      { path: 'services', title: 'Services', loadComponent: () => import('./pages/admin/services/admin-services').then((m) => m.AdminServicesPage) },
      { path: 'media', title: 'Media Library', loadComponent: () => import('./pages/admin/media/admin-media').then((m) => m.AdminMediaPage) },
      { path: 'social', title: 'Social Media', loadComponent: () => import('./pages/admin/social/admin-social').then((m) => m.AdminSocialPage) },
      { path: 'settings', title: 'Website Settings', canActivate: [fullAdminGuard], loadComponent: () => import('./pages/admin/settings/admin-settings').then((m) => m.AdminSettingsPage) },
    ],
  },

  // ---------------------------------------------------- not found
  {
    path: '**',
    component: MainLayout,
    children: [
      { path: '', title: 'Page Not Found', data: { noindex: true }, loadComponent: () => import('./pages/not-found/not-found').then((m) => m.NotFoundPage) },
    ],
  },
];
