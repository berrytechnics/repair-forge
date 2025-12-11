"use client";

import { Invoice, InvoiceItem } from "../api/invoice.api";

/**
 * Format a date string to a readable format
 */
function formatDate(dateString?: string): string {
  if (!dateString) return "N/A";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateString;
  }
}

/**
 * Format a number as currency
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

/**
 * Generate a PDF invoice from invoice data
 * Uses @react-pdf/renderer for React/Next.js compatibility
 */
export async function generateInvoicePDF(invoice: Invoice): Promise<void> {
  // Ensure we're in the browser
  if (typeof window === "undefined") {
    throw new Error("PDF generation is only available in the browser");
  }

  // Dynamic import for client-side only libraries
  // Use direct import so webpack can bundle it properly
  const reactPdfModule = await import("@react-pdf/renderer");
  const { pdf, Document, Page, Text, View, StyleSheet } = reactPdfModule;

  // Create styles
  const styles = StyleSheet.create({
    page: {
      padding: 40,
      fontSize: 10,
      fontFamily: "Helvetica",
    },
    header: {
      marginBottom: 30,
    },
    companyName: {
      fontSize: 20,
      fontWeight: "bold",
      color: "#2980b9",
      marginBottom: 5,
    },
    companySubtitle: {
      fontSize: 10,
      color: "#34495e",
      marginBottom: 3,
    },
    invoiceTitle: {
      fontSize: 24,
      fontWeight: "bold",
      color: "#2980b9",
      textAlign: "right",
      marginBottom: 10,
    },
    invoiceInfo: {
      fontSize: 12,
      color: "#34495e",
      textAlign: "right",
      marginBottom: 5,
    },
    section: {
      marginBottom: 20,
    },
    sectionTitle: {
      fontSize: 11,
      fontWeight: "bold",
      color: "#34495e",
      marginBottom: 7,
    },
    customerInfo: {
      fontSize: 10,
      color: "#34495e",
      marginBottom: 3,
    },
    table: {
      marginBottom: 20,
    },
    tableRow: {
      flexDirection: "row",
      borderBottomWidth: 1,
      borderBottomColor: "#e0e0e0",
      borderBottomStyle: "solid",
      paddingVertical: 8,
    },
    tableHeader: {
      backgroundColor: "#2980b9",
      flexDirection: "row",
      paddingVertical: 8,
    },
    tableHeaderText: {
      color: "#ffffff",
      fontWeight: "bold",
      fontSize: 10,
    },
    tableCell: {
      fontSize: 9,
      color: "#34495e",
    },
    colDescription: {
      width: "40%",
      paddingRight: 10,
    },
    colQty: {
      width: "10%",
      textAlign: "center",
      paddingRight: 10,
    },
    colPrice: {
      width: "20%",
      textAlign: "right",
      paddingRight: 10,
    },
    colDiscount: {
      width: "15%",
      textAlign: "center",
      paddingRight: 10,
    },
    colTotal: {
      width: "15%",
      textAlign: "right",
    },
    totalsSection: {
      marginTop: 20,
      marginBottom: 20,
    },
    totalRow: {
      flexDirection: "row",
      justifyContent: "flex-end",
      marginBottom: 5,
    },
    totalLabel: {
      fontSize: 10,
      color: "#34495e",
      width: 100,
      textAlign: "right",
      marginRight: 10,
    },
    totalValue: {
      fontSize: 10,
      color: "#34495e",
      width: 80,
      textAlign: "right",
    },
    grandTotal: {
      flexDirection: "row",
      justifyContent: "flex-end",
      marginTop: 10,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: "#2980b9",
      borderTopStyle: "solid",
    },
    grandTotalLabel: {
      fontSize: 12,
      fontWeight: "bold",
      color: "#2980b9",
      width: 100,
      textAlign: "right",
      marginRight: 10,
    },
    grandTotalValue: {
      fontSize: 12,
      fontWeight: "bold",
      color: "#2980b9",
      width: 80,
      textAlign: "right",
    },
    statusBadge: {
      color: "#ffffff",
      padding: 4,
      borderRadius: 3,
      fontSize: 9,
      fontWeight: "bold",
      textAlign: "center",
      width: 60,
      marginLeft: "auto",
    },
    notes: {
      marginTop: 20,
      fontSize: 9,
      color: "#34495e",
    },
    footer: {
      position: "absolute",
      bottom: 30,
      left: 40,
      right: 40,
      textAlign: "center",
      fontSize: 8,
      color: "#95a5a6",
      fontStyle: "italic",
    },
  });

  // Create the PDF document
  const InvoiceDocument = (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 20 }}>
            <View>
              <Text style={styles.companyName}>RepairTix</Text>
              <Text style={styles.companySubtitle}>Electronics Repair Services</Text>
              <Text style={styles.companySubtitle}>123 Repair Street</Text>
              <Text style={styles.companySubtitle}>City, State 12345</Text>
              <Text style={styles.companySubtitle}>Phone: (555) 123-4567</Text>
              <Text style={styles.companySubtitle}>Email: info@repairtix.com</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.invoiceTitle}>INVOICE</Text>
              <Text style={styles.invoiceInfo}>Invoice #: {invoice.invoiceNumber}</Text>
              {invoice.issueDate && (
                <Text style={styles.invoiceInfo}>Issue Date: {formatDate(invoice.issueDate)}</Text>
              )}
              {invoice.dueDate && (
                <Text style={styles.invoiceInfo}>Due Date: {formatDate(invoice.dueDate)}</Text>
              )}
              <View style={{ marginTop: 5 }}>
                <Text style={[
                  styles.statusBadge,
                  {
                    backgroundColor:
                      invoice.status === "paid"
                        ? "#2ecc71"
                        : invoice.status === "overdue"
                        ? "#e74c3c"
                        : "#95a5a6",
                  },
                ]}>
                  {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Customer Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bill To:</Text>
          {invoice.customer ? (
            <>
              <Text style={styles.customerInfo}>
                {invoice.customer.firstName} {invoice.customer.lastName}
              </Text>
              {invoice.customer.phone && (
                <Text style={styles.customerInfo}>{invoice.customer.phone}</Text>
              )}
              {invoice.customer.email && (
                <Text style={styles.customerInfo}>{invoice.customer.email}</Text>
              )}
              {invoice.customer.address && (
                <Text style={styles.customerInfo}>{invoice.customer.address}</Text>
              )}
              {invoice.customer.city && (
                <Text style={styles.customerInfo}>
                  {[invoice.customer.city, invoice.customer.state, invoice.customer.zipCode]
                    .filter(Boolean)
                    .join(", ")}
                </Text>
              )}
            </>
          ) : (
            <Text style={styles.customerInfo}>Customer information not available</Text>
          )}
        </View>

        {/* Invoice Items Table */}
        <View style={styles.section}>
          <View style={styles.table}>
            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, styles.colDescription]}>Description</Text>
              <Text style={[styles.tableHeaderText, styles.colQty]}>Qty</Text>
              <Text style={[styles.tableHeaderText, styles.colPrice]}>Unit Price</Text>
              <Text style={[styles.tableHeaderText, styles.colDiscount]}>Discount</Text>
              <Text style={[styles.tableHeaderText, styles.colTotal]}>Total</Text>
            </View>
            {/* Table Rows */}
            {invoice.invoiceItems && invoice.invoiceItems.length > 0 ? (
              invoice.invoiceItems.map((item: InvoiceItem) => {
                const lineTotal = item.quantity * item.unitPrice;
                const discountAmount = item.discountPercent
                  ? lineTotal * (item.discountPercent / 100)
                  : 0;
                const finalLineTotal = lineTotal - discountAmount;

                return (
                  <View key={item.id} style={styles.tableRow}>
                    <Text style={[styles.tableCell, styles.colDescription]}>
                      {item.description || "N/A"}
                    </Text>
                    <Text style={[styles.tableCell, styles.colQty]}>{item.quantity}</Text>
                    <Text style={[styles.tableCell, styles.colPrice]}>
                      {formatCurrency(item.unitPrice)}
                    </Text>
                    <Text style={[styles.tableCell, styles.colDiscount]}>
                      {item.discountPercent ? `${item.discountPercent}%` : "-"}
                    </Text>
                    <Text style={[styles.tableCell, styles.colTotal]}>
                      {formatCurrency(finalLineTotal)}
                    </Text>
                  </View>
                );
              })
            ) : (
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, styles.colDescription]}>No items</Text>
              </View>
            )}
          </View>
        </View>

        {/* Totals Section */}
        <View style={styles.totalsSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal:</Text>
            <Text style={styles.totalValue}>{formatCurrency(invoice.subtotal)}</Text>
          </View>
          {invoice.taxRate > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Tax ({invoice.taxRate}%):</Text>
              <Text style={styles.totalValue}>{formatCurrency(invoice.taxAmount)}</Text>
            </View>
          )}
          {invoice.discountAmount > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Discount:</Text>
              <Text style={[styles.totalValue, { color: "#e74c3c" }]}>
                -{formatCurrency(invoice.discountAmount)}
              </Text>
            </View>
          )}
          <View style={styles.grandTotal}>
            <Text style={styles.grandTotalLabel}>Total:</Text>
            <Text style={styles.grandTotalValue}>{formatCurrency(invoice.totalAmount)}</Text>
          </View>
        </View>

        {/* Payment Information */}
        {invoice.status === "paid" && invoice.paidDate && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: "#2ecc71" }]}>PAID</Text>
            <Text style={styles.customerInfo}>Paid on: {formatDate(invoice.paidDate)}</Text>
            {invoice.paymentMethod && (
              <Text style={styles.customerInfo}>Payment Method: {invoice.paymentMethod}</Text>
            )}
            {invoice.paymentReference && (
              <Text style={styles.customerInfo}>Reference: {invoice.paymentReference}</Text>
            )}
          </View>
        )}

        {/* Notes */}
        {invoice.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes:</Text>
            <Text style={styles.notes}>{invoice.notes}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text>Thank you for your business!</Text>
          <Text style={{ marginTop: 5 }}>
            Generated on {formatDate(new Date().toISOString())}
          </Text>
        </View>
      </Page>
    </Document>
  );

  // Generate and open the PDF in a new tab
  const blob = await pdf(InvoiceDocument).toBlob();
  const url = URL.createObjectURL(blob);
  const newWindow = window.open(url, "_blank");
  if (newWindow) {
    // Clean up the URL after a delay to allow the browser to load it
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 100);
  } else {
    // If popup was blocked, fall back to download
    const link = document.createElement("a");
    link.href = url;
    link.download = `invoice-${invoice.invoiceNumber}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
