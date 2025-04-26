import React, { Fragment, useState, useEffect, useRef, useMemo } from 'react'
import { Disclosure, Menu, Transition } from '@headlessui/react'
import { Bars3Icon, XMarkIcon, ChevronDownIcon, HomeIcon } from '@heroicons/react/24/outline'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import './Navbar.css'
import { getAllLabels } from '../api/labelApi'

function classNames(...classes) {
  return classes.filter(Boolean).join(' ')
}

// Komponen DropdownItem untuk menangani item dropdown biasa dan nested dropdown
function DropdownItem({ child }) {
  const location = useLocation();
  const navigate = useNavigate();

  // Handler untuk navigasi label yang aman
  const handleLabelClick = (e, href) => {
    e.preventDefault(); // Mencegah navigasi default
    // Jika href dimulai dengan /label/, ini adalah navigasi label
    if (href.startsWith('/label/')) {
      // Navigasi langsung ke halaman label
      navigate(href);
    }
  };

  // Jika child memiliki children, maka ini adalah nested dropdown
  if (child.children && child.children.length > 0) {
    const [isNestedOpen, setIsNestedOpen] = useState(false);
    const nestedTimeoutRef = useRef(null);

    const handleNestedMouseEnter = () => {
      if (nestedTimeoutRef.current) {
        clearTimeout(nestedTimeoutRef.current);
        nestedTimeoutRef.current = null;
      }
      setIsNestedOpen(true);
    };

    const handleNestedMouseLeave = () => {
      nestedTimeoutRef.current = setTimeout(() => {
        setIsNestedOpen(false);
      }, 300);
    };

    useEffect(() => {
      return () => {
        if (nestedTimeoutRef.current) {
          clearTimeout(nestedTimeoutRef.current);
        }
      };
    }, []);

    return (
      <div
        className="relative dropdown-nested-container"
        onMouseEnter={handleNestedMouseEnter}
        onMouseLeave={handleNestedMouseLeave}
      >
        <Menu.Item>
          {({ active }) => (
            <div
              className={`${
                active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
              } flex justify-between items-center px-4 py-2 text-sm cursor-pointer`}
            >
              <span>{child.name}</span>
              <ChevronDownIcon className="h-4 w-4 transform -rotate-90" aria-hidden="true" />
            </div>
          )}
        </Menu.Item>

        <Transition
          show={isNestedOpen}
          as={Fragment}
          enter="transition ease-out duration-100"
          enterFrom="transform opacity-0 scale-95"
          enterTo="transform opacity-100 scale-100"
          leave="transition ease-in duration-75"
          leaveFrom="transform opacity-100 scale-100"
          leaveTo="transform opacity-0 scale-95"
        >
          <div
            className="absolute left-full top-0 w-56 origin-top-left rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none navbar-dropdown-menu navbar-nested-dropdown"
            onMouseEnter={handleNestedMouseEnter}
            onMouseLeave={handleNestedMouseLeave}
          >
            <div className="py-1">
              {child.children.map((nestedChild) => (
                <Menu.Item key={nestedChild.name}>
                  {({ active }) => (
                    <Link
                      to={nestedChild.href}
                      onClick={(e) => handleLabelClick(e, nestedChild.href)}
                      className={`${
                        location.pathname === nestedChild.href || location.pathname.startsWith(nestedChild.href + '/') ? 'bg-blue-600 text-white' : active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                      } block px-4 py-2 text-sm`}
                    >
                      {nestedChild.name}
                    </Link>
                  )}
                </Menu.Item>
              ))}
            </div>
          </div>
        </Transition>
      </div>
    );
  }

  // Jika tidak memiliki children, tampilkan sebagai item biasa
  const isActive = location.pathname === child.href || location.pathname.startsWith(child.href + '/');

  return (
    <Menu.Item>
      {({ active }) => (
        <Link
          to={child.href}
          onClick={(e) => handleLabelClick(e, child.href)}
          className={`${
            isActive ? 'bg-blue-600 text-white' : active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
          } block px-4 py-2 text-sm`}
        >
          {child.name}
        </Link>
      )}
    </Menu.Item>
  );
}

