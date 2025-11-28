"use client";

import { getTechnicians, Technician } from "@/lib/api";
import { getInvoicesByTicket, Invoice } from "@/lib/api/invoice.api";
import {
  addDiagnosticNote,
  addRepairNote,
  assignTechnician,
  getTicketById,
  Ticket,
  updateTicket,
  updateTicketStatus,
} from "@/lib/api/ticket.api";
import { useUser } from "@/lib/UserContext";
import { getPriorityColor, getStatusColor } from "@/lib/utils/ticketUtils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";


export default function TicketDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const { user, hasPermission, isLoading: userLoading } = useUser();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [selectedTechnicianId, setSelectedTechnicianId] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedPriority, setSelectedPriority] = useState("");
  const [newNote, setNewNote] = useState("");
  const [noteType, setNoteType] = useState<"diagnostic" | "repair">(
    "diagnostic"
  );
  const [isUpdating, setIsUpdating] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  // Parse notes from plain text (notes are appended with double newlines)
  const parseNotes = (notesText: string | null | undefined): string[] => {
    if (!notesText) return [];
    // Split by double newlines to get individual notes
    return notesText.split(/\n\n+/).filter(note => note.trim().length > 0);
  };

  const diagnosticNotes = parseNotes(ticket?.diagnosticNotes);
  const repairNotes = parseNotes(ticket?.repairNotes);

  // Check if user has permission to access this page
  useEffect(() => {
    if (!userLoading && (!user || !hasPermission("tickets.read"))) {
      router.push("/dashboard");
    }
  }, [user, userLoading, hasPermission, router]);

  // Fetch ticket data
  useEffect(() => {
    const fetchTicket = async () => {
      setIsLoading(true);
      try {
        const response = await getTicketById(params.id);
        if (response.data) {
          setTicket(response.data);
          setSelectedStatus(response.data.status);
          setSelectedPriority(response.data.priority);
        }
      } catch (err) {
        console.error("Error fetching ticket:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load ticket. Please try again."
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchTicket();
  }, [params.id]);

  // Fetch invoices for this ticket
  useEffect(() => {
    const fetchInvoices = async () => {
      if (!ticket?.id || !hasPermission("invoices.read")) {
        return;
      }
      try {
        const response = await getInvoicesByTicket(ticket.id);
        if (response.data) {
          setInvoices(response.data);
        }
      } catch (err) {
        console.error("Error fetching invoices:", err);
        // Don't show error to user, just log it
      }
    };

    fetchInvoices();
  }, [ticket?.id, hasPermission]);

  // Fetch technicians
  useEffect(() => {
    const fetchTechnicians = async () => {
      try {
        const response = await getTechnicians();
        if (response.data) {
          setTechnicians(response.data);
        }
      } catch (err) {
        console.error("Error fetching technicians:", err);
      }
    };

    fetchTechnicians();
  }, []);

  // Handle technician assignment
  const handleAssignTechnician = async () => {
    if (!ticket) return;

    setIsUpdating(true);
    try {
      const technicianId = selectedTechnicianId || null;
      const response = await assignTechnician(ticket.id, technicianId);
      if (response.data) {
        setTicket(response.data);
        setSelectedTechnicianId("");
      }
    } catch (err) {
      console.error("Error assigning technician:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to assign technician. Please try again."
      );
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle status update
  const handleStatusUpdate = async () => {
    if (!selectedStatus || !ticket || selectedStatus === ticket.status) return;

    setIsUpdating(true);
    try {
      const response = await updateTicketStatus(
        ticket.id,
        selectedStatus as
          | "new"
          | "assigned"
          | "in_progress"
          | "on_hold"
          | "completed"
          | "cancelled"
      );
      if (response.data) {
        setTicket(response.data);
      }
    } catch (err) {
      console.error("Error updating status:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update status. Please try again."
      );
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle priority update
  const handlePriorityUpdate = async () => {
    if (!selectedPriority || !ticket || selectedPriority === ticket.priority) return;

    setIsUpdating(true);
    try {
      const response = await updateTicket(ticket.id, {
        priority: selectedPriority as "low" | "medium" | "high" | "urgent",
      });
      if (response.data) {
        setTicket(response.data);
      }
    } catch (err) {
      console.error("Error updating priority:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update priority. Please try again."
      );
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle adding a note
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote || !ticket) return;

    setIsUpdating(true);
    try {
      let response;
      if (noteType === "diagnostic") {
        response = await addDiagnosticNote(ticket.id, newNote);
      } else {
        response = await addRepairNote(ticket.id, newNote);
      }

      if (response.data) {
        setTicket(response.data);
        setNewNote("");
      }
    } catch (err) {
      console.error("Error adding note:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to add note. Please try again."
      );
    } finally {
      setIsUpdating(false);
    }
  };


  // Function to format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";

    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (userLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user || !hasPermission("tickets.read")) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 dark:border-blue-500 border-r-transparent"></div>
          <p className="mt-2 text-gray-700 dark:text-gray-300">Loading ticket details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h1 className="text-xl font-bold text-red-600 dark:text-red-400">Error</h1>
          <p className="mt-2 text-gray-700 dark:text-gray-300">{error}</p>
          <button
            onClick={() => router.push("/tickets")}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 focus:ring-blue-500"
          >
            Back to Tickets
          </button>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Ticket Not Found</h1>
          <p className="mt-2 text-gray-700 dark:text-gray-300">
            The requested ticket could not be found.
          </p>
          <button
            onClick={() => router.push("/tickets")}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 focus:ring-blue-500"
          >
            Back to Tickets
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header with actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {ticket.ticketNumber}
              </h1>
              <span
                className={`ml-3 px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(
                  ticket.status
                )}`}
              >
                {ticket.status.replace("_", " ").charAt(0).toUpperCase() +
                  ticket.status.replace("_", " ").slice(1)}
              </span>
              <span
                className={`ml-2 px-3 py-1 text-xs font-medium rounded-full ${getPriorityColor(
                  ticket.priority
                )}`}
              >
                {ticket.priority.charAt(0).toUpperCase() +
                  ticket.priority.slice(1)}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Created on {formatDate(ticket.createdAt)}
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
            <button
              onClick={() => router.push("/tickets")}
              className="inline-flex items-center justify-center rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
            >
              Back to List
            </button>
            {hasPermission("invoices.create") && (
              <button
                onClick={() => router.push(`/invoices/new?customerId=${ticket.customerId}&ticketId=${ticket.id}`)}
                className="inline-flex items-center justify-center rounded-md border border-transparent bg-green-600 dark:bg-green-700 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 dark:hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
              >
                Create Invoice
              </button>
            )}
            <button
              onClick={() => router.push(`/tickets/${ticket.id}/edit`)}
              className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 dark:bg-blue-700 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
            >
              Edit Ticket
            </button>
          </div>
        </div>

        {/* Main content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left column - Ticket details */}
          <div className="md:col-span-2 bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100">
                Ticket Details
              </h3>
            </div>
            <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-5 sm:p-6">
              <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Issue Description
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                    {ticket.issueDescription}
                  </dd>
                </div>

                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Device Type
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                    {ticket.deviceType}
                  </dd>
                </div>

                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Brand / Model
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                    {ticket.deviceBrand ? ticket.deviceBrand : "N/A"}
                    {ticket.deviceModel ? ` / ${ticket.deviceModel}` : ""}
                  </dd>
                </div>

                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Serial Number
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                    {ticket.serialNumber || "N/A"}
                  </dd>
                </div>

                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Estimated Completion
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                    {ticket.estimatedCompletionDate
                      ? formatDate(ticket.estimatedCompletionDate)
                      : "Not set"}
                  </dd>
                </div>

                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Completed Date
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                    {ticket.completedDate
                      ? formatDate(ticket.completedDate)
                      : "N/A"}
                  </dd>
                </div>
                {hasPermission("invoices.read") && invoices.length > 0 && (
                  <div className="sm:col-span-2">
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Related Invoices
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                      <div className="flex flex-wrap gap-2">
                        {invoices.map((invoice) => (
                          <Link
                            key={invoice.id}
                            href={`/invoices/${invoice.id}`}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300"
                          >
                            Invoice {invoice.invoiceNumber}
                          </Link>
                        ))}
                      </div>
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Notes section */}
            <div className="px-4 py-5 sm:px-6 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100">
                Notes
              </h3>

              {/* Note tabs */}
              <div className="mt-4">
                <div className="border-b border-gray-200 dark:border-gray-700">
                  <div className="sm:flex sm:items-baseline">
                    <div className="mt-4 sm:mt-0 sm:flex-1 pb-1">
                      <div className="sm:hidden">
                        <label htmlFor="note-tabs" className="sr-only">
                          Select note type
                        </label>
                        <select
                          id="note-tabs"
                          className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-blue-500 dark:focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-500 sm:text-sm rounded-md"
                          value={noteType}
                          onChange={(e) =>
                            setNoteType(
                              e.target.value as "diagnostic" | "repair"
                            )
                          }
                        >
                          <option value="diagnostic">Diagnostic Notes</option>
                          <option value="repair">Repair Notes</option>
                        </select>
                      </div>
                      <div className="hidden sm:block">
                        <nav className="-mb-px flex space-x-8">
                          <button
                            onClick={() => setNoteType("diagnostic")}
                            className={`${
                              noteType === "diagnostic"
                                ? "border-blue-500 text-blue-600 dark:text-blue-400 dark:border-blue-400"
                                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"
                            } whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm`}
                          >
                            Diagnostic Notes
                          </button>
                          <button
                            onClick={() => setNoteType("repair")}
                            className={`${
                              noteType === "repair"
                                ? "border-blue-500 text-blue-600 dark:text-blue-400 dark:border-blue-400"
                                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"
                            } whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm`}
                          >
                            Repair Notes
                          </button>
                        </nav>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notes content */}
                <div className="mt-4">
                  {noteType === "diagnostic" ? (
                    <div>
                      {diagnosticNotes.length === 0 ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                          No diagnostic notes yet
                        </p>
                      ) : (
                        <ul className="space-y-4">
                          {diagnosticNotes.map((note, index) => (
                            <li
                              key={index}
                              className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-md"
                            >
                              <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                                {note.trim()}
                              </p>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ) : (
                    <div>
                      {repairNotes.length === 0 ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                          No repair notes yet
                        </p>
                      ) : (
                        <ul className="space-y-4">
                          {repairNotes.map((note, index) => (
                            <li
                              key={index}
                              className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-md"
                            >
                              <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                                {note.trim()}
                              </p>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  {/* Add note form */}
                  <form onSubmit={handleAddNote} className="mt-6">
                    <div>
                      <label
                        htmlFor="new-note"
                        className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                      >
                        Add{" "}
                        {noteType === "diagnostic" ? "Diagnostic" : "Repair"}{" "}
                        Note
                      </label>
                      <textarea
                        id="new-note"
                        name="new-note"
                        rows={3}
                        className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500 shadow-sm focus:border-blue-500 dark:focus:border-blue-500 focus:ring-blue-500 dark:focus:ring-blue-500 sm:text-sm"
                        placeholder="Enter your note here..."
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                      ></textarea>
                    </div>
                    <div className="mt-2 flex justify-end">
                      <button
                        type="submit"
                        disabled={isUpdating || !newNote}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 focus:ring-blue-500 disabled:opacity-50"
                      >
                        {isUpdating ? "Adding..." : "Add Note"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>

          {/* Right column - Customer and Actions */}
          <div className="md:col-span-1 space-y-6">
            {/* Customer info */}
            <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100">
                  Customer
                </h3>
              </div>
              <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-5 sm:p-6">
                {ticket.customer ? (
                  <>
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                        <span className="text-lg font-medium text-gray-500 dark:text-gray-300">
                          {ticket.customer.firstName?.charAt(0) || "?"}
                          {ticket.customer.lastName?.charAt(0) || ""}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {ticket.customer.firstName} {ticket.customer.lastName}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {ticket.customer.email}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4">
                      {ticket.customer.phone && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          <span className="font-medium">Phone:</span>{" "}
                          {ticket.customer.phone}
                        </p>
                      )}
                    </div>
                    <div className="mt-3">
                      <button
                        onClick={() =>
                          router.push(`/customers/${ticket.customer.id}`)
                        }
                        className="text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        View Customer Details
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                    Customer information not available
                  </p>
                )}
              </div>
            </div>

            {/* Technician info */}
            <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100">
                  Technician
                </h3>
              </div>
              <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-5 sm:p-6">
                {ticket.technician ? (
                  <div>
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <span className="text-lg font-medium text-blue-600 dark:text-blue-400">
                          {ticket.technician.firstName?.charAt(0) || "?"}
                          {ticket.technician.lastName?.charAt(0) || ""}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {ticket.technician.firstName}{" "}
                          {ticket.technician.lastName}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {ticket.technician.email}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                    No technician assigned
                  </p>
                )}

                {/* Assign technician */}
                <div className="mt-4">
                  <label
                    htmlFor="technician"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    {ticket.technician
                      ? "Reassign Technician"
                      : "Assign Technician"}
                  </label>
                  <div className="mt-1 flex">
                    <select
                      id="technician"
                      name="technician"
                      className="block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 shadow-sm focus:border-blue-500 dark:focus:border-blue-500 focus:ring-blue-500 dark:focus:ring-blue-500 sm:text-sm"
                      value={selectedTechnicianId}
                      onChange={(e) => setSelectedTechnicianId(e.target.value)}
                    >
                      <option value="">{ticket.technician ? "Unassign" : "Select a technician"}</option>
                      {technicians.map((tech) => (
                        <option key={tech.id} value={tech.id}>
                          {tech.firstName} {tech.lastName}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleAssignTechnician}
                      disabled={isUpdating}
                      className="ml-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 focus:ring-blue-500 disabled:opacity-50"
                    >
                      {isUpdating ? "Updating..." : ticket.technician && !selectedTechnicianId ? "Unassign" : "Assign"}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Status actions */}
            <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100">
                  Status
                </h3>
              </div>
              <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-5 sm:p-6">
                <label
                  htmlFor="status"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Update Status
                </label>
                <div className="mt-1 flex">
                  <select
                    id="status"
                    name="status"
                    className="block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 shadow-sm focus:border-blue-500 dark:focus:border-blue-500 focus:ring-blue-500 dark:focus:ring-blue-500 sm:text-sm"
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                  >
                    <option value="new">New</option>
                    <option value="assigned">Assigned</option>
                    <option value="in_progress">In Progress</option>
                    <option value="on_hold">On Hold</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleStatusUpdate}
                    disabled={isUpdating || selectedStatus === ticket.status}
                    className="ml-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {isUpdating ? "Updating..." : "Update"}
                  </button>
                </div>
              </div>
            </div>

            {/* Priority actions */}
            <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100">
                  Priority
                </h3>
              </div>
              <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-5 sm:p-6">
                <label
                  htmlFor="priority"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Update Priority
                </label>
                <div className="mt-1 flex">
                  <select
                    id="priority"
                    name="priority"
                    className="block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 shadow-sm focus:border-blue-500 dark:focus:border-blue-500 focus:ring-blue-500 dark:focus:ring-blue-500 sm:text-sm"
                    value={selectedPriority}
                    onChange={(e) => setSelectedPriority(e.target.value)}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                  <button
                    type="button"
                    onClick={handlePriorityUpdate}
                    disabled={isUpdating || selectedPriority === ticket.priority}
                    className="ml-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {isUpdating ? "Updating..." : "Update"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
