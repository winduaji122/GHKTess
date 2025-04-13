import React, { useState, useRef, useEffect, Fragment } from 'react';
import { Link } from 'react-router-dom';
import './LabelNavbar.css';
import { FaChevronLeft, FaChevronRight, FaHome, FaChevronDown } from 'react-icons/fa';
import { Menu, Transition } from '@headlessui/react';

// Fungsi untuk menggabungkan class names
function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

// Komponen Dropdown untuk label
function LabelDropdown({ label, isActive, onClick }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const timeoutRef = useRef(null);

  // Fungsi untuk menangani hover
  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    // Menambahkan delay sebelum menutup dropdown
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 300); // Delay 300ms
  };

  // Menambahkan event listener untuk menangani hover dan klik di luar dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      // Membersihkan timeout saat komponen unmount
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [dropdownRef]);

  return (
    <Menu as="div" className="relative inline-block text-left dropdown-container">
      <div
        ref={dropdownRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <Menu.Button
          className={`label-nav-item ${isActive ? 'active' : ''}`}
          onClick={() => onClick(label.slug)}
        >
          {label.label}
          <FaChevronDown className="ml-1 h-4 w-4" aria-hidden="true" />
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
              {label.sublabels && label.sublabels.map((sublabel) => (
                <Menu.Item key={sublabel.id || sublabel.slug}>
                  {({ active }) => (
                    <div
                      onClick={() => onClick(sublabel.slug)}
                      className={`${
                        active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                      } block px-4 py-2 text-sm cursor-pointer`}
                    >
                      {sublabel.label || sublabel.name}
                    </div>
                  )}
                </Menu.Item>
              ))}
            </div>
          </Menu.Items>
        </Transition>
      </div>
    </Menu>
  );
}

const LabelNavbar = ({ labels, currentLabel, onLabelClick }) => {
  const [scrollPosition, setScrollPosition] = useState(0);
  const navbarRef = useRef(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  // Check if scroll arrows should be shown
  useEffect(() => {
    const checkScrollArrows = () => {
      if (navbarRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = navbarRef.current;
        setShowLeftArrow(scrollLeft > 0);
        setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
      }
    };

    checkScrollArrows();
    window.addEventListener('resize', checkScrollArrows);
    return () => window.removeEventListener('resize', checkScrollArrows);
  }, [scrollPosition, labels]);

  // Handle scroll left
  const handleScrollLeft = () => {
    if (navbarRef.current) {
      const newPosition = Math.max(0, scrollPosition - 200);
      navbarRef.current.scrollTo({ left: newPosition, behavior: 'smooth' });
      setScrollPosition(newPosition);
    }
  };

  // Handle scroll right
  const handleScrollRight = () => {
    if (navbarRef.current) {
      const { scrollWidth, clientWidth } = navbarRef.current;
      const maxScroll = scrollWidth - clientWidth;
      const newPosition = Math.min(maxScroll, scrollPosition + 200);
      navbarRef.current.scrollTo({ left: newPosition, behavior: 'smooth' });
      setScrollPosition(newPosition);
    }
  };

  // Update scroll position when scrolling
  const handleScroll = () => {
    if (navbarRef.current) {
      setScrollPosition(navbarRef.current.scrollLeft);
    }
  };

  return (
    <div className="label-navbar-container">
      {showLeftArrow && (
        <button className="nav-arrow nav-arrow-left" onClick={handleScrollLeft}>
          <FaChevronLeft />
        </button>
      )}

      <div
        className="label-navbar"
        ref={navbarRef}
        onScroll={handleScroll}
      >
        <Link
          to="/posts"
          className={`label-nav-item ${!currentLabel ? 'active' : ''}`}
        >
          <FaHome className="home-icon" />
          <span>Semua</span>
        </Link>

        {labels.map(label => (
          label.sublabels && label.sublabels.length > 0 ? (
            <LabelDropdown
              key={label.id}
              label={label}
              isActive={currentLabel === label.slug}
              onClick={onLabelClick}
            />
          ) : (
            <div
              key={label.id}
              className={`label-nav-item ${currentLabel === label.slug ? 'active' : ''}`}
              onClick={() => onLabelClick(label.slug)}
            >
              {label.label}
            </div>
          )
        ))}
      </div>

      {showRightArrow && (
        <button className="nav-arrow nav-arrow-right" onClick={handleScrollRight}>
          <FaChevronRight />
        </button>
      )}
    </div>
  );
};

export default LabelNavbar;
