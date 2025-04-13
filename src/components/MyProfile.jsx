import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api/axios';
import { toast } from 'react-hot-toast';
import { FiUser, FiLock, FiSave } from 'react-icons/fi';
import ProfileImage from './ProfileImage';
import { validateImage, getImageUrl } from '../utils/imageHelper';
import './MyProfile.css';

function MyProfile() {
  const { user, refreshUserData } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userData, setUserData] = useState({
    name: '',
    email: '',
    // bio: '', // Kolom bio tidak ada di database
    profile_picture: null
  });
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [profileImage, setProfileImage] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [activeTab, setActiveTab] = useState('profile');
  const [uploadStatus, setUploadStatus] = useState({
    isUploading: false,
    progress: 0,
    speed: 0
  });

  // Fungsi untuk memeriksa keberadaan file gambar
  const checkImageExists = async (url) => {
    try {
      console.log('Checking if image exists:', url);
      const response = await fetch(url, { method: 'HEAD' });
      const exists = response.ok;
      console.log('Image exists:', exists, 'Status:', response.status);
      return exists;
    } catch (error) {
      console.error('Error checking image:', error);
      return false;
    }
  };

  useEffect(() => {
    console.log('MyProfile component mounted or user changed:', user);

    // Jika user sudah ada dari context, gunakan data tersebut
    if (user && user.name) {
      console.log('Using user data from context:', user);
      setUserData({
        name: user.name || '',
        email: user.email || '',
        profile_picture: user.profile_picture || null
      });

      if (user.profile_picture) {
        // Gunakan helper function untuk mendapatkan URL gambar
        const imageUrl = getImageUrl(user.profile_picture);
        console.log('Setting preview image URL from context:', imageUrl);

        // Periksa keberadaan file gambar
        checkImageExists(imageUrl).then(exists => {
          if (exists) {
            console.log('Image exists, setting preview image');
            setPreviewImage(imageUrl);
          } else {
            console.warn('Image does not exist, not setting preview image');
            // Coba URL alternatif
            const alternativeUrl = `/uploads/${user.profile_picture}`;
            console.log('Trying alternative URL:', alternativeUrl);
            checkImageExists(alternativeUrl).then(altExists => {
              if (altExists) {
                console.log('Alternative image exists, setting preview image');
                setPreviewImage(alternativeUrl);
              } else {
                console.warn('Alternative image does not exist either');
                setPreviewImage(null);
              }
            });
          }
        });
      }
      // Jika data sudah ada dari context, tidak perlu fetch dari API
      return;
    }

    // Jika tidak ada data dari context, fetch dari API
    const fetchUserData = async () => {
      try {
        setLoading(true);
        console.log('Fetching user profile data...');
        const response = await api.get('/api/auth/user-profile');
        console.log('API response:', response.data);

        if (response.data && response.data.success) {
          const userData = response.data.user;
          console.log('User data received:', userData);

          setUserData({
            name: userData.name || '',
            email: userData.email || '',
            // bio: userData.bio || '', // Kolom bio tidak ada di database
            profile_picture: userData.profile_picture || null
          });
          console.log('userData state updated:', {
            name: userData.name || '',
            email: userData.email || '',
            profile_picture: userData.profile_picture || null
          });

          if (userData.profile_picture) {
            // Gunakan helper function untuk mendapatkan URL gambar
            const imageUrl = getImageUrl(userData.profile_picture);
            console.log('Setting preview image URL:', imageUrl);

            // Periksa keberadaan file gambar
            checkImageExists(imageUrl).then(exists => {
              if (exists) {
                console.log('Image exists, setting preview image');
                setPreviewImage(imageUrl);
              } else {
                console.warn('Image does not exist, not setting preview image');
                // Coba URL alternatif
                const alternativeUrl = `/uploads/${userData.profile_picture}`;
                console.log('Trying alternative URL:', alternativeUrl);
                checkImageExists(alternativeUrl).then(altExists => {
                  if (altExists) {
                    console.log('Alternative image exists, setting preview image');
                    setPreviewImage(alternativeUrl);
                  } else {
                    console.warn('Alternative image does not exist either');
                    setPreviewImage(null);
                  }
                });
              }
            });
          } else {
            console.log('No profile picture found');
            // Reset preview image jika tidak ada gambar profil
            setPreviewImage(null);
          }
        } else {
          console.warn('API response success is false or missing user data');
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        toast.error('Gagal memuat data profil');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchUserData();
    }
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    console.log(`Input changed: ${name} = ${value}`);
    setUserData(prev => {
      const newData = {
        ...prev,
        [name]: value
      };
      console.log('Updated userData:', newData);
      return newData;
    });
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      console.log('File selected:', file.name, file.type, file.size);

      // Validasi file
      const validation = await validateImage(file);
      if (!validation.isValid) {
        validation.errors.forEach(error => toast.error(error));
        return;
      }

      setProfileImage(file);

      // Buat preview image
      const reader = new FileReader();
      reader.onloadend = () => {
        console.log('File read complete, setting preview image');
        setPreviewImage(reader.result);
      };
      reader.onerror = (error) => {
        console.error('Error reading file:', error);
        toast.error('Gagal membaca file gambar');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setProfileImage(null);
    setPreviewImage(null);
    setUserData(prev => ({
      ...prev,
      profile_picture: null
    }));
  };

  const validatePasswordForm = () => {
    if (!passwordData.current_password) {
      toast.error('Password saat ini harus diisi');
      return false;
    }

    if (!passwordData.new_password) {
      toast.error('Password baru harus diisi');
      return false;
    }

    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.error('Konfirmasi password tidak cocok');
      return false;
    }

    if (passwordData.new_password.length < 8) {
      toast.error('Password baru minimal 8 karakter');
      return false;
    }

    return true;
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    console.log('Submitting profile update with data:', userData);

    try {
      setSaving(true);

      // Buat FormData untuk update profil
      const formData = new FormData();
      formData.append('name', userData.name);
      formData.append('email', userData.email);

      // Jika ada gambar profil baru, tambahkan ke FormData
      if (profileImage) {
        console.log('Adding profile image to form data:', profileImage.name, profileImage.type, profileImage.size);
        formData.append('profile_picture', profileImage);
      } else {
        console.log('No new profile image to upload');
      }

      // Kirim request update profil dengan progress tracking
      setUploadStatus({
        isUploading: true,
        progress: 0,
        speed: 0
      });

      const uploadStartTime = Date.now();

      const response = await api.post('/api/auth/update-profile', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          const timeElapsed = (Date.now() - uploadStartTime) / 1000;
          const uploadedMB = progressEvent.loaded / (1024 * 1024);
          const speed = timeElapsed > 0 ? (uploadedMB / timeElapsed).toFixed(2) : 0;

          console.log(`Upload progress: ${progress}%, Speed: ${speed} MB/s`);

          setUploadStatus({
            isUploading: true,
            progress,
            speed
          });
        }
      });

      console.log('Profile update response:', response.data);

      if (response.data.success) {
        toast.success('Profil berhasil diperbarui');

        // Refresh data user di context tanpa me-reload halaman
        console.log('Refreshing user data in context...');
        const refreshedUser = await refreshUserData();
        console.log('User data refreshed:', refreshedUser);

        // Trigger event untuk memberitahu komponen lain bahwa data user telah diperbarui
        window.dispatchEvent(new Event('user:dataUpdated'));
        console.log('Dispatched user:dataUpdated event');

        // Perbarui state lokal dengan data terbaru
        const updatedUserData = {
          name: response.data.user.name || '',
          email: response.data.user.email || '',
          profile_picture: response.data.user.profile_picture || null
        };
        console.log('Updating local state with:', updatedUserData);
        setUserData(updatedUserData);

        // Perbarui preview gambar jika ada
        if (response.data.user.profile_picture) {
          // Gunakan helper function untuk mendapatkan URL gambar
          const imageUrl = getImageUrl(response.data.user.profile_picture);
          console.log('Setting new preview image URL:', imageUrl);

          // Periksa keberadaan file gambar
          checkImageExists(imageUrl).then(exists => {
            if (exists) {
              console.log('Image exists, setting preview image');
              setPreviewImage(imageUrl);
            } else {
              console.warn('Image does not exist, not setting preview image');
              // Coba URL alternatif
              // 1. Coba akses langsung dari direktori uploads
              const alternativeUrl = `/uploads/${response.data.user.profile_picture}`;
              // 2. Coba akses dari direktori backend/uploads
              const alternativeUrl2 = `/backend/uploads/profiles/${response.data.user.profile_picture}`;
              console.log('Trying alternative URL:', alternativeUrl);
              checkImageExists(alternativeUrl).then(altExists => {
                if (altExists) {
                  console.log('Alternative image exists, setting preview image');
                  setPreviewImage(alternativeUrl);
                } else {
                  console.warn('First alternative image does not exist, trying second alternative');

                  // Coba URL alternatif kedua
                  checkImageExists(alternativeUrl2).then(alt2Exists => {
                    if (alt2Exists) {
                      console.log('Second alternative image exists, setting preview image');
                      setPreviewImage(alternativeUrl2);
                    } else {
                      console.warn('No alternative image exists');
                      setPreviewImage(null);
                    }
                  });
                }
              });
            }
          });
        }
      } else {
        console.error('Profile update failed:', response.data);
        toast.error(response.data.message || 'Gagal memperbarui profil');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(error.response?.data?.message || 'Gagal memperbarui profil');
    } finally {
      setSaving(false);
      setUploadStatus({
        isUploading: false,
        progress: 0,
        speed: 0
      });
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (!validatePasswordForm()) {
      return;
    }

    try {
      setSaving(true);

      const response = await api.post('/api/auth/change-password', {
        current_password: passwordData.current_password,
        new_password: passwordData.new_password,
        confirm_password: passwordData.confirm_password
      });

      if (response.data.success) {
        toast.success('Password berhasil diubah');
        setPasswordData({
          current_password: '',
          new_password: '',
          confirm_password: ''
        });
      } else {
        toast.error(response.data.message || 'Gagal mengubah password');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error(error.response?.data?.message || 'Gagal mengubah password');
    } finally {
      setSaving(false);
    }
  };

  // Log current state for debugging
  console.log('Rendering MyProfile with state:', {
    userData,
    previewImage,
    loading,
    saving,
    activeTab
  });

  if (loading) {
    return (
      <div className="user-profile-loading">
        <div className="user-profile-loading-spinner"></div>
        <p>Memuat data profil...</p>
      </div>
    );
  }

  return (
    <div className="user-profile-container">
      <h1 className="user-profile-title">Profil Saya</h1>

      <div className="user-profile-tabs">
        <button
          className={`user-profile-tab ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          <FiUser className="user-profile-tab-icon" />
          Informasi Profil
        </button>
        <button
          className={`user-profile-tab ${activeTab === 'password' ? 'active' : ''}`}
          onClick={() => setActiveTab('password')}
        >
          <FiLock className="user-profile-tab-icon" />
          Ubah Password
        </button>
      </div>

      <div className="user-profile-content">
        {activeTab === 'profile' && (
          <form onSubmit={handleUpdateProfile} className="user-profile-form">
            <ProfileImage
              profileImage={profileImage}
              previewImage={previewImage}
              uploadStatus={uploadStatus}
              onImageChange={handleImageChange}
              onRemoveImage={handleRemoveImage}
            />

            <div className="user-profile-form-group">
              <label htmlFor="name" className="user-profile-label">Nama</label>
              <input
                type="text"
                id="name"
                name="name"
                value={userData.name || ''}
                onChange={handleInputChange}
                className="user-profile-input"
                required
              />
            </div>

            <div className="user-profile-form-group">
              <label htmlFor="email" className="user-profile-label">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={userData.email || ''}
                onChange={handleInputChange}
                className="user-profile-input"
                required
              />
            </div>

            {/* Kolom bio tidak ada di database
            <div className="user-profile-form-group">
              <label htmlFor="bio" className="user-profile-label">Bio</label>
              <textarea
                id="bio"
                name="bio"
                value={userData.bio || ''}
                onChange={handleInputChange}
                className="user-profile-textarea"
                rows="4"
                placeholder="Ceritakan sedikit tentang diri Anda..."
              />
            </div>
            */}

            <div className="user-profile-form-actions">
              <button
                type="submit"
                className="user-profile-submit-button"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <div className="user-profile-button-spinner"></div>
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <FiSave className="user-profile-button-icon" />
                    <span>Simpan Perubahan</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {activeTab === 'password' && (
          <form onSubmit={handleChangePassword} className="user-profile-form">
            <div className="user-profile-form-group">
              <label htmlFor="current_password" className="user-profile-label">Password Saat Ini</label>
              <input
                type="password"
                id="current_password"
                name="current_password"
                value={passwordData.current_password}
                onChange={handlePasswordChange}
                className="user-profile-input"
                required
              />
            </div>

            <div className="user-profile-form-group">
              <label htmlFor="new_password" className="user-profile-label">Password Baru</label>
              <input
                type="password"
                id="new_password"
                name="new_password"
                value={passwordData.new_password}
                onChange={handlePasswordChange}
                className="user-profile-input"
                required
                minLength={8}
              />
              <small className="user-profile-input-help">Minimal 8 karakter</small>
            </div>

            <div className="user-profile-form-group">
              <label htmlFor="confirm_password" className="user-profile-label">Konfirmasi Password Baru</label>
              <input
                type="password"
                id="confirm_password"
                name="confirm_password"
                value={passwordData.confirm_password}
                onChange={handlePasswordChange}
                className="user-profile-input"
                required
              />
            </div>

            <div className="user-profile-form-actions">
              <button
                type="submit"
                className="user-profile-submit-button"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <div className="user-profile-button-spinner"></div>
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <FiSave className="user-profile-button-icon" />
                    <span>Ubah Password</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default MyProfile;
