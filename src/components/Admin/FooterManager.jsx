import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { api } from '../../api/axios';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import './FooterManager.css';
import { FaPlus, FaEdit, FaTrash, FaSave, FaTimes } from 'react-icons/fa';

function FooterManager() {
  const [staticPages, setStaticPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [currentPage, setCurrentPage] = useState(null);
  const [footerSections, setFooterSections] = useState(['main', 'links', 'social']);
  const [showAddSection, setShowAddSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    content: '',
    is_published: true,
    show_in_footer: true,
    footer_section: 'main', // Default section
    external_link: '' // Link eksternal (opsional)
  });

  // Konfigurasi ReactQuill
  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['link', 'image'],
      ['clean']
    ],
  };

  const quillFormats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'list', 'bullet',
    'link', 'image'
  ];

  // Fetch static pages
  const fetchStaticPages = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/static-pages');
      if (response.data && response.data.success) {
        setStaticPages(response.data.data);
      } else {
        setError('Gagal memuat halaman statis');
      }
    } catch (error) {
      console.error('Error fetching static pages:', error);
      setError('Terjadi kesalahan saat memuat halaman statis');
    } finally {
      setLoading(false);
    }
  };

  // Fetch footer sections
  const fetchFooterSections = async () => {
    try {
      const response = await api.get('/api/static-pages/public/footer-sections');
      if (response.data && response.data.success) {
        setFooterSections(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching footer sections:', error);
      // Fallback ke bagian default jika gagal
      setFooterSections(['main', 'links', 'social']);
    }
  };

  useEffect(() => {
    fetchStaticPages();
    fetchFooterSections();
  }, []);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;

    // Jika mengubah slug, update juga external_link
    if (name === 'slug') {
      const newSlug = value;
      const newExternalLink = generateExternalLink(newSlug);

      setFormData({
        ...formData,
        [name]: type === 'checkbox' ? checked : value,
        external_link: newExternalLink
      });
    } else {
      setFormData({
        ...formData,
        [name]: type === 'checkbox' ? checked : value
      });
    }
  };

  // Handle content change from ReactQuill
  const handleContentChange = (content) => {
    setFormData({
      ...formData,
      content
    });
  };

  // Generate slug from title
  const generateSlug = (title) => {
    return title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  // Generate default external link from slug
  const generateExternalLink = (slug) => {
    // Gunakan variabel lingkungan FRONTEND_URL alih-alih URL statis
    const frontendUrl = import.meta.env.VITE_FRONTEND_URL || import.meta.env.FRONTEND_URL || 'http://localhost:5173';
    return `${frontendUrl}/page/${slug}`;
  };

  // Handle title change and auto-generate slug and external_link
  const handleTitleChange = (e) => {
    const title = e.target.value;
    const slug = generateSlug(title);
    const externalLink = generateExternalLink(slug);

    setFormData({
      ...formData,
      title,
      slug,
      external_link: externalLink
    });
  };

  // Add new page
  const handleAddPage = () => {
    setCurrentPage(null);
    setFormData({
      title: '',
      slug: '',
      content: '',
      is_published: true,
      show_in_footer: true,
      footer_section: 'main',
      external_link: ''
    });
    setEditMode(true);
  };

  // Edit existing page
  const handleEditPage = (page) => {
    setCurrentPage(page);
    setFormData({
      title: page.title,
      slug: page.slug,
      content: page.content,
      is_published: page.is_published,
      show_in_footer: page.show_in_footer,
      footer_section: page.footer_section || 'main',
      external_link: page.external_link || generateExternalLink(page.slug)
    });
    setEditMode(true);
  };

  // Delete page
  const handleDeletePage = async (pageId) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus halaman ini?')) {
      return;
    }

    try {
      const response = await api.delete(`/api/static-pages/${pageId}`);
      if (response.data && response.data.success) {
        toast.success('Halaman berhasil dihapus');
        fetchStaticPages();
      } else {
        toast.error('Gagal menghapus halaman');
      }
    } catch (error) {
      console.error('Error deleting page:', error);
      toast.error('Terjadi kesalahan saat menghapus halaman');
    }
  };

  // Save page (create or update)
  const handleSavePage = async (e) => {
    e.preventDefault();

    // Validate form
    if (!formData.title || !formData.slug || !formData.content) {
      toast.error('Judul, slug, dan konten harus diisi');
      return;
    }

    try {
      let response;
      if (currentPage) {
        // Update existing page
        response = await api.put(`/api/static-pages/${currentPage.id}`, formData);
      } else {
        // Create new page
        response = await api.post('/api/static-pages', formData);
      }

      if (response.data && response.data.success) {
        toast.success(currentPage ? 'Halaman berhasil diperbarui' : 'Halaman baru berhasil dibuat');
        setEditMode(false);
        fetchStaticPages();
      } else {
        toast.error(currentPage ? 'Gagal memperbarui halaman' : 'Gagal membuat halaman baru');
      }
    } catch (error) {
      console.error('Error saving page:', error);
      toast.error('Terjadi kesalahan saat menyimpan halaman');
    }
  };

  // Cancel edit mode
  const handleCancel = () => {
    setEditMode(false);
    setCurrentPage(null);
  };

  // Handle adding new footer section
  const handleAddSection = () => {
    setShowAddSection(true);
  };

  // Handle saving new footer section
  const handleSaveSection = () => {
    if (!newSectionName.trim()) {
      toast.error('Nama kelompok tidak boleh kosong');
      return;
    }

    // Konversi ke format yang konsisten (lowercase, tanpa spasi)
    const formattedSectionName = newSectionName
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '');

    if (footerSections.includes(formattedSectionName)) {
      toast.error('Kelompok footer dengan nama tersebut sudah ada');
      return;
    }

    // Tambahkan bagian baru ke daftar
    setFooterSections([...footerSections, formattedSectionName]);
    setNewSectionName('');
    setShowAddSection(false);

    toast.success(
      <div>
        <strong>Kelompok footer baru berhasil ditambahkan!</strong>
        <p>Kelompok "{newSectionName}" sekarang tersedia di dropdown "Pengelompokan di Footer".</p>
        <p>Anda dapat menambahkan halaman ke kelompok ini.</p>
      </div>,
      { duration: 5000 }
    );
  };

  // Handle canceling add section
  const handleCancelAddSection = () => {
    setShowAddSection(false);
    setNewSectionName('');
  };

  // Group pages by footer section
  const groupedPages = staticPages.reduce((acc, page) => {
    const section = page.footer_section || 'main';
    if (!acc[section]) {
      acc[section] = [];
    }
    acc[section].push(page);
    return acc;
  }, {});

  return (
    <div className="footer-manager">
      <div className="footer-manager-header">
        <h2>Kelola Halaman Footer</h2>
        {!editMode && (
          <button className="add-page-button" onClick={handleAddPage}>
            <FaPlus /> Tambah Halaman Baru
          </button>
        )}
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Memuat halaman...</p>
        </div>
      ) : error ? (
        <div className="error-message">{error}</div>
      ) : editMode ? (
        <div className="page-form-container">
          <h3>{currentPage ? 'Edit Halaman' : 'Tambah Halaman Baru'}</h3>
          <form onSubmit={handleSavePage} className="page-form">
            <div className="form-group">
              <label htmlFor="title">Judul Halaman</label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleTitleChange}
                required
              />
              <small>Judul ini akan ditampilkan sebagai judul utama halaman dan di breadcrumb.</small>
            </div>

            <div className="form-group">
              <label htmlFor="slug">Slug (URL)</label>
              <input
                type="text"
                id="slug"
                name="slug"
                value={formData.slug}
                onChange={handleInputChange}
                required
              />
              <small>URL halaman akan menjadi: /page/{formData.slug}</small>
            </div>

            <div className="form-group">
              <label htmlFor="external_link">Link Eksternal</label>
              <input
                type="text"
                id="external_link"
                name="external_link"
                value={formData.external_link}
                onChange={handleInputChange}
              />
              <small>
                Link ini akan digunakan untuk mengarahkan ke halaman tertentu.
                Secara default dibuat otomatis dari slug menggunakan FRONTEND_URL dari variabel lingkungan.
                Anda dapat mengubahnya ke URL eksternal lain jika diperlukan.
              </small>
            </div>

            <div className="form-group">
              <label htmlFor="footer_section">Pengelompokan di Footer</label>
              <div className="footer-section-selector">
                <select
                  id="footer_section"
                  name="footer_section"
                  value={formData.footer_section}
                  onChange={handleInputChange}
                >
                  {footerSections.map(section => (
                    <option key={section} value={section}>
                      {section === 'main' && 'Utama'}
                      {section === 'links' && 'Tautan Berguna'}
                      {section === 'social' && 'Sosial Media'}
                      {!['main', 'links', 'social'].includes(section) && section.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="add-section-button"
                  onClick={handleAddSection}
                  title="Tambah Kelompok Baru"
                >
                  <FaPlus />
                </button>
              </div>
              <small>Ini hanya menentukan di bagian mana halaman ini akan ditampilkan di footer, bukan judul halaman.</small>
              {showAddSection && (
                <div className="add-section-form">
                  <h4 className="add-section-title">Tambah Kelompok Footer Baru</h4>
                  <p className="add-section-description">
                    Kelompok footer digunakan untuk mengelompokkan halaman-halaman di footer.
                    Nama kelompok akan ditampilkan sebagai judul bagian di footer.
                  </p>
                  <input
                    type="text"
                    placeholder="Nama Kelompok Baru (mis: Informasi, Donasi)"
                    value={newSectionName}
                    onChange={(e) => setNewSectionName(e.target.value)}
                    className="section-name-input"
                  />
                  <div className="section-actions">
                    <button
                      type="button"
                      className="save-section-button"
                      onClick={handleSaveSection}
                    >
                      <FaSave /> Simpan Kelompok
                    </button>
                    <button
                      type="button"
                      className="cancel-section-button"
                      onClick={handleCancelAddSection}
                    >
                      <FaTimes /> Batal
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  name="is_published"
                  checked={formData.is_published}
                  onChange={handleInputChange}
                />
                Publikasikan Halaman
              </label>
            </div>

            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  name="show_in_footer"
                  checked={formData.show_in_footer}
                  onChange={handleInputChange}
                />
                Tampilkan di Footer
              </label>
            </div>

            <div className="form-group">
              <label htmlFor="content">Konten Halaman</label>
              <div className="editor-container">
                <ReactQuill
                  theme="snow"
                  value={formData.content}
                  onChange={handleContentChange}
                  modules={quillModules}
                  formats={quillFormats}
                  className="quill-editor"
                />
                <small>Gunakan toolbar di atas untuk memformat teks, menambahkan link, gambar, dll.</small>
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="save-button">
                <FaSave /> {currentPage ? 'Perbarui Halaman' : 'Simpan Halaman'}
              </button>
              <button type="button" className="cancel-button" onClick={handleCancel}>
                <FaTimes /> Batal
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="pages-container">
          {Object.keys(groupedPages).length === 0 ? (
            <div className="no-pages">
              <p>Belum ada halaman statis yang dibuat</p>
              <button className="add-page-button" onClick={handleAddPage}>
                <FaPlus /> Tambah Halaman Baru
              </button>
            </div>
          ) : (
            <div className="footer-sections">
              {Object.entries(groupedPages).map(([section, pages]) => (
                <div key={section} className="footer-section">
                  <h3 className="section-title">
                    <span className="section-title-label">Kelompok Footer: </span>
                    {section === 'main' && 'Utama'}
                    {section === 'links' && 'Tautan Berguna'}
                    {section === 'social' && 'Sosial Media'}
                    {!['main', 'links', 'social'].includes(section) && section.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </h3>
                  <div className="pages-list">
                    {pages.map(page => (
                      <div key={page.id} className="page-item">
                        <div className="page-info">
                          <h4 className="page-title">{page.title}</h4>
                          <div className="page-meta">
                            <span className="page-slug">/page/{page.slug}</span>
                            <span className={`page-status ${page.is_published ? 'published' : 'draft'}`}>
                              {page.is_published ? 'Dipublikasikan' : 'Draft'}
                            </span>
                            <span className={`footer-status ${page.show_in_footer ? 'shown' : 'hidden'}`}>
                              {page.show_in_footer ? 'Ditampilkan di Footer' : 'Tersembunyi dari Footer'}
                            </span>
                          </div>
                          {page.external_link && (
                            <div className="page-external-link">
                              <span className="external-link-label">Link Eksternal:</span>
                              <a
                                href={page.external_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="external-link-value"
                                title={page.external_link}
                              >
                                {page.external_link.replace(/^https?:\/\//, '').replace(/^localhost:[0-9]+\//, 'localhost/')}
                              </a>
                            </div>
                          )}
                        </div>
                        <div className="page-actions">
                          <button
                            className="edit-button"
                            onClick={() => handleEditPage(page)}
                            title="Edit Halaman"
                          >
                            <FaEdit />
                          </button>
                          <button
                            className="delete-button"
                            onClick={() => handleDeletePage(page.id)}
                            title="Hapus Halaman"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default FooterManager;
