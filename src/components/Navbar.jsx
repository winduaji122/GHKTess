import React, { Fragment, useState, useEffect, useRef } from 'react'
import { Disclosure, Menu, Transition } from '@headlessui/react'
import { Bars3Icon, XMarkIcon, ChevronDownIcon, HomeIcon } from '@heroicons/react/24/outline'
import { Link, useLocation } from 'react-router-dom'
import './Navbar.css'
import { getAllLabels } from '../api/labelApi'

function classNames(...classes) {
  return classes.filter(Boolean).join(' ')
}

// Komponen DropdownItem untuk menangani item dropdown biasa dan nested dropdown
function DropdownItem({ child }) {
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
                      className={`${
                        active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
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
  return (
    <Menu.Item>
      {({ active }) => (
        <Link
          to={child.href}
          className={`${
            active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
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
        <Menu.Button className="inline-flex w-full justify-center rounded-md px-3 py-1 text-sm font-bold text-gray-300 hover:bg-gray-700 hover:text-white">
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
  const [isFloating, setIsFloating] = useState(false);
  const [shouldSlideDown, setShouldSlideDown] = useState(false);
  const navRef = useRef(null);
  const [navItems, setNavItems] = useState([]);

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
        const allLabels = await getAllLabels();

        // Buat array untuk item navigasi
        const updatedNavItems = [];

        // Filter hanya label utama (tanpa parent_id)
        const mainLabels = allLabels.filter(label => !label.parent_id);

        // Urutkan label berdasarkan nama
        const sortedLabels = mainLabels.sort((a, b) => {
          const nameA = (a.name || a.label || '').toLowerCase();
          const nameB = (b.name || b.label || '').toLowerCase();
          return nameA.localeCompare(nameB);
        });

        // Tambahkan label ke item navigasi
        sortedLabels.forEach(label => {
          // Pastikan kita selalu menggunakan nama label, bukan ID
          const labelName = label.name || label.label;
          updatedNavItems.push({
            name: labelName,
            href: `/label/${labelName}`
          });
        });

        // Tambahkan item Spotlight (dengan path khusus, bukan format label)
        updatedNavItems.push({
          name: 'Spotlight',
          href: '/spotlight',
          isSpecial: true // Menandai bahwa ini bukan label biasa
        });

        // Log untuk debugging
        console.log('Labels from server:', allLabels);
        console.log('Main labels:', mainLabels);
        console.log('Sorted labels:', sortedLabels);
        console.log('Updated nav items:', updatedNavItems);

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
                        location.pathname === '/' ? 'bg-blue-600 text-white' : ''
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
                            className={classNames(
                              'text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-1 rounded-md text-sm font-bold',
                              location.pathname === item.href ? 'bg-blue-600 text-white' : ''
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
                          <Disclosure.Button className="flex w-full items-center justify-between rounded-md bg-gray-800 px-3 py-3 text-base text-gray-300 hover:bg-gray-700 hover:text-white text-bold">
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
                                className="block rounded-md px-3 py-3 text-base font-medium text-gray-300 hover:bg-gray-700 hover:text-white"
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
                      className={classNames(
                        location.pathname === item.href ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white',
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
