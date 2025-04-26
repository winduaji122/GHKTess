import React, { useState, useRef, useEffect, Fragment  } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserIcon, MagnifyingGlassIcon, UserPlusIcon, ChartBarIcon, DocumentTextIcon, ArrowRightIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import { Menu, Transition } from '@headlessui/react';
import { api } from '../api/axios';
import { getProfileImageUrl } from '../utils/imageHelper';
import SmartAvatar from './common/SmartAvatar';
import './Header.css';

export default function Header({ isLoggedIn, onLogout, user }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [userData, setUserData] = useState(user);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownTimeoutRef = useRef(null);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const headerRef = useRef(null);
  const buttonRef = useRef(null);

  // Gunakan prop user yang diterima dari AuthContext
  console.log('Header component - User prop received:', user);

  // Effect untuk memperbarui userData saat user prop berubah
  useEffect(() => {
    console.log('Header useEffect triggered for user prop, user:', user);

    if (user) {
      console.log('User prop updated, updating userData:', user);
      console.log('User profile_picture:', user.profile_picture);

      // Jika ada profile_picture, coba log URL lengkapnya
      if (user.profile_picture) {
        const imageUrl = getProfileImageUrl(user.profile_picture);
        console.log('Profile image filename:', user.profile_picture);
        console.log('Generated profile image URL:', imageUrl);
      }

      setUserData(user);
    }
  }, [user]);

  // Effect untuk menangani event user:dataUpdated, user:logout, dan app:logout
  useEffect(() => {
    console.log('Setting up event listeners in Header.jsx');

    const handleUserDataUpdated = () => {
      console.log('User data updated event received');
      try {
        const storedUser = JSON.parse(localStorage.getItem('auth_user'));
        if (storedUser && storedUser.name) {
          console.log('Updating userData from localStorage after event:', storedUser);
          console.log('Profile picture in updated data:', storedUser.profile_picture);
          setUserData(storedUser);

          // Jika ada profile_picture, log URL lengkapnya
          if (storedUser.profile_picture) {
            const imageUrl = getProfileImageUrl(storedUser.profile_picture);
            console.log('Generated profile image URL after update:', imageUrl);
          }
        } else {
          // Jika tidak ada data user di localStorage, reset userData
          console.log('No user data in localStorage, resetting userData');
          setUserData(null);
        }
      } catch (error) {
        console.error('Error parsing user data from localStorage after event:', error);
        // Jika terjadi error, reset userData
        setUserData(null);
      }
    };

    const handleUserLogout = () => {
      console.log('User logout event received in Header.jsx');
      // Reset semua state terkait user
      setUserData(null);
      setIsDropdownOpen(false);
    };

    const handleAppLogout = () => {
      console.log('App logout event received in Header.jsx');
      // Reset semua state terkait user
      setUserData(null);
      setIsDropdownOpen(false);
    };

    // Panggil handler sekali saat komponen dimuat untuk memastikan data terbaru
    handleUserDataUpdated();

    window.addEventListener('user:dataUpdated', handleUserDataUpdated);
    window.addEventListener('user:logout', handleUserLogout);
    window.addEventListener('app:logout', handleAppLogout);

    return () => {
      window.removeEventListener('user:dataUpdated', handleUserDataUpdated);
      window.removeEventListener('user:logout', handleUserLogout);
      window.removeEventListener('app:logout', handleAppLogout);
    };
  }, []);

  // Effect untuk mengambil data dari localStorage atau API jika user prop tidak tersedia
  useEffect(() => {
    if (user) return; // Skip jika user prop tersedia

    console.log('Trying to get user data from localStorage or API');

    try {
      const storedUser = JSON.parse(localStorage.getItem('auth_user'));
      if (storedUser && storedUser.name && isLoggedIn) {
        console.log('Using user data from localStorage:', storedUser);
        console.log('Profile picture from localStorage:', storedUser.profile_picture);
        setUserData(storedUser);

        // Jika ada profile_picture, log URL lengkapnya
        if (storedUser.profile_picture) {
          const imageUrl = getProfileImageUrl(storedUser.profile_picture);
          console.log('Generated profile image URL from localStorage:', imageUrl);
        }
      } else if (isLoggedIn) {
        // Jika tidak ada data di localStorage tapi user sudah login, ambil dari API
        const fetchUserProfile = async () => {
          try {
            console.log('Fetching user profile from API...');
            const response = await api.get('/api/auth/user-profile');
            if (response.data && response.data.success) {
              console.log('Fetched user profile from API:', response.data.user);
              console.log('Profile picture from API:', response.data.user.profile_picture);
              setUserData(response.data.user);

              // Simpan ke localStorage untuk penggunaan berikutnya
              localStorage.setItem('auth_user', JSON.stringify(response.data.user));
              console.log('User data saved to localStorage from API fetch');

              // Jika ada profile_picture, log URL lengkapnya
              if (response.data.user.profile_picture) {
                const imageUrl = getProfileImageUrl(response.data.user.profile_picture);
                console.log('Generated profile image URL from API:', imageUrl);
              }
            }
          } catch (error) {
            console.error('Error fetching user profile:', error);
          }
        };
        fetchUserProfile();
      }
    } catch (error) {
      console.error('Error parsing user data from localStorage:', error);
    }
  }, [user, isLoggedIn]);

  // Effect untuk mereset userData ketika pengguna logout
  useEffect(() => {
    console.log('isLoggedIn changed to:', isLoggedIn);
    if (!isLoggedIn) {
      console.log('User logged out, resetting userData in Header.jsx');
      setUserData(null);
      setIsDropdownOpen(false);
      // Hapus data dari localStorage untuk memastikan tidak ada data yang tersisa
      localStorage.removeItem('auth_user');
      localStorage.removeItem('auth_persistent');
      localStorage.removeItem('token');
    }
  }, [isLoggedIn]);

  // Default ke 'guest' jika tidak ada data, 'writer' jika ada data tapi tidak ada role
  const userRole = userData ? (userData.role || 'writer') : 'guest';
  console.log('User role:', userRole);
  console.log('User name:', userData?.name);
  console.log('User username:', userData?.username);
  console.log('User profile_picture:', userData?.profile_picture);

  // Jika ada profile_picture, log URL lengkapnya
  if (userData?.profile_picture) {
    const imageUrl = getProfileImageUrl(userData.profile_picture);
    console.log('Final generated profile image URL:', imageUrl);
  }

  // Fungsi untuk menangani dropdown menu - hanya dengan klik, bukan hover
  const toggleDropdown = (e) => {
    if (e) {
      e.preventDefault(); // Mencegah default action
      e.stopPropagation(); // Mencegah event bubbling
    }
    setIsDropdownOpen(!isDropdownOpen);
  };

  // Fungsi untuk menutup dropdown sudah diimplementasikan inline

  // Effect untuk menangani klik di luar dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isDropdownOpen && dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    // Hanya tambahkan event listener jika dropdown terbuka
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      // Membersihkan timeout saat komponen unmount
      if (dropdownTimeoutRef.current) {
        clearTimeout(dropdownTimeoutRef.current);
      }
    };
  }, [isDropdownOpen, dropdownRef]);

  // Effect untuk menutup dropdown saat scroll
  useEffect(() => {
    const handleScroll = () => {
      if (isDropdownOpen) {
        setIsDropdownOpen(false);
      }
    };

    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [isDropdownOpen]);

  useEffect(() => {
    if (headerRef.current) {
      const headerHeight = headerRef.current.offsetHeight;
      document.documentElement.style.setProperty('--header-height', `${headerHeight}px`);
    }
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchTerm)}`);
      setSearchTerm('');
    }
  };

  return (
    <header ref={headerRef} className="bg-black text-white border-b-0">
      <div className="container py-3 flex justify-between items-center">
        <Link to="/" className="text-3xl font-bold px-0 py-1 text-white">
          Gema Hati Kudus
        </Link>
        <div className="flex items-center space-x-2 sm:space-x-2">
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              placeholder="Cari post..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-2 py-2 pr-20 border rounded-md text-sm bg-gray-700 text-white placeholder-gray-400 border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
            >
              <MagnifyingGlassIcon className="h-5 w-5"/>
            </button>
          </form>
          <Menu as="div" className="relative inline-block text-left header-dropdown-container" ref={dropdownRef}>
            <div>
              {/* Menu Button dengan gambar profil atau ikon default */}
              {isLoggedIn ? (
                <Menu.Button
                  className="writer-profile-button"
                  ref={buttonRef}
                  onClick={toggleDropdown}
                >
                  {console.log('Header render - userData:', userData)}
                  {console.log('Header render - profile_picture:', userData?.profile_picture)}
                  {userData?.profile_picture && console.log('Rendering profile image with:', userData.profile_picture)}
                  <div className="writer-profile-image-container">
                    <SmartAvatar
                      src={userData?.profile_picture}
                      alt="Profile"
                      name={userData?.name || userData?.username || 'User'}
                      size="md"
                      className="writer-profile-image"
                    />
                  </div>
                </Menu.Button>
              ) : (
                <Menu.Button className="writer-profile-button writer-profile-button-default" onClick={toggleDropdown}>
                  <div className="writer-profile-icon-container">
                    <UserIcon className="writer-profile-icon w-6 h-6" aria-hidden="true" />
                  </div>
                </Menu.Button>
              )}
            </div>
            <Transition
              as={Fragment}
              show={isDropdownOpen}
              enter="transition ease-out duration-200"
              enterFrom="transform opacity-0 scale-95 translate-y-[-10px]"
              enterTo="transform opacity-100 scale-100 translate-y-0"
              leave="transition ease-in duration-150"
              leaveFrom="transform opacity-100 scale-100 translate-y-0"
              leaveTo="transform opacity-0 scale-95 translate-y-[-10px]"
            >
              <Menu.Items
                className={`absolute right-0 mt-2 w-56 origin-top-right divide-y divide-gray-100 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-[9999] user-dropdown-menu header-dropdown-menu ${isDropdownOpen ? 'visible' : ''}`}
              >

                <div className="px-1 py-1">
                  {isLoggedIn ? (
                    <>
                      <Menu.Item>
                        {({ active }) => (
                          <Link
                            to="/profile"
                            className={`${
                              active ? '!bg-blue-600 !text-white' : 'text-gray-700'
                            } group flex w-full items-center rounded-md px-2 py-2 text-sm`}
                            onClick={() => {
                              console.log('Navigating to profile page');
                              // Tutup dropdown setelah klik
                              setIsDropdownOpen(false);
                            }}
                          >
                            <UserCircleIcon className="mr-2 h-5 w-5" aria-hidden="true" />
                            {userData?.name || userData?.username || 'Profil Saya'}
                          </Link>
                        )}
                      </Menu.Item>
                      <div className="border-t border-gray-200 my-1"></div>
                      <Menu.Item>
                        {({ active }) => (
                          <Link
                            to="/dashboard"
                            className={`${
                              active ? '!bg-blue-600 !text-white' : 'text-gray-700'
                            } group flex w-full items-center rounded-md px-2 py-2 text-sm`}
                          >
                            <ChartBarIcon className="mr-2 h-5 w-5" aria-hidden="true" />
                            Dashboard
                          </Link>
                        )}
                      </Menu.Item>
                      <Menu.Item>
                        {({ active }) => (
                          <Link
                            to={userRole === 'admin' ? '/admin/posts' : '/writer/posts'}
                            className={`${
                              active ? '!bg-blue-600 !text-white' : 'text-gray-700'
                            } group flex w-full items-center rounded-md px-2 py-2 text-sm`}
                            onClick={() => {
                              // Tambahkan log untuk debugging
                              console.log('Navigating to:', userRole === 'admin' ? '/admin/posts' : '/writer/posts');
                              console.log('Current user role:', userRole);

                              // Jika user null atau tidak memiliki role, gunakan default
                              if (!user || !user.role) {
                                console.log('User data is missing or incomplete');
                              }
                            }}
                          >
                            <DocumentTextIcon className="mr-2 h-5 w-5" aria-hidden="true" />
                            Manage Posts
                          </Link>
                        )}
                      </Menu.Item>
                      <div className="border-t border-gray-200 my-1"></div>
                      <Menu.Item>
                        {({ active }) => (
                          <button
                            onClick={async () => {
                              try {
                                console.log('Logout button clicked');
                                // Tutup dropdown sebelum logout
                                setIsDropdownOpen(false);
                                // Reset userData
                                setUserData(null);
                                // Hapus data dari localStorage
                                localStorage.removeItem('auth_user');
                                localStorage.removeItem('auth_persistent');
                                localStorage.removeItem('token');

                                // Tambahkan flag untuk menandai bahwa user baru saja logout
                                sessionStorage.setItem('recently_logged_out', 'true');
                                // Panggil fungsi logout dan tunggu sampai selesai
                                const logoutSuccess = await onLogout();
                                console.log('Logout completed with status:', logoutSuccess);

                                // Tunggu sebentar untuk memastikan semua state sudah diperbarui
                                setTimeout(() => {
                                  // Navigasi ke halaman utama
                                  navigate('/', { replace: true });
                                  // Refresh halaman untuk memastikan semua state direset
                                  window.location.href = '/';
                                }, 100);
                              } catch (error) {
                                console.error('Error during logout:', error);
                                // Jika terjadi error, tetap coba navigasi dan refresh
                                localStorage.removeItem('auth_user');
                                localStorage.removeItem('auth_persistent');
                                localStorage.removeItem('token');

                                // Tambahkan flag untuk menandai bahwa user baru saja logout
                                sessionStorage.setItem('recently_logged_out', 'true');
                                navigate('/', { replace: true });
                                window.location.href = '/';
                              }
                            }}
                            className={`${
                              active ? '!bg-red-600 !text-white' : 'text-red-600'
                            } group flex w-full items-center rounded-md px-2 py-2 text-sm`}
                          >
                            <ArrowRightIcon className="mr-2 h-5 w-5" aria-hidden="true" />
                            Logout
                          </button>
                        )}
                      </Menu.Item>
                    </>
                  ) : (
                    <>
                      <Menu.Item>
                        {({ active }) => (
                          <Link
                            to="/login"
                            className={`${
                              active ? '!bg-blue-600 !text-white' : 'text-gray-700'
                            } group flex w-full items-center rounded-md px-2 py-2 text-sm`}
                          >
                            <UserIcon className="mr-2 h-5 w-5" aria-hidden="true" />
                            Login
                          </Link>
                        )}
                      </Menu.Item>
                      <Menu.Item>
                        {({ active }) => (
                          <Link
                            to="/register"
                            className={`${
                              active ? '!bg-blue-600 !text-white' : 'text-gray-700'
                            } group flex w-full items-center rounded-md px-2 py-2 text-sm`}
                          >
                            <UserPlusIcon className="mr-2 h-5 w-5" aria-hidden="true" />
                            Daftar Writer
                          </Link>
                        )}
                      </Menu.Item>
                    </>
                  )}
                </div>
              </Menu.Items>
            </Transition>
          </Menu>
        </div>
      </div>
    </header>
  );
}