import React from 'react';

function Pagination({ currentPage, totalPages, onPageChange, loading }) {
  const pageNumbers = [];
  let startPage = Math.max(1, currentPage - 2);
  let endPage = Math.min(totalPages, startPage + 4);

  if (endPage - startPage < 4) {
    startPage = Math.max(1, endPage - 4);
  }

  for (let i = startPage; i <= endPage; i++) {
    pageNumbers.push(i);
  }

  const handlePageClick = (pageNumber) => {
    if (pageNumber !== currentPage && !loading) {
      onPageChange(pageNumber);
    }
  };

  const buttonClass = (isActive, isDisabled) => `
    px-3 py-1 rounded transition-colors duration-300
    ${isActive ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}
    ${isDisabled ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : ''}
  `;

  return (
    <nav className="flex justify-center items-center space-x-2 mt-8">
      <button
        onClick={() => handlePageClick(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1 || loading}
        className={buttonClass(false, currentPage === 1 || loading)}
        aria-label="Previous page"
      >
        &laquo; Previous
      </button>
      {pageNumbers.map(number => (
        <button
          key={number}
          onClick={() => handlePageClick(number)}
          disabled={loading}
          className={buttonClass(currentPage === number, loading)}
          aria-label={`Page ${number}`}
          aria-current={currentPage === number ? 'page' : undefined}
        >
          {number}
        </button>
      ))}
      <button
        onClick={() => handlePageClick(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages || loading}
        className={buttonClass(false, currentPage === totalPages || loading)}
        aria-label="Next page"
      >
        Next &raquo;
      </button>
    </nav>
  );
}

export default Pagination;