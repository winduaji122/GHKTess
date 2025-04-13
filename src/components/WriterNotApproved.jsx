import React from 'react';
import { Link } from 'react-router-dom';

const WriterNotApproved = () => {
  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Akun Belum Diapprove</h1>
      <p className="mb-4">
        Akun writer Anda belum mendapatkan persetujuan dari admin. Anda masih bisa:
      </p>
      <ul className="list-disc pl-6 mb-4">
        <li>Membuat draft post</li>
        <li>Menyimpan post sebagai draft</li>
        <li>Mengedit post yang belum dipublikasikan</li>
      </ul>
      <Link 
        to="/dashboard" 
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
      >
        Kembali ke Dashboard
      </Link>
    </div>
  );
};

export default WriterNotApproved;