# CircuitSage Quick Start Guide

Welcome to CircuitSage! This guide will help you get up and running quickly.

## Getting Started

### Access the Application

Once CircuitSage is running, open your web browser and navigate to:

**http://localhost:3000**

The application works best in modern browsers (Chrome, Firefox, Safari, Edge).

### First Login

When you first access CircuitSage, use these default credentials:

- **Email**: `admin@circuitsage.com`
- **Password**: `admin123`

**Security Warning**: Change this password immediately after your first login!

#### Changing Your Password

1. Log in with the default credentials
2. Click your user avatar in the top-right corner
3. Navigate to **Settings**
4. Update your password in the **Account Settings** section

## Navigation Overview

The main navigation sidebar provides access to all features:

### Main Menu

- **Dashboard** - Overview of key metrics and recent activity
- **Tickets** - Manage repair tickets and track job status
- **Customers** - Customer database and contact information
- **Invoices** - Create and manage customer invoices
- **Inventory** - Track parts and supplies
- **Purchase Orders** - Manage supplier orders
- **Locations** - Manage business locations (multi-location support)
- **Assets** - Track business assets and equipment
- **Settings** - System settings and user management

### User Menu

Click your avatar in the top-right to access:
- Your profile information
- Theme toggle (light/dark mode)
- Logout

## Core Workflows

### Managing Customers

#### Creating a New Customer

1. Navigate to **Customers** from the sidebar
2. Click **"Add Customer"** or **"New Customer"**
3. Fill in the customer information:
   - Name (First and Last)
   - Email address
   - Phone number
   - Address (optional)
   - Notes (optional)
4. Click **"Save"** or **"Create Customer"**

#### Searching for Customers

- Use the search bar at the top of the Customers page
- Search by name, email, or phone number
- Results update as you type

#### Viewing Customer Details

1. Click on any customer from the list
2. View customer information, ticket history, and invoice history
3. Edit customer information by clicking the **"Edit"** button

### Creating and Managing Tickets

#### Creating a New Ticket

1. Navigate to **Tickets** from the sidebar
2. Click **"New Ticket"** or **"Create Ticket"**
3. Fill in ticket details:
   - **Customer**: Select from existing customers or create new
   - **Device**: Description of the device being repaired
   - **Issue**: Description of the problem
   - **Priority**: Low, Medium, High, or Urgent
   - **Location**: Select the service location
4. Click **"Create Ticket"**

The system automatically assigns a ticket number (e.g., TKT-0001).

#### Updating Ticket Status

1. Open a ticket from the Tickets list
2. Use the **Status** dropdown to update:
   - **New** - Just created
   - **In Progress** - Currently being worked on
   - **Waiting for Parts** - Parts ordered, waiting for delivery
   - **Ready for Pickup** - Repair complete, waiting for customer
   - **Completed** - Customer has picked up
   - **Cancelled** - Ticket cancelled

#### Adding Notes to Tickets

1. Open a ticket
2. Scroll to the **Notes** section
3. Add **Diagnostic Notes** (initial assessment):
   - Click **"Add Diagnostic Notes"**
   - Enter your findings
   - Save
4. Add **Repair Notes** (work performed):
   - Click **"Add Repair Notes"**
   - Enter details of the repair
   - Save

#### Assigning Technicians

1. Open a ticket
2. Find the **Assigned Technician** section
3. Select a technician from the dropdown
4. Click **"Assign"** or **"Update Assignment"**

To unassign, select "None" or "Unassigned" from the dropdown.

### Creating and Managing Invoices

#### Creating an Invoice

1. Navigate to **Invoices** from the sidebar
2. Click **"New Invoice"** or **"Create Invoice"**
3. Fill in invoice details:
   - **Customer**: Select the customer
   - **Invoice Date**: Defaults to today
   - **Due Date**: Set payment due date
   - **Location**: Select the service location
4. Click **"Create Invoice"**

The system automatically assigns an invoice number (e.g., INV-0001).

#### Adding Items to an Invoice

1. Open an invoice
2. Click **"Add Item"** or **"Add Line Item"**
3. Fill in item details:
   - **Description**: Item or service description
   - **Quantity**: Number of units
   - **Unit Price**: Price per unit
   - **Taxable**: Whether the item is taxable
4. Click **"Add Item"**

The system automatically calculates:
- Subtotal
- Tax amount
- Total

#### Editing Invoice Items

1. Open an invoice
2. Find the item in the line items list
3. Click **"Edit"** on the item
4. Modify the details
5. Click **"Save"**

#### Removing Invoice Items

1. Open an invoice
2. Find the item in the line items list
3. Click **"Delete"** or **"Remove"** on the item
4. Confirm deletion

#### Marking an Invoice as Paid

