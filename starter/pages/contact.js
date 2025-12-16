import Head from 'next/head';
import { useState } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { FiMail, FiPhone, FiMapPin, FiMessageSquare } from 'react-icons/fi';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Save contact form submission to database
      const { error } = await supabase
        .from('contact_submissions')
        .insert([{
          ...formData,
          submitted_at: new Date().toISOString()
        }]);

      if (error) throw error;

      toast.success('Message sent successfully! We\'ll get back to you soon.');
      setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
    } catch (err) {
      console.error('Contact form error:', err);
      toast.error('Failed to send message. Please email us directly.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <>
      <Head>
        <title>Contact Us | Dosnine Properties</title>
        <meta name="description" content="Get in touch with Dosnine Properties. Contact us for property listings, questions about boosting your ads, or general inquiries about renting in Jamaica." />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://www.dosnine.com/contact" />
      </Head>

      <div className="min-h-screen bg-gray-50 py-12">
        <div className="container mx-auto px-4 max-w-6xl">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Contact Us</h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Have questions about listing your property or finding a rental? We're here to help!
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Contact Information */}
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Get in Touch</h2>
                
                <div className="space-y-4">
                  {/* Email */}
                  <div className="flex items-start gap-4">
                    <div className="bg-blue-100 p-3 rounded-lg">
                      <FiMail className="text-blue-600" size={24} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Email</h3>
                        <a href="mailto:info@dosnine.com" className="text-accent hover:underline">
                        info@dosnine.com
                      </a>
                      <p className="text-sm text-gray-600 mt-1">
                        We respond within 24 hours
                      </p>
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="flex items-start gap-4">
                    <div className="bg-green-100 p-3 rounded-lg">
                      <FiPhone className="text-green-600" size={24} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Phone</h3>
                        <a href="tel:+18765551234" className="text-accent hover:underline">
                        +1 (876) 555-1234
                      </a>
                      <p className="text-sm text-gray-600 mt-1">
                        Mon-Fri: 9am - 6pm (Jamaica Time)
                      </p>
                    </div>
                  </div>

                  {/* Address */}
                  <div className="flex items-start gap-4">
                    <div className="bg-purple-100 p-3 rounded-lg">
                      <FiMapPin className="text-purple-600" size={24} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Address</h3>
                      <p className="text-gray-700">
                        Dosnine Properties<br />
                        Kingston, Jamaica
                      </p>
                    </div>
                  </div>

                  {/* Support */}
                  <div className="flex items-start gap-4">
                    <div className="bg-orange-100 p-3 rounded-lg">
                      <FiMessageSquare className="text-orange-600" size={24} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Support Hours</h3>
                      <p className="text-gray-700">
                        Monday - Friday: 9:00 AM - 6:00 PM<br />
                        Saturday: 10:00 AM - 4:00 PM<br />
                        Sunday: Closed
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Links */}
              <div className="bg-blue-50 rounded-lg p-6">
                <h3 className="font-bold text-gray-900 mb-4">Quick Links</h3>
                <ul className="space-y-2">
                  <li>
                      <a href="/privacy-policy" className="text-accent hover:underline">
                      Privacy Policy
                    </a>
                  </li>
                  <li>
                      <a href="/terms-of-service" className="text-accent hover:underline">
                      Terms of Service
                    </a>
                  </li>
                  <li>
                      <a href="/refund-policy" className="text-accent hover:underline">
                      Refund Policy
                    </a>
                  </li>
                  <li>
                      <a href="/properties/boost-property" className="text-accent hover:underline">
                      Boost Your Property
                    </a>
                  </li>
                </ul>
              </div>
            </div>

            {/* Contact Form */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Send us a Message</h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Your Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="John Smith"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="john@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="+1 (876) 555-0000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subject *
                  </label>
                  <select
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select a subject</option>
                    <option value="listing">List a Property</option>
                    <option value="renting">Finding a Rental</option>
                    <option value="boost">Boost/Advertising</option>
                    <option value="support">Technical Support</option>
                    <option value="partnership">Business Partnership</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Message *
                  </label>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={6}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    placeholder="Tell us how we can help you..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition btn-accent"
                >
                  {submitting ? 'Sending...' : 'Send Message'}
                </button>

                <p className="text-sm text-gray-600 text-center">
                  We typically respond within 24 hours
                </p>
              </form>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="mt-12 bg-white rounded-lg shadow-sm p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
              Frequently Asked Questions
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">How do I list my property?</h3>
                <p className="text-gray-600">
                  Sign up for a free account, go to your landlord dashboard, and click "Post a Property". Fill in the details and upload photos.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">What is property boosting?</h3>
                <p className="text-gray-600">
                  Boosting makes your property featured for 10 days at JMD $2,500. Featured properties appear in our rotating banner and search results.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Is it free to list properties?</h3>
                <p className="text-gray-600">
                  Yes! Basic property listings are completely free. You only pay if you want to boost your property for better visibility.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">How do I contact property owners?</h3>
                <p className="text-gray-600">
                  Click on any property listing to see the owner's contact information and reach out directly.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
