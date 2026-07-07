import React, { forwardRef } from 'react';
import { Mail, Phone, MessageCircle, Zap, Building2, Image as ImageIcon } from 'lucide-react';

const HtvInvoice = forwardRef(({ order, onClose }, ref) => {
  if (!order) return null;

  const getInvoiceNumber = (uuid) => {
    return uuid ? uuid.substring(0, 8).toUpperCase() : 'N/A';
  };

  const formatPhoneNumber = (phone) => {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('876') || cleaned.startsWith('1876')) {
      return `+1${cleaned.slice(-10)}`;
    }
    if (!cleaned.startsWith('1') && cleaned.length === 10) {
      return `+1876${cleaned}`;
    }
    if (cleaned.length === 7) {
      return `+1876${cleaned}`;
    }
    return `+1${cleaned}`;
  };

  const invoiceNumber = getInvoiceNumber(order.id);
  const invoiceDate = new Date(order.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const rawMaterials = Array.isArray(order.raw_materials) ? order.raw_materials : [];
  const formattedEmail = order.email ? order.email : '';
  const formattedPhone = formatPhoneNumber(order.phone);
  
  return (
    <div ref={ref} className="invoice-container">
      {/* Header */}
      <div className="invoice-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src="/logos/dosnine_co_logo.png" alt="Dosnine Logo" style={{ height: '50px', width: 'auto' }} />
          <div>
            <h1 className="invoice-logo">DOSNINE</h1>
            <p className="invoice-logo-subtitle">Dosnine Ltd</p>
          </div>
        </div>
        <div>
          <h2 className="invoice-title">INVOICE</h2>
          <p className="invoice-title-number">Invoice #: {invoiceNumber}</p>
        </div>
      </div>

      {/* Invoice Details */}
      <div className="invoice-details">
        {/* From Section */}
        <div>
          <h3 className="invoice-section-title">From:</h3>
          <p className="invoice-contact-name">Dosnine Ltd</p>
          <div className="invoice-contact-line">
            <Mail size={14} />
            <span>dosnineco@gmail.com</span>
          </div>
          <div className="invoice-contact-line">
            <Phone size={14} />
            <span>876-336-9045</span>
          </div>
          <div className="invoice-contact-line">
            <MessageCircle size={14} />
            <span>WhatsApp: 876-336-9045</span>
          </div>
        </div>

        {/* To Section */}
        <div>
          <h3 className="invoice-section-title">Bill To:</h3>
          <p className="invoice-contact-name">{order.business_name}</p>
          {formattedEmail && (
            <div className="invoice-contact-line">
              <Mail size={14} />
              <span>{formattedEmail}</span>
            </div>
          )}
          {formattedPhone && (
            <div className="invoice-contact-line">
              <Phone size={14} />
              <span>{formattedPhone}</span>
            </div>
          )}
        </div>
      </div>

      {/* Invoice Meta */}
      <div className="invoice-meta">
        <div>
          <p className="invoice-meta-label">INVOICE DATE:</p>
          <p className="invoice-meta-value">{invoiceDate}</p>
        </div>
        <div>
          <p className="invoice-meta-label">ORDER ID:</p>
          <p className="invoice-meta-value">{invoiceNumber}</p>
        </div>
      </div>

      {/* Items Table */}
      <table className="invoice-table">
        <thead className="invoice-table-header">
          <tr>
            <th>DESCRIPTION</th>
            <th className="invoice-table-align-center">QUANTITY</th>
            <th style={{ textAlign: 'right' }}>UNIT PRICE</th>
            <th style={{ textAlign: 'right' }}>TOTAL</th>
          </tr>
        </thead>
        <tbody>
          {/* Main Order Item */}
          <tr>
            <td>
              Custom Logo Cutting - {order.quantity} Pack{order.quantity > 1 ? 's' : ''} ({order.size ? order.size.charAt(0).toUpperCase() + order.size.slice(1) : 'Custom'})
              {order.rush_order && <span className="invoice-rush-badge"><Zap size={12} style={{ display: 'inline' }} /> RUSH</span>}
            </td>
            <td className="invoice-table-align-center">{order.quantity}</td>
            <td className="invoice-table-align-right" style={{ textAlign: 'right' }}>JMD {(order.subtotal / order.quantity).toLocaleString()}</td>
            <td className="invoice-table-align-right" style={{ textAlign: 'right' }}>JMD {order.subtotal.toLocaleString()}</td>
          </tr>

          {/* Additional Logo Work Charge */}
          {(order.logo_work_charge || 0) > 0 && (
            <tr className="invoice-table-row-material">
              <td>Additional Logo Work Charge (Professional Processing)</td>
              <td className="invoice-table-align-center">1</td>
              <td className="invoice-table-align-right" style={{ textAlign: 'right' }}>JMD {Number(order.logo_work_charge).toLocaleString()}</td>
              <td className="invoice-table-align-right" style={{ textAlign: 'right' }}>JMD {Number(order.logo_work_charge).toLocaleString()}</td>
            </tr>
          )}

          {/* Raw Materials */}
          {rawMaterials.length > 0 && rawMaterials.map((material, idx) => (
            <tr key={idx} className="invoice-table-row-material">
              <td>Material: {material.material || material.name}</td>
              <td className="invoice-table-align-center">1</td>
              <td className="invoice-table-align-right" style={{ textAlign: 'right' }}>JMD {Number(material.cost || material.price || 0).toLocaleString()}</td>
              <td className="invoice-table-align-right" style={{ textAlign: 'right' }}>JMD {Number(material.cost || material.price || 0).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="invoice-totals">
        <div className="invoice-totals-box">
          <div className="invoice-totals-row">
            <span>Subtotal:</span>
            <span>JMD {order.subtotal.toLocaleString()}</span>
          </div>
          <div className="invoice-totals-row invoice-totals-row-total">
            <span>TOTAL:</span>
            <span>JMD {order.total.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Payment Terms */}
      <div className="invoice-payment">
        <h3 className="invoice-payment-title">Payment Instructions</h3>
        
        <div className="invoice-payment-section">
          <p className="invoice-payment-label">
            <Building2 size={14} style={{ display: 'inline', marginRight: '5px' }} />
            NCB ACCOUNT:
          </p>
          <div className="invoice-payment-details">
            <p className="invoice-payment-detail-line">Name: Tahjay Thompson</p>
            <p className="invoice-payment-detail-line">Account Number: 401337768</p>
            <p className="invoice-payment-detail-line">Account Type: Checking</p>
          </div>
        </div>

        <div className="invoice-payment-section">
          <p className="invoice-payment-label">
            <Building2 size={14} style={{ display: 'inline', marginRight: '5px' }} />
            SCOTIABANK ACCOUNT:
          </p>
          <div className="invoice-payment-details">
            <p className="invoice-payment-detail-line">First Name: Tahjay</p>
            <p className="invoice-payment-detail-line">Last Name: Thompson</p>
            <p className="invoice-payment-detail-line">Branch/Transit Number: 50575</p>
            <p className="invoice-payment-detail-line">Account Type: Savings</p>
            <p className="invoice-payment-detail-line">Account Number: 50575 010860258</p>
            <p className="invoice-payment-detail-line">Currency: JMD</p>
          </div>
        </div>
      </div>

      {/* Notes */}
      {order.notes && (
        <div className="invoice-notes">
          <p className="invoice-notes-label">NOTES:</p>
          <p className="invoice-notes-text">{order.notes}</p>
        </div>
      )}

      {/* Footer */}
      <div className="invoice-footer">
        <p className="invoice-footer-line">Thank you for your business! Invoice generated on {new Date().toLocaleDateString()}</p>
        <p className="invoice-footer-line">Dosnine Ltd | dosnineco@gmail.com | 876-336-9045</p>
      </div>
    </div>
  );
});

HtvInvoice.displayName = 'HtvInvoice';

export default HtvInvoice;