1. Open an invoice
2. Click **"Mark as Paid"** button
3. Optionally add payment notes
4. Confirm

The invoice status will update to "Paid" and the date will be recorded.

### Managing Inventory

#### Adding Inventory Items

1. Navigate to **Inventory** from the sidebar
2. Click **"Add Item"** or **"New Inventory Item"**
3. Fill in item details:
   - **Name**: Item name/description
   - **SKU**: Stock keeping unit (optional)
   - **Category**: Item category
   - **Quantity**: Current stock level
   - **Unit Cost**: Cost per unit
   - **Reorder Threshold**: Minimum quantity before reordering
   - **Location**: Storage location
4. Click **"Save"**

#### Updating Stock Levels

1. Open an inventory item
2. Click **"Edit"**
3. Update the **Quantity** field
4. Save changes

#### Low Stock Alerts

Items below their reorder threshold will be highlighted or shown in a "Low Stock" section.

### Managing Purchase Orders

#### Creating a Purchase Order

1. Navigate to **Purchase Orders** from the sidebar
2. Click **"New Purchase Order"** or **"Create PO"**
3. Fill in PO details:
   - **Supplier**: Supplier name and contact
   - **Order Date**: Date of order
   - **Expected Delivery**: Expected arrival date
   - **Location**: Delivery location
4. Add items:
   - Click **"Add Item"**
   - Enter item details (description, quantity, unit cost)
   - Save item
5. Click **"Create Purchase Order"** or **"Submit"**

#### Receiving a Purchase Order

1. Open a purchase order with status "Ordered"
2. Click **"Receive Order"**
3. Verify received quantities
4. Update quantities if different from ordered
5. Click **"Confirm Receipt"**

The system will:
- Update inventory quantities automatically
- Change PO status to "Received"

#### Cancelling a Purchase Order

1. Open a purchase order
2. Click **"Cancel Order"**
3. Optionally add cancellation reason
4. Confirm cancellation

## User Roles and Permissions

CircuitSage supports four user roles with different permission levels:

### Admin
- **Full access** to all features
- Can manage users and permissions
- Can delete records
- Can manage system settings

### Manager
- Can view and manage most features
- Can assign tickets to technicians
- Can update ticket statuses
- Cannot delete records (except inventory)
- Cannot manage user permissions

### Technician
- Can create and update tickets
- Can add diagnostic and repair notes
- Can update ticket status
- Can view customers, invoices, and inventory
- Cannot assign tickets or manage invoices
- Cannot delete records

### Front Desk
- Can create and update customers
- Can create tickets
- Can create invoices
- Can view inventory
- Limited ability to update tickets
- Cannot delete records

**Note**: Your role determines which menu items and actions are available. If you don't see a feature, you may not have permission to access it.

## Tips and Best Practices

### Ticket Management

- **Use clear descriptions**: Detailed issue descriptions help technicians diagnose problems faster
- **Update status regularly**: Keep ticket status current so customers and team members know progress
- **Add notes promptly**: Document diagnostic findings and repair work as you go
- **Assign tickets**: Assign tickets to specific technicians for accountability

### Invoice Management

- **Add items as you work**: Add invoice items as services are performed or parts are used
- **Use clear descriptions**: Item descriptions should be clear for customer records
- **Set due dates**: Set realistic due dates based on your payment terms
- **Mark paid promptly**: Update invoice status when payment is received

### Customer Management

- **Keep information current**: Update customer contact information when it changes
- **Use notes**: Add notes about customer preferences or special instructions
- **Link tickets and invoices**: Always associate tickets and invoices with the correct customer

### Inventory Management

- **Set reorder thresholds**: Configure reorder thresholds to avoid stockouts
- **Update quantities regularly**: Keep stock levels accurate for better planning
- **Use categories**: Organize inventory with categories for easier management

### General Tips

- **Use search**: The search functionality works across customers, tickets, and invoices
- **Filter views**: Use filters to focus on specific statuses, dates, or locations
- **Dark mode**: Toggle dark mode from your user menu for comfortable viewing
- **Location switching**: If you have multiple locations, use the location switcher to filter by location

## Getting Help

If you encounter issues or have questions:

1. Check that you have the necessary permissions for the action you're trying to perform
2. Verify you're logged in (check the top-right corner for your user avatar)
3. Try refreshing the page
4. Contact your system administrator

## Keyboard Shortcuts

- **Esc**: Close modals or cancel actions
- **Enter**: Submit forms

## Browser Compatibility

CircuitSage works best with:
- Chrome/Edge (latest versions)
- Firefox (latest versions)
- Safari (latest versions)

For the best experience, keep your browser updated to the latest version.

---

**Ready to get started?** Log in at http://localhost:3000 and begin managing your repair business!
