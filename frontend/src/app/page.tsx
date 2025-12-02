"use client";

import Link from "next/link";
import NewsletterSignup from "@/components/NewsletterSignup";
import { getMaintenanceModePublic } from "@/lib/api/system.api";
import { useEffect, useState } from "react";

export default function Home() {
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [isCheckingMaintenance, setIsCheckingMaintenance] = useState(true);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  useEffect(() => {
    const checkMaintenance = async () => {
      try {
        const response = await getMaintenanceModePublic();
        setMaintenanceEnabled(response.data?.enabled === true);
      } catch (error) {
        // If we can't check maintenance mode, assume it's off
        console.error("Error checking maintenance mode:", error);
        setMaintenanceEnabled(false);
      } finally {
        setIsCheckingMaintenance(false);
      }
    };

    checkMaintenance();
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setLightboxImage(null);
      }
    };

    if (lightboxImage) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [lightboxImage]);

  return (
    <div className="flex flex-col min-h-screen w-full bg-white dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50 backdrop-blur-sm bg-white/95 dark:bg-gray-900/95">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 dark:from-blue-400 dark:to-blue-600 bg-clip-text text-transparent">
                RepairTix
              </div>
            </div>
            <nav className="flex items-center space-x-4">
              {!maintenanceEnabled && (
                <>
                  <Link
                    href="/login"
                    className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 px-3 py-2 text-sm font-medium transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/register"
                    className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-sm"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 py-20 sm:py-28 lg:py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
              Streamline Your{" "}
              <span className="bg-gradient-to-r from-blue-600 to-blue-800 dark:from-blue-400 dark:to-blue-600 bg-clip-text text-transparent">
                Electronics Repair Business
              </span>
            </h1>
            <p className="text-xl sm:text-2xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
              All-in-one management platform for repair shops. Track tickets, manage inventory, handle invoicing, and grow your business—all from one place.
            </p>
            {!maintenanceEnabled && (
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center px-8 py-4 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5"
                >
                  Start Free Trial
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center px-8 py-4 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-semibold rounded-lg border-2 border-gray-300 dark:border-gray-700 hover:border-blue-600 dark:hover:border-blue-500 transition-all"
                >
                  Sign In
                </Link>
              </div>
            )}
            <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">
              No credit card required • Cancel anytime
            </p>
          </div>
        </div>
      </section>

      {/* Newsletter Signup Section */}
      <section className="py-12 bg-white dark:bg-gray-900 border-y border-gray-200 dark:border-gray-800">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-3">
              Stay Updated
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">
              Get the latest updates, tips, and features delivered to your inbox.
            </p>
            <NewsletterSignup className="max-w-md mx-auto" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Everything You Need to Run Your Repair Shop
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Powerful features designed specifically for electronics repair businesses
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {/* Feature 1 */}
            <div className="bg-gray-50 dark:bg-gray-800 p-8 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Repair Ticketing
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Track jobs from intake to completion with status updates, technician assignment, and detailed notes. Never lose track of a repair.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-gray-50 dark:bg-gray-800 p-8 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Customer Management
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Complete customer profiles with contact information, service history, and communication logs. Build lasting relationships with your customers.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-gray-50 dark:bg-gray-800 p-8 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Professional Invoicing
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Generate professional invoices with line items, tax calculation, and payment tracking. Get paid faster with automated invoicing.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-gray-50 dark:bg-gray-800 p-8 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Inventory Management
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Track parts and supplies with real-time inventory updates. Receive low-stock alerts and manage stock across multiple locations.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-gray-50 dark:bg-gray-800 p-8 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Analytics & Reporting
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Comprehensive dashboards with charts and metrics. Understand your business performance and make data-driven decisions.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-gray-50 dark:bg-gray-800 p-8 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Multi-Location Support
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Operate multiple locations with location-based data isolation. Manage inventory transfers and track performance by location.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Screenshots Section */}
      <section className="py-20 bg-gray-50 dark:bg-gray-800">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              See It In Action
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Get a glimpse of how RepairTix works in real repair shops
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {/* Dashboard Screenshot */}
            <div className="bg-white dark:bg-gray-900 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
              <div 
                className="aspect-video bg-gray-100 dark:bg-gray-800 overflow-hidden cursor-pointer group relative"
                onClick={() => setLightboxImage("/dashboard.png")}
              >
                <img
                  src="/dashboard.png"
                  alt="Dashboard Overview"
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 dark:bg-gray-800/90 rounded-full p-3">
                    <svg className="w-6 h-6 text-gray-900 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Comprehensive Dashboard
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Get a complete overview of your business at a glance with real-time stats, charts, and recent activity.
                </p>
              </div>
            </div>

            {/* Ticket Management Screenshot */}
            <div className="bg-white dark:bg-gray-900 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
              <div 
                className="aspect-video bg-gray-100 dark:bg-gray-800 overflow-hidden cursor-pointer group relative"
                onClick={() => setLightboxImage("/ticket.png")}
              >
                <img
                  src="/ticket.png"
                  alt="Ticket Management"
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 dark:bg-gray-800/90 rounded-full p-3">
                    <svg className="w-6 h-6 text-gray-900 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Ticket Management
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Track repair jobs from intake to completion with detailed status updates and technician assignments.
                </p>
              </div>
            </div>

            {/* Invoice Screenshot */}
            <div className="bg-white dark:bg-gray-900 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
              <div 
                className="aspect-video bg-gray-100 dark:bg-gray-800 overflow-hidden cursor-pointer group relative"
                onClick={() => setLightboxImage("/invoice.png")}
              >
                <img
                  src="/invoice.png"
                  alt="Invoice Management"
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 dark:bg-gray-800/90 rounded-full p-3">
                    <svg className="w-6 h-6 text-gray-900 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Professional Invoicing
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Create and manage invoices with line items, tax calculations, and payment tracking.
                </p>
              </div>
            </div>

            {/* Invoice PDF Screenshot */}
            <div className="bg-white dark:bg-gray-900 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
              <div 
                className="aspect-video bg-gray-100 dark:bg-gray-800 overflow-hidden cursor-pointer group relative"
                onClick={() => setLightboxImage("/invoice_pdf.png")}
              >
                <img
                  src="/invoice_pdf.png"
                  alt="Invoice PDF"
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 dark:bg-gray-800/90 rounded-full p-3">
                    <svg className="w-6 h-6 text-gray-900 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  PDF Generation
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Generate professional PDF invoices that you can email or print directly for your customers.
                </p>
              </div>
            </div>
          </div>

          {/* Lightbox Modal */}
          {lightboxImage && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 dark:bg-black/95 p-4"
              onClick={() => setLightboxImage(null)}
            >
              <div className="relative max-w-7xl max-h-full w-full h-full flex items-center justify-center">
                <button
                  onClick={() => setLightboxImage(null)}
                  className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors z-10 bg-black/50 rounded-full p-2 hover:bg-black/70"
                  aria-label="Close lightbox"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <img
                  src={lightboxImage}
                  alt="Screenshot"
                  className="max-w-full max-h-full object-contain rounded-lg"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                Why Choose RepairTix?
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-400">
                Built by repair technicians, for repair technicians
              </p>
            </div>

            <div className="space-y-8">
              <div className="flex gap-6">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-blue-600 dark:bg-blue-700 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    Save Time on Administrative Tasks
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Automate repetitive tasks and focus on what you do best—repairing electronics. Spend less time on paperwork and more time serving customers.
                  </p>
                </div>
              </div>

              <div className="flex gap-6">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-blue-600 dark:bg-blue-700 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    Secure & Reliable
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Your data is protected with enterprise-grade security. Multi-tenant architecture ensures complete data isolation between companies.
                  </p>
                </div>
              </div>

              <div className="flex gap-6">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-blue-600 dark:bg-blue-700 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    Scale with Your Business
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Whether you&apos;re a single-location shop or a multi-location operation, RepairTix grows with you. Add locations, users, and features as needed.
                  </p>
                </div>
              </div>

              <div className="flex gap-6">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-blue-600 dark:bg-blue-700 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    Role-Based Access Control
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Granular permissions for Admin, Manager, Technician, and Front Desk roles. Control who can access what, ensuring data security and workflow efficiency.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      {!maintenanceEnabled && (
        <section className="py-20 bg-gradient-to-r from-blue-600 to-blue-800 dark:from-blue-700 dark:to-blue-900">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Ready to Transform Your Repair Business?
              </h2>
              <p className="text-xl text-blue-100 mb-8">
                Join repair shops that are already streamlining their operations with RepairTix.
              </p>
              <Link
                href="/register"
                className="inline-flex items-center justify-center px-8 py-4 bg-white text-blue-600 font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5"
              >
                Get Started Free
              </Link>
              <p className="mt-6 text-sm text-blue-100">
                No credit card required • Setup in minutes • Cancel anytime
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Temporarily hidden footer links */}
          {/* <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="text-xl font-bold text-white mb-4">RepairTix</div>
              <p className="text-sm">
                The complete management solution for electronics repair businesses.
              </p>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/features" className="hover:text-white transition-colors">
                    Features
                  </Link>
                </li>
                <li>
                  <Link href="/pricing" className="hover:text-white transition-colors">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link href="/integrations" className="hover:text-white transition-colors">
                    Integrations
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/about" className="hover:text-white transition-colors">
                    About
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="hover:text-white transition-colors">
                    Contact
                  </Link>
                </li>
                <li>
                  <Link href="/blog" className="hover:text-white transition-colors">
                    Blog
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Legal</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/privacy" className="hover:text-white transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-white transition-colors">
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>
          </div> */}
          <div className="text-center text-sm">
            <p>&copy; {new Date().getFullYear()} RepairTix. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