function Dropdown({ item }) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)
  const timeoutRef = useRef(null)
  const location = useLocation()
  const navigate = useNavigate()

  // Handler untuk navigasi label yang aman
  const handleLabelClick = (e, href) => {
    e.preventDefault(); // Mencegah navigasi default
    // Jika href dimulai dengan /label/, ini adalah navigasi label
    if (href.startsWith('/label/')) {
      // Navigasi langsung ke halaman label
      navigate(href);
    }
  };

  // Periksa apakah item ini atau salah satu childrennya aktif
  const isActive = useMemo(() => {
    if (location.pathname === item.href || location.pathname.startsWith(item.href + '/')) {
      return true;
    }

    if (item.children) {
      return item.children.some(child =>
        location.pathname === child.href || location.pathname.startsWith(child.href + '/')
      );
    }

    return false;
  }, [location.pathname, item])

  // Fungsi untuk menangani hover
  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    setIsOpen(true)
  }

  const handleMouseLeave = () => {
    // Menambahkan delay sebelum menutup dropdown
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false)
    }, 300) // Delay 300ms
  }

  // Menambahkan event listener untuk menangani hover dan klik di luar dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      // Membersihkan timeout saat komponen unmount
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [dropdownRef])

  return (
    <Menu as="div" className="relative inline-block text-left dropdown-container">
      <div
        ref={dropdownRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <Menu.Button className={`inline-flex w-full justify-center rounded-md px-3 py-1 text-sm font-bold ${isActive ? 'navbar-active-link' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}>
          {item.name}
          <ChevronDownIcon className="-mr-1 ml-2 h-5 w-5" aria-hidden="true" />
        </Menu.Button>
        <Transition
          show={isOpen}
          as={Fragment}
          enter="transition ease-out duration-100"
          enterFrom="transform opacity-0 scale-95"
          enterTo="transform opacity-100 scale-100"
          leave="transition ease-in duration-75"
          leaveFrom="transform opacity-100 scale-100"
          leaveTo="transform opacity-0 scale-95"
        >
          <Menu.Items
            static
            className="absolute left-0 z-50 w-56 origin-top-left rounded-b-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none navbar-dropdown-menu"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            style={{ minWidth: '200px' }} /* Memastikan dropdown memiliki lebar minimum */
          >
            <div className="py-1">
              {item.children.map((child) => (
                <DropdownItem
                  key={child.name}
                  child={child}
                />
              ))}
            </div>
          </Menu.Items>
        </Transition>
      </div>
    </Menu>
  )
}

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isFloating, setIsFloating] = useState(false);
  const [shouldSlideDown, setShouldSlideDown] = useState(false);
  const navRef = useRef(null);
  const [navItems, setNavItems] = useState([]);

  // Handler untuk navigasi label yang aman
  const handleLabelClick = (e, href) => {
    e.preventDefault(); // Mencegah navigasi default
    // Jika href dimulai dengan /label/, ini adalah navigasi label
    if (href.startsWith('/label/')) {
      // Navigasi langsung ke halaman label
      navigate(href);
    }
  };

  // Efek untuk scroll navbar
  useEffect(() => {
    const handleScroll = () => {
      if (navRef.current) {
        const navRect = navRef.current.getBoundingClientRect();
        const navBottom = navRect.bottom;
        if (navBottom <= 0 && !isFloating) {
          setIsFloating(true);
          setShouldSlideDown(true);
        } else if (navBottom > 0 && isFloating) {
          setIsFloating(false);
          setShouldSlideDown(false);
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isFloating]);

  // Efek untuk mengambil data label dari API
  useEffect(() => {
    const fetchLabels = async () => {
      try {
        const labelsData = await getAllLabels();
        console.log('Raw labels data from API:', labelsData);

        // Buat array untuk item navigasi
        const updatedNavItems = [];

        // Proses data label berdasarkan format yang diterima
        let processedLabels = [];

        // Jika data sudah dalam format label dengan sublabel
        if (Array.isArray(labelsData) && labelsData.length > 0 && 'sublabels' in labelsData[0]) {
          console.log('Data sudah dalam format label dengan sublabel');
          processedLabels = labelsData;
        }
        // Jika data dalam format datar (flat)
        else if (Array.isArray(labelsData)) {
          console.log('Data dalam format datar, perlu diproses');

          // Filter label utama (tanpa parent_id)
          const mainLabels = labelsData.filter(label => !label.parent_id);

          // Buat Map untuk menyimpan label utama dan sublabelnya
          const mainLabelsMap = new Map();

          // Inisialisasi mainLabelsMap dengan label utama
          mainLabels.forEach(label => {
            mainLabelsMap.set(label.id, {
              ...label,
              sublabels: [],
              name: label.name || label.label || '',
              label: label.label || label.name || '',
              slug: label.slug || label.name || label.label || ''
            });
          });

          // Tambahkan sublabel ke label utama
          labelsData.forEach(label => {
            if (label.parent_id && mainLabelsMap.has(label.parent_id)) {
              const mainLabel = mainLabelsMap.get(label.parent_id);
              mainLabel.sublabels.push({
                ...label,
                name: label.name || label.label || '',
                label: label.label || label.name || '',
                slug: label.slug || label.name || label.label || '',
                href: `/label/${label.slug || label.name || label.label || ''}`
              });
            }
          });

          processedLabels = Array.from(mainLabelsMap.values());
        }

        // Urutkan label berdasarkan nama
        const sortedLabels = processedLabels.sort((a, b) => {
          const nameA = (a.name || a.label || '').toLowerCase();
          const nameB = (b.name || b.label || '').toLowerCase();
          return nameA.localeCompare(nameB);
        });

        console.log('Processed and sorted labels:', sortedLabels);

        // Tambahkan label ke item navigasi
        sortedLabels.forEach(label => {
          // Pastikan kita selalu menggunakan nama label, bukan ID
          const labelName = label.name || label.label;
          const labelSlug = label.slug || labelName;

          // Konversi sublabels menjadi format children untuk dropdown
          const hasSubLabels = label.sublabels && label.sublabels.length > 0;

          if (hasSubLabels) {
            const children = label.sublabels.map(sublabel => ({
              name: sublabel.name || sublabel.label || '',
              href: `/label/${sublabel.slug || sublabel.name || sublabel.label || ''}`,
              id: sublabel.id,
              slug: sublabel.slug || sublabel.name || sublabel.label || ''
            }));

            updatedNavItems.push({
              name: labelName,
              href: `/label/${labelSlug}`,
              children: children,
              slug: labelSlug
            });
          } else {
            // Jika tidak memiliki sublabel, tambahkan sebagai link biasa
            updatedNavItems.push({
              name: labelName,
              href: `/label/${labelSlug}`,
              slug: labelSlug
            });
          }
        });

        // Tambahkan item Spotlight (dengan path khusus, bukan format label)
        updatedNavItems.push({
          name: 'Spotlight',
          href: '/spotlight',
          isSpecial: true // Menandai bahwa ini bukan label biasa
        });

        // Log untuk debugging
        console.log('Labels data:', labelsData);
        console.log('Processed labels:', processedLabels);
        console.log('Sorted labels:', sortedLabels);
        console.log('Updated nav items:', updatedNavItems);

        // Log khusus untuk memeriksa struktur dropdown
        const dropdownItems = updatedNavItems.filter(item => item.children && item.children.length > 0);
        console.log('Dropdown items:', dropdownItems);

        // Periksa apakah ada label yang memiliki sublabel tetapi tidak ditampilkan sebagai dropdown
        const mainLabelsWithSublabels = sortedLabels.filter(label =>
          label.sublabels && label.sublabels.length > 0
        );

        console.log('Main labels with sublabels from processed data:', mainLabelsWithSublabels);

        // Periksa apakah semua main label dengan sublabel sudah ditampilkan sebagai dropdown
        const missingDropdowns = mainLabelsWithSublabels.filter(mainLabel =>
          !dropdownItems.some(item =>
            item.name === (mainLabel.name || mainLabel.label) ||
            item.slug === (mainLabel.slug || mainLabel.name || mainLabel.label)
          )
        );

        console.log('Missing dropdowns:', missingDropdowns);

        // Update state
        setNavItems(updatedNavItems);
      } catch (error) {
        console.error('Error fetching labels for navbar:', error);
      }
    };

    fetchLabels();
  }, []);

  return (
    <div ref={navRef}>
      <Disclosure
        as="nav"
        className={`transition-all duration-300 ease-in-out mb-6 ${
          isFloating ? 'fixed top-0 left-0 w-full z-50' : ''
        } ${shouldSlideDown ? 'slide-down' : ''}`}
      >
        {({ open }) => (
          <>
            <div className="navbar-container">
              <div className="container"> {/* Container dengan lebar tetap 1100px */}
                <div className="flex items-center justify-between writer-navbar-content-shifted">
                  <div className="flex items-center"> {/* Logo dan menu utama */}
                    <Link
                      to="/"
                      className={classNames(
                        'text-gray-300 hover:bg-gray-700 hover:text-white px-2 py-1 rounded-md text-sm font-medium mr-3',
                        location.pathname === '/' ? 'navbar-active-link' : ''
                      )}
                    >
                      <HomeIcon className="h-6 w-6" /> {/* Memperbesar ukuran icon */}
                    </Link>
                    <div className="hidden sm:flex space-x-1 sm:space-x-2"> {/* Adjusted spacing */}
                      {navItems.map((item) =>
                        item.children ? (
                          <Dropdown key={item.name} item={item} />
                        ) : (
                          <Link
                            key={item.name}
                            to={item.href}
                            onClick={(e) => item.href.startsWith('/label/') ? handleLabelClick(e, item.href) : null}
                            className={classNames(
                              'text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-1 rounded-md text-sm font-bold',
                              location.pathname === item.href || location.pathname.startsWith(item.href + '/') ? 'navbar-active-link' : ''
                            )}
                          >
                            {item.name}
                          </Link>
                        )
                      )}
                    </div>
                  </div>

                  {/* Mobile menu button */}
                  <div className="-mr-2 flex sm:hidden">
                    <Disclosure.Button className="inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-gray-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white">
                      <span className="sr-only">Buka menu utama</span>
                      {open ? (
                        <XMarkIcon className="block h-6 w-6" aria-hidden="true" />
                      ) : (
                        <Bars3Icon className="block h-6 w-6" aria-hidden="true" />
                      )}
                    </Disclosure.Button>
                  </div>
                </div>
              </div>
            </div>

            <Disclosure.Panel className="sm:hidden">
              <div className="container">
                <div className="space-y-1 py-2">
                {navItems.map((item) =>
                  item.children ? (
                    <Disclosure key={item.name}>
                      {({ open }) => (
                        <>
                          <Disclosure.Button
                            className={`flex w-full items-center justify-between rounded-md px-3 py-3 text-base text-bold ${location.pathname.startsWith(item.href) ? 'navbar-active-link' : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'}`}
                          >
                            <span>{item.name}</span>
                            <ChevronDownIcon
                              className={`${open ? 'rotate-180 transform' : ''} h-5 w-5 text-gray-300`}
                            />
                          </Disclosure.Button>
                          <Disclosure.Panel className="px-4 pt-2 pb-2 text-sm text-gray-500">
                            {item.children.map((child) => (
                              <Disclosure.Button
                                key={child.name}
                                as="a"
                                href={child.href}
                                onClick={(e) => child.href.startsWith('/label/') ? handleLabelClick(e, child.href) : null}
                                className={`block rounded-md px-3 py-3 text-base font-medium ${location.pathname === child.href || location.pathname.startsWith(child.href + '/') ? 'navbar-active-link' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}
                              >
                                {child.name}
                              </Disclosure.Button>
                            ))}
                          </Disclosure.Panel>
                        </>
                      )}
                    </Disclosure>
                  ) : (
                    <Disclosure.Button
                      key={item.name}
                      as="a"
                      href={item.href}
                      onClick={(e) => item.href.startsWith('/label/') ? handleLabelClick(e, item.href) : null}
                      className={classNames(
                        location.pathname === item.href || location.pathname.startsWith(item.href + '/') ? 'navbar-active-link' : 'text-gray-300 hover:bg-gray-700 hover:text-white',
                        'block rounded-md px-3 py-3 text-base font-bold'
                      )}
                    >
                      {item.name}
                    </Disclosure.Button>
                  )
                )}
                </div>
              </div>
            </Disclosure.Panel>
          </>
        )}
      </Disclosure>
      {isFloating && <div style={{ height: navRef.current?.offsetHeight, marginBottom: '2rem' }} />}
    </div>
  )
}
